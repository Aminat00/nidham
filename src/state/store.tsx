/**
 * In-memory app store (no persistence in v1). Holds every Item, the capture
 * pipeline (thinking → landed), and the manual controls on Today (mark done /
 * push to tomorrow). Reseeds — preserving user status — when the language flips.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Item } from '../types/item';
import { useI18n } from '../i18n/I18nContext';
import { buildSeed } from '../data/seed';
import { flattenResponse } from './flatten';
import { runAgent } from '../agent/runAgent';
import { DEMO_NOW_ISO, DEMO_TODAY, PRAYER_TIMES } from '../data/demo';
import { addDays } from '../utils/dates';
import { loadState, saveState, PersistedState } from './persistence';
import { usePrayerTimes } from '../data/PrayerTimesContext';
import { useAuth } from './auth';
import { fetchAll, saveAll } from '../data/itemsRepo';

/** Minimum "Nidham is scheduling…" duration — keeps the moment calm, never jumpy. */
const MIN_THINKING_MS = 1500;

/** Item ids the seed owns (language-independent) — the rest are user captures. */
const SEED_IDS = new Set(buildSeed('en').items.map((i) => i.id));

type Phase = 'idle' | 'thinking';

interface StoreValue {
  today: string;
  phase: Phase;
  summary: string | null;
  /** Top-level captured items, feed order (what "Just captured" renders). */
  feed: Item[];
  /** Items scheduled for `day`, sorted by clock time. */
  itemsForDay: (day: string) => Item[];
  /** Direct children (steps/tesbihat) of a parent id, in clock order. */
  childrenOf: (parentId: string) => Item[];
  getItem: (id: string) => Item | undefined;
  /** Run the agent on a raw brain-dump. */
  capture: (text: string) => Promise<void>;
  toggleDone: (id: string) => void;
  pushToTomorrow: (id: string) => void;
  undoLastPush: () => void;
  canUndoPush: boolean;
}

const StoreContext = createContext<StoreValue | null>(null);

