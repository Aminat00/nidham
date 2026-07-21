import { runCaptureAgent, isCaptureAgentConfigured } from './runCaptureAgent';
import type { CapturePayload } from './captureContract';

const ctx = {
  now: '2026-07-21T13:00:00+03:00', lang: 'en' as const,
  prayerTimes: { fajr: '03:51', dhuhr: '13:15', asr: '17:13', maghrib: '20:39', isha: '22:21' },
  existingItems: [],
};
const p = (capture: string): CapturePayload => ({ capture, context: ctx });

describe('runCaptureAgent (unconfigured → local fallback)', () => {
  it('reports not configured with no URL/KEY set', () => {
    expect(isCaptureAgentConfigured()).toBe(false);
  });
  it('classifies a plain capture as a task with a title', async () => {
    const r = await runCaptureAgent(p('call mom'));
    expect(r.kind).toBe('task');
    if (r.kind === 'task') {
      expect(r.task.title.length).toBeGreaterThan(0);
      expect(r.task.scheduleToday).toBe(false);
    }
  });
  it('flags an explicit "today" capture as scheduleToday', async () => {
    const r = await runCaptureAgent(p('call the bank today'));
    expect(r.kind === 'task' && r.task.scheduleToday).toBe(true);
  });
  it('routes a project-sized goal into the interview', async () => {
    const r = await runCaptureAgent(p('start a business'));
    expect(['ask', 'plan']).toContain(r.kind);
  });
});
