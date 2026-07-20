/**
 * White, thin-bordered, rounded surface (the design leans on hairline borders, not
 * heavy shadows). `accent` adds a 3px green leading edge — mirrored to the right
 * under RTL.
 */

import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { colors, radius as R } from '../theme/tokens';
import { startSide } from '../theme/rtl';
import { useI18n } from '../i18n/I18nContext';

export function Card({
  children,
  style,
  borderColor = colors.border2,
  radius = R.card,
  accent,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  borderColor?: string;
  radius?: number;
  accent?: boolean;
}) {
  const { isRTL } = useI18n();
  const accentEdge: ViewStyle = accent
    ? isRTL
      ? { borderRightWidth: 3, borderRightColor: colors.green }
      : { borderLeftWidth: 3, borderLeftColor: colors.green }
    : {};
  return <View style={[styles.card, { borderColor, borderRadius: radius }, accentEdge, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderWidth: 1 },
});
