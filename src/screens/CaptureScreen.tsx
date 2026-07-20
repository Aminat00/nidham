/**
 * Screen 1 — Capture (قيد). Empty your mind → the agent schedules it → items
 * "land" as Nidham-scheduled cards, projects broken into numbered steps.
 * Layout matches Nidham.dc.html.
 */

import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { DumpBox } from '../components/DumpBox';
import { CaptureCard } from '../components/CaptureCard';
import { ThinkingCard } from '../components/ThinkingCard';
import { FadeInView } from '../components/FadeInView';
import { ProfileButton } from '../components/ProfileButton';
import { amiri, colors, ff, space } from '../theme/tokens';
import { row, textStart, writingDirection } from '../theme/rtl';
import { useI18n } from '../i18n/I18nContext';
import { useStore } from '../state/store';

export function CaptureScreen({ onOpenProfile }: { onOpenProfile: () => void }) {
  const { strings, isRTL } = useI18n();
  const { feed, phase, capture } = useStore();
  const thinking = phase === 'thinking';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.headerBlock}>
        <View style={[styles.headerRow, { flexDirection: row(isRTL) }]}>
          <View style={[styles.titleRow, { flexDirection: row(isRTL) }]}>
            <Text style={styles.title}>{strings.capTitle}</Text>
            <Text style={styles.titleScript}>قيد</Text>
          </View>
          <ProfileButton onPress={onOpenProfile} />
        </View>
        <Text style={[styles.intro, { textAlign: textStart(isRTL), writingDirection: writingDirection(isRTL) }]}>{strings.capIntro}</Text>
      </View>

      <DumpBox onSubmit={capture} busy={thinking} />

      {thinking && <ThinkingCard />}

      {/* Just captured */}
      <View style={[styles.sectionRow, { flexDirection: row(isRTL) }]}>
        <Text style={styles.sectionTitle}>{strings.recentLabel}</Text>
        <Text style={styles.sectionTag}>{strings.scheduledBy} ✦</Text>
      </View>

      <View style={styles.feed}>
        {feed.map((item, i) => (
          <FadeInView key={item.id} delay={i * 70}>
            <CaptureCard item={item} />
          </FadeInView>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  content: { paddingHorizontal: space.screen, paddingTop: 8, paddingBottom: 40, gap: 13 },
  headerBlock: { gap: 3, paddingHorizontal: 2 },
  headerRow: { alignItems: 'center', justifyContent: 'space-between' },
  titleRow: { alignItems: 'baseline', gap: 9 },
  title: { fontSize: 22, fontFamily: ff('700'), color: colors.ink, letterSpacing: -0.3 },
  titleScript: { fontFamily: amiri(), fontSize: 19, color: colors.green },
  intro: { fontSize: 12.5, fontFamily: ff('500'), color: colors.muted, lineHeight: 19, maxWidth: 320 },
  sectionRow: { alignItems: 'center', justifyContent: 'space-between', marginTop: 7, paddingHorizontal: 2 },
  sectionTitle: { fontSize: 13, fontFamily: ff('700'), color: colors.ink },
  sectionTag: { fontSize: 10.5, fontFamily: ff('500'), color: colors.muted2 },
  feed: { gap: 10 },
});
