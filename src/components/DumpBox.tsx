/**
 * The single "What's on your mind?" capture card — free text + hold-to-speak.
 * No lists, no fields. A green send-arrow submits; the mic simulates dictation for
 * the demo (hold → transcribes a sample). Styled from Nidham.dc.html.
 */

import React, { useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ArrowRightIcon, MicIcon } from './Icons';
import { colors, ff, radius } from '../theme/tokens';
import { row, textStart, writingDirection } from '../theme/rtl';
import { useI18n } from '../i18n/I18nContext';
import { SAMPLE_CAPTURE } from '../data/samplePlan';

/** Web Speech API constructor (browser only), and per-language recognition locale. */
const SpeechRecognition =
  Platform.OS === 'web'
    ? (globalThis as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).SpeechRecognition ??
      (globalThis as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
    : undefined;
const SR_LOCALE: Record<string, string> = { en: 'en-US', tr: 'tr-TR', ar: 'ar-SA' };

export function DumpBox({
  onSubmit,
  busy,
  placeholder,
  hint,
}: {
  onSubmit: (text: string) => void;
  busy: boolean;
  placeholder?: string;
  hint?: string;
}) {
  const { strings, lang, isRTL } = useI18n();
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const recRef = useRef<{ stop: () => void } | null>(null);
  const baseRef = useRef('');
  const gotSpeechRef = useRef(false);

  const submit = () => {
    if (busy || !text.trim()) return;
    onSubmit(text);
    setText('');
  };

  // Hold the mic to dictate: real Web Speech in the browser; on native (or if the
  // API/mic is unavailable) we simulate by dropping in a sample on release.
  const startVoice = () => {
    setListening(true);
    if (!SpeechRecognition) return;
    try {
      const Ctor = SpeechRecognition as new () => {
        lang: string;
        interimResults: boolean;
        continuous: boolean;
        start: () => void;
        stop: () => void;
        onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
        onerror: () => void;
        onend: () => void;
      };
      const rec = new Ctor();
      rec.lang = SR_LOCALE[lang] ?? 'en-US';
      rec.interimResults = true;
      rec.continuous = true;
      baseRef.current = text.trim() ? text.trim() + ' ' : '';
      gotSpeechRef.current = false;
      rec.onresult = (e) => {
        let t = '';
        for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
        if (t.trim()) gotSpeechRef.current = true;
        setText(baseRef.current + t);
      };
      rec.onerror = () => {
        setListening(false);
        recRef.current = null;
      };
      rec.onend = () => setListening(false);
      recRef.current = rec;
      rec.start();
    } catch {
      recRef.current = null;
    }
  };

  const stopVoice = () => {
    setListening(false);
    if (recRef.current) {
      try {
        recRef.current.stop();
      } catch {
        /* ignore */
      }
      recRef.current = null;
      // No mic / denied / silence → fall back to the sample so the demo still lands.
      setTimeout(() => {
        if (!gotSpeechRef.current) setText((p) => (p.trim() ? p : SAMPLE_CAPTURE));
      }, 300);
    } else {
      setText((p) => (p.trim() ? p : SAMPLE_CAPTURE));
    }
  };

  return (
    <View style={styles.card}>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={placeholder ?? strings.capPlaceholder}
        placeholderTextColor={colors.faint}
        multiline
        editable={!busy}
        style={[styles.input, { textAlign: textStart(isRTL), writingDirection: writingDirection(isRTL) }]}
        textAlignVertical="top"
      />
      <View style={[styles.footer, { flexDirection: row(isRTL) }]}>
        <Text style={[styles.hint, { textAlign: textStart(isRTL), writingDirection: writingDirection(isRTL) }]} numberOfLines={1}>
          {listening ? strings.listening : (hint ?? strings.capHint)}
        </Text>
        <Pressable
          onPressIn={startVoice}
          onPressOut={stopVoice}
          style={[styles.mic, listening && styles.micOn]}
          accessibilityRole="button"
          accessibilityLabel={strings.listening}
        >
          <MicIcon size={19} color={listening ? colors.white : colors.green} />
        </Pressable>
        <Pressable onPress={submit} style={styles.send} accessibilityRole="button">
          <View style={isRTL ? styles.flip : undefined}>
            <ArrowRightIcon size={18} color={colors.white} />
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.cardLg,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 13,
    gap: 8,
    ...Platform.select({
      ios: { shadowColor: '#1C1A16', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.09, shadowRadius: 16 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  input: { minHeight: 76, fontSize: 16, fontFamily: ff('500'), color: colors.ink, lineHeight: 24 },
  footer: { alignItems: 'center', gap: 10 },
  hint: { flex: 1, fontSize: 11, fontFamily: ff('500'), color: colors.faint },
  mic: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.micBg, alignItems: 'center', justifyContent: 'center' },
  micOn: { backgroundColor: colors.green },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  flip: { transform: [{ scaleX: -1 }] },
});
