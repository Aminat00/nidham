/**
 * Bottom tab bar — Today · [center mic] · Tasks. The center mic is a raised filled
 * forest circle: the universal "talk to Nidham" button (opens Capture). Two flat tabs
 * flank it. A hairline top border; styled from Nidham.dc.html. RTL-aware.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, ff, fs } from '../theme/tokens';
import { row } from '../theme/rtl';
import { useI18n } from '../i18n/I18nContext';
import { SunIcon, ListIcon, MicIcon } from './Icons';

export type ScreenName = 'today' | 'capture' | 'tasks';

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

      <Pressable
        style={styles.micWrap}
        onPress={() => onNavigate('capture')}
        accessibilityRole="button"
        accessibilityLabel={strings.capTitle}
        accessibilityState={{ selected: screen === 'capture' }}
      >
        <View style={[styles.mic, screen === 'capture' && styles.micActive]}>
          <MicIcon size={22} color={colors.white} />
        </View>
      </Pressable>

      <Tab label={strings.navTasks} active={screen === 'tasks'} icon={(c) => <ListIcon color={c} />} onPress={() => onNavigate('tasks')} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    paddingTop: 11,
    paddingHorizontal: 28,
    backgroundColor: colors.cream,
    borderTopWidth: 1,
    borderTopColor: colors.timeline,
  },
  tab: { flex: 1, alignItems: 'center', gap: 5 },
  label: { fontSize: fs(10), fontFamily: ff('600') },
  micWrap: { flex: 1, alignItems: 'center' },
  mic: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginTop: -18,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.green,
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  micActive: { backgroundColor: colors.ink },
});
