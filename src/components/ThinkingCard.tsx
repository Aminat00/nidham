/**
 * The calm "Nidham is thinking…" state shown while runAgent works — three gently
 * pulsing green dots + a label. Styled from Nidham.dc.html.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { colors, ff } from '../theme/tokens';
import { row } from '../theme/rtl';
import { useI18n } from '../i18n/I18nContext';

function PulseDot({ delay }: { delay: number }) {
  const o = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(o, { toValue: 1, duration: 600, delay, useNativeDriver: true }),
        Animated.timing(o, { toValue: 0.4, duration: 600, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [o, delay]);
  return <Animated.View style={[styles.dot, { opacity: o }]} />;
}

export function ThinkingCard() {
  const { strings, isRTL } = useI18n();
  return (
    <View style={[styles.card, { flexDirection: row(isRTL) }]}>
      <View style={[styles.dots, { flexDirection: row(isRTL) }]}>
        <PulseDot delay={0} />
        <PulseDot delay={200} />
        <PulseDot delay={400} />
      </View>
      <Text style={styles.label}>{strings.thinking}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border2,
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  dots: { gap: 4 },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.green },
  label: { fontSize: 13, fontFamily: ff('600'), color: colors.slate2 },
});
