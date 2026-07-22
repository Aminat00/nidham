/**
 * Task detail — where a user "disposes" a captured task: rename it, and schedule
 * it to a specific date + prayer window + optional exact time, or mark done /
 * unschedule / delete. Two states only: Unscheduled (no `day`) or Scheduled to a
 * slot — there is no fuzzy "suggested" state here. A spoken time, if present, is a
 * quiet muted context line only ("You said: …"), never a scheduling suggestion.
 * Full-screen modal, styled like ProjectDetailScreen.
 */

import React, { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TextInput, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WindowPicker } from '../components/WindowPicker';
import { ChevronDownIcon } from '../components/Icons';
import { colors, ff, fs, radius, space } from '../theme/tokens';
import { row, textStart, writingDirection } from '../theme/rtl';
import { useI18n } from '../i18n/I18nContext';
import { useStore } from '../state/store';
import { t as fmt, AREA_LABEL, WINDOW_WORD, type Lang } from '../i18n/strings';
import { TODAY } from '../data/demo';
import { addDays } from '../utils/dates';
import { prayerName, type PrayerKey } from '../data/prayers';
import type { Window } from '../types/item';

type DayMode = 'today' | 'tomorrow' | 'pick';

function modeFor(date: string): DayMode {
  if (date === TODAY) return 'today';
  if (date === addDays(TODAY, 1)) return 'tomorrow';
  return 'pick';
}

/** Display label for any Window value — prayer-anchored or the plain day-part words. */
function windowLabel(w: Window, lang: Lang): string {
  if (w === 'anytime' || w === 'morning' || w === 'afternoon' || w === 'evening') return WINDOW_WORD[lang][w];
  return prayerName(w as PrayerKey, lang);
}

