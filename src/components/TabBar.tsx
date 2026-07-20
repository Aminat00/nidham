/**
 * Bottom tab bar — Today · Capture only (the design's v1 nav; no other tabs, no
 * center FAB). A bar with a hairline top border. Styled from Nidham.dc.html.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, ff } from '../theme/tokens';
import { row } from '../theme/rtl';
import { useI18n } from '../i18n/I18nContext';
import { SunIcon, MicNavIcon } from './Icons';

export type ScreenName = 'today' | 'capture';

function Tab({ label, active, icon, onPress }: { label: string; active: boolean; icon: (c: string) => React.ReactNode; onPress: () => void }) {
  const color = active ? colors.green : colors.muted2;
  return (
    <Pressable style={styles.tab} onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: active }}>
      {icon(color)}
      <Text style={[styles.label, { color }]}>{label}</Text>
    </Pressable>
  );
}

export function TabBar({ screen, onNavigate }: { screen: ScreenName; onNavigate: (s: ScreenName) => void }) {
  const { strings, isRTL } = useI18n();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { flexDirection: row(isRTL), paddingBottom: Math.max(insets.bottom, 10) }]}>
      <Tab label={strings.navToday} active={screen === 'today'} icon={(c) => <SunIcon color={c} />} onPress={() => onNavigate('today')} />
      <Tab label={strings.navCapture} active={screen === 'capture'} icon={(c) => <MicNavIcon color={c} />} onPress={() => onNavigate('capture')} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    paddingTop: 11,
    paddingHorizontal: 46,
    backgroundColor: colors.cream,
    borderTopWidth: 1,
    borderTopColor: colors.timeline,
  },
  tab: { flex: 1, alignItems: 'center', gap: 5 },
  label: { fontSize: 10, fontFamily: ff('600') },
});
