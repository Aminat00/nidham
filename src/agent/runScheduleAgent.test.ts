import { runScheduleAgent, isScheduleAgentConfigured } from './runScheduleAgent';
import type { SchedulePayload } from './scheduleContract';

const payload: SchedulePayload = {
  subtasks: [
    { id: 'a', title: 'Deep', energy: 'deep' },
    { id: 'b', title: 'Admin', energy: 'admin' },
  ],
  spread: true, // project batch → both placed by the fallback
  context: {
    now: '2026-07-21T09:00:00+03:00', lang: 'en',
    prayerTimes: { fajr: '03:51', dhuhr: '13:15', asr: '17:13', maghrib: '20:39', isha: '22:21' },
    existingItems: [],
  },
};

describe('runScheduleAgent (unconfigured → local fallback)', () => {
  it('reports not configured with no URL/KEY', () => {
    expect(isScheduleAgentConfigured()).toBe(false);
  });
  it('returns placements for every subtask, echoing ids, without throwing', async () => {
    const { placements } = await runScheduleAgent(payload);
    expect(placements.map((p) => p.subtaskId).sort()).toEqual(['a', 'b']);
    expect(placements[0].day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
