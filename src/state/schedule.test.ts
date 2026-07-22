import { scheduledFields, captureTaskToItem, localSchedule, parseDayHint, parseExactTime, windowForTime, type Times } from './schedule';
import type { CaptureTask } from '../agent/captureContract';
import type { SchedulableSubtask } from '../agent/scheduleContract';

describe('parseExactTime', () => {
  it('parses am/pm (wins over a bare 24h match)', () => {
    expect(parseExactTime('call at 3pm')).toBe('15:00');
    expect(parseExactTime('meet 3:30 pm')).toBe('15:30');
    expect(parseExactTime('gym 9am')).toBe('09:00');
    expect(parseExactTime('12am')).toBe('00:00');
    expect(parseExactTime('12pm')).toBe('12:00');
  });
  it('parses a 24h HH:mm', () => {
    expect(parseExactTime('standup 14:30')).toBe('14:30');
  });
  it('returns null when there is no time (and ignores false positives like "amazing")', () => {
    expect(parseExactTime('call mom')).toBeNull();
    expect(parseExactTime('3 amazing ideas')).toBeNull();
    expect(parseExactTime(undefined)).toBeNull();
  });
});

describe('windowForTime', () => {
  const t: Times = { fajr: '03:51', dhuhr: '13:15', asr: '17:13', maghrib: '20:39', isha: '22:21' };
  it('maps a clock time to the prayer window it falls in', () => {
    expect(windowForTime('15:00', t)).toBe('dhuhr'); // after Dhuhr, before Asr
    expect(windowForTime('18:00', t)).toBe('asr');
    expect(windowForTime('02:00', t)).toBe('anytime'); // before Fajr
  });
});

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

const NOW = '2026-07-21T09:00:00+03:00'; // 2026-07-21 is a Tuesday (real calendar)
const ctx = (existing: Array<{ day?: string | null }> = []) => ({
  now: NOW, lang: 'en' as const,
  prayerTimes: { fajr: '03:51', dhuhr: '13:15', asr: '17:13', maghrib: '20:39', isha: '22:21' },
  existingItems: existing.map((e, i) => ({ id: 'e' + i, title: 't', window: 'anytime', day: e.day })),
});
const subs = (n: number, extra: Partial<SchedulableSubtask> = {}): SchedulableSubtask[] =>
  Array.from({ length: n }, (_, i) => ({ id: 's' + i, title: 'sub' + i, ...extra }));

describe('parseDayHint', () => {
  it('resolves a weekday name to the nearest such day (today or later)', () => {
    expect(parseDayHint('go Wednesday', '2026-07-21')).toBe('2026-07-22'); // Tue → Wed
  });
  it('handles tomorrow / weekend / today, and null when no hint', () => {
    expect(parseDayHint('tomorrow', '2026-07-21')).toBe('2026-07-22');
    expect(parseDayHint('on weekends', '2026-07-21')).toBe('2026-07-25'); // Saturday
    expect(parseDayHint('today please', '2026-07-21')).toBe('2026-07-21');
    expect(parseDayHint('buy a bag', '2026-07-21')).toBeNull();
    expect(parseDayHint(undefined, '2026-07-21')).toBeNull();
  });
});

describe('localSchedule — spread (project batch)', () => {
  it('fills a day to the load cap (3) then moves to the next day', () => {
    const p = localSchedule(subs(5), ctx(), true);
    expect(p.map((x) => x.day)).toEqual(['2026-07-21', '2026-07-21', '2026-07-21', '2026-07-22', '2026-07-22']);
  });
  it('deep → morning, light → anytime; skips full existing days; caps at the horizon', () => {
    expect(localSchedule(subs(1, { energy: 'deep' }), ctx(), true)[0].window).toBe('morning');
    expect(localSchedule(subs(1, { energy: 'light' }), ctx(), true)[0].window).toBe('anytime');
    const full = ctx([{ day: '2026-07-21' }, { day: '2026-07-21' }, { day: '2026-07-21' }]);
    expect(localSchedule(subs(1), full, true)[0].day).toBe('2026-07-22');
    expect(localSchedule(subs(30), ctx(), true).length).toBe(21); // 7 days * 3
  });
});

describe('localSchedule — on-signal (loose)', () => {
  it('places urgency today → today, a weekday hint → that day, and omits no-signal items', () => {
    const p = localSchedule(
      [
        { id: 'a', title: 'urgent', urgency: 'today' },
        { id: 'b', title: 'bag', timeContext: 'Wednesday or weekends' },
        { id: 'c', title: 'someday', urgency: 'someday' },
      ],
      ctx(),
      false,
    );
    expect(p.find((x) => x.subtaskId === 'a')?.day).toBe('2026-07-21');
    expect(p.find((x) => x.subtaskId === 'b')?.day).toBe('2026-07-22'); // next Wednesday
    expect(p.find((x) => x.subtaskId === 'c')).toBeUndefined(); // omitted (no signal)
  });
  it('pulls an exact clock time out of the hint (day + time + matching window)', () => {
    const p = localSchedule([{ id: 'd', title: 'dentist', timeContext: 'Wednesday at 3pm' }], ctx(), false);
    const d = p.find((x) => x.subtaskId === 'd');
    expect(d?.day).toBe('2026-07-22'); // next Wednesday
    expect(d?.time).toBe('15:00');     // 3pm
    expect(d?.window).toBe('dhuhr');   // 15:00 falls in the Dhuhr window
  });
});
