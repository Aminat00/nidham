/**
 * Capture-feed data + the runAgent fallback, from Nidham.dc.html.
 *
 * INITIAL_FEED — the three "already scheduled" cards pre-loaded in Just-captured
 * (Buy train tickets, Plan my move → project, Call the dentist).
 *
 * buildFallback — mirrors the design's addCapture heuristic: one raw brain-dump →
 * one scheduled Item (a project with generic steps if it reads like one, else a
 * task). Returned by runAgent whenever the real agent is unconfigured or fails, so
 * a broken call never breaks the demo.
 */

import type { AgentResponse, Item, RawItem } from '../types/item';
import type { Lang } from '../i18n/strings';
import { addDays } from '../utils/dates';

type L3 = { en: string; tr: string; ar: string };
const pick = (v: L3, lang: Lang) => v[lang];

const T = {
  tickets: { en: 'Buy train tickets to Berlin', tr: 'Berlin’e tren bileti al', ar: 'شراء تذاكر قطار إلى برلين' },
  move: { en: 'Plan my move from Poland', tr: 'Polonya’dan taşınmamı planla', ar: 'خطّط انتقالي من بولندا' },
  dentist: { en: 'Call the dentist', tr: 'Dişçiyi ara', ar: 'اتصل بطبيب الأسنان' },
  step1: { en: 'List what to bring', tr: 'Getirilecekleri listele', ar: 'اكتب ما ستحضره' },
  step2: { en: 'Message my brother', tr: 'Kardeşime yaz', ar: 'راسل أخي' },
  step3: { en: 'Get 3 courier quotes', tr: '3 kargo teklifi al', ar: 'احصل على ٣ عروض شحن' },
} as const;

const FALLBACK_STEPS: L3[] = [
  { en: 'List what it involves', tr: 'Neleri içerdiğini yaz', ar: 'اكتب ما يتضمنه' },
  { en: 'Message the first person', tr: 'İlk kişiye yaz', ar: 'راسل أول شخص' },
  { en: 'Set a date', tr: 'Bir tarih belirle', ar: 'حدّد تاريخاً' },
  { en: 'Prepare what’s needed', tr: 'Gerekenleri hazırla', ar: 'جهّز ما يلزم' },
];

/** The three pre-loaded feed items, in feed order (newest first at the top). */
export function buildInitialFeed(today: string, lang: Lang): { items: RawItem[]; ids: string[] } {
  const items: RawItem[] = [
    {
      id: 'f_tickets',
      title: pick(T.tickets, lang),
      category: 'errand',
      day: addDays(today, 3), // Sat
      window: 'afternoon',
      sortTime: '15:00',
      urgency: 'soon',
      energy: 'light',
      status: 'pending',
    },
    {
      id: 'f_move',
      title: pick(T.move, lang),
      category: 'project',
      day: addDays(today, 1), // Thu → next wk
      dueDate: addDays(today, 8),
      window: 'anytime',
      sortTime: '10:00',
      urgency: 'soon',
      energy: 'deep',
      status: 'pending',
      steps: [
        { id: 'f_move_a', title: pick(T.step1, lang), parentId: 'f_move', category: 'step', startHere: true },
        { id: 'f_move_b', title: pick(T.step2, lang), parentId: 'f_move', category: 'step' },
        { id: 'f_move_c', title: pick(T.step3, lang), parentId: 'f_move', category: 'step' },
      ],
    },
    {
      id: 'f_dentist',
      title: pick(T.dentist, lang),
      category: 'errand',
      day: addDays(today, 1), // Tomorrow, after Dhuhr
      window: 'dhuhr',
      sortTime: '13:20',
      urgency: 'soon',
      energy: 'light',
      status: 'pending',
    },
  ];
  return { items, ids: items.map((i) => i.id) };
}

const PROJECT_RE = /poland|move|apply|research|trip|project|organi|wedding|flat|find a|plan /i;

/**
 * One brain-dump → one scheduled Item. Projects (by keyword or length) get generic
 * steps with the first flagged start-here. Deterministic id from a caller-supplied
 * seed so re-captures don't collide.
 */
export function buildFallback(text: string, lang: Lang, today: string, seed: string): AgentResponse {
  const trimmed = text.trim();
  const isProject = PROJECT_RE.test(trimmed) || trimmed.length > 34;
  const id = 'cap_' + seed;

  const item: RawItem = {
    id,
    title: trimmed,
    category: isProject ? 'project' : 'task',
    day: addDays(today, 3), // "Sat afternoon", as in the design
    window: 'afternoon',
    sortTime: '15:00',
    urgency: 'soon',
    energy: isProject ? 'deep' : 'light',
    status: 'pending',
    ...(isProject
      ? {
          dueDate: addDays(today, 8),
          steps: FALLBACK_STEPS.map((s, i) => ({
            id: `${id}_s${i}`,
            title: pick(s, lang),
            parentId: id,
            category: 'step' as const,
            startHere: i === 0,
          })),
        }
      : {}),
  };

  const summary =
    lang === 'ar'
      ? 'التُقط وجُدوِل حول صلواتك.'
      : lang === 'tr'
        ? 'Yakalandı — namazlarının etrafına planlandı.'
        : 'Captured — scheduled around your prayers.';

  return { summary, items: [item] };
}

/** Raw dump string the mic "dictates" for the demo. */
export const SAMPLE_CAPTURE = 'plan my move from poland — it is a whole thing';
