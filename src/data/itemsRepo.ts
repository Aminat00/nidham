/**
 * Items repository — maps the app's single `Item` model to/from the Postgres `items`
 * table and reads/writes it scoped to the signed-in user (RLS enforces isolation on
 * the server too). Local-first: the store keeps working from AsyncStorage; this layer
 * pulls the user's cloud rows on sign-in and writes changes through.
 */

import type { Item } from '../types/item';
import { supabase } from './supabase';

interface Row {
  user_id: string;
  id: string;
  title: string;
  category: Item['category'];
  day: string;
  prayer_window: Item['window'];
  sort_time: string;
  urgency: Item['urgency'];
  energy: Item['energy'];
  due_date: string | null;
  parent_id: string | null;
  steps: string[] | null;
  start_here: boolean | null;
  status: Item['status'];
  protected: boolean | null;
  note: string | null;
  in_feed: boolean;
  feed_order: number | null;
}

function rowToItem(r: Row): Item {
  return {
    id: r.id,
    title: r.title,
    category: r.category,
    day: r.day,
    window: r.prayer_window,
    sortTime: r.sort_time,
    urgency: r.urgency,
    energy: r.energy,
    dueDate: r.due_date,
    parentId: r.parent_id,
    steps: r.steps ?? undefined,
    startHere: r.start_here ?? undefined,
    status: r.status,
    protected: r.protected ?? undefined,
    note: r.note ?? undefined,
  };
}

function itemToRow(item: Item, userId: string, feedIndex: number): Row {
  return {
    user_id: userId,
    id: item.id,
    title: item.title,
    category: item.category,
    day: item.day,
    prayer_window: item.window,
    sort_time: item.sortTime,
    urgency: item.urgency,
    energy: item.energy,
    due_date: item.dueDate ?? null,
    parent_id: item.parentId ?? null,
    steps: item.steps ?? null,
    start_here: item.startHere ?? null,
    status: item.status,
    protected: item.protected ?? null,
    note: item.note ?? null,
    in_feed: feedIndex >= 0,
    feed_order: feedIndex >= 0 ? feedIndex : null,
  };
}

export interface RepoState {
  items: Item[];
  feedIds: string[];
}

/** Fetch all of the user's items + feed order. Null on error/unconfigured. */
export async function fetchAll(userId: string): Promise<RepoState | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('items').select('*').eq('user_id', userId);
  if (error || !data) return null;
  const rows = data as Row[];
  const items = rows.map(rowToItem);
  const feedIds = rows
    .filter((r) => r.in_feed)
    .sort((a, b) => (a.feed_order ?? 0) - (b.feed_order ?? 0))
    .map((r) => r.id);
  return { items, feedIds };
}

/** Upsert the full item set + feed order for the user. Best-effort. */
export async function saveAll(userId: string, items: Item[], feedIds: string[]): Promise<void> {
  if (!supabase) return;
  const order = new Map(feedIds.map((id, i) => [id, i]));
  const rows = items.map((it) => itemToRow(it, userId, order.has(it.id) ? (order.get(it.id) as number) : -1));
  const { error } = await supabase.from('items').upsert(rows, { onConflict: 'user_id,id' });
  if (error) {
    // eslint-disable-next-line no-console
    console.warn('[itemsRepo] saveAll failed —', error.message);
  }
}
