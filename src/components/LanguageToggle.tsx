/**
 * Segmented language toggle — EN · TR · ع (ع in Amiri). Flips copy + layout
 * direction instantly. Styled from Nidham.dc.html.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { amiri, colors, ff, radius } from '../theme/tokens';
import { row } from '../theme/rtl';
import { useI18n } from '../i18n/I18nContext';
import { LANGS, LANG_LABEL } from '../i18n/strings';

export function LanguageToggle() {
  const { lang, setLang, isRTL } = useI18n();
  return (
    <View style={[styles.wrap, { flexDirection: row(isRTL) }]}>
      {LANGS.map((l) => {
        const active = l === lang;
        return (
          <Pressable
            key={l}
            onPress={() => setLang(l)}
            hitSlop={4}
            style={[styles.seg, active && styles.segActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text
              style={[
                styles.segText,
                { fontFamily: l === 'ar' ? amiri(true) : ff('700') },
                active ? styles.segTextActive : styles.segTextInactive,
              ]}
            >
              {LANG_LABEL[l]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 3,
    gap: 2,
    alignItems: 'center',
  },
  seg: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  segActive: { backgroundColor: colors.green },
  segText: { fontSize: 12 },
  segTextActive: { color: colors.white },
  segTextInactive: { color: colors.slate },
});
