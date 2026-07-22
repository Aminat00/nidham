/**
 * runCaptureAgent — the FIRST turn of a capture. Mirrors runProjectAgent's transport
 * (same env, 20s timeout, never throws). Classifies: a small thing → a clean task; a
 * project-sized goal → `route` (the app then hands it to the Project agent). On
 * unconfigured/failure it falls back to the local triage so capture always works offline.
 */
import type { CapturePayload, CaptureResult, CaptureTask } from './captureContract';
import { CAPTURE_SYSTEM_PROMPT } from './captureSystemPrompt';
import { triageCapture } from './triage';
import { candidateObjects } from './unwrap';
import type { Area } from '../types/item';

type AgentMode = 'webhook' | 'direct';
const MODE = (process.env.EXPO_PUBLIC_AGENT_MODE as AgentMode | undefined) ?? 'webhook';
const URL = process.env.EXPO_PUBLIC_AGENT_URL ?? '';
const KEY = process.env.EXPO_PUBLIC_AGENT_KEY ?? '';
const MODEL = process.env.EXPO_PUBLIC_AGENT_MODEL ?? 'gpt-4o-mini';
const REQUEST_TIMEOUT_MS = 20_000;

export function isCaptureAgentConfigured(): boolean {
  if (MODE === 'webhook') return URL.trim().length > 0;
  if (MODE === 'direct') return KEY.trim().length > 0;
  return false;
}

/** Build a CaptureResult locally from the deterministic triage. */
function localFallback(payload: CapturePayload, reason: string): CaptureResult {
  // eslint-disable-next-line no-console
  console.warn(`[runCaptureAgent] using fallback — ${reason}`);
  const text = payload.capture.trim();
  const tri = triageCapture(text);
  if (tri.kind === 'project') return { kind: 'route', to: 'project' };
  const area: Area = tri.area === 'project' ? 'personal' : tri.area;
  const task: CaptureTask = {
    title: text,
    area,
    category: area === 'errand' || area === 'chore' ? 'errand' : 'task',
    urgency: tri.scheduleToday ? 'today' : 'soon',
    energy: 'light',
    scheduleToday: tri.scheduleToday,
  };
  return { kind: 'task', task };
}

/** Narrow an unknown response (task branch OR project branch) into a CaptureResult. */
function normalize(raw: unknown): CaptureResult | null {
  for (const v of candidateObjects(raw)) {
    const kind = v.kind ?? (v.type as unknown); // project branch may use `type`
    if (kind === 'task' && v.task && typeof v.task === 'object') {
      const t = v.task as Record<string, unknown>;
      if (typeof t.title === 'string' && typeof t.area === 'string') {
        return { kind: 'task', task: {
          title: t.title, area: t.area as Area,
          category: t.category === 'errand' ? 'errand' : 'task',
          urgency: (t.urgency as CaptureTask['urgency']) ?? 'soon',
          energy: (t.energy as CaptureTask['energy']) ?? 'light',
          ...(typeof t.timeContext === 'string' ? { timeContext: t.timeContext } : {}),
          scheduleToday: t.scheduleToday === true,
        } };
      }
    }
    // Any recognized non-task response means "it's a project" → hand off to the Project agent.
    // (Covers the new `route` and, for back-compat, an older `ask`/`plan` capture prompt.)
    if (kind === 'route' || kind === 'ask' || kind === 'plan') return { kind: 'route', to: 'project' };
  }
  return null;
}

async function fetchWithTimeout(input: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try { return await fetch(input, { ...init, signal: controller.signal }); }
  finally { clearTimeout(timer); }
}

async function callWebhook(payload: CapturePayload): Promise<CaptureResult> {
  const res = await fetchWithTimeout(URL, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, agent: 'capture' }),
  });
  if (!res.ok) throw new Error(`webhook HTTP ${res.status}`);
  const parsed = normalize(await res.json());
  if (!parsed) throw new Error('webhook returned an unrecognized shape');
  return parsed;
}

async function callDirect(payload: CapturePayload): Promise<CaptureResult> {
  const res = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      model: MODEL, max_tokens: 800, response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: CAPTURE_SYSTEM_PROMPT },
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

export async function runCaptureAgent(payload: CapturePayload): Promise<CaptureResult> {
  if (!isCaptureAgentConfigured()) return localFallback(payload, `mode "${MODE}" not configured`);
  try {
    return MODE === 'direct' ? await callDirect(payload) : await callWebhook(payload);
  } catch (err) {
    return localFallback(payload, err instanceof Error ? err.message : 'unknown error');
  }
}
