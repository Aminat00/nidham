/**
 * runAgent — the ONE swappable module the whole app talks to.
 *
 * The model call is configured entirely by env (never hardcoded):
 *   EXPO_PUBLIC_AGENT_MODE = "webhook" | "direct"
 *   EXPO_PUBLIC_AGENT_URL  = n8n webhook that runs Triage → Planner → Breakdown
 *   EXPO_PUBLIC_AGENT_KEY  = model key (direct mode only)
 *
 * - "webhook" (preferred): POST the payload to n8n; the key stays server-side.
 * - "direct": call the model directly with the orchestrator system prompt.
 * - If unconfigured OR the call fails/times out, we ALWAYS return the built-in
 *   sample plan. A failed call can never break the demo.
 *
 * The three agents (Triage, Planner, Breakdown) are prompts run through this same
 * function; swapping the endpoint changes nothing in the UI.
 */

import type { AgentPayload } from './contract';
import type { AgentResponse, RawItem } from '../types/item';
import { ORCHESTRATOR_SYSTEM_PROMPT } from './systemPrompt';
import { buildFallback } from '../data/samplePlan';

type AgentMode = 'webhook' | 'direct';

const MODE = (process.env.EXPO_PUBLIC_AGENT_MODE as AgentMode | undefined) ?? 'webhook';
const URL = process.env.EXPO_PUBLIC_AGENT_URL ?? '';
const KEY = process.env.EXPO_PUBLIC_AGENT_KEY ?? '';
const MODEL = process.env.EXPO_PUBLIC_AGENT_MODEL ?? 'claude-sonnet-5';

const REQUEST_TIMEOUT_MS = 20_000;

/** Whether a real endpoint is configured. If not, we go straight to fallback. */
export function isAgentConfigured(): boolean {
  if (MODE === 'webhook') return URL.trim().length > 0;
  if (MODE === 'direct') return KEY.trim().length > 0;
  return false;
}

/** The ISO date ("YYYY-MM-DD") portion of context.now. */
function dayOf(payload: AgentPayload): string {
  return payload.context.now.slice(0, 10);
}

function fallback(payload: AgentPayload, reason: string): AgentResponse {
  // eslint-disable-next-line no-console
  console.warn(`[runAgent] using fallback plan — ${reason}`);
  const seed = `${dayOf(payload)}-${payload.capture.length}-${payload.context.existingItems.length}`;
  return buildFallback(payload.capture, payload.context.lang, dayOf(payload), seed);
}

/** Minimal shape guard: a usable response has a summary and an items array. */
function looksValid(value: unknown): value is AgentResponse {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.summary === 'string' && Array.isArray(v.items);
}

/** Unwrap common envelope shapes (n8n often nests under output/data/json). */
function normalize(raw: unknown): AgentResponse | null {
  const candidates: unknown[] = [raw];
  if (raw && typeof raw === 'object') {
    const r = raw as Record<string, unknown>;
    candidates.push(r.output, r.data, r.json, r.result, r.response);
    if (Array.isArray(r)) candidates.push(r[0]);
  }
  for (const c of candidates) {
    if (looksValid(c)) {
      return { summary: c.summary, items: c.items as RawItem[] };
    }
  }
  return null;
}

async function fetchWithTimeout(input: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** "webhook" mode — n8n owns the prompt and the model key server-side. */
async function callWebhook(payload: AgentPayload): Promise<AgentResponse> {
  const res = await fetchWithTimeout(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`webhook HTTP ${res.status}`);
  const parsed = normalize(await res.json());
  if (!parsed) throw new Error('webhook returned an unrecognized shape');
  return parsed;
}

/**
 * "direct" mode — call the model with the orchestrator system prompt. Implemented
 * against the Anthropic Messages API. Note: a client-side key is insecure; webhook
 * mode is preferred for anything but local testing.
 */
async function callDirect(payload: AgentPayload): Promise<AgentResponse> {
  const res = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2048,
      system: ORCHESTRATOR_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: JSON.stringify(payload) }],
    }),
  });
  if (!res.ok) throw new Error(`direct HTTP ${res.status}`);
  const body = (await res.json()) as { content?: Array<{ text?: string }> };
  const text = body.content?.[0]?.text ?? '';
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error('direct response was not valid JSON');
  }
  const parsed = normalize(json);
  if (!parsed) throw new Error('direct returned an unrecognized shape');
  return parsed;
}

/**
 * Turn one raw brain-dump into a scheduled, prayer-anchored plan.
 * Never throws — worst case it resolves to the built-in sample plan.
 */
export async function runAgent(payload: AgentPayload): Promise<AgentResponse> {
  if (!isAgentConfigured()) {
    return fallback(payload, `mode "${MODE}" not configured`);
  }
  try {
    return MODE === 'direct' ? await callDirect(payload) : await callWebhook(payload);
  } catch (err) {
    return fallback(payload, err instanceof Error ? err.message : 'unknown error');
  }
}
