import type { ProjectPayload } from './projectContract';
import { fallbackProjectTurn } from './projectFallback';

const ctx = (lang: 'en' | 'tr' | 'ar'): ProjectPayload['context'] => ({
  now: '2026-07-21T13:00:00+03:00',
  lang,
  prayerTimes: { fajr: '03:51', dhuhr: '13:15', asr: '17:13', maghrib: '20:39', isha: '22:21' },
  existingItems: [],
});

const goal = (text: string): ProjectPayload['conversation'] => [{ role: 'user', text }];

describe('fallbackProjectTurn', () => {
  it('asks one clarifying question on the first turn', () => {
    const turn = fallbackProjectTurn({ conversation: goal('start a business'), context: ctx('en') });
    expect(turn.type).toBe('ask');
    if (turn.type === 'ask') expect(turn.question.length).toBeGreaterThan(0);
  });

  it('produces a plan once the user has answered', () => {
    const convo: ProjectPayload['conversation'] = [
      { role: 'user', text: 'start a solo AI business' },
      { role: 'agent', text: 'What would done look like?' },
      { role: 'user', text: 'one paying customer in 30 days' },
    ];
    const turn = fallbackProjectTurn({ conversation: convo, context: ctx('en') });
    expect(turn.type).toBe('plan');
    if (turn.type === 'plan') {
      expect(turn.summary.length).toBeGreaterThan(0);
      expect(turn.project.milestones.length).toBeGreaterThanOrEqual(2);
      expect(turn.project.milestones.every((m) => m.steps.length >= 1)).toBe(true);
      const startHeres = turn.project.milestones.flatMap((m) => m.steps).filter((s) => s.startHere);
      expect(startHeres).toHaveLength(1);
      expect(turn.project.title.length).toBeGreaterThan(0);
    }
  });

  it('is localized (Arabic question contains Arabic script)', () => {
    const turn = fallbackProjectTurn({ conversation: goal('ابدأ مشروعًا'), context: ctx('ar') });
    expect(turn.type).toBe('ask');
    if (turn.type === 'ask') expect(/[؀-ۿ]/.test(turn.question)).toBe(true);
  });

  it('always returns a valid turn, even for an empty conversation', () => {
    const turn = fallbackProjectTurn({ conversation: [], context: ctx('tr') });
    expect(['ask', 'plan']).toContain(turn.type);
  });
});
