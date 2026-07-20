import type { ProjectPayload } from './projectContract';
import { runProjectAgent, isProjectAgentConfigured } from './runProjectAgent';

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
