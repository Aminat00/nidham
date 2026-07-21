/**
 * Triage — the fast, offline, deterministic first pass on a raw capture.
 *
 * Decides three things with plain keyword heuristics (no network): is this a *task* or a
 * project-sized *goal*, which life `area` it belongs to, and whether the user asked for
 * it *today*. The real agent can refine this later; keeping it local means Capture always
 * works and the demo never waits on a model just to file a quick task.
 *
 * `area` is resolved by priority so overlapping words land predictably — e.g. "read
 * Qur’an" is spiritual, not self-dev; "buy groceries" is a chore, not a generic errand.
 */

import type { Area } from '../types/item';

export interface Triage {
  kind: 'task' | 'project';
  area: Area;
  /** The user explicitly asked for it today/tonight → schedule straight into Today. */
  scheduleToday: boolean;
}

/**
 * Words that signal a project-sized goal (vs a one-shot task). Kept conservative so
 * quick tasks ("book a flight", "buy groceries") don't get pulled into an interview —
 * e.g. we match "write a/my …" (write a book) but not the bare word "book".
 */
const PROJECT_SIGNALS =
  /\b(business|start[- ]?up|project|thesis|website|web ?app|app|brand|portfolio|wedding|company|launch|found a|start (a|my)|move (from|to|out)|relocat|build (a|an|my)|create (a|an|my)|write (a|an|my)|novel|screenplay|podcast|newsletter|marathon|album|campaign|plan (a|an|my)|organi[sz]e|renovat|remodel)\b/i;

/** Ordered area matchers — first hit wins, so spiritual/chore beat their overlaps. */
const AREA_RULES: Array<{ area: Area; re: RegExp }> = [
  { area: 'spiritual', re: /\b(qur['’]?an|quran|wird|dhikr|zikr|risale|du['’]?a|dua|pray|prayer|salah|namaz|tafsir|sunnah|tahajjud|adhkar)\b/i },
  { area: 'self-dev', re: /\b(read|reading|study|studying|learn|learning|course|practice|practise|gym|workout|work out|exercise|arabic|language|lesson|tutorial)\b/i },
  { area: 'chore', re: /\b(groceries|grocery|pharmacy|clean|cleaning|laundry|dishes|cook|cooking|trash|garbage|tidy|vacuum|chore|chores|dry[- ]cleaning)\b/i },
  { area: 'admin', re: /\b(email|e-mail|reply|invoice|bill|bills|pay|payment|renew|tax|taxes|bank|form|forms|appointment|insurance|passport|visa|document|register|registration|sign up for|advisor)\b/i },
  { area: 'errand', re: /\b(buy|shop|shopping|order|ticket|tickets|pick ?up|post office|package|parcel|return|drop ?off|collect)\b/i },
  { area: 'personal', re: /\b(call|message|text|ring|mom|mum|dad|aunt|uncle|friend|family|birthday|visit|wife|husband|kids|brother|sister|cousin)\b/i },
];

/** today / tonight in en, tr, ar. */
const TODAY_RE = /\btoday\b|\btonight\b|\bthis (morning|afternoon|evening|eve)\b|\bright now\b|\bbug[üu]n\b|\bbu ak[şs]am\b|اليوم|الليلة/i;

export function triageCapture(text: string): Triage {
  const t = text.trim();

  const kind: Triage['kind'] = PROJECT_SIGNALS.test(t) ? 'project' : 'task';
  const area: Area = kind === 'project' ? 'project' : (AREA_RULES.find((r) => r.re.test(t))?.area ?? 'personal');
  const scheduleToday = TODAY_RE.test(t);

  return { kind, area, scheduleToday };
}
