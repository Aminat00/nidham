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

const FALLBACK_STEPS: L3[] = [
  { en: 'List what it involves', tr: 'Neleri içerdiğini yaz', ar: 'اكتب ما يتضمنه' },
  { en: 'Message the first person', tr: 'İlk kişiye yaz', ar: 'راسل أول شخص' },
  { en: 'Set a date', tr: 'Bir tarih belirle', ar: 'حدّد تاريخاً' },
  { en: 'Prepare what’s needed', tr: 'Gerekenleri hazırla', ar: 'جهّز ما يلزم' },
];

/**
 * The pre-loaded Capture feed. Emptied — the demo sample captures (Berlin tickets,
 * plan-my-move, dentist) were removed so the app starts with a clean Tasks list.
 */
export function buildInitialFeed(_today: string, _lang: Lang): { items: RawItem[]; ids: string[] } {
  return { items: [], ids: [] };
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
