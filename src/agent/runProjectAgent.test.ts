import type { ProjectPayload } from './projectContract';
import { runProjectAgent, isProjectAgentConfigured, normalize } from './runProjectAgent';

const PLAN = {
  type: 'plan',
  summary: 'Here is a plan',
  project: { title: 'Learn Arabic', milestones: [{ title: 'Basics', steps: [{ title: 'Alphabet' }] }] },
};
const ASK = { type: 'ask', question: 'What does done look like?' };

describe('normalize — n8n AI Agent output shapes', () => {
  it('accepts a plain turn object', () => {
    expect(normalize(ASK)?.type).toBe('ask');
    expect(normalize(PLAN)?.type).toBe('plan');
  });
  it('accepts a JSON string (n8n default when output-format is off)', () => {
    expect(normalize(JSON.stringify(PLAN))?.type).toBe('plan');
  });
  it('accepts an { output: <stringified JSON> } envelope — the real failing case', () => {
    expect(normalize({ output: JSON.stringify(PLAN) })?.type).toBe('plan');
    expect(normalize({ output: JSON.stringify(ASK) })?.type).toBe('ask');
  });
  it('accepts an { output: <object> } envelope', () => {
    expect(normalize({ output: PLAN })?.type).toBe('plan');
  });
  it('strips a ```json code fence', () => {
    expect(normalize('```json\n' + JSON.stringify(PLAN) + '\n```')?.type).toBe('plan');
  });
  it('unwraps an array', () => {
    expect(normalize([{ output: PLAN }])?.type).toBe('plan');
  });
  it('accepts the real n8n payload — [{ output: <stringified ask> }]', () => {
    const real = [
      { output: '{"type":"ask","question":"Got it — sounds like you\'re researching Tonguç Akademi. Which grade(s)?"}' },
    ];
    const turn = normalize(real);
    expect(turn?.type).toBe('ask');
    if (turn?.type === 'ask') expect(turn.question).toContain('Tonguç');
  });
  it('accepts prose BEFORE the JSON — the real "Good — the research confirms… {json}" case', () => {
    const real = [
      { output: 'Good — the research confirms this is a real niche. Let me ask.\n\n{"type":"ask","question":"Which platform?"}' },
    ];
    const turn = normalize(real);
    expect(turn?.type).toBe('ask');
    if (turn?.type === 'ask') expect(turn.question).toBe('Which platform?');
  });
  it('rejects prose / non-JSON / empty', () => {
    expect(normalize('Got it. What would done look like?')).toBeNull();
    expect(normalize({ output: 'just some text' })).toBeNull();
    expect(normalize('')).toBeNull();
    expect(normalize(null)).toBeNull();
  });
});

const payload: ProjectPayload = {
  conversation: [{ role: 'user', text: 'start a business' }],
  context: {
    now: '2026-07-21T13:00:00+03:00',
    lang: 'en',
    prayerTimes: { fajr: '03:51', dhuhr: '13:15', asr: '17:13', maghrib: '20:39', isha: '22:21' },
    existingItems: [],
  },
};

describe('runProjectAgent (unconfigured)', () => {
  it('reports not configured when no URL/KEY is set', () => {
    expect(isProjectAgentConfigured()).toBe(false);
  });

  it('falls back to a valid turn instead of throwing', async () => {
    const turn = await runProjectAgent(payload);
    expect(['ask', 'plan']).toContain(turn.type);
  });
});
