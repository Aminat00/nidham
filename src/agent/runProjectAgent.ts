/**
 * runProjectAgent — the swappable module for the Project interview, mirroring
 * `runAgent`. Same env config (EXPO_PUBLIC_AGENT_MODE / URL / KEY), same 20 s timeout,
 * same guarantee: it NEVER throws. On unconfigured / failure / bad shape it resolves to
 * the deterministic `fallbackProjectTurn`, so the interview always advances.
 *
 * It returns one turn at a time — either `{type:'ask'}` (one more question) or
 * `{type:'plan'}` (the finished plan). The caller loops, appending each user answer, and
 * caps the interview at 3 answers client-side.
 */

import type { ProjectPayload, ProjectPlan, ProjectTurn } from './projectContract';
import { PROJECT_SYSTEM_PROMPT } from './projectSystemPrompt';
import { fallbackProjectTurn } from './projectFallback';
import { candidateObjects } from './unwrap';

type AgentMode = 'webhook' | 'direct';

const MODE = (process.env.EXPO_PUBLIC_AGENT_MODE as AgentMode | undefined) ?? 'webhook';
// A dedicated project-agent URL is allowed; otherwise reuse the capture webhook.
const URL = process.env.EXPO_PUBLIC_PROJECT_AGENT_URL ?? process.env.EXPO_PUBLIC_AGENT_URL ?? '';
const KEY = process.env.EXPO_PUBLIC_AGENT_KEY ?? '';
const MODEL = process.env.EXPO_PUBLIC_AGENT_MODEL ?? 'claude-sonnet-5';

// The project turn runs a research-backed plan (Tavily search + a large multi-phase
// generation) in n8n — it legitimately takes 25-45s. A 20s cap aborted mid-run and
// silently dropped the real plan onto the fallback. Give it real room; override via env.
const REQUEST_TIMEOUT_MS = Number(process.env.EXPO_PUBLIC_PROJECT_TIMEOUT_MS) || 120_000;

export function isProjectAgentConfigured(): boolean {
  if (MODE === 'webhook') return URL.trim().length > 0;
  if (MODE === 'direct') return KEY.trim().length > 0;
  return false;
}

function fallback(payload: ProjectPayload, reason: string): ProjectTurn {
  // eslint-disable-next-line no-console
  console.warn(`[runProjectAgent] using fallback — ${reason}`);
  return fallbackProjectTurn(payload);
}

function isPlan(value: unknown): value is ProjectPlan {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.title === 'string' && Array.isArray(v.milestones);
}

/** Validate + narrow an unknown value into a ProjectTurn. */
function asTurn(value: unknown): ProjectTurn | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (v.type === 'ask' && typeof v.question === 'string') {
    return { type: 'ask', question: v.question };
  }
  if (v.type === 'plan' && typeof v.summary === 'string' && isPlan(v.project)) {
    return { type: 'plan', summary: v.summary, project: v.project };
  }
  return null;
}

/** Unwrap whatever the transport returned (string / envelope / array) into a ProjectTurn. */
export function normalize(raw: unknown): ProjectTurn | null {
  for (const c of candidateObjects(raw)) {
    const turn = asTurn(c);
    if (turn) return turn;
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

async function callWebhook(payload: ProjectPayload): Promise<ProjectTurn> {
  const res = await fetchWithTimeout(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, agent: 'project' }),
  });
  if (!res.ok) throw new Error(`webhook HTTP ${res.status}`);
  const parsed = normalize(await res.json());
  if (!parsed) throw new Error('webhook returned an unrecognized shape');
  return parsed;
}

async function callDirect(payload: ProjectPayload): Promise<ProjectTurn> {
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
      system: PROJECT_SYSTEM_PROMPT,
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

/** One interview turn. Never throws — worst case, the deterministic fallback. */
export async function runProjectAgent(payload: ProjectPayload): Promise<ProjectTurn> {
  if (!isProjectAgentConfigured()) {
    return fallback(payload, `mode "${MODE}" not configured`);
  }
  try {
    return MODE === 'direct' ? await callDirect(payload) : await callWebhook(payload);
  } catch (err) {
    return fallback(payload, err instanceof Error ? err.message : 'unknown error');
  }
}
