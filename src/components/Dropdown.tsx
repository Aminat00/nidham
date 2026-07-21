/**
 * A compact dropdown select — a bordered row showing the current value; tapping
 * opens a modal sheet with the options. Keeps long option lists off the parent
 * screen (no inline scroll there). RTL-aware.
 */

import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, ff, fs, radius } from '../theme/tokens';
import { row, textStart } from '../theme/rtl';
import { useI18n } from '../i18n/I18nContext';
import { ChevronDownIcon, CheckIcon } from './Icons';

export interface Option {
  id: number;
  name: string;
}

export function Dropdown({ value, options, onSelect }: { value: number; options: Option[]; onSelect: (id: number) => void }) {
  const { isRTL } = useI18n();
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.id === value);

  return (
    <>
      <Pressable style={[styles.control, { flexDirection: row(isRTL) }]} onPress={() => setOpen(true)} accessibilityRole="button">
        <Text style={[styles.controlText, { textAlign: textStart(isRTL) }]} numberOfLines={1}>
          {current?.name ?? ''}
        </Text>
        <ChevronDownIcon size={16} color={colors.muted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <ScrollView bounces={false}>
              {options.map((o) => {
                const selected = o.id === value;
                return (
                  <Pressable
                    key={o.id}
                    onPress={() => {
                      onSelect(o.id);
                      setOpen(false);
                    }}
                    style={[styles.option, { flexDirection: row(isRTL) }, selected && styles.optionOn]}
                  >
                    <Text style={[styles.optionText, { color: selected ? colors.green : colors.ink, textAlign: textStart(isRTL) }]}>{o.name}</Text>
                    {selected && <CheckIcon size={13} color={colors.green} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  control: {
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.inner,
    paddingHorizontal: 15,
    paddingVertical: 14,
    gap: 10,
  },
  controlText: { flex: 1, fontSize: fs(14), fontFamily: ff('600'), color: colors.ink },
  backdrop: { flex: 1, backgroundColor: 'rgba(28,26,22,0.35)', justifyContent: 'center', paddingHorizontal: 28 },
  sheet: { backgroundColor: colors.card, borderRadius: radius.card, maxHeight: '70%', overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  option: { alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: colors.hairline2 },
  optionOn: { backgroundColor: colors.tint },
  optionText: { flex: 1, fontSize: fs(15), fontFamily: ff('600') },
});
