/**
 * Live RTL helpers. We do NOT use I18nManager.forceRTL (it needs an app reload and
 * is global) — the language toggle must flip direction instantly. Instead every row
 * reads `isRTL` and mirrors flex direction, text alignment and start/end edges.
 */

import type { FlexStyle, TextStyle } from 'react-native';

/** Row direction that visually reads left-to-right in the active language. */
export function row(isRTL: boolean): FlexStyle['flexDirection'] {
  return isRTL ? 'row-reverse' : 'row';
}

/** Text alignment for leading-aligned content. */
export function textStart(isRTL: boolean): TextStyle['textAlign'] {
  return isRTL ? 'right' : 'left';
}

/** Writing direction to pass to <Text> so bidi resolves correctly. */
export function writingDirection(isRTL: boolean): TextStyle['writingDirection'] {
  return isRTL ? 'rtl' : 'ltr';
}

/** Which physical side is the "start" (leading) edge. */
export function startSide(isRTL: boolean): 'left' | 'right' {
  return isRTL ? 'right' : 'left';
}

/** Which physical side is the "end" (trailing) edge. */
export function endSide(isRTL: boolean): 'left' | 'right' {
  return isRTL ? 'left' : 'right';
}
