/**
 * Deterministic, offline fallback for the Project agent — so the interview works with no
 * network and the demo can never break (same guarantee `buildFallback` gives the capture
 * agent).
 *
 * Behaviour: on the very first turn it asks ONE clarifying question; once the user has
 * answered, it emits a plausible generic three-phase plan (Clarify → Build → Ship) with
 * the goal as the title and the first step flagged `startHere`. Everything is localized.
 */

import type { Lang } from '../i18n/strings';
import type { ProjectPayload, ProjectPlan, ProjectTurn } from './projectContract';

type L3 = { en: string; tr: string; ar: string };
const g = (v: L3, lang: Lang) => v[lang];

const QUESTION: L3 = {
  en: 'Got it. What would “done” look like in the next 30 days?',
  tr: 'Anladım. Önümüzdeki 30 günde “bitti” neye benzerdi?',
  ar: 'فهمت. كيف سيبدو «الإنجاز» خلال الثلاثين يومًا القادمة؟',
};

const SUMMARY: L3 = {
  en: 'Here’s a plan — start with the first step.',
  tr: 'İşte bir plan — ilk adımla başla.',
  ar: 'إليك خطة — ابدأ بالخطوة الأولى.',
};

/** Generic 3-phase scaffold that fits almost any goal. */
const MILESTONES: Array<{ title: L3; steps: L3[] }> = [
  {
    title: { en: 'Get clear', tr: 'Netleş', ar: 'وضّح الهدف' },
    steps: [
      { en: 'Write the one-line goal', tr: 'Hedefi tek cümleyle yaz', ar: 'اكتب الهدف في جملة واحدة' },
      { en: 'List what “done” means', tr: '“Bitti” ne demek, listele', ar: 'اكتب ماذا يعني «الإنجاز»' },
    ],
  },
  {
    title: { en: 'Build the first version', tr: 'İlk sürümü yap', ar: 'ابنِ النسخة الأولى' },
    steps: [
      { en: 'Do the smallest first piece', tr: 'En küçük ilk parçayı yap', ar: 'أنجز أصغر جزء أولاً' },
      { en: 'Ask one person for feedback', tr: 'Bir kişiden geri bildirim al', ar: 'اطلب رأي شخص واحد' },
    ],
  },
  {
    title: { en: 'Ship & review', tr: 'Yayınla ve gözden geçir', ar: 'أطلق وراجِع' },
    steps: [
      { en: 'Share it with someone', tr: 'Biriyle paylaş', ar: 'شاركها مع أحد' },
      { en: 'Note what to improve', tr: 'Neyi geliştireceğini not al', ar: 'دوّن ما ستحسّنه' },
    ],
  },
];

/** Strip leading intent phrases and capitalize → a clean project title. */
function titleFromGoal(goal: string, lang: Lang): string {
  let t = goal.trim();
  if (lang === 'en') t = t.replace(/^(i\s+want\s+to|i'?d\s+like\s+to|i\s+need\s+to|let'?s|please|start|begin)\s+/i, '');
  t = t.trim();
  if (!t) return { en: 'New project', tr: 'Yeni proje', ar: 'مشروع جديد' }[lang];
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function buildPlan(goal: string, lang: Lang): ProjectPlan {
  return {
    title: titleFromGoal(goal, lang),
    milestones: MILESTONES.map((m) => ({
      title: g(m.title, lang),
      steps: m.steps.map((s) => ({ title: g(s, lang) })),
    })),
  };
}

export function fallbackProjectTurn(payload: ProjectPayload): ProjectTurn {
  const { conversation, context } = payload;
  const lang = context.lang;
  const userTurns = conversation.filter((c) => c.role === 'user');

  // First turn only (just the raw goal) → ask one clarifier.
  if (userTurns.length <= 1) {
    return { type: 'ask', question: g(QUESTION, lang) };
  }

  const goal = userTurns[0]?.text ?? '';
  const plan = buildPlan(goal, lang);
  // Flag the very first step as the one to start with.
  if (plan.milestones[0]?.steps[0]) plan.milestones[0].steps[0].startHere = true;

  return { type: 'plan', summary: g(SUMMARY, lang), project: plan };
}
