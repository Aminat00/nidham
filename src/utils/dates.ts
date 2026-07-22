/**
 * Small, timezone-safe date helpers. All functions take/return ISO date strings
 * ("YYYY-MM-DD") and anchor on UTC noon so day arithmetic never slips across a
 * DST/offset boundary. No hidden "today" — callers pass the reference day, which
 * keeps the demo deterministic (see TODAY).
 */

/** Parse "YYYY-MM-DD" to a Date at UTC noon. */
function parse(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

/** Format a Date back to "YYYY-MM-DD". */
function fmt(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Add `n` days to an ISO date. */
export function addDays(iso: string, n: number): string {
  const dt = parse(iso);
  dt.setUTCDate(dt.getUTCDate() + n);
  return fmt(dt);
}

/** Whole-day difference `b - a` (positive if b is later). */
export function dayDiff(a: string, b: string): number {
  const ms = parse(b).getTime() - parse(a).getTime();
  return Math.round(ms / 86_400_000);
}

/** 0 = Sunday … 6 = Saturday. */
export function weekdayIndex(iso: string): number {
  return parse(iso).getUTCDay();
}
