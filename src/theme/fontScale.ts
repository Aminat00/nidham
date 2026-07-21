/**
 * Native-only type scale. The web preview IS the design surface (pixel-matched to
 * Nidham.dc.html), so web sizes pass through unchanged; native bumps ~8% for
 * on-device legibility (tested on iPhone 14). Kept RN-free so it unit-tests in node.
 */
export const NATIVE_FONT_SCALE = 1.08;

export function scaleFont(size: number, isWeb: boolean): number {
  if (isWeb) return size;
  return Math.round(size * NATIVE_FONT_SCALE * 2) / 2; // snap to nearest 0.5
}
