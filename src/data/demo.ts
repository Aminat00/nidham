/**
 * App anchors. TODAY / NOW_ISO are the real current day + moment (resolved once at
 * launch), so "today", schedule chips and the Hijri header all track the real calendar.
 * PRAYER_TIMES stay as fallback demo times until a live source overrides them.
 */

import type { Lang } from '../i18n/strings';
import type { PrayerTimes } from '../agent/contract';

const pad = (n: number) => String(n).padStart(2, '0');

/** Local YYYY-MM-DD for a Date (no UTC shift). */
function localDateISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Full ISO 8601 in the device's LOCAL timezone (with offset). Crucially, its date part
 * equals localDateISO(d) — so anything that slices the date off `now` gets the same "today"
 * the rest of the app uses, avoiding an off-by-one when local date ≠ UTC date.
 */
function localISO(d: Date): string {
  const off = -d.getTimezoneOffset(); // minutes east of UTC
  const sign = off >= 0 ? '+' : '-';
  const oh = pad(Math.floor(Math.abs(off) / 60));
  const om = pad(Math.abs(off) % 60);
  return `${localDateISO(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${sign}${oh}:${om}`;
}

// One instant, resolved at launch — TODAY and NOW_ISO always agree on the calendar day.
const NOW = new Date();

/** "Today" is the real current day (local). */
export const TODAY = localDateISO(NOW);

/** ISO 8601 "now" (local, with offset) sent to the agent as context.now. */
export const NOW_ISO = localISO(NOW);

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
