import { scheduledFields, captureTaskToItem, type Times } from './schedule';
import type { CaptureTask } from '../agent/captureContract';

const times: Times = { fajr: '03:51', dhuhr: '13:15', asr: '17:13', maghrib: '20:39', isha: '22:21' };

describe('scheduledFields', () => {
  it('uses windowBaseTime + 10min for sortTime when no exact time', () => {
    const f = scheduledFields({ date: '2026-07-22', window: 'dhuhr' }, times);
    expect(f.day).toBe('2026-07-22');
    expect(f.window).toBe('dhuhr');
    expect(f.time).toBeNull();
    expect(f.sortTime).toBe('13:25');
    expect(f.status).toBe('pending');
  });
  it('uses the exact time for sortTime when pinned', () => {
    const f = scheduledFields({ date: '2026-07-22', window: 'asr', time: '15:30' }, times);
    expect(f.time).toBe('15:30');
    expect(f.sortTime).toBe('15:30');
  });
  it('defaults window to anytime', () => {
    expect(scheduledFields({ date: '2026-07-22' }, times).window).toBe('anytime');
  });
});

describe('captureTaskToItem', () => {
  const task: CaptureTask = { title: '  Buy a bag ', area: 'errand', category: 'errand', urgency: 'soon', energy: 'light', timeContext: 'weekends or Wednesday' };
  it('files an unscheduled item (no day) with trimmed title + fields', () => {
    const it = captureTaskToItem(task, 'cap_1');
    expect(it.day).toBeUndefined();
    expect(it.title).toBe('Buy a bag');
    expect(it.area).toBe('errand');
    expect(it.category).toBe('errand');
    expect(it.timeContext).toBe('weekends or Wednesday');
    expect(it.status).toBe('pending');
  });
  it('merges a schedule when provided', () => {
    const sched = scheduledFields({ date: '2026-07-22', window: 'dhuhr' }, times);
    const it = captureTaskToItem(task, 'cap_1', sched);
    expect(it.day).toBe('2026-07-22');
    expect(it.window).toBe('dhuhr');
  });
});
