/**
 * transcribe — the ONE swappable module for voice → text, mirroring `runAgent`.
 *
 * It POSTs the recorded audio to an n8n webhook that runs Whisper (OpenAI) server-side,
 * so the speech-to-text key never lives in the app. Configured entirely by env:
 *   EXPO_PUBLIC_STT_URL = n8n webhook that transcribes audio → { text }
 *
 * Like the agent, it NEVER throws: if unconfigured or the call fails, it resolves to an
 * empty string and the mic simply does nothing (the user can still type). The language is
 * sent as a hint so Whisper decodes en / tr / ar correctly.
 */

import type { Lang } from '../i18n/strings';

const STT_URL = process.env.EXPO_PUBLIC_STT_URL ?? '';
const REQUEST_TIMEOUT_MS = 30_000;

/** Whether a speech-to-text endpoint is configured. */
export function isTranscribeConfigured(): boolean {
  return STT_URL.trim().length > 0;
}

/**
 * Send recorded audio to the STT webhook and return the transcript. Accepts either a
 * file uri (native, from expo-audio) or a Blob (web, from MediaRecorder). Returns '' on any
 * failure so the caller can degrade gracefully.
 */
export async function transcribe(audio: string | Blob, lang: Lang): Promise<string> {
  if (!isTranscribeConfigured() || !audio) return '';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const form = new FormData();
    if (typeof audio === 'string') {
      // Native: RN's FormData accepts a { uri, name, type } file part.
      form.append('file', { uri: audio, name: 'audio.m4a', type: 'audio/m4a' } as unknown as Blob);
    } else {
      // Web: a real Blob from MediaRecorder.
      form.append('file', audio, 'audio.webm');
    }
    form.append('lang', lang);

    const res = await fetch(STT_URL, { method: 'POST', body: form, signal: controller.signal });
    if (!res.ok) throw new Error(`stt HTTP ${res.status}`);
    const data = (await res.json()) as { text?: unknown };
    return typeof data.text === 'string' ? data.text.trim() : '';
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[transcribe] failed —', err instanceof Error ? err.message : 'unknown error');
    return '';
  } finally {
    clearTimeout(timer);
  }
}
