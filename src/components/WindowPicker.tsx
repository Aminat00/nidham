/**
 * "When today?" — a small modal that lets the user place an item into a prayer window
 * when they tap "Do today". Options are the five daily prayers plus "anytime". RTL-aware,
 * styled like the calc-method Dropdown sheet.
 */

import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, ff, fs, radius } from '../theme/tokens';
import { row, textStart } from '../theme/rtl';
import { useI18n } from '../i18n/I18nContext';
import { WINDOW_WORD } from '../i18n/strings';
import { prayerName, PrayerKey } from '../data/prayers';
import type { Window } from '../types/item';

const OPTIONS: Window[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'anytime'];

export function WindowPicker({ visible, onSelect, onClose }: { visible: boolean; onSelect: (w: Window) => void; onClose: () => void }) {
  const { strings, lang, isRTL } = useI18n();

  const label = (w: Window) => (w === 'anytime' ? WINDOW_WORD[lang].anytime : prayerName(w as PrayerKey, lang));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={[styles.title, { textAlign: textStart(isRTL) }]}>{strings.whenToday}</Text>
          {OPTIONS.map((w) => (
            <Pressable key={w} onPress={() => onSelect(w)} style={[styles.option, { flexDirection: row(isRTL) }]}>
              <Text style={[styles.optionText, { textAlign: textStart(isRTL) }]}>{label(w)}</Text>
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(28,26,22,0.35)', justifyContent: 'center', paddingHorizontal: 28 },
  sheet: { backgroundColor: colors.card, borderRadius: radius.card, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, paddingVertical: 6 },
  title: { fontSize: fs(12), fontFamily: ff('700'), color: colors.muted2, letterSpacing: 0.6, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 6 },
  option: { alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 15, borderTopWidth: 1, borderTopColor: colors.hairline2 },
  optionText: { flex: 1, fontSize: fs(15), fontFamily: ff('600'), color: colors.ink },
});
