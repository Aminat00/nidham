/**
 * Demo anchors, matching Nidham.dc.html. In-memory, no persistence, so "today" is
 * pinned to a constant to keep prayer times, the Hijri header and schedule chips
 * consistent. Swap DEMO_TODAY + PRAYER_TIMES for a live source later.
 */

import type { Lang } from '../i18n/strings';
import type { PrayerTimes } from '../agent/contract';

/** Wed · 9 Muḥarram 1448 (Gregorian 2026-07-20). */
export const DEMO_TODAY = '2026-07-20';

/** The demo treats today as Wednesday (see the design's date line). */
export const DEMO_WEEKDAY_INDEX = 3; // 0 = Sun … 3 = Wed

/** ISO 8601 "now" sent to the agent as context.now (Dhuhr just entered). */
export const DEMO_NOW_ISO = '2026-07-20T13:02:00+03:00';

export const USER_NAME = 'Yusuf';

/** The five daily prayers for DEMO_TODAY (times from the design). */
export const PRAYER_TIMES: PrayerTimes = {
  fajr: '04:21',
  dhuhr: '13:02',
  asr: '16:30',
  maghrib: '19:14',
  isha: '20:41',
};

export const NIGHT_TIMES = { tahajjud: '03:10', witr: '21:10' };
