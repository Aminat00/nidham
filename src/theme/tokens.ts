/**
 * Design tokens — extracted verbatim from the Claude Design source (Nidham.dc.html).
 * This is the source of truth for palette, type and shape. Calm, warm, low-contrast.
 */

import { Platform, TextStyle, ViewStyle } from 'react-native';
import { scaleFont } from './fontScale';

export const colors = {
  cream: '#F5F2EB', // app / screen background
  card: '#FFFFFF',
  cardAlt: '#FBF8F1', // non-first step rows
  green: '#2D5A4A', // primary — nodes, avatar, send, badges, step-1
  tint: '#E6EFEA', // green tint — chips, badges, time badge, schedule chip
  ink: '#1C1A16', // titles
  muted: '#8A8275', // subtitles, meta, secondary time
  muted2: '#A39C8E', // fainter meta / inactive nav
  faint: '#B4ADA0', // Arabic secondary, fainter meta
  slate: '#79746B', // upcoming prayer name
  slate2: '#6B6458', // thinking label, step text
  rust: '#C0553F', // "urgent" pill only
  border: '#E4DECF', // card borders, dunya card
  border2: '#ECE7DC', // now-strip, feed cards
  hairline: '#EDE8DD', // prayer / akhira row bottom borders
  hairline2: '#F4F0E6', // dunya card inner row borders
  timeline: '#E8E3D7', // the vertical spine
  tesBorder: '#E6F0EA', // tesbihat card border
  micBg: '#F0ECE2', // mic button bg
  energyLight: '#C4D3C9', // light energy dot
  nodeUpBg: '#F5F2EB',
  nodeUpBorder: '#DDD7CA',
  nodeUpGlyph: '#C2BBAE',
  checkBorder: '#CFC9BC', // unchecked checkbox border
  white: '#FFFFFF',
} as const;

export const space = {
  screen: 18, // screen horizontal padding
  card: 15,
  gap: 12,
  gapSm: 10,
  gapXs: 7,
} as const;

export const radius = {
  card: 16,
  cardLg: 22, // dump box
  inner: 13,
  chip: 11,
  pill: 20,
  badge: 6,
} as const;

/* ------------------------------------------------------------------ fonts --- */

/**
 * Latin/Turkish → Hanken Grotesk. Arabic → Amiri. Amiri only ships Regular + Bold, so
 * weights map onto those. Custom fonts don't synthesize weight, so each weight is its
 * own pair.
 *
 * `ff(weight)` renders the right family per platform:
 * - **Web:** a font *stack* (`Hanken, Amiri`) — browsers do per-glyph fallback, so Latin
 *   renders in Hanken and any Arabic in Amiri within the same run.
 * - **Native:** RN accepts only ONE family name (a comma list silently falls back to the
 *   system font), so we return Hanken alone. iOS/Android still render Arabic glyphs via
 *   their own system fallback, and explicit Arabic flourishes use `amiri()` directly.
 */
const HANKEN = {
  '400': 'HankenGrotesk_400Regular',
  '500': 'HankenGrotesk_500Medium',
  '600': 'HankenGrotesk_600SemiBold',
  '700': 'HankenGrotesk_700Bold',
  '800': 'HankenGrotesk_800ExtraBold',
} as const;

export type Weight = keyof typeof HANKEN;

const amiriFor = (w: Weight): string => (w === '400' || w === '500' ? 'Amiri_400Regular' : 'Amiri_700Bold');

/** Latin (Hanken); web adds an Amiri fallback in the same run (native can't). */
export const ff = (weight: Weight = '400'): string =>
  Platform.OS === 'web' ? `${HANKEN[weight]}, ${amiriFor(weight)}` : HANKEN[weight];

/** Amiri directly — for Arabic-script flourishes (نِظام, الظهر, تسبيحات, ي). */
export const amiri = (bold = false): string => (bold ? 'Amiri_700Bold' : 'Amiri_400Regular');

/** Font size, scaled up on native only (web = design surface, unscaled). */
export const fs = (size: number): number => scaleFont(size, Platform.OS === 'web');

/** Families to preload (see App.tsx useFonts). */
export const FONT_MAP = {
  HankenGrotesk_400Regular: require('@expo-google-fonts/hanken-grotesk/400Regular/HankenGrotesk_400Regular.ttf'),
  HankenGrotesk_500Medium: require('@expo-google-fonts/hanken-grotesk/500Medium/HankenGrotesk_500Medium.ttf'),
  HankenGrotesk_600SemiBold: require('@expo-google-fonts/hanken-grotesk/600SemiBold/HankenGrotesk_600SemiBold.ttf'),
  HankenGrotesk_700Bold: require('@expo-google-fonts/hanken-grotesk/700Bold/HankenGrotesk_700Bold.ttf'),
  HankenGrotesk_800ExtraBold: require('@expo-google-fonts/hanken-grotesk/800ExtraBold/HankenGrotesk_800ExtraBold.ttf'),
  Amiri_400Regular: require('@expo-google-fonts/amiri/400Regular/Amiri_400Regular.ttf'),
  Amiri_700Bold: require('@expo-google-fonts/amiri/700Bold/Amiri_700Bold.ttf'),
};

/* ------------------------------------------------------------------- type --- */

export const type = {
  screenTitle: { fontSize: fs(22), fontFamily: ff('700'), color: colors.ink, letterSpacing: -0.3 } as TextStyle,
  greeting: { fontSize: fs(21), fontFamily: ff('700'), color: colors.ink, letterSpacing: -0.2 } as TextStyle,
  cardTitle: { fontSize: fs(14.5), fontFamily: ff('700'), color: colors.ink } as TextStyle,
  body: { fontSize: fs(13), fontFamily: ff('600'), color: colors.ink } as TextStyle,
  meta: { fontSize: fs(12), fontFamily: ff('500'), color: colors.muted } as TextStyle,
  label: { fontSize: fs(10), fontFamily: ff('600'), color: colors.muted2, letterSpacing: 0.6 } as TextStyle,
  pill: { fontSize: fs(12), fontFamily: ff('700') } as TextStyle,
  time: { fontSize: fs(12), fontFamily: ff('600'), color: colors.muted } as TextStyle,
} as const;

/* ----------------------------------------------------------------- shadow --- */

export const softShadow: ViewStyle = Platform.select({
  ios: { shadowColor: '#1C1A16', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 20 },
  android: { elevation: 2 },
  default: {},
}) as ViewStyle;

export const softShadowSm: ViewStyle = Platform.select({
  ios: { shadowColor: '#1C1A16', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10 },
  android: { elevation: 1 },
  default: {},
}) as ViewStyle;

export const ACCENT_BAR_WIDTH = 3;
