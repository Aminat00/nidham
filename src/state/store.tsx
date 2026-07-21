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
import type { Item, Area, Window } from '../types/item';
import { useI18n } from '../i18n/I18nContext';
import { buildSeed } from '../data/seed';
import { flattenResponse } from './flatten';
import { flattenProjectPlan } from './flattenProject';
import { runAgent } from '../agent/runAgent';
import type { ProjectPlan } from '../agent/projectContract';
import { currentStep, projectProgress, milestonesOf, stepsOf, type ProjectProgress } from '../data/projects';
import { DEMO_NOW_ISO, DEMO_TODAY, PRAYER_TIMES } from '../data/demo';
import { addDays } from '../utils/dates';
import { loadState, saveState, clearState, PersistedState } from './persistence';
import { usePrayerTimes } from '../data/PrayerTimesContext';
import { useAuth } from './auth';
import { fetchAll, saveAll, deleteAll } from '../data/itemsRepo';
import { addMinutes, windowBaseTime, suggestCurrentWindow, scheduledFields, captureTaskToItem, type Times } from './schedule';
import type { CaptureTask } from '../agent/captureContract';

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

  /* ---- Tasks backlog + Project agent ---- */
  /** All projects (category 'project'), newest-created not guaranteed — UI can sort. */
  projects: Item[];
  /** Unscheduled loose tasks grouped by life area, in a stable area order. */
  backlogByArea: Array<{ area: Area; items: Item[] }>;
  /** The one next action of a project (derived). */
  currentStepOf: (projectId: string) => Item | undefined;
  progressOf: (projectId: string) => ProjectProgress;
  projectMilestones: (projectId: string) => Item[];
  milestoneSteps: (milestoneId: string) => Item[];
  /** Persist a finished plan as project → milestones → steps (backlog). Returns project id. */
  createProject: (plan: ProjectPlan) => string;
  /** File a loose task from the capture agent's parsed result (backlog, or today if flagged). */
  addCaptureTask: (task: CaptureTask) => string;
  /** Schedule an item to any date + window (+ optional exact time). */
  scheduleItem: (id: string, input: { date: string; window?: Window; time?: string | null }) => void;
  /** Rename an item's title (trims; ignores empty). */
  renameItem: (id: string, title: string) => void;
  /** Delete a captured item (guarded — seed items are never removed). */
  deleteItem: (id: string) => void;
  /** Suggested window for "Do today" right now. */
  suggestWindow: () => Window;
  /** Schedule an item into today, in a prayer window. */
  scheduleToday: (id: string, window?: Window) => void;
  /** Send an item back to the backlog (clears its day). */
  unschedule: (id: string) => void;
  /** Wipe everything (local + cloud) back to a fresh seed. Keeps language + session. */
  resetData: () => void;
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
  const timesRef = useRef<Times>(PRAYER_TIMES);
  timesRef.current = live?.times ?? PRAYER_TIMES;

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
      if (!item || !item.day) return prev; // only scheduled items can be pushed
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
        if (!item || !item.day) return prev;
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

  /* -------------------------------------------------- Tasks backlog + Projects --- */

  const projects = useMemo(
    () => Object.values(itemsById).filter((i) => i.category === 'project'),
    [itemsById],
  );

  // Unscheduled loose tasks/errands, grouped by area in a fixed display order.
  const backlogByArea = useMemo(() => {
    const AREA_ORDER: Area[] = ['chore', 'admin', 'personal', 'self-dev', 'spiritual', 'errand'];
    const loose = Object.values(itemsById).filter(
      (i) => !i.day && i.status !== 'done' && (i.category === 'task' || i.category === 'errand'),
    );
    const groups = new Map<Area, Item[]>();
    for (const it of loose) {
      const a = it.area ?? 'personal';
      const bucket = groups.get(a) ?? [];
      bucket.push(it);
      groups.set(a, bucket);
    }
    return AREA_ORDER.filter((a) => groups.has(a)).map((a) => ({ area: a, items: groups.get(a) as Item[] }));
  }, [itemsById]);

  const currentStepOf = useCallback((projectId: string) => currentStep(projectId, itemsById), [itemsById]);
  const progressOf = useCallback((projectId: string) => projectProgress(projectId, itemsById), [itemsById]);
  const projectMilestones = useCallback((projectId: string) => milestonesOf(projectId, itemsById), [itemsById]);
  const milestoneSteps = useCallback((milestoneId: string) => stepsOf(milestoneId, itemsById), [itemsById]);

  const createProject = useCallback(
    (plan: ProjectPlan): string => {
      const seed = Date.now().toString(36);
      const { project, items } = flattenProjectPlan(plan, { idSeed: seed });
      upsertItems([project, ...items]);
      return project.id;
    },
    [upsertItems],
  );

  const suggestWindow = useCallback((): Window => suggestCurrentWindow(timesRef.current, new Date()), []);

  const addCaptureTask = useCallback((task: CaptureTask): string => {
    const id = 'cap_' + Date.now().toString(36);
    const schedule = task.scheduleToday
      ? scheduledFields({ date: DEMO_TODAY, window: suggestCurrentWindow(timesRef.current, new Date()) }, timesRef.current)
      : undefined;
    upsertItems([captureTaskToItem(task, id, schedule)]);
    return id;
  }, [upsertItems]);

  const scheduleItem = useCallback((id: string, input: { date: string; window?: Window; time?: string | null }) => {
    setItemsById((prev) => {
      const it = prev[id];
      if (!it) return prev;
      return { ...prev, [id]: { ...it, ...scheduledFields(input, timesRef.current) } };
    });
  }, []);

  const renameItem = useCallback((id: string, title: string) => {
    const clean = title.trim();
    if (!clean) return;
    setItemsById((prev) => (prev[id] ? { ...prev, [id]: { ...prev[id], title: clean } } : prev));
  }, []);

  const deleteItem = useCallback((id: string) => {
    if (SEED_IDS.has(id)) return;
    setItemsById((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setFeedIds((prev) => prev.filter((f) => f !== id));
  }, []);

  const scheduleToday = useCallback((id: string, window: Window = 'anytime') => {
    setItemsById((prev) => {
      const it = prev[id];
      if (!it) return prev;
      return {
        ...prev,
        [id]: {
          ...it,
          day: DEMO_TODAY,
          window,
          sortTime: addMinutes(windowBaseTime(window, timesRef.current), 10),
          status: 'pending',
        },
      };
    });
  }, []);

  const unschedule = useCallback((id: string) => {
    setItemsById((prev) => {
      const it = prev[id];
      if (!it) return prev;
      return { ...prev, [id]: { ...it, day: undefined, time: null } };
    });
  }, []);

  // Clean slate: rebuild the fresh seed in memory, clear local cache, and wipe the
  // user's cloud rows. Keeps language + session. The save effect re-persists the seed.
  const resetData = useCallback(() => {
    const { items, capturedIds } = buildSeed(lang);
    const byId: Record<string, Item> = {};
    for (const it of items) byId[it.id] = it;
    setItemsById(byId);
    setFeedIds(capturedIds);
    setSummary(null);
    setPhase('idle');
    setLastPushedId(null);
    clearState();
    if (userId) deleteAll(userId);
  }, [lang, userId]);

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
      projects,
      backlogByArea,
      currentStepOf,
      progressOf,
      projectMilestones,
      milestoneSteps,
      createProject,
      addCaptureTask,
      scheduleItem,
      renameItem,
      deleteItem,
      suggestWindow,
      scheduleToday,
      unschedule,
      resetData,
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
      projects,
      backlogByArea,
      currentStepOf,
      progressOf,
      projectMilestones,
      milestoneSteps,
      createProject,
      addCaptureTask,
      scheduleItem,
      renameItem,
      deleteItem,
      suggestWindow,
      scheduleToday,
      unschedule,
      resetData,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
