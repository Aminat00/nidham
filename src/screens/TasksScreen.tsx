/**
 * Screen 3 — Tasks. The categorized backlog: your Projects on top (with progress + next
 * action), then loose tasks grouped by life area. Nothing here is forced onto Today —
 * each task has a "Do today" that places it in a prayer window. Layout mirrors the
 * Nidham design language (cream, hairlines, forest green).
 */

import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { ProfileButton } from '../components/ProfileButton';
import { WindowPicker } from '../components/WindowPicker';
import { amiri, colors, ff, fs, radius, space } from '../theme/tokens';
import { row, textStart, writingDirection } from '../theme/rtl';
import { useI18n } from '../i18n/I18nContext';
import { useStore } from '../state/store';
import { AREA_LABEL, t as fmt, digits } from '../i18n/strings';
import type { Window } from '../types/item';

export function TasksScreen({ onOpenProfile, onOpenProject, onOpenTask }: { onOpenProfile: () => void; onOpenProject: (id: string) => void; onOpenTask: (id: string) => void }) {
  const { strings, isRTL, lang } = useI18n();
  const { projects, backlogByArea, progressOf, currentStepOf, scheduleToday } = useStore();
  const [pickerFor, setPickerFor] = useState<string | null>(null);

  const empty = projects.length === 0 && backlogByArea.length === 0;

  const pick = (w: Window) => {
    if (pickerFor) scheduleToday(pickerFor, w);
    setPickerFor(null);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerBlock}>
        <View style={[styles.headerRow, { flexDirection: row(isRTL) }]}>
          <View style={[styles.titleRow, { flexDirection: row(isRTL) }]}>
            <Text style={styles.title}>{strings.tasksTitle}</Text>
            <Text style={styles.titleScript}>مهام</Text>
          </View>
          <ProfileButton onPress={onOpenProfile} />
        </View>
        <Text style={[styles.intro, { textAlign: textStart(isRTL), writingDirection: writingDirection(isRTL) }]}>{strings.tasksIntro}</Text>
      </View>

      {empty && <Text style={[styles.empty, { textAlign: textStart(isRTL), writingDirection: writingDirection(isRTL) }]}>{strings.emptyTasks}</Text>}

      {/* Projects */}
      {projects.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { textAlign: textStart(isRTL) }]}>{strings.projectsSection.toUpperCase()}</Text>
          <View style={styles.group}>
            {projects.map((p) => {
              const prog = progressOf(p.id);
              const next = currentStepOf(p.id);
              const meta =
                fmt(strings.stepsOfLabel, { done: digits(prog.done, lang), total: digits(prog.total, lang) }) +
                (prog.milestoneTitle ? ` · ${fmt(strings.onMilestone, { name: prog.milestoneTitle })}` : '');
              return (
                <Pressable key={p.id} style={styles.projectCard} onPress={() => onOpenProject(p.id)} accessibilityRole="button">
                  <Text style={[styles.projectTitle, { textAlign: textStart(isRTL), writingDirection: writingDirection(isRTL) }]}>{p.title}</Text>
                  <Text style={[styles.projectMeta, { textAlign: textStart(isRTL), writingDirection: writingDirection(isRTL) }]}>{meta}</Text>
                  {next ? (
                    <View style={[styles.nextRow, { flexDirection: row(isRTL) }]}>
                      <Text style={styles.startHereTag}>{strings.startHere}</Text>
                      <Text style={[styles.nextText, { textAlign: textStart(isRTL), writingDirection: writingDirection(isRTL) }]} numberOfLines={1}>{next.title}</Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* Loose tasks by area */}
      {backlogByArea.map((group) => (
        <View key={group.area} style={styles.section}>
          <Text style={[styles.sectionLabel, { textAlign: textStart(isRTL) }]}>{AREA_LABEL[lang][group.area].toUpperCase()}</Text>
          <View style={styles.group}>
            {group.items.map((it) => (
              <Pressable key={it.id} style={[styles.taskRow, { flexDirection: row(isRTL) }]} onPress={() => onOpenTask(it.id)} accessibilityRole="button">
                <Text style={[styles.taskTitle, { textAlign: textStart(isRTL), writingDirection: writingDirection(isRTL) }]} numberOfLines={2}>{it.title}</Text>
                <Pressable style={styles.doToday} onPress={(e) => { e.stopPropagation(); setPickerFor(it.id); }} accessibilityRole="button">
                  <Text style={styles.doTodayText}>{strings.doToday}</Text>
                </Pressable>
              </Pressable>
            ))}
          </View>
        </View>
      ))}

      <WindowPicker visible={pickerFor !== null} onSelect={pick} onClose={() => setPickerFor(null)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  content: { paddingHorizontal: space.screen, paddingTop: 8, paddingBottom: 40, gap: 18 },
  headerBlock: { gap: 3, paddingHorizontal: 2 },
  headerRow: { alignItems: 'center', justifyContent: 'space-between' },
  titleRow: { alignItems: 'baseline', gap: 9 },
  title: { fontSize: fs(22), fontFamily: ff('700'), color: colors.ink, letterSpacing: -0.3 },
  titleScript: { fontFamily: amiri(), fontSize: fs(19), color: colors.green },
  intro: { fontSize: fs(12.5), fontFamily: ff('500'), color: colors.muted, lineHeight: 19, maxWidth: 320 },
  empty: { fontSize: fs(13.5), fontFamily: ff('500'), color: colors.muted, lineHeight: 20, paddingHorizontal: 2 },
  section: { gap: 9 },
  sectionLabel: { fontSize: fs(11), fontFamily: ff('700'), color: colors.muted2, letterSpacing: 0.7, paddingHorizontal: 2 },
  group: { gap: 9 },
  projectCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.cardLg, paddingHorizontal: 15, paddingVertical: 14, gap: 6 },
  projectTitle: { fontSize: fs(16), fontFamily: ff('700'), color: colors.ink, letterSpacing: -0.2 },
  projectMeta: { fontSize: fs(12), fontFamily: ff('500'), color: colors.muted },
  nextRow: { alignItems: 'center', gap: 8, marginTop: 2 },
  startHereTag: { fontSize: fs(10), fontFamily: ff('700'), color: colors.white, backgroundColor: colors.green, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2, overflow: 'hidden' },
  nextText: { flex: 1, fontSize: fs(13.5), fontFamily: ff('600'), color: colors.ink },
  taskRow: { alignItems: 'center', justifyContent: 'space-between', gap: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, paddingHorizontal: 14, paddingVertical: 13 },
  taskTitle: { flex: 1, fontSize: fs(14.5), fontFamily: ff('500'), color: colors.ink },
  doToday: { borderWidth: 1, borderColor: colors.green, borderRadius: radius.inner, paddingHorizontal: 12, paddingVertical: 7 },
  doTodayText: { fontSize: fs(12), fontFamily: ff('700'), color: colors.green },
});
