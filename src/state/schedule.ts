/**
 * Pure scheduling logic — extracted from the store so it unit-tests in node (RN-free).
 * Places prayer-anchored items on a clock and builds Items from captures.
 */
import type { Item, Window } from '../types/item';
import type { CaptureTask } from '../agent/captureContract';
import { addDays, weekdayIndex } from '../utils/dates';
import type { AgentContext } from '../agent/contract';
import type { SchedulableSubtask, SchedulePlacement } from '../agent/scheduleContract';

/** "HH:mm" prayer times used to place scheduled items in a window. */
export type Times = { fajr: string; dhuhr: string; asr: string; maghrib: string; isha: string };

export function hhmmToMin(hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
}

export function addMinutes(hhmm: string, minutes: number): string {
  const total = Math.min(hhmmToMin(hhmm) + minutes, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** A representative clock time for a prayer window, so scheduled items order sensibly. */
export function windowBaseTime(window: Window, t: Times): string {
  switch (window) {
    case 'fajr': return t.fajr;
    case 'morning': return addMinutes(t.fajr, 120);
    case 'dhuhr': return t.dhuhr;
    case 'afternoon': return addMinutes(t.dhuhr, 90);
    case 'asr': return t.asr;
    case 'maghrib': return t.maghrib;
    case 'isha': return t.isha;
    case 'evening': return addMinutes(t.isha, 60);
    default: return t.dhuhr; // anytime
  }
}

/** The prayer window active at `now` (wraps to isha overnight). */
export function suggestCurrentWindow(t: Times, now: Date): Window {
  const mins = now.getHours() * 60 + now.getMinutes();
  const seq: Array<[Window, number]> = [
    ['fajr', hhmmToMin(t.fajr)], ['dhuhr', hhmmToMin(t.dhuhr)], ['asr', hhmmToMin(t.asr)],
    ['maghrib', hhmmToMin(t.maghrib)], ['isha', hhmmToMin(t.isha)],
  ];
  let cur: Window = 'isha';
  for (const [w, m] of seq) if (mins >= m) cur = w;
  return cur;
}

export interface ScheduleInput { date: string; window?: Window; time?: string | null; }

/** Resolve a schedule request into the Item fields that place it on a day. */
export function scheduledFields(input: ScheduleInput, times: Times): Pick<Item, 'day' | 'window' | 'time' | 'sortTime' | 'status'> {
  const window: Window = input.window ?? 'anytime';
  const time = input.time ?? null;
  const sortTime = time ?? addMinutes(windowBaseTime(window, times), 10);
  return { day: input.date, window, time, sortTime, status: 'pending' };
}

/** Build an Item from a parsed capture. Unscheduled by default; pass `schedule` to place it. */
export function captureTaskToItem(
  task: CaptureTask,
  id: string,
  schedule?: ReturnType<typeof scheduledFields>,
): Item {
  const base: Item = {
    id,
    title: task.title.trim(),
    category: task.category,
    area: task.area,
    window: 'anytime',
    sortTime: '10:00',
    urgency: task.urgency,
    energy: task.energy,
    status: 'pending',
    ...(task.timeContext ? { timeContext: task.timeContext } : {}),
  };
  return schedule ? { ...base, ...schedule } : base;
}

export const LOAD_CAP = 3;
export const HORIZON_DAYS = 7;

const WEEKDAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/** Resolve a spoken time hint to the nearest ISO day (today or later), or null if none found. */
export function parseDayHint(hint: string | undefined, todayIso: string): string | null {
  if (!hint) return null;
  const h = hint.toLowerCase();
  if (/\btomorrow\b/.test(h)) return addDays(todayIso, 1);
  if (/\btoday\b|\btonight\b/.test(h)) return todayIso;
  const nextDow = (target: number) => addDays(todayIso, (target - weekdayIndex(todayIso) + 7) % 7);
  // Check a named weekday before the generic "weekend" — a specific day mentioned alongside
  // "weekends" (e.g. "Wednesday or weekends") should win, since it's the more specific signal.
  for (let i = 0; i < 7; i++) if (new RegExp(`\\b${WEEKDAY_NAMES[i]}\\b`).test(h)) return nextDow(i);
  if (/\bweekend\b|\bweekends\b/.test(h)) return nextDow(6); // Saturday
  return null;
}

function place(sub: SchedulableSubtask, day: string): SchedulePlacement {
  const deep = sub.energy === 'deep';
  const window: Window = deep ? 'morning' : 'anytime';
  return { subtaskId: sub.id, day, window, rationale: deep ? 'deep work → morning' : 'placed in an open slot' };
}

/**
 * Deterministic offline scheduler (also the runScheduleAgent fallback).
 * - spread=true (project batch): fill each day to LOAD_CAP within HORIZON_DAYS from `now`,
 *   skipping days already full per context.existingItems; overflow stays unscheduled.
 * - spread=false (loose): place each item ONLY on a signal — urgency now/today → today, or
 *   parseDayHint(timeContext) → that day; omit no-signal items.
 */
export function localSchedule(subtasks: SchedulableSubtask[], context: AgentContext, spread = false): SchedulePlacement[] {
  const today = context.now.slice(0, 10);
  const placements: SchedulePlacement[] = [];
  if (spread) {
    const dayCount: Record<string, number> = {};
    for (const it of context.existingItems) if (it.day) dayCount[it.day] = (dayCount[it.day] ?? 0) + 1;
    let cursor = 0;
    for (const sub of subtasks) {
      let placedDay: string | null = null;
      for (let d = cursor; d < HORIZON_DAYS; d++) {
        const date = addDays(today, d);
        if ((dayCount[date] ?? 0) < LOAD_CAP) { placedDay = date; dayCount[date] = (dayCount[date] ?? 0) + 1; cursor = d; break; }
      }
      if (!placedDay) break;
      placements.push(place(sub, placedDay));
    }
  } else {
    for (const sub of subtasks) {
      const target = sub.urgency === 'now' || sub.urgency === 'today' ? today : parseDayHint(sub.timeContext, today);
      if (target) placements.push(place(sub, target));
    }
  }
  return placements;
}
