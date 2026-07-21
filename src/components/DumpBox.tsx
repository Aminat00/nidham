/**
 * The single "What's on your mind?" capture card — free text + hold-to-speak.
 * No lists, no fields. A green send-arrow submits; the mic simulates dictation for
 * the demo (hold → transcribes a sample). Styled from Nidham.dc.html.
 */

import React, { useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAudioRecorder, AudioModule, RecordingPresets, setAudioModeAsync } from 'expo-audio';
import { ArrowRightIcon, MicIcon } from './Icons';
import { colors, ff, radius } from '../theme/tokens';
import { row, textStart, writingDirection } from '../theme/rtl';
import { useI18n } from '../i18n/I18nContext';
import { transcribe, isTranscribeConfigured } from '../voice/transcribe';

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
  const [micError, setMicError] = useState(false);
  const recRef = useRef<{ stop: () => void } | null>(null);
  const baseRef = useRef('');
  const gotSpeechRef = useRef(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY); // native (expo-audio)
  // Web MediaRecorder → Whisper (n8n).
  const webRecRef = useRef<MediaRecorder | null>(null);
  const webChunksRef = useRef<Blob[]>([]);
  const webStreamRef = useRef<MediaStream | null>(null);

  const submit = () => {
    if (busy || !text.trim()) return;
    onSubmit(text);
    setText('');
  };

  // Native (iOS/Android): record with expo-audio, then transcribe via the STT webhook
  // (Whisper through n8n). Never throws — a failed transcription just leaves the box as-is.
  const startNativeRecording = async () => {
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) {
        setListening(false);
        setMicError(true);
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch {
      setListening(false);
      setMicError(true);
    }
  };

  const stopNativeRecording = async () => {
    try {
      await recorder.stop();
      const uri = recorder.uri;
      const spoken = uri ? await transcribe(uri, lang) : '';
      if (spoken) setText((p) => (p.trim() ? p.trim() + ' ' + spoken : spoken));
    } catch {
      /* ignore — the mic simply does nothing */
    }
    setListening(false);
  };

  // Web (when an STT webhook is configured): record with MediaRecorder → send to the n8n
  // Whisper workflow → drop the transcript in. This makes the STT workflow run on web too.
  const startWebRecording = async () => {
    try {
      const md = navigator?.mediaDevices;
      if (!md || typeof MediaRecorder === 'undefined') {
        setListening(false);
        setMicError(true);
        return;
      }
      const stream = await md.getUserMedia({ audio: true });
      webStreamRef.current = stream;
      webChunksRef.current = [];
      const rec = new MediaRecorder(stream);
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) webChunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        webStreamRef.current?.getTracks().forEach((t) => t.stop());
        webStreamRef.current = null;
        const blob = new Blob(webChunksRef.current, { type: rec.mimeType || 'audio/webm' });
        const spoken = await transcribe(blob, lang);
        if (spoken) setText((p) => (p.trim() ? p.trim() + ' ' + spoken : spoken));
        setListening(false);
      };
      rec.start();
      webRecRef.current = rec;
    } catch {
      setListening(false);
      setMicError(true);
      webRecRef.current = null;
    }
  };

  const stopWebRecording = () => {
    const rec = webRecRef.current;
    webRecRef.current = null;
    if (rec && rec.state !== 'inactive') {
      try {
        rec.stop(); // onstop fires → transcribe → insert text
      } catch {
        setListening(false);
      }
    } else {
      setListening(false);
    }
  };

  // Dictation: on web, use the n8n Whisper workflow if configured, else the browser's
  // built-in Web Speech; on native, expo-audio + the STT webhook.
  const startVoice = () => {
    setMicError(false);
    setListening(true);
    if (Platform.OS !== 'web') {
      void startNativeRecording();
      return;
    }
    // Prefer the configured Whisper webhook so the user's own workflow runs.
    if (isTranscribeConfigured()) {
      void startWebRecording();
      return;
    }
    // Fallback: browser dictation (Chromium only).
    if (!SpeechRecognition) {
      setListening(false);
      setMicError(true);
      return;
    }
    try {
      const Ctor = SpeechRecognition as new () => {
        lang: string;
        interimResults: boolean;
        continuous: boolean;
        start: () => void;
        stop: () => void;
        onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
        onerror: (e: { error?: string }) => void;
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
      rec.onerror = (e) => {
        setListening(false);
        recRef.current = null;
        // Only a real permission / hardware problem is worth surfacing — not a quick
        // release ('aborted') or silence ('no-speech').
        const err = e?.error ?? '';
        if (err === 'not-allowed' || err === 'service-not-allowed' || err === 'audio-capture') {
          setMicError(true);
        }
      };
      rec.onend = () => setListening(false);
      recRef.current = rec;
      rec.start();
    } catch {
      recRef.current = null;
      setListening(false);
      setMicError(true);
    }
  };

  const stopVoice = () => {
    if (Platform.OS !== 'web') {
      void stopNativeRecording();
      return;
    }
    if (isTranscribeConfigured()) {
      stopWebRecording();
      return;
    }
    setListening(false);
    if (recRef.current) {
      try {
        recRef.current.stop(); // onresult already captured whatever was said
      } catch {
        /* ignore */
      }
      recRef.current = null;
    }
  };

  // Tap the mic to start dictating, tap again to stop — friendlier than push-to-talk.
  const toggleVoice = () => {
    if (listening) stopVoice();
    else startVoice();
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
        <Text
          style={[styles.hint, micError && styles.hintError, { textAlign: textStart(isRTL), writingDirection: writingDirection(isRTL) }]}
          numberOfLines={1}
        >
          {micError ? strings.micBlocked : listening ? strings.listening : (hint ?? strings.capHint)}
        </Text>
        <Pressable
          onPress={toggleVoice}
          style={[styles.mic, listening && styles.micOn]}
          accessibilityRole="button"
          accessibilityLabel={strings.listening}
          accessibilityState={{ selected: listening }}
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
  hintError: { color: colors.rust, fontFamily: ff('600') },
  mic: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.micBg, alignItems: 'center', justifyContent: 'center' },
  micOn: { backgroundColor: colors.green },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  flip: { transform: [{ scaleX: -1 }] },
});
