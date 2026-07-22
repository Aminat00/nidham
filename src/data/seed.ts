/**
 * Demo seed, matching Nidham.dc.html's Today screen. Builds the immovable prayer
 * anchors + their tesbihat, the "ākhira" readings (wird/Risale/Qurʾān/Muhāsaba) and
 * the "dunya" tasks (email/thesis/groceries), each in its prayer window. Then folds
 * in the three pre-scheduled Capture-feed items. Everything localized to `lang`.
 *
 * Prayer/tesbihat ids encode their key (`p_fajr`, `t_fajr`) for label resolution.
 */

import type { Item } from '../types/item';
import type { Lang } from '../i18n/strings';
import { digits } from '../i18n/strings';
import { TODAY, PRAYER_TIMES, NIGHT_TIMES } from './demo';
import { buildInitialFeed } from './samplePlan';
import { flattenResponse } from '../state/flatten';
import { PrayerKey } from './prayers';
import { addDays } from '../utils/dates';

type L3 = { en: string; tr: string; ar: string };
const g = (v: L3, lang: Lang) => v[lang];

/* --------------------------------------------------------- localized copy --- */

const TITLES: Record<string, L3> = {
  wird: { en: 'Morning wird — adhkār', tr: 'Sabah virdi — ezkâr', ar: 'الورد الصباحي — أذكار' },
  risale: { en: 'Risale-i Nur — Sözler', tr: 'Risale-i Nur — Sözler', ar: 'Risale-i Nur — Sözler' },
  quran: { en: 'Qurʾān — 1 juz (khatm)', tr: 'Kur’an — 1 cüz (hatim)', ar: 'القرآن — جزء واحد (ختم)' },
  muhasaba: { en: 'Evening Muhāsaba', tr: 'Akşam muhasebesi', ar: 'محاسبة المساء' },
  email: { en: 'Reply to advisor email', tr: 'Danışmana e-posta yaz', ar: 'الرد على بريد المشرف' },
  thesis: { en: 'Thesis — outline lit-review', tr: 'Tez — literatür taslağı', ar: 'الأطروحة — مخطط مراجعة الأدبيات' },
  groceries: { en: 'Groceries + pharmacy', tr: 'Market + eczane', ar: 'تسوّق + صيدلية' },
};

function notes(lang: Lang): Record<string, string> {
  const d = (n: number) => digits(n, lang);
  return {
    wird: { en: 'After Fajr · Ākhira', tr: 'Sabahtan sonra · Âhiret', ar: 'بعد الفجر · آخرة' }[lang],
    risale: { en: `15 min · Ākhira`, tr: `15 dk · Âhiret`, ar: `${d(15)} دقيقة · آخرة` }[lang],
    quran: { en: 'Ākhira · 30 min', tr: 'Âhiret · 30 dk', ar: `آخرة · ${d(30)} دقيقة` }[lang],
    muhasaba: { en: 'Reflect · 10 min', tr: 'Tefekkür · 10 dk', ar: `تفكّر · ${d(10)} دقائق` }[lang],
    email: { en: 'Admin · 5 min', tr: 'İdari · 5 dk', ar: `إداري · ${d(5)} دقائق` }[lang],
    thesis: { en: 'Deep work · goal · 90 min', tr: 'Derin çalışma · hedef · 90 dk', ar: `عمل عميق · هدف · ${d(90)} دقيقة` }[lang],
    groceries: { en: 'Chore · 30 min', tr: 'Ev işi · 30 dk', ar: `مهمة منزلية · ${d(30)} دقيقة` }[lang],
  };
}

/* ------------------------------------------------------------- item makers --- */

function prayer(key: PrayerKey, sortTime: string, status: Item['status']): Item {
  const window = (key === 'tahajjud' ? 'fajr' : key === 'witr' ? 'isha' : key) as Item['window'];
  return { id: `p_${key}`, title: key, category: 'prayer', day: TODAY, window, sortTime, urgency: 'today', energy: 'light', status, protected: true };
}

function tesbihat(key: PrayerKey, sortTime: string, status: Item['status']): Item {
  return { id: `t_${key}`, title: `${key} tesbihat`, category: 'tesbihat', day: TODAY, window: key as Item['window'], sortTime, urgency: 'today', energy: 'light', parentId: `p_${key}`, status };
}

interface TaskDef {
  id: string;
  cat: 'wird' | 'task' | 'errand';
  window: Item['window'];
  sortTime: string;
  status: Item['status'];
  energy: Item['energy'];
  urgency?: Item['urgency'];
  protected?: boolean;
  dueDate?: string;
}

function task(def: TaskDef, lang: Lang, N: Record<string, string>): Item {
  const key = def.id;
  return {
    id: `x_${def.id}`,
    title: g(TITLES[key], lang),
    category: def.cat,
    day: TODAY,
    window: def.window,
    sortTime: def.sortTime,
    urgency: def.urgency ?? 'today',
    energy: def.energy,
    note: N[key],
    status: def.status,
    protected: def.protected,
    dueDate: def.dueDate,
  };
}

/* ------------------------------------------------------------------ build --- */

export function buildSeed(lang: Lang): { items: Item[]; capturedIds: string[] } {
  const N = notes(lang);

  const prayers: Item[] = [
    prayer('tahajjud', NIGHT_TIMES.tahajjud, 'done'),
    prayer('fajr', PRAYER_TIMES.fajr, 'done'),
    prayer('dhuhr', PRAYER_TIMES.dhuhr, 'pending'),
    prayer('asr', PRAYER_TIMES.asr, 'pending'),
    prayer('maghrib', PRAYER_TIMES.maghrib, 'pending'),
    prayer('isha', PRAYER_TIMES.isha, 'pending'),
    prayer('witr', NIGHT_TIMES.witr, 'pending'),
  ];

  // Tesbihat for the five daily prayers (fajr done, rest pending).
  const tesbihats: Item[] = [
    tesbihat('fajr', '04:25', 'done'),
    tesbihat('dhuhr', '13:05', 'pending'),
    tesbihat('asr', '16:33', 'pending'),
    tesbihat('maghrib', '19:17', 'pending'),
    tesbihat('isha', '20:44', 'pending'),
  ];

  // Only the spiritual ākhira readings are seeded now — the worldly demo tasks
  // (email/thesis/groceries) were removed so Today starts clean.
  const taskDefs: TaskDef[] = [
    { id: 'wird', cat: 'wird', window: 'fajr', sortTime: '04:45', status: 'done', energy: 'light' },
    // Qurʾān (1 juz) sits in the Fajr block right after the morning wird — Risale-i Nur is hidden for now.
    { id: 'quran', cat: 'wird', window: 'fajr', sortTime: '05:10', status: 'pending', energy: 'light' },
    { id: 'muhasaba', cat: 'wird', window: 'isha', sortTime: '21:00', status: 'pending', energy: 'light' },
  ];
  const tasks = taskDefs.map((d) => task(d, lang, N));

  // Pre-scheduled Capture feed (other days).
  const feed = buildInitialFeed(TODAY, lang);
  const { items: feedItems } = flattenResponse({ summary: '', items: feed.items });

  return { items: [...prayers, ...tesbihats, ...tasks, ...feedItems], capturedIds: feed.ids };
}
