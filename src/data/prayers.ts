/**
 * Prayer identity data, matching Nidham.dc.html. Names are localized (en = trans-
 * literation, tr = Turkish, ar = Arabic script). The Arabic script also shows as a
 * secondary flourish in en/tr. Tahajjud and Witr are night-prayer anchors.
 */

import type { Lang } from '../i18n/strings';

export type PrayerKey = 'tahajjud' | 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha' | 'witr';

export interface PrayerName {
  en: string;
  tr: string;
  ar: string;
}

export const PRAYER_NAMES: Record<PrayerKey, PrayerName> = {
  tahajjud: { en: 'Tahajjud', tr: 'Teheccüd', ar: 'تهجد' },
  fajr: { en: 'Fajr', tr: 'Sabah namazı', ar: 'الفجر' },
  dhuhr: { en: 'Dhuhr', tr: 'Öğle namazı', ar: 'الظهر' },
  asr: { en: 'ʿAsr', tr: 'İkindi namazı', ar: 'العصر' },
  maghrib: { en: 'Maghrib', tr: 'Akşam namazı', ar: 'المغرب' },
  isha: { en: 'ʿIshāʾ', tr: 'Yatsı namazı', ar: 'العشاء' },
  witr: { en: 'Witr', tr: 'Vitir namazı', ar: 'الوتر' },
};

/** Primary label for the active language. */
export function prayerName(key: PrayerKey, lang: Lang): string {
  return PRAYER_NAMES[key][lang];
}

/** Arabic-script secondary flourish — only shown in en/tr. */
export function prayerScript(key: PrayerKey, lang: Lang): string | null {
  return lang === 'ar' ? null : PRAYER_NAMES[key].ar;
}

export const TESBIHAT_ARABIC = 'تسبيحات';
