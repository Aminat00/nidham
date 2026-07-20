/**
 * One row of the Today timeline: a left rail (with an optional node) and the row's
 * content. A single vertical spine is drawn as a child of the row wrapper — spanning
 * the FULL row height including its vertical padding — so consecutive rows join into
 * one unbroken line. The node sits on top and masks the spine where it lands. The
 * rail (and thus the spine) mirrors to the right under RTL.
 */

import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { colors } from '../theme/tokens';
import { row } from '../theme/rtl';
import { useI18n } from '../i18n/I18nContext';

const RAIL = 42;
const LINE_W = 1.5;

export function TimelineRow({
  node,
  isFirst,
  isLast,
  align = 'center',
  children,
}: {
  node?: React.ReactNode;
  isFirst?: boolean;
  isLast?: boolean;
  align?: ViewStyle['alignItems'];
  children: React.ReactNode;
}) {
  const { isRTL } = useI18n();
  // Center the spine on the rail, whichever side the rail is on.
  const edge = isRTL ? { right: RAIL / 2 - LINE_W / 2 } : { left: RAIL / 2 - LINE_W / 2 };
  return (
    <View style={styles.rowWrap}>
      <View
        pointerEvents="none"
        style={[styles.line, edge, { top: isFirst ? '50%' : 0, bottom: isLast ? '50%' : 0 }]}
      />
      <View style={[styles.row, { flexDirection: row(isRTL), alignItems: align }]}>
        <View style={styles.rail}>{node}</View>
        <View style={styles.content}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rowWrap: { paddingVertical: 13, position: 'relative' },
  line: { position: 'absolute', width: LINE_W, backgroundColor: colors.timeline },
  row: {},
  rail: { width: RAIL, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, justifyContent: 'center' },
});
