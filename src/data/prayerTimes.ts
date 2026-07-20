/**
 * Real prayer times via the Aladhan API (free, no key), by location + date. Returns
 * the five daily times plus night anchors (Tahajjud ≈ last third of the night, Witr
 * shortly after ʿIshāʾ) and the Hijri date. Everything degrades gracefully: no
 * network / denied location → the caller falls back to the pinned demo values.
 */

import type { PrayerTimes } from '../agent/contract';

export interface Coords {
  lat: number;
  lng: number;
  city?: string;
}

/** Default location when the device won't share one (Istanbul). */
export const DEFAULT_COORDS: Coords = { lat: 41.0082, lng: 28.9784, city: 'Istanbul' };

/** Aladhan calculation methods the user can pick from (id → label). */
export const CALC_METHODS: { id: number; name: string }[] = [
  { id: 13, name: 'Diyanet İşleri (Türkiye)' },
  { id: 3, name: 'Muslim World League' },
  { id: 4, name: 'Umm al-Qura (Makkah)' },
  { id: 2, name: 'ISNA (North America)' },
  { id: 5, name: 'Egyptian Authority' },
  { id: 1, name: 'University of Karachi' },
  { id: 8, name: 'Gulf Region' },
  { id: 9, name: 'Kuwait' },
  { id: 10, name: 'Qatar' },
  { id: 11, name: 'Singapore (MUIS)' },
  { id: 12, name: 'France (UOIF)' },
  { id: 7, name: 'Tehran' },
  { id: 0, name: 'Shia Ithna-Ashari' },
];

/** Default calculation method (13 = Diyanet İşleri, Türkiye). */
export const DEFAULT_METHOD = 13;

const TIMEOUT_MS = 8000;

export interface LivePrayerData {
  times: PrayerTimes;
  tahajjud: string;
  witr: string;
  hijri: { day: number; monthEn: string; monthAr: string; year: number };
  /** 0 = Sunday … 6 = Saturday. */
  weekdayIndex: number;
  source: 'live';
}

/** Strip "04:21 (EET)" → "04:21". */
function hhmm(t: string): string {
  return (t || '').split(' ')[0].trim();
}

/** Add minutes to an "HH:mm" clock string (clamped to 23:59). */
function addMinutes(hm: string, minutes: number): string {
  const [h, m] = hm.split(':').map(Number);
  const total = Math.min(h * 60 + m + minutes, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

/** Fetch prayer times for `dateISO` (YYYY-MM-DD) at `coords` with a calc `method`. */
export async function fetchPrayerTimes(
  coords: Coords,
  dateISO: string,
  method: number = DEFAULT_METHOD,
): Promise<LivePrayerData | null> {
  const [y, m, d] = dateISO.split('-');
  const url = `https://api.aladhan.com/v1/timings/${d}-${m}-${y}?latitude=${coords.lat}&longitude=${coords.lng}&method=${method}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      data?: {
        timings?: Record<string, string>;
        date?: { hijri?: { day?: string; month?: { en?: string; ar?: string }; year?: string }; gregorian?: { weekday?: { en?: string } } };
      };
    };
    const t = body.data?.timings;
    const hijri = body.data?.date?.hijri;
    if (!t || !t.Fajr || !t.Dhuhr) return null;

    const isha = hhmm(t.Isha);
    return {
      times: { fajr: hhmm(t.Fajr), dhuhr: hhmm(t.Dhuhr), asr: hhmm(t.Asr), maghrib: hhmm(t.Maghrib), isha },
      tahajjud: t.Lastthird ? hhmm(t.Lastthird) : addMinutes(hhmm(t.Fajr), -70),
      witr: addMinutes(isha, 29),
      hijri: {
        day: Number(hijri?.day ?? 0),
        monthEn: hijri?.month?.en ?? '',
        monthAr: hijri?.month?.ar ?? '',
        year: Number(hijri?.year ?? 0),
      },
      weekdayIndex: WEEKDAY_INDEX[body.data?.date?.gregorian?.weekday?.en ?? ''] ?? 3,
      source: 'live',
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
