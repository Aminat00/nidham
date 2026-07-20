/**
 * Turn an Item's structured schedule (day + window + dueDate) into the human chip
 * label the Capture cards show — "Sat afternoon", "Tomorrow, after Dhuhr",
 * "Thu → next wk" — localized and RTL-aware. Derived, never stored.
 */

import type { Item } from '../types/item';
import { Lang, UI, WEEKDAYS, WINDOW_WORD, t, isRTL } from '../i18n/strings';
import { dayDiff } from './dates';
import { PRAYER_NAMES, PrayerKey } from '../data/prayers';
import { DEMO_WEEKDAY_INDEX } from '../data/demo';

const PRAYER_WINDOWS: Item['window'][] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

/** Weekday index anchored to the demo's Wednesday, not the real calendar. */
function demoWeekday(date: string, today: string): number {
  return ((DEMO_WEEKDAY_INDEX + dayDiff(today, date)) % 7 + 7) % 7;
}

function dayPart(item: Item, lang: Lang, today: string): string {
  const s = UI[lang];
  const diff = dayDiff(today, item.day);
  if (diff <= 0) return s.today;
  if (diff === 1) return s.tomorrow;
  return WEEKDAYS[lang][demoWeekday(item.day, today)];
}

/** Window phrase; `isAfter` marks prayer windows ("after Dhuhr") vs plain words. */
function windowPart(window: Item['window'], lang: Lang): { text: string; isAfter: boolean } {
  if (PRAYER_WINDOWS.includes(window)) {
    const key = window as PrayerKey;
    const name = lang === 'ar' ? PRAYER_NAMES[key].ar : PRAYER_NAMES[key].en;
    return { text: t(UI[lang].after, { prayer: name }), isAfter: true };
  }
  const word = WINDOW_WORD[lang][window as 'morning' | 'afternoon' | 'evening' | 'anytime'];
  return { text: word, isAfter: false };
}

export function scheduleChipLabel(item: Item, lang: Lang, today: string): string {
  const s = UI[lang];
  const arrow = isRTL(lang) ? '←' : '→';

  // Projects show a range ("Thu → next wk").
  if (item.category === 'project') {
    const start = WEEKDAYS[lang][demoWeekday(item.day, today)];
    let end = s.nextWeek;
    if (item.dueDate) {
      const span = dayDiff(item.day, item.dueDate);
      end = span >= 6 ? s.nextWeek : WEEKDAYS[lang][demoWeekday(item.dueDate, today)];
    }
    return `${start} ${arrow} ${end}`;
  }

  const dp = dayPart(item, lang, today);
  const wp = windowPart(item.window, lang);
  if (wp.isAfter) {
    const sep = lang === 'ar' ? '، ' : ', ';
    return `${dp}${sep}${wp.text}`;
  }
  return `${dp} ${wp.text}`;
}
