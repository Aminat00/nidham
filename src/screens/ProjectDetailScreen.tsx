/**
 * Project detail — opened from the Tasks tab or a freshly-created plan. Shows the project
 * as milestones (collapsible) → steps rendered as tappable sub-task cards. Tapping a card
 * opens the shared Task detail (rename, schedule, mark done, delete). The current "start
 * here" step is highlighted and carries a "Do today". A scheduled step shows its day +
 * window inline. Delete (whole project) sits at the very bottom behind a confirm dialog.
 */

import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WindowPicker } from '../components/WindowPicker';
import { CheckIcon, ChevronDownIcon } from '../components/Icons';
import { colors, ff, fs, radius, space } from '../theme/tokens';
import { row, textStart, writingDirection } from '../theme/rtl';
import { useI18n } from '../i18n/I18nContext';
import { useStore } from '../state/store';
import { t as fmt, digits, WEEKDAYS, WINDOW_WORD } from '../i18n/strings';
import { weekdayIndex } from '../utils/dates';
import { prayerName, type PrayerKey } from '../data/prayers';
import { DEMO_TODAY } from '../data/demo';
import type { Item, Window } from '../types/item';

const PRAYER_WINDOWS = new Set<Window>(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']);

export function ProjectDetailScreen({
  projectId,
  onClose,
  onOpenTask,
}: {
  projectId: string;
  onClose: () => void;
  onOpenTask: (id: string) => void;
}) {
  const { strings, isRTL, lang } = useI18n();
  const {
    getItem,
    progressOf,
    projectMilestones,
    milestoneSteps,
    currentStepOf,
    toggleDone,
    scheduleToday,
    deleteProject,
  } = useStore();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

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

  /** "Wed · ʿAsr · 15:00" — the day/window (+ exact time) a step is scheduled to. */
  const whenLabel = (s: Item): string => {
    const wd = s.day ? WEEKDAYS[lang][weekdayIndex(s.day)] : '';
    const w = PRAYER_WINDOWS.has(s.window)
      ? prayerName(s.window as PrayerKey, lang)
      : WINDOW_WORD[lang][s.window as 'morning' | 'afternoon' | 'evening' | 'anytime'] ?? '';
    const time = s.time ? ` · ${digits(s.time, lang)}` : '';
    return `${wd} · ${w}${time}`;
  };

  const doDelete = () => {
    setConfirming(false);
    deleteProject(projectId);
    onClose();
  };

  const meta =
    fmt(strings.stepsOfLabel, { done: digits(prog.done, lang), total: digits(prog.total, lang) }) +
    (prog.milestoneTitle ? ` · ${fmt(strings.onMilestone, { name: prog.milestoneTitle })}` : '');

  return (
    <SafeAreaView style={styles.screen}>
      <View style={[styles.top, { flexDirection: row(isRTL) }]}>
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
                    <Pressable key={s.id} style={[styles.stepCard, { flexDirection: row(isRTL) }, isCurrent && !done && styles.stepCardCurrent]} onPress={() => onOpenTask(s.id)} accessibilityRole="button">
                      <Pressable onPress={() => toggleDone(s.id)} style={[styles.checkbox, done && styles.checkboxOn]} accessibilityRole="checkbox" accessibilityState={{ checked: done }}>
                        {done ? <CheckIcon size={12} color={colors.white} /> : null}
                      </Pressable>
                      <View style={styles.stepBody}>
                        <Text style={[styles.stepText, done && styles.stepTextDone, { textAlign: textStart(isRTL), writingDirection: writingDirection(isRTL) }]}>{s.title}</Text>
                        {s.day && !done ? (
                          <Text style={[styles.stepWhen, { textAlign: textStart(isRTL) }]}>{whenLabel(s)}</Text>
                        ) : null}
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
                      <ChevronDownIcon size={15} color={colors.muted2} />
                    </Pressable>
                  );
                })}
            </View>
          );
        })}

        <Pressable onPress={() => setConfirming(true)} style={styles.deleteButton} accessibilityRole="button" accessibilityLabel={strings.delete}>
          <Text style={styles.deleteButtonText}>{strings.delete}</Text>
        </Pressable>
      </ScrollView>

      <WindowPicker visible={pickerFor !== null} onSelect={pick} onClose={() => setPickerFor(null)} />

      <Modal visible={confirming} transparent animationType="fade" onRequestClose={() => setConfirming(false)}>
        <Pressable style={styles.backdrop} onPress={() => setConfirming(false)}>
          <Pressable style={styles.dialog} onPress={() => {}}>
            <Text style={[styles.dialogTitle, { textAlign: textStart(isRTL), writingDirection: writingDirection(isRTL) }]}>{strings.deleteProjectTitle}</Text>
            <Text style={[styles.dialogBody, { textAlign: textStart(isRTL), writingDirection: writingDirection(isRTL) }]}>{strings.deleteProjectBody}</Text>
            <View style={[styles.dialogActions, { flexDirection: row(isRTL) }]}>
              <Pressable onPress={() => setConfirming(false)} style={[styles.dialogBtn, styles.dialogCancel]} accessibilityRole="button">
                <Text style={styles.dialogCancelText}>{strings.cancel}</Text>
              </Pressable>
              <Pressable onPress={doDelete} style={[styles.dialogBtn, styles.dialogDelete]} accessibilityRole="button">
                <Text style={styles.dialogDeleteText}>{strings.delete}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream, paddingHorizontal: space.screen },
  top: { alignItems: 'center', justifyContent: 'flex-end', paddingTop: 8 },
  close: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: fs(15), fontFamily: ff('600'), color: colors.muted },
  content: { paddingTop: 12, paddingBottom: 40, gap: 16 },
  head: { gap: 5 },
  kicker: { fontSize: fs(10), fontFamily: ff('700'), color: colors.green, letterSpacing: 0.6 },
  title: { fontSize: fs(24), fontFamily: ff('800'), color: colors.ink, letterSpacing: -0.4 },
  meta: { fontSize: fs(13), fontFamily: ff('500'), color: colors.muted },
  milestone: { gap: 11 },
  mHeader: { alignItems: 'center', gap: 10, paddingHorizontal: 2 },
  mDot: { width: 9, height: 9, borderRadius: 5, borderWidth: 1.6, borderColor: colors.green },
  mDotDone: { backgroundColor: colors.green },
  mTitle: { flex: 1, fontSize: fs(15), fontFamily: ff('700'), color: colors.ink },
  chevUp: { transform: [{ rotate: '180deg' }] },
  stepCard: { alignItems: 'flex-start', gap: 11, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.cardLg, paddingHorizontal: 14, paddingVertical: 13 },
  stepCardCurrent: { borderColor: colors.green, backgroundColor: colors.tint },
  checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.6, borderColor: colors.muted2, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkboxOn: { backgroundColor: colors.green, borderColor: colors.green },
  stepBody: { flex: 1, gap: 6 },
  stepText: { fontSize: fs(14.5), fontFamily: ff('500'), color: colors.ink, lineHeight: 21 },
  stepTextDone: { color: colors.muted2, textDecorationLine: 'line-through' },
  stepWhen: { fontSize: fs(12), fontFamily: ff('600'), color: colors.green },
  currentRow: { alignItems: 'center', gap: 9 },
  startHereTag: { fontSize: fs(10), fontFamily: ff('700'), color: colors.white, backgroundColor: colors.green, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2, overflow: 'hidden' },
  todayChip: { fontSize: fs(11), fontFamily: ff('700'), color: colors.green },
  doToday: { borderWidth: 1, borderColor: colors.green, borderRadius: radius.inner, paddingHorizontal: 11, paddingVertical: 6 },
  doTodayText: { fontSize: fs(11.5), fontFamily: ff('700'), color: colors.green },
  deleteButton: { borderWidth: 1, borderColor: colors.rust, borderRadius: radius.inner, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  deleteButtonText: { fontSize: fs(14), fontFamily: ff('700'), color: colors.rust },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  dialog: { width: '100%', backgroundColor: colors.cream, borderRadius: radius.cardLg, padding: 20, gap: 12 },
  dialogTitle: { fontSize: fs(17), fontFamily: ff('800'), color: colors.ink },
  dialogBody: { fontSize: fs(13.5), fontFamily: ff('500'), color: colors.muted, lineHeight: 20 },
  dialogActions: { gap: 10, justifyContent: 'flex-end' },
  dialogBtn: { borderRadius: radius.inner, paddingHorizontal: 18, paddingVertical: 11, alignItems: 'center', justifyContent: 'center' },
  dialogCancel: { borderWidth: 1, borderColor: colors.border },
  dialogCancelText: { fontSize: fs(14), fontFamily: ff('700'), color: colors.ink },
  dialogDelete: { backgroundColor: colors.rust },
  dialogDeleteText: { fontSize: fs(14), fontFamily: ff('700'), color: colors.white },
});
