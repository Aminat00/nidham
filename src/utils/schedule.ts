/**
 * Turn an Item's structured schedule (day + window + dueDate) into the human chip
 * label the Capture cards show — "Sat afternoon", "Tomorrow, after Dhuhr",
 * "Thu → next wk" — localized and RTL-aware. Derived, never stored.
 */

import type { Item } from '../types/item';
import { Lang, UI, WEEKDAYS, WINDOW_WORD, t, isRTL } from '../i18n/strings';
import { dayDiff, weekdayIndex } from './dates';
import { PRAYER_NAMES, PrayerKey } from '../data/prayers';

const PRAYER_WINDOWS: Item['window'][] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

function dayPart(day: string, lang: Lang, today: string): string {
  const s = UI[lang];
  const diff = dayDiff(today, day);
  if (diff <= 0) return s.today;
  if (diff === 1) return s.tomorrow;
  return WEEKDAYS[lang][weekdayIndex(day)];
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

  // Unscheduled (backlog) items carry no day → no schedule chip.
  if (!item.day) return '';
  const day = item.day;

  // Projects show a range ("Thu → next wk").
  if (item.category === 'project') {
    const start = WEEKDAYS[lang][weekdayIndex(day)];
    let end = s.nextWeek;
    if (item.dueDate) {
      const span = dayDiff(day, item.dueDate);
      end = span >= 6 ? s.nextWeek : WEEKDAYS[lang][weekdayIndex(item.dueDate)];
    }
    return `${start} ${arrow} ${end}`;
  }

  const dp = dayPart(day, lang, today);
  const wp = windowPart(item.window, lang);
  if (wp.isAfter) {
    const sep = lang === 'ar' ? '، ' : ', ';
    return `${dp}${sep}${wp.text}`;
  }
  return `${dp} ${wp.text}`;
}
