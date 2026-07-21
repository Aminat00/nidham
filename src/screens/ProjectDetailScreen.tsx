/**
 * Project detail — opened from the Tasks tab or a freshly-created plan. Shows the project
 * as milestones (collapsible) → steps with checkboxes. The current "start here" step is
 * highlighted and carries a "Do today" that schedules it into a prayer window. Checking a
 * step advances the project; the next step becomes current. Overlay, like Profile.
 */

import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WindowPicker } from '../components/WindowPicker';
import { CheckIcon, ChevronDownIcon } from '../components/Icons';
import { colors, ff, fs, radius, space } from '../theme/tokens';
import { row, textStart, writingDirection } from '../theme/rtl';
import { useI18n } from '../i18n/I18nContext';
import { useStore } from '../state/store';
import { t as fmt, digits } from '../i18n/strings';
import { DEMO_TODAY, DEMO_NOW_ISO, PRAYER_TIMES } from '../data/demo';
import { usePrayerTimes } from '../data/PrayerTimesContext';
import { runScheduleAgent } from '../agent/runScheduleAgent';
import type { Window } from '../types/item';

export function ProjectDetailScreen({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const { strings, isRTL, lang } = useI18n();
  const {
    getItem,
    progressOf,
    projectMilestones,
    milestoneSteps,
    currentStepOf,
    toggleDone,
    scheduleToday,
    subtasksOf,
    scheduledItems,
    scheduleItem,
  } = useStore();
  const { live } = usePrayerTimes();
  const times = live?.times ?? PRAYER_TIMES;
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [pickerFor, setPickerFor] = useState<string | null>(null);

  const project = getItem(projectId);
  const milestones = projectMilestones(projectId);
  const current = currentStepOf(projectId);
  const prog = progressOf(projectId);

  const toggleCollapse = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const pick = (w: Window) => {
    if (pickerFor) scheduleToday(pickerFor, w);
    setPickerFor(null);
  };

  /** Re-runs the scheduler over this project's subtasks, spreading them across the horizon. */
  const reschedule = async () => {
    const subs = subtasksOf(projectId).map((i) => ({ id: i.id, title: i.title, estimate: i.note ?? undefined, energy: i.energy }));
    if (subs.length === 0) return;
    const ctx = {
      now: DEMO_NOW_ISO,
      lang,
      prayerTimes: times,
      existingItems: scheduledItems().map((i) => ({ id: i.id, title: i.title, window: i.window, day: i.day })),
    };
    const { placements } = await runScheduleAgent({ subtasks: subs, context: ctx, spread: true });
    for (const p of placements) scheduleItem(p.subtaskId, { date: p.day, window: p.window });
  };

  const meta =
    fmt(strings.stepsOfLabel, { done: digits(prog.done, lang), total: digits(prog.total, lang) }) +
    (prog.milestoneTitle ? ` · ${fmt(strings.onMilestone, { name: prog.milestoneTitle })}` : '');

  return (
    <SafeAreaView style={styles.screen}>
      <View style={[styles.top, { flexDirection: row(isRTL) }]}>
        <Pressable onPress={reschedule} style={styles.rescheduleBtn} accessibilityRole="button" accessibilityLabel={strings.reschedule}>
          <Text style={styles.rescheduleText}>{strings.reschedule}</Text>
        </Pressable>
        <Pressable onPress={onClose} hitSlop={10} style={styles.close} accessibilityRole="button" accessibilityLabel="Close">
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <Text style={[styles.kicker, { textAlign: textStart(isRTL) }]}>{strings.projectsSection.toUpperCase()}</Text>
          <Text style={[styles.title, { textAlign: textStart(isRTL), writingDirection: writingDirection(isRTL) }]}>{project?.title ?? ''}</Text>
          <Text style={[styles.meta, { textAlign: textStart(isRTL), writingDirection: writingDirection(isRTL) }]}>{meta}</Text>
        </View>

        {milestones.map((m) => {
          const isCollapsed = collapsed.has(m.id);
          const steps = milestoneSteps(m.id);
          const mDone = steps.length > 0 && steps.every((s) => s.status === 'done');
          return (
            <View key={m.id} style={styles.milestone}>
              <Pressable style={[styles.mHeader, { flexDirection: row(isRTL) }]} onPress={() => toggleCollapse(m.id)}>
                <View style={[styles.mDot, mDone && styles.mDotDone]} />
                <Text style={[styles.mTitle, { textAlign: textStart(isRTL), writingDirection: writingDirection(isRTL) }]}>{m.title}</Text>
                <View style={!isCollapsed ? styles.chevUp : undefined}><ChevronDownIcon size={15} color={colors.muted} /></View>
              </Pressable>

              {!isCollapsed &&
                steps.map((s) => {
                  const done = s.status === 'done';
                  const isCurrent = current?.id === s.id;
                  const scheduledToday = s.day === DEMO_TODAY;
                  return (
                    <View key={s.id} style={[styles.stepRow, { flexDirection: row(isRTL) }]}>
                      <Pressable onPress={() => toggleDone(s.id)} style={[styles.checkbox, done && styles.checkboxOn]} accessibilityRole="checkbox" accessibilityState={{ checked: done }}>
                        {done ? <CheckIcon size={12} color={colors.white} /> : null}
                      </Pressable>
                      <View style={styles.stepBody}>
                        <Text style={[styles.stepText, done && styles.stepTextDone, { textAlign: textStart(isRTL), writingDirection: writingDirection(isRTL) }]}>{s.title}</Text>
                        {isCurrent && !done ? (
                          <View style={[styles.currentRow, { flexDirection: row(isRTL) }]}>
                            <Text style={styles.startHereTag}>{strings.startHere}</Text>
                            {scheduledToday ? (
                              <Text style={styles.todayChip}>{strings.today}</Text>
                            ) : (
                              <Pressable onPress={() => setPickerFor(s.id)} style={styles.doToday}>
                                <Text style={styles.doTodayText}>{strings.doToday}</Text>
                              </Pressable>
                            )}
                          </View>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
            </View>
          );
        })}
      </ScrollView>

      <WindowPicker visible={pickerFor !== null} onSelect={pick} onClose={() => setPickerFor(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream, paddingHorizontal: space.screen },
  top: { alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingTop: 8 },
  close: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: fs(15), fontFamily: ff('600'), color: colors.muted },
  rescheduleBtn: { borderWidth: 1, borderColor: colors.green, borderRadius: radius.inner, paddingHorizontal: 12, paddingVertical: 8 },
  rescheduleText: { fontSize: fs(12.5), fontFamily: ff('700'), color: colors.green },
  content: { paddingTop: 12, paddingBottom: 40, gap: 16 },
  head: { gap: 5 },
  kicker: { fontSize: fs(10), fontFamily: ff('700'), color: colors.green, letterSpacing: 0.6 },
  title: { fontSize: fs(24), fontFamily: ff('800'), color: colors.ink, letterSpacing: -0.4 },
  meta: { fontSize: fs(13), fontFamily: ff('500'), color: colors.muted },
  milestone: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.cardLg, paddingHorizontal: 15, paddingVertical: 13, gap: 11 },
  mHeader: { alignItems: 'center', gap: 10 },
  mDot: { width: 9, height: 9, borderRadius: 5, borderWidth: 1.6, borderColor: colors.green },
  mDotDone: { backgroundColor: colors.green },
  mTitle: { flex: 1, fontSize: fs(15), fontFamily: ff('700'), color: colors.ink },
  chevUp: { transform: [{ rotate: '180deg' }] },
  stepRow: { alignItems: 'flex-start', gap: 11, paddingLeft: 2 },
  checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.6, borderColor: colors.muted2, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkboxOn: { backgroundColor: colors.green, borderColor: colors.green },
  stepBody: { flex: 1, gap: 6 },
  stepText: { fontSize: fs(14.5), fontFamily: ff('500'), color: colors.ink, lineHeight: 21 },
  stepTextDone: { color: colors.muted2, textDecorationLine: 'line-through' },
  currentRow: { alignItems: 'center', gap: 9 },
  startHereTag: { fontSize: fs(10), fontFamily: ff('700'), color: colors.white, backgroundColor: colors.green, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2, overflow: 'hidden' },
  todayChip: { fontSize: fs(11), fontFamily: ff('700'), color: colors.green },
  doToday: { borderWidth: 1, borderColor: colors.green, borderRadius: radius.inner, paddingHorizontal: 11, paddingVertical: 6 },
  doTodayText: { fontSize: fs(11.5), fontFamily: ff('700'), color: colors.green },
});
