import { triageCapture } from './triage';

describe('triageCapture — kind', () => {
  it('flags a project when there is a project signal', () => {
    expect(triageCapture('I want to start a solo AI business').kind).toBe('project');
    expect(triageCapture('plan my move from Poland').kind).toBe('project');
    expect(triageCapture('build a portfolio website').kind).toBe('project');
  });

  it('does NOT flag a long-but-chatty task as a project', () => {
    // 40+ chars, but no project signal → still a task (the old length heuristic mis-fired here).
    expect(triageCapture("call my aunt I haven't talked to in ages").kind).toBe('task');
  });
});

describe('triageCapture — area', () => {
  const area = (t: string) => triageCapture(t).area;

  it('classifies projects into the project bucket', () => {
    expect(area('start a business')).toBe('project');
  });
  it('spiritual wins over self-dev when both could match', () => {
    expect(area('read Qur’an and make dua')).toBe('spiritual');
  });
  it('self-dev for learning/reading', () => {
    expect(area('study Arabic for 20 min')).toBe('self-dev');
  });
  it('chore for household errands, even when phrased as "buy"', () => {
    expect(area('buy groceries and pharmacy')).toBe('chore');
  });
  it('admin for paperwork', () => {
    expect(area('reply to advisor email')).toBe('admin');
    expect(area('renew my ID')).toBe('admin');
  });
  it('errand for generic shopping', () => {
    expect(area('buy a new laptop charger')).toBe('errand');
  });
  it('personal as the friendly default', () => {
    expect(area('call my aunt')).toBe('personal');
    expect(area('do the thing')).toBe('personal');
  });
});

describe('triageCapture — scheduleToday', () => {
  const today = (t: string) => triageCapture(t).scheduleToday;
  it('detects an explicit today/tonight (en/tr/ar)', () => {
    expect(today('call the dentist today')).toBe(true);
    expect(today('finish this tonight')).toBe(true);
    expect(today('dişçiyi bugün ara')).toBe(true);
    expect(today('اتصل اليوم بالطبيب')).toBe(true);
  });
  it('is false when no day is mentioned', () => {
    expect(today('call my aunt')).toBe(false);
  });
});
