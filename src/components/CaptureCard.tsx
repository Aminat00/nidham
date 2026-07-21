/**
 * A "Nidham scheduled" card in the Just-captured feed — the payoff moment. Energy
 * dot + title (+ Project badge), a green schedule chip showing where it landed, and
 * for projects the "Broken into steps" list. Styled from Nidham.dc.html.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Item } from '../types/item';
import { Card } from './Card';
import { Badge, EnergyDot, StepNum } from './primitives';
import { CalendarIcon } from './Icons';
import { colors, ff, fs, radius } from '../theme/tokens';
import { row, textStart, writingDirection } from '../theme/rtl';
import { useI18n } from '../i18n/I18nContext';
import { useStore } from '../state/store';
import { scheduleChipLabel } from '../utils/schedule';

function StepRow({ item, index }: { item: Item; index: number }) {
  const { strings, isRTL } = useI18n();
  const first = Boolean(item.startHere);
  return (
    <View style={[styles.stepRow, { flexDirection: row(isRTL) }, first ? styles.stepFirst : styles.stepRest]}>
      <StepNum n={index + 1} first={first} />
      <Text
        style={[styles.stepLabel, { color: first ? colors.ink : colors.slate2, textAlign: textStart(isRTL), writingDirection: writingDirection(isRTL) }]}
        numberOfLines={1}
      >
        {item.title}
      </Text>
      {first && <Badge label={strings.startHere} tone="startHere" />}
    </View>
  );
}

export function CaptureCard({ item }: { item: Item }) {
  const { strings, lang, isRTL } = useI18n();
  const { childrenOf, today } = useStore();
  const isProject = item.category === 'project';
  const steps = isProject ? childrenOf(item.id) : [];

  return (
    <Card accent style={styles.card}>
      <View style={[styles.header, { flexDirection: row(isRTL) }]}>
        <EnergyDot deep={item.energy === 'deep'} feed />
        <Text style={[styles.title, { textAlign: textStart(isRTL), writingDirection: writingDirection(isRTL) }]} numberOfLines={2}>
          {item.title}
        </Text>
        {isProject && <Badge label={strings.projectChip} tone="project" />}
      </View>

      <View style={[styles.chip, { flexDirection: row(isRTL) }]}>
        <CalendarIcon size={13} color={colors.green} />
        <Text style={styles.chipText}>{scheduleChipLabel(item, lang, today)}</Text>
      </View>

      {isProject && steps.length > 0 && (
        <View style={styles.steps}>
          <Text style={[styles.stepsLabel, { textAlign: textStart(isRTL) }]}>{strings.brokenSteps}</Text>
          {steps.map((s, i) => (
            <StepRow key={s.id} item={s} index={i} />
          ))}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: 14, paddingHorizontal: 15, gap: 10 },
  header: { alignItems: 'center', gap: 11 },
  title: { flex: 1, fontSize: fs(14), fontFamily: ff('600'), color: colors.ink },
  chip: { alignSelf: 'flex-start', alignItems: 'center', gap: 7, backgroundColor: colors.tint, paddingHorizontal: 11, paddingVertical: 7, borderRadius: radius.chip },
  chipText: { fontSize: fs(12), fontFamily: ff('700'), color: colors.green },
  steps: { gap: 6, marginTop: 1 },
  stepsLabel: { fontSize: fs(10), fontFamily: ff('600'), color: colors.muted2, letterSpacing: 0.6, marginBottom: 1 },
  stepRow: { alignItems: 'center', gap: 10, paddingHorizontal: 11, paddingVertical: 8, borderRadius: radius.chip },
  stepFirst: { backgroundColor: colors.tint },
  stepRest: { backgroundColor: colors.cardAlt },
  stepLabel: { flex: 1, fontSize: fs(12.5), fontFamily: ff('600') },
});