export function TaskDetailScreen({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const { strings, lang, isRTL } = useI18n();
  const { getItem, scheduleItem, unschedule, deleteItem, toggleDone, renameItem } = useStore();
  const item = getItem(taskId);

  const [draftTitle, setDraftTitle] = useState(item?.title ?? '');
  const [selectedDate, setSelectedDate] = useState(item?.day ?? TODAY);
  const [dayMode, setDayMode] = useState<DayMode>(modeFor(item?.day ?? TODAY));
  const [selectedWindow, setSelectedWindow] = useState<Window>(item?.window ?? 'anytime');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [exactOn, setExactOn] = useState(Boolean(item?.time));
  const [selectedTime, setSelectedTime] = useState(item?.time ?? '');

  const selectMode = (mode: DayMode) => {
    if (mode === 'today') setSelectedDate(TODAY);
    else if (mode === 'tomorrow') setSelectedDate(addDays(TODAY, 1));
    setDayMode(mode);
  };

  const timeValid = /^([01]\d|2[0-3]):[0-5]\d$/.test(selectedTime);
  const saveDisabled = exactOn && !timeValid;

  const handleSave = () => {
    if (saveDisabled) return;
    const validTime = exactOn && timeValid ? selectedTime : null;
    scheduleItem(taskId, { date: selectedDate, window: selectedWindow, time: validTime });
    onClose();
  };
  const handleMarkDone = () => {
    toggleDone(taskId);
    onClose();
  };
  const handleDelete = () => {
    deleteItem(taskId);
    onClose();
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={[styles.top, { flexDirection: row(isRTL) }]}>
        <Pressable onPress={onClose} hitSlop={10} style={styles.close} accessibilityRole="button" accessibilityLabel="Close">
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { textAlign: textStart(isRTL), writingDirection: writingDirection(isRTL) }]}>
          {strings.taskDetailTitle}
        </Text>
      </View>

      {!item ? (
        <View style={styles.content} />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.head}>
            <TextInput
              value={draftTitle}
              onChangeText={setDraftTitle}
              onBlur={() => renameItem(taskId, draftTitle)}
              style={[styles.titleInput, { textAlign: textStart(isRTL), writingDirection: writingDirection(isRTL) }]}
              multiline
            />
            <View style={[styles.areaRow, { flexDirection: row(isRTL) }]}>
              <View style={styles.areaPill}>
                <Text style={styles.areaPillText}>{AREA_LABEL[lang][item.area ?? 'personal']}</Text>
              </View>
            </View>
            {item.timeContext ? (
              <Text style={[styles.context, { textAlign: textStart(isRTL), writingDirection: writingDirection(isRTL) }]}>
                {fmt(strings.youSaid, { text: item.timeContext })}
              </Text>
            ) : null}
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { textAlign: textStart(isRTL) }]}>{strings.dayLabel.toUpperCase()}</Text>
            <View style={[styles.segmentRow, { flexDirection: row(isRTL) }]}>
              <Pressable onPress={() => selectMode('today')} style={[styles.segment, dayMode === 'today' && styles.segmentOn]}>
                <Text style={[styles.segmentText, dayMode === 'today' && styles.segmentTextOn]}>{strings.today}</Text>
              </Pressable>
              <Pressable onPress={() => selectMode('tomorrow')} style={[styles.segment, dayMode === 'tomorrow' && styles.segmentOn]}>
                <Text style={[styles.segmentText, dayMode === 'tomorrow' && styles.segmentTextOn]}>{strings.tomorrow}</Text>
              </Pressable>
              <Pressable onPress={() => selectMode('pick')} style={[styles.segment, dayMode === 'pick' && styles.segmentOn]}>
                <Text style={[styles.segmentText, dayMode === 'pick' && styles.segmentTextOn]}>{strings.pickDate}</Text>
              </Pressable>
            </View>
            {dayMode === 'pick' ? (
              <View style={[styles.stepperRow, { flexDirection: row(isRTL) }]}>
                <Pressable onPress={() => setSelectedDate((d) => addDays(d, -1))} style={styles.stepBtn} accessibilityRole="button" accessibilityLabel={strings.prevDay}>
                  <Text style={styles.stepBtnText}>−1</Text>
                </Pressable>
                <Text style={styles.stepperDate}>{selectedDate}</Text>
                <Pressable onPress={() => setSelectedDate((d) => addDays(d, 1))} style={styles.stepBtn} accessibilityRole="button" accessibilityLabel={strings.nextDay}>
                  <Text style={styles.stepBtnText}>+1</Text>
                </Pressable>
              </View>
            ) : null}
          </View>

          <View style={styles.section}>
            <Pressable onPress={() => setPickerOpen(true)} style={[styles.control, { flexDirection: row(isRTL) }]} accessibilityRole="button">
              <Text style={[styles.controlText, { textAlign: textStart(isRTL) }]} numberOfLines={1}>
                {windowLabel(selectedWindow, lang)}
              </Text>
              <ChevronDownIcon size={16} color={colors.muted} />
            </Pressable>

            <View style={[styles.switchRow, { flexDirection: row(isRTL) }]}>
              <Text style={[styles.switchLabel, { textAlign: textStart(isRTL) }]}>{strings.setExactTime}</Text>
              <Switch value={exactOn} onValueChange={setExactOn} trackColor={{ false: colors.border, true: colors.green }} thumbColor={colors.white} />
            </View>
            {exactOn ? (
              <TextInput
                value={selectedTime}
                onChangeText={setSelectedTime}
                placeholder="HH:mm"
                placeholderTextColor={colors.faint}
                maxLength={5}
                style={[styles.timeInput, { textAlign: textStart(isRTL) }]}
              />
            ) : null}
          </View>

          <View style={styles.actions}>
            <Pressable onPress={handleSave} disabled={saveDisabled} style={[styles.saveButton, saveDisabled && styles.saveButtonDisabled]} accessibilityRole="button">
              <Text style={styles.saveButtonText}>{strings.save}</Text>
            </Pressable>
            <Pressable onPress={handleMarkDone} style={styles.outlineButton} accessibilityRole="button">
              <Text style={styles.outlineButtonText}>{strings.markDone}</Text>
            </Pressable>
            {item.day ? (
              <Pressable onPress={() => unschedule(taskId)} style={styles.outlineButton} accessibilityRole="button">
                <Text style={styles.outlineButtonText}>{strings.unscheduleLabel}</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={handleDelete} style={styles.deleteButton} accessibilityRole="button">
              <Text style={styles.deleteButtonText}>{strings.deleteTask}</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}

      <WindowPicker
        visible={pickerOpen}
        onSelect={(w) => { setSelectedWindow(w); setPickerOpen(false); }}
        onClose={() => setPickerOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream, paddingHorizontal: space.screen },
  top: { alignItems: 'center', paddingTop: 8, gap: 12 },
  close: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: fs(15), fontFamily: ff('600'), color: colors.muted },
  headerTitle: { fontSize: fs(16), fontFamily: ff('700'), color: colors.ink },
  content: { flex: 1, paddingTop: 20, paddingBottom: 40, gap: 22 },
  head: { gap: 10 },
  titleInput: { fontSize: fs(20), fontFamily: ff('800'), color: colors.ink, letterSpacing: -0.3, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border },
  areaRow: {},
  areaPill: { backgroundColor: colors.tint, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5 },
  areaPillText: { fontSize: fs(11), fontFamily: ff('700'), color: colors.green },
  context: { fontSize: fs(13), fontFamily: ff('500'), color: colors.muted },
  section: { gap: 10 },
  sectionLabel: { fontSize: fs(11), fontFamily: ff('700'), color: colors.muted2, letterSpacing: 0.6 },
  segmentRow: { gap: 8 },
  segment: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.inner, paddingVertical: 12, alignItems: 'center', backgroundColor: colors.card },
  segmentOn: { borderColor: colors.green, backgroundColor: colors.tint },
  segmentText: { fontSize: fs(13), fontFamily: ff('600'), color: colors.ink },
  segmentTextOn: { color: colors.green, fontFamily: ff('700') },
  stepperRow: { alignItems: 'center', gap: 12 },
  stepBtn: { borderRadius: radius.inner, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.card },
  stepBtnText: { fontSize: fs(12.5), fontFamily: ff('700'), color: colors.green },
  stepperDate: { flex: 1, textAlign: 'center', fontSize: fs(14), fontFamily: ff('600'), color: colors.ink },
  control: { alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.inner, paddingHorizontal: 15, paddingVertical: 14, gap: 10 },
  controlText: { flex: 1, fontSize: fs(14), fontFamily: ff('600'), color: colors.ink },
  switchRow: { alignItems: 'center', justifyContent: 'space-between' },
  switchLabel: { fontSize: fs(14), fontFamily: ff('600'), color: colors.ink },
  timeInput: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.inner, paddingHorizontal: 15, paddingVertical: 14, fontSize: fs(15), fontFamily: ff('600'), color: colors.ink },
  actions: { gap: 10 },
  saveButton: { backgroundColor: colors.green, borderRadius: radius.inner, paddingVertical: 15, alignItems: 'center', justifyContent: 'center' },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: colors.white, fontSize: fs(15), fontFamily: ff('700') },
  outlineButton: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.inner, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  outlineButtonText: { fontSize: fs(14), fontFamily: ff('700'), color: colors.ink },
  deleteButton: { borderWidth: 1, borderColor: colors.rust, borderRadius: radius.inner, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  deleteButtonText: { fontSize: fs(14), fontFamily: ff('700'), color: colors.rust },
});
