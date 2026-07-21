/**
 * Shared building blocks — badges, checkboxes, energy dots, step numbers and the
 * timeline node — styled verbatim from Nidham.dc.html.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, ff, fs, radius } from '../theme/tokens';
import { useI18n } from '../i18n/I18nContext';
import { digits } from '../i18n/strings';
import { CheckIcon } from './Icons';

/* -------------------------------------------------------------- badges ----- */

type BadgeTone = 'now' | 'nowStrip' | 'urgent' | 'project' | 'startHere' | 'deadline';

const BADGE: Record<BadgeTone, { bg: string; fg: string; fs: number; ph: number; pv: number; br: number }> = {
  now: { bg: colors.tint, fg: colors.green, fs: 9, ph: 7, pv: 2, br: 10 },
  nowStrip: { bg: colors.tint, fg: colors.green, fs: 10, ph: 9, pv: 5, br: radius.pill },
  urgent: { bg: colors.rust, fg: colors.white, fs: 8.5, ph: 6, pv: 2, br: 8 },
  project: { bg: colors.tint, fg: colors.green, fs: 9, ph: 8, pv: 3, br: 10 },
  startHere: { bg: colors.white, fg: colors.green, fs: 9, ph: 7, pv: 3, br: 8 },
  deadline: { bg: colors.micBg, fg: colors.muted, fs: 9.5, ph: 7, pv: 2, br: 8 },
};

export function Badge({ label, tone }: { label: string; tone: BadgeTone }) {
  const b = BADGE[tone];
  const heavy = tone !== 'deadline';
  return (
    <View style={[styles.badge, { backgroundColor: b.bg, paddingHorizontal: b.ph, paddingVertical: b.pv, borderRadius: b.br }]}>
      <Text style={{ color: b.fg, fontSize: b.fs, fontFamily: ff(heavy ? '700' : '600'), letterSpacing: 0.4 }}>{label}</Text>
    </View>
  );
}

/* ------------------------------------------------------------ checkbox ----- */

export function CheckBox({ checked, onPress, size = 18 }: { checked: boolean; onPress?: () => void; size?: number }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={9}
      style={[
        styles.checkbox,
        { width: size, height: size, borderRadius: size >= 19 ? 6 : 5 },
        checked ? styles.checkboxOn : styles.checkboxOff,
      ]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
    >
      {checked && <CheckIcon size={size * 0.6} color={colors.white} />}
    </Pressable>
  );
}

/* ---------------------------------------------------------- energy dot ----- */

/** Deep = green dot with a tint ring; light = small sage dot. */
export function EnergyDot({ deep, feed }: { deep?: boolean; feed?: boolean }) {
  if (deep) {
    const ring = feed ? 4 : 3;
    const dot = feed ? 10 : 9;
    return (
      <View style={{ width: dot + ring * 2, height: dot + ring * 2, borderRadius: (dot + ring * 2) / 2, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: dot, height: dot, borderRadius: dot / 2, backgroundColor: colors.green }} />
      </View>
    );
  }
  const s = feed ? 8 : 7;
  return <View style={{ width: s, height: s, borderRadius: s / 2, backgroundColor: colors.energyLight }} />;
}

/** Small solid dot preceding an ākhira reading row. */
export function Dot({ color = colors.green }: { color?: string }) {
  return <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: color }} />;
}

/* ---------------------------------------------------------- step number ---- */

export function StepNum({ n, first }: { n: number; first?: boolean }) {
  const { lang } = useI18n();
  return (
    <View style={[styles.stepNum, first ? styles.stepNumFirst : styles.stepNumRest]}>
      <Text style={{ fontSize: fs(11), fontFamily: ff('700'), color: first ? colors.white : colors.muted }}>{digits(n, lang)}</Text>
    </View>
  );
}

/* ------------------------------------------------------------ timeline ----- */

export const NODE_SIZE = 30;

export function TimelineNode({ status }: { status: 'done' | 'now' | 'upcoming' }) {
  const style: ViewStyle =
    status === 'done'
      ? { backgroundColor: colors.green, borderColor: colors.green }
      : status === 'now'
        ? { backgroundColor: colors.white, borderColor: colors.green }
        : { backgroundColor: colors.nodeUpBg, borderColor: colors.nodeUpBorder };
  return (
    <View style={[styles.node, style]}>
      {status === 'done' && <CheckIcon size={11} color={colors.white} />}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  checkbox: { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  checkboxOn: { backgroundColor: colors.green, borderColor: colors.green },
  checkboxOff: { backgroundColor: colors.white, borderColor: colors.checkBorder },
  stepNum: { width: 20, height: 20, borderRadius: radius.badge, alignItems: 'center', justifyContent: 'center' },
  stepNumFirst: { backgroundColor: colors.green },
  stepNumRest: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  node: { width: NODE_SIZE, height: NODE_SIZE, borderRadius: NODE_SIZE / 2, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