function bySortTime(a: Item, b: Item): number {
  return a.sortTime.localeCompare(b.sortTime);
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { lang } = useI18n();
  const { live } = usePrayerTimes();
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [itemsById, setItemsById] = useState<Record<string, Item>>({});
  const [feedIds, setFeedIds] = useState<string[]>([]);
  const [phase, setPhase] = useState<Phase>('idle');
  const [summary, setSummary] = useState<string | null>(null);
  const [lastPushedId, setLastPushedId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const phaseRef = useRef<Phase>('idle');
  phaseRef.current = phase;
  const itemsRef = useRef<Record<string, Item>>({});
  itemsRef.current = itemsById;
  const feedIdsRef = useRef<string[]>([]);
  feedIdsRef.current = feedIds;
  const hydratedRef = useRef(false);
  const langInitRef = useRef(false);
  const cloudPulledRef = useRef<string | null>(null);
  const cloudSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hydrate once from disk: a fresh seed overlaid with the user's saved status/day
  // and their captured items. Falls back to a plain seed if nothing is stored.
  useEffect(() => {
    let alive = true;
    (async () => {
      const persisted = await loadState();
      if (!alive) return;
      const { items, capturedIds } = buildSeed(lang);
      const byId: Record<string, Item> = {};
      for (const it of items) byId[it.id] = it;
      if (persisted) {
        for (const id of Object.keys(persisted.overrides)) {
          if (byId[id]) byId[id] = { ...byId[id], ...persisted.overrides[id] };
        }
        for (const c of persisted.captures) byId[c.id] = c;
        setFeedIds(persisted.feedIds);
      } else {
        setFeedIds(capturedIds);
      }
      setItemsById(byId);
      hydratedRef.current = true;
      setHydrated(true);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cloud sync (local-first): once signed in, pull the user's Supabase rows and merge
  // them over local; if the cloud is empty, seed it from the current local state.
  useEffect(() => {
    if (!userId || !hydrated || cloudPulledRef.current === userId) return;
    cloudPulledRef.current = userId;
    let alive = true;
    (async () => {
      const remote = await fetchAll(userId);
      if (!alive) return;
      if (remote && remote.items.length) {
        setItemsById((prev) => {
          const next = { ...prev };
          for (const it of remote.items) next[it.id] = it; // remote wins
          return next;
        });
        if (remote.feedIds.length) setFeedIds(remote.feedIds);
      } else {
        // First sign-in on this device → push the current items to the cloud.
        saveAll(userId, Object.values(itemsRef.current), feedIdsRef.current);
      }
    })();
    return () => {
      alive = false;
    };
  }, [userId, hydrated]);

  // Reseed on language change (skip the initial run — hydrate handles mount),
  // preserving the user's status/day and their captured items.
  useEffect(() => {
    if (!langInitRef.current) {
      langInitRef.current = true;
      return;
    }
    const snapshot = itemsRef.current;
    const { items } = buildSeed(lang);
    const next: Record<string, Item> = {};
    for (const item of items) {
      const prior = snapshot[item.id];
      next[item.id] = prior ? { ...item, status: prior.status, day: prior.day } : item;
    }
    for (const id of Object.keys(snapshot)) {
      if (!(id in next)) next[id] = snapshot[id]; // user captures
    }
    setItemsById(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  // Persist (best-effort) whenever items/feed change, after hydration: always to the
  // local cache, and — when signed in — write through to Supabase (debounced).
  useEffect(() => {
    if (!hydratedRef.current) return;
    const overrides: PersistedState['overrides'] = {};
    const captures: Item[] = [];
    for (const it of Object.values(itemsById)) {
      if (SEED_IDS.has(it.id)) overrides[it.id] = { status: it.status, day: it.day };
      else captures.push(it);
    }
    saveState({ overrides, captures, feedIds });

    if (userId && cloudPulledRef.current === userId) {
      if (cloudSaveTimer.current) clearTimeout(cloudSaveTimer.current);
      cloudSaveTimer.current = setTimeout(() => {
        saveAll(userId, Object.values(itemsById), feedIds);
      }, 600);
    }
  }, [itemsById, feedIds, userId]);

  const upsertItems = useCallback((incoming: Item[]) => {
    setItemsById((prev) => {
      const next = { ...prev };
      for (const item of incoming) {
        // Keep any user-set status/day if the item already exists.
        const prior = next[item.id];
        next[item.id] = prior ? { ...item, status: prior.status, day: prior.day } : item;
      }
      return next;
    });
  }, []);

  const capture = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || phaseRef.current === 'thinking') return;

      setPhase('thinking');
      setSummary(null);
      const startedAt = Date.now();

      const existingItems = Object.values(itemsRef.current).map((i) => ({
        id: i.id,
        title: i.title,
        window: i.window,
      }));

      const res = await runAgent({
        capture: trimmed,
        context: {
          now: DEMO_NOW_ISO,
          lang,
          prayerTimes: live?.times ?? PRAYER_TIMES,
          existingItems,
        },
      });
      const { items, topLevelIds } = flattenResponse(res);

      const elapsed = Date.now() - startedAt;
      const wait = Math.max(0, MIN_THINKING_MS - elapsed);
      setTimeout(() => {
        upsertItems(items);
        setFeedIds((prev) => [
          ...topLevelIds.filter((id) => !prev.includes(id)),
          ...prev,
        ]);
        setSummary(res.summary);
        setPhase('idle');
      }, wait);
    },
    [lang, live, upsertItems],
  );

  const toggleDone = useCallback((id: string) => {
    setItemsById((prev) => {
      const item = prev[id];
      if (!item) return prev;
      const status: Item['status'] = item.status === 'done' ? 'pending' : 'done';
      return { ...prev, [id]: { ...item, status } };
    });
  }, []);

  const pushToTomorrow = useCallback((id: string) => {
    setItemsById((prev) => {
      const item = prev[id];
      if (!item) return prev;
      return {
        ...prev,
        [id]: { ...item, status: 'pushed', day: addDays(item.day, 1) },
      };
    });
    setLastPushedId(id);
  }, []);

  const undoLastPush = useCallback(() => {
    setLastPushedId((pushedId) => {
      if (!pushedId) return null;
      setItemsById((prev) => {
        const item = prev[pushedId];
        if (!item) return prev;
        return {
          ...prev,
          [pushedId]: { ...item, status: 'pending', day: addDays(item.day, -1) },
        };
      });
      return null;
    });
  }, []);

  const itemsForDay = useCallback(
    (day: string) =>
      Object.values(itemsById)
        .filter((i) => i.day === day && i.status !== 'pushed')
        .sort(bySortTime),
    [itemsById],
  );

  const childrenOf = useCallback(
    (parentId: string) =>
      Object.values(itemsById)
        .filter((i) => i.parentId === parentId)
        .sort(bySortTime),
    [itemsById],
  );

  const getItem = useCallback((id: string) => itemsById[id], [itemsById]);

  const feed = useMemo(
    () => feedIds.map((id) => itemsById[id]).filter((i): i is Item => Boolean(i)),
    [feedIds, itemsById],
  );

  const value = useMemo<StoreValue>(
    () => ({
      today: DEMO_TODAY,
      phase,
      summary,
      feed,
      itemsForDay,
      childrenOf,
      getItem,
      capture,
      toggleDone,
      pushToTomorrow,
      undoLastPush,
      canUndoPush: lastPushedId !== null,
    }),
    [
      phase,
      summary,
      feed,
      itemsForDay,
      childrenOf,
      getItem,
      capture,
      toggleDone,
      pushToTomorrow,
      undoLastPush,
      lastPushedId,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
