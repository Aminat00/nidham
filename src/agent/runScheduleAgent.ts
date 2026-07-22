/**
 * runScheduleAgent — mirrors runProjectAgent (same env transport, 20s timeout, NEVER throws).
 * On unconfigured/failure/bad shape it falls back to the deterministic localSchedule, so
 * auto-scheduling always completes.
 */
import type { SchedulePayload, ScheduleResult, SchedulePlacement } from './scheduleContract';
import { SCHEDULER_SYSTEM_PROMPT } from './scheduleSystemPrompt';
import { localSchedule } from '../state/schedule';
import type { Window } from '../types/item';

type AgentMode = 'webhook' | 'direct';
const MODE = (process.env.EXPO_PUBLIC_AGENT_MODE as AgentMode | undefined) ?? 'webhook';
const URL = process.env.EXPO_PUBLIC_AGENT_URL ?? '';
const KEY = process.env.EXPO_PUBLIC_AGENT_KEY ?? '';
const MODEL = process.env.EXPO_PUBLIC_AGENT_MODEL ?? 'gpt-4o-mini';
const REQUEST_TIMEOUT_MS = 20_000;

const WINDOWS: Window[] = ['fajr','morning','dhuhr','afternoon','asr','maghrib','isha','evening','anytime'];

export function isScheduleAgentConfigured(): boolean {
  if (MODE === 'webhook') return URL.trim().length > 0;
  if (MODE === 'direct') return KEY.trim().length > 0;
  return false;
}

function fallback(payload: SchedulePayload, reason: string): ScheduleResult {
  // eslint-disable-next-line no-console
  console.warn(`[runScheduleAgent] using fallback — ${reason}`);
  return { placements: localSchedule(payload.subtasks, payload.context, payload.spread) };
}

function normalize(raw: unknown): ScheduleResult | null {
  const candidates: unknown[] = [raw];
  if (raw && typeof raw === 'object') {
    const r = raw as Record<string, unknown>;
    candidates.push(r.output, r.data, r.json, r.result, r.response);
    if (Array.isArray(raw)) candidates.push(raw[0]);
  }
  for (const c of candidates) {
    if (!c || typeof c !== 'object') continue;
    const arr = (c as Record<string, unknown>).placements;
    if (!Array.isArray(arr)) continue;
    const placements: SchedulePlacement[] = [];
    for (const p of arr) {
      if (!p || typeof p !== 'object') continue;
      const v = p as Record<string, unknown>;
      if (typeof v.subtaskId === 'string' && typeof v.day === 'string' && typeof v.window === 'string' && WINDOWS.includes(v.window as Window)) {
        const time = typeof v.time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v.time) ? v.time : undefined;
        placements.push({ subtaskId: v.subtaskId, day: v.day, window: v.window as Window, ...(time ? { time } : {}), rationale: typeof v.rationale === 'string' ? v.rationale : undefined });
      }
    }
    if (placements.length) return { placements };
  }
  return null;
}

async function fetchWithTimeout(input: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try { return await fetch(input, { ...init, signal: controller.signal }); }
  finally { clearTimeout(timer); }
}

async function callWebhook(payload: SchedulePayload): Promise<ScheduleResult> {
  const res = await fetchWithTimeout(URL, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, agent: 'schedule' }),
  });
  if (!res.ok) throw new Error(`webhook HTTP ${res.status}`);
  const parsed = normalize(await res.json());
  if (!parsed) throw new Error('webhook returned an unrecognized shape');
  return parsed;
}

async function callDirect(payload: SchedulePayload): Promise<ScheduleResult> {
  const res = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      model: MODEL, max_tokens: 1200, response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SCHEDULER_SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify(payload) },
      ],
    }),
  });
  if (!res.ok) throw new Error(`direct HTTP ${res.status}`);
  const body = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = body.choices?.[0]?.message?.content ?? '';
  let json: unknown;
  try { json = JSON.parse(text); } catch { throw new Error('direct response was not valid JSON'); }
  const parsed = normalize(json);
  if (!parsed) throw new Error('direct returned an unrecognized shape');
  return parsed;
}

export async function runScheduleAgent(payload: SchedulePayload): Promise<ScheduleResult> {
  if (payload.subtasks.length === 0) return { placements: [] };
  if (!isScheduleAgentConfigured()) return fallback(payload, `mode "${MODE}" not configured`);
  try {
    return MODE === 'direct' ? await callDirect(payload) : await callWebhook(payload);
  } catch (err) {
    return fallback(payload, err instanceof Error ? err.message : 'unknown error');
  }
}
