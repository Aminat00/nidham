import { collapseRepeats } from './transcribe';

describe('collapseRepeats (Whisper silence-loop guard)', () => {
  it('collapses a token repeated 3+ times', () => {
    expect(collapseRepeats('5 5 5 5')).toBe('5');
    expect(collapseRepeats('okay okay okay okay okay')).toBe('okay');
  });

  it('collapses a short phrase repeated 3+ times (space or comma separated)', () => {
    expect(collapseRepeats('1 2 3 4 5 1 2 3 4 5 1 2 3 4 5')).toBe('1 2 3 4 5');
    expect(collapseRepeats('thank you, thank you, thank you')).toBe('thank you');
  });

  it('leaves genuine short repeats and normal text alone', () => {
    expect(collapseRepeats('very very good')).toBe('very very good'); // only doubled
    expect(collapseRepeats('call my aunt about the trip')).toBe('call my aunt about the trip');
    expect(collapseRepeats('')).toBe('');
  });
});
