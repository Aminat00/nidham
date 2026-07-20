/**
 * Display helpers for prayer & tesbihat rows. Prayer/tesbihat ids encode their key:
 * `p_fajr`, `t_fajr` → key "fajr". Arabic-script flourishes are rendered in Amiri.
 */

import type { Lang } from '../i18n/strings';
import { UI } from '../i18n/strings';
import { PRAYER_NAMES, PrayerKey, prayerName, prayerScript, TESBIHAT_ARABIC } from '../data/prayers';

export { prayerName, prayerScript };

/** Extract the prayer key from a `p_fajr` / `t_fajr` id. */
export function prayerKeyFromId(id: string): PrayerKey | null {
  const key = id.replace(/^[pt]_/, '') as PrayerKey;
  return key in PRAYER_NAMES ? key : null;
}

/** Tesbihat card primary label, e.g. "Fajr tesbihat" / "تسبيحات الفجر". */
export function tesbihatCardLabel(key: PrayerKey, lang: Lang): string {
  if (lang === 'ar') return `${TESBIHAT_ARABIC} ${PRAYER_NAMES[key].ar}`;
  return `${prayerName(key, lang)}${UI[lang].tesbihatSuffix}`;
}

/** Tesbihat card secondary Arabic flourish — only shown in en/tr. */
export function tesbihatScript(lang: Lang): string | null {
  return lang === 'ar' ? null : TESBIHAT_ARABIC;
}
