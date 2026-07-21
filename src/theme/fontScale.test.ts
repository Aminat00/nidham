import { scaleFont, NATIVE_FONT_SCALE } from './fontScale';

describe('scaleFont', () => {
  it('leaves web sizes untouched (design surface stays pixel-matched)', () => {
    expect(scaleFont(16, true)).toBe(16);
    expect(scaleFont(14.5, true)).toBe(14.5);
  });

  it('scales native sizes up and snaps to the nearest 0.5', () => {
    expect(NATIVE_FONT_SCALE).toBeGreaterThan(1);
    expect(scaleFont(16, false)).toBe(17.5); // 16 * 1.08 = 17.28 -> 17.5
    expect(scaleFont(10, false)).toBe(11);   // 10 * 1.08 = 10.8  -> 11
  });
});
