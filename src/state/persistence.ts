/**
 * Local persistence via AsyncStorage. We store a slim override layer, not the whole
 * item set, so seed/code changes still take effect while the user's status/day edits
 * and their captured items survive a reload. Language is stored separately (App
 * needs it before the i18n provider mounts).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Item, Status } from '../types/item';
import type { Lang } from '../i18n/strings';

const STATE_KEY = 'nidham.state.v1';
const LANG_KEY = 'nidham.lang.v1';

export interface PersistedState {
  /** status/day for seed-owned items, keyed by id. day may be null (unscheduled). */
  overrides: Record<string, { status: Status; day?: string | null }>;
  /** User-captured items (ids not present in the base seed). */
  captures: Item[];
  /** Just-captured feed order. */
  feedIds: string[];
}

export async function loadState(): Promise<PersistedState | null> {
  try {
    const raw = await AsyncStorage.getItem(STATE_KEY);
    return raw ? (JSON.parse(raw) as PersistedState) : null;
  } catch {
    return null;
  }
}

export async function saveState(state: PersistedState): Promise<void> {
  try {
    await AsyncStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
    // Best-effort; never throw into the render path.
  }
}

export async function loadLang(): Promise<Lang | null> {
  try {
    const l = await AsyncStorage.getItem(LANG_KEY);
    return l === 'en' || l === 'tr' || l === 'ar' ? l : null;
  } catch {
    return null;
  }
}

export async function saveLang(lang: Lang): Promise<void> {
  try {
    await AsyncStorage.setItem(LANG_KEY, lang);
  } catch {
    /* ignore */
  }
}

export async function clearAll(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([STATE_KEY, LANG_KEY]);
  } catch {
    /* ignore */
  }
}
