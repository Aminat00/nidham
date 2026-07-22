/**
 * App anchors. TODAY / NOW_ISO are the real current day + moment (resolved once at
 * launch), so "today", schedule chips and the Hijri header all track the real calendar.
 * PRAYER_TIMES stay as fallback demo times until a live source overrides them.
 */

import type { Lang } from '../i18n/strings';
import type { PrayerTimes } from '../agent/contract';

/** Local YYYY-MM-DD for a Date (no UTC shift). */
function localDateISO(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** "Today" is the real current day now — the app is live (auth-gated), not a frozen demo. */
export const TODAY = localDateISO(new Date());

/** ISO 8601 "now" sent to the agent as context.now — the real current moment. */
export const NOW_ISO = new Date().toISOString();

export const USER_NAME = 'Yusuf';

/** The five daily prayers for TODAY (times from the design). */
export const PRAYER_TIMES: PrayerTimes = {
  fajr: '04:21',
  dhuhr: '13:02',
  asr: '16:30',
  maghrib: '19:14',
  isha: '20:41',
};

export const NIGHT_TIMES = { tahajjud: '03:10', witr: '21:10' };
