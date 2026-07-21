/**
 * Pure scheduling logic — extracted from the store so it unit-tests in node (RN-free).
 * Places prayer-anchored items on a clock and builds Items from captures.
 */
import type { Item, Window } from '../types/item';
import type { CaptureTask } from '../agent/captureContract';

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
