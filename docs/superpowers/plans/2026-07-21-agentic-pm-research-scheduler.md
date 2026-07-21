# Agentic PM System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the Project agent into a research-backed PM that produces day-sized subtasks and add a Scheduler agent that auto-schedules them onto days + prayer windows.

**Architecture:** Additive type/contract changes; a new pure `localSchedule` + `runScheduleAgent` (mirrors `runProjectAgent`, never throws); the PM prompt is upgraded and the plan flattener carries `estimate`/`energy`; CaptureScreen auto-schedules after a plan. The Research (Tavily) step and Scheduler n8n branch are applied by the user via an updated (git-ignored) reference workflow.

**Tech Stack:** Expo SDK 54, React Native 0.81.5, React 19.1.0, TypeScript ~5.9.2 (strict), Jest + ts-jest. n8n + OpenAI (gpt-4o-mini) + Tavily.

## Global Constraints

- Jest is pure-logic only (`testEnvironment: node`, `testMatch: **/src/**/*.test.ts`). Do NOT import `react-native` into a `.test.ts`. RN components/agents-with-transport are verified via `npm run typecheck` + Expo web preview.
- Test command: `npm test`. Typecheck: `npm run typecheck`.
- Commits: plain messages, NO `Co-Authored-By` trailer.
- Layout: flex + `gap`; numeric `fontSize` via `fs()`; style via `../theme/tokens`; RTL-aware.
- Each agent NEVER throws — on any failure it returns a deterministic local fallback.
- The **app-facing PM contract stays `{type:'ask'} | {type:'plan'}`** — research is n8n-internal. `estimate`/`energy` on steps are additive.
- **Never commit the n8n workflow JSON** (`docs/*.n8n.json` is git-ignored). Prompts live canonically in the TS files; n8n is applied by the user.
- Scheduler defaults: **load cap 3 planned items/day**, **horizon 7 days**, `deep`→morning window.
- Auto-schedule applies to project subtasks only; loose-task capture is unchanged.

---

### Task 1: Extend contracts (types only)

**Files:**
- Modify: `src/agent/contract.ts` (add `day` to `ExistingItemRef`)
- Modify: `src/agent/projectContract.ts` (add `estimate`/`energy` to `ProjectPlanStep`)
- Create: `src/agent/scheduleContract.ts`

**Interfaces:**
- Produces: `ExistingItemRef.day?: string | null`; `ProjectPlanStep.estimate?: string`, `ProjectPlanStep.energy?: Energy`; `SchedulableSubtask`, `SchedulePayload`, `SchedulePlacement`, `ScheduleResult`.

- [ ] **Step 1: Add `day` to `ExistingItemRef`**

In `src/agent/contract.ts`, in `interface ExistingItemRef` (after `window: string;`):
```ts
  /** ISO date the item is scheduled for, so the scheduler sees the busy map. */
  day?: string | null;
```

- [ ] **Step 2: Extend `ProjectPlanStep`**

In `src/agent/projectContract.ts`, add to `interface ProjectPlanStep` (import `Energy`):
```ts
import type { Energy } from '../types/item';
```
```ts
  /** Rough size, e.g. "~half a day", "~2h". */
  estimate?: string;
  /** Cognitive load — drives energy-aware scheduling. */
  energy?: Energy;
```

- [ ] **Step 3: Create the schedule contract**

`src/agent/scheduleContract.ts`:
```ts
/**
 * Scheduler agent contract — takes the project's day-sized subtasks + Context and returns
 * where each should sit (day + prayer window). Consumed by runScheduleAgent; the app applies
 * each placement via scheduleItem. Mirrors the swappable-module philosophy of the others.
 */
import type { AgentContext } from './contract';
import type { Window, Energy, Urgency } from '../types/item';

export interface SchedulableSubtask {
  id: string;
  title: string;
  estimate?: string;
  energy?: Energy;
  timeContext?: string;   // spoken/parsed time hint, e.g. "Wednesday or weekends" — a signal
  urgency?: Urgency;      // a signal
}

export interface SchedulePayload {
  subtasks: SchedulableSubtask[];
  context: AgentContext;
  /** true = project batch (fill near-horizon); false/omitted = loose (schedule-on-signal only). */
  spread?: boolean;
}

export interface SchedulePlacement {
  subtaskId: string;   // echoed verbatim from the payload
  day: string;         // ISO date "YYYY-MM-DD"
  window: Window;      // prayer-anchored
  rationale?: string;
}

export interface ScheduleResult {
  placements: SchedulePlacement[];
}
```

- [ ] **Step 4: Verify typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**
```bash
git add src/agent/contract.ts src/agent/projectContract.ts src/agent/scheduleContract.ts
git commit -m "Contracts: existingItems.day, step estimate/energy, schedule contract"
```

---

### Task 2: Flatten `estimate`/`energy` onto step Items

**Files:**
- Modify: `src/state/flattenProject.ts:54-71`
- Test: `src/state/flattenProject.test.ts`

**Interfaces:**
- Consumes: `ProjectPlanStep.estimate`/`energy` (Task 1).
- Produces: step `Item`s whose `energy` = `step.energy ?? 'light'` and `note` = `step.note ?? step.estimate`.

- [ ] **Step 1: Write the failing test**

Add to `src/state/flattenProject.test.ts`:
```ts
import { flattenProjectPlan } from './flattenProject';

describe('flattenProjectPlan — estimate/energy on subtasks', () => {
  it('maps step energy and uses estimate as note when no note', () => {
    const { items } = flattenProjectPlan(
      { title: 'P', milestones: [{ title: 'M', steps: [
        { title: 'Deep one', energy: 'deep', estimate: '~2h', startHere: true },
        { title: 'Has note', energy: 'admin', estimate: '~30m', note: 'call first' },
      ] }] },
      { idSeed: 'x' },
    );
    const steps = items.filter((i) => i.category === 'step');
    expect(steps[0].energy).toBe('deep');
    expect(steps[0].note).toBe('~2h');       // estimate used when no note
    expect(steps[1].energy).toBe('admin');
    expect(steps[1].note).toBe('call first'); // explicit note wins
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- flattenProject`
Expected: FAIL (steps[0].energy is 'light', note undefined).

- [ ] **Step 3: Implement**

In `src/state/flattenProject.ts`, the step push (lines ~57-70) — change `energy` and `note`:
```ts
        energy: s.energy ?? 'light',
        status: 'pending',
        startHere: s.startHere,
        note: s.note ?? s.estimate,
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- flattenProject`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/state/flattenProject.ts src/state/flattenProject.test.ts
git commit -m "Flatten: carry subtask energy + estimate onto step Items"
```

---

### Task 3: Pure `localSchedule` + tests

**Files:**
- Modify: `src/state/schedule.ts`
- Test: `src/state/schedule.test.ts`

**Interfaces:**
- Consumes: `SchedulableSubtask` from `../agent/scheduleContract`; `AgentContext` from `../agent/contract`; `addDays` from `../utils/dates`; `Window` from `../types/item`.
- Produces: `localSchedule(subtasks: SchedulableSubtask[], context: AgentContext): SchedulePlacement[]`, and exported consts `LOAD_CAP = 3`, `HORIZON_DAYS = 7`.

- [ ] **Step 1: Write the failing test**

Add to `src/state/schedule.test.ts`:
```ts
import { localSchedule, parseDayHint } from './schedule';
import type { SchedulableSubtask } from '../agent/scheduleContract';

const NOW = '2026-07-21T09:00:00+03:00'; // 2026-07-21 is a Monday
const ctx = (existing: Array<{ day?: string | null }> = []) => ({
  now: NOW, lang: 'en' as const,
  prayerTimes: { fajr: '03:51', dhuhr: '13:15', asr: '17:13', maghrib: '20:39', isha: '22:21' },
  existingItems: existing.map((e, i) => ({ id: 'e' + i, title: 't', window: 'anytime', day: e.day })),
});
const subs = (n: number, extra: Partial<SchedulableSubtask> = {}): SchedulableSubtask[] =>
  Array.from({ length: n }, (_, i) => ({ id: 's' + i, title: 'sub' + i, ...extra }));

describe('parseDayHint', () => {
  it('resolves a weekday name to the nearest such day (today or later)', () => {
    expect(parseDayHint('go Wednesday', '2026-07-21')).toBe('2026-07-23'); // Mon → Wed
  });
  it('handles tomorrow / weekend / today, and null when no hint', () => {
    expect(parseDayHint('tomorrow', '2026-07-21')).toBe('2026-07-22');
    expect(parseDayHint('on weekends', '2026-07-21')).toBe('2026-07-26'); // Saturday
    expect(parseDayHint('today please', '2026-07-21')).toBe('2026-07-21');
    expect(parseDayHint('buy a bag', '2026-07-21')).toBeNull();
    expect(parseDayHint(undefined, '2026-07-21')).toBeNull();
  });
});

describe('localSchedule — spread (project batch)', () => {
  it('fills a day to the load cap (3) then moves to the next day', () => {
    const p = localSchedule(subs(5), ctx(), true);
    expect(p.map((x) => x.day)).toEqual(['2026-07-21', '2026-07-21', '2026-07-21', '2026-07-22', '2026-07-22']);
  });
  it('deep → morning, light → anytime; skips full existing days; caps at the horizon', () => {
    expect(localSchedule(subs(1, { energy: 'deep' }), ctx(), true)[0].window).toBe('morning');
    expect(localSchedule(subs(1, { energy: 'light' }), ctx(), true)[0].window).toBe('anytime');
    const full = ctx([{ day: '2026-07-21' }, { day: '2026-07-21' }, { day: '2026-07-21' }]);
    expect(localSchedule(subs(1), full, true)[0].day).toBe('2026-07-22');
    expect(localSchedule(subs(30), ctx(), true).length).toBe(21); // 7 days * 3
  });
});

describe('localSchedule — on-signal (loose)', () => {
  it('places urgency today → today, a weekday hint → that day, and omits no-signal items', () => {
    const p = localSchedule(
      [
        { id: 'a', title: 'urgent', urgency: 'today' },
        { id: 'b', title: 'bag', timeContext: 'Wednesday or weekends' },
        { id: 'c', title: 'someday', urgency: 'someday' },
      ],
      ctx(),
      false,
    );
    expect(p.find((x) => x.subtaskId === 'a')?.day).toBe('2026-07-21');
    expect(p.find((x) => x.subtaskId === 'b')?.day).toBe('2026-07-23'); // next Wednesday
    expect(p.find((x) => x.subtaskId === 'c')).toBeUndefined(); // omitted (no signal)
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- schedule`
Expected: FAIL — `localSchedule` not exported.

- [ ] **Step 3: Implement**

Add to `src/state/schedule.ts` (imports at top: `import { addDays, weekdayIndex } from '../utils/dates';`, `import type { AgentContext } from '../agent/contract';`, `import type { SchedulableSubtask, SchedulePlacement } from '../agent/scheduleContract';`; `Window` is already imported from `../types/item`):
```ts
export const LOAD_CAP = 3;
export const HORIZON_DAYS = 7;

const WEEKDAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/** Resolve a spoken time hint to the nearest ISO day (today or later), or null if none found. */
export function parseDayHint(hint: string | undefined, todayIso: string): string | null {
  if (!hint) return null;
  const h = hint.toLowerCase();
  if (/\btomorrow\b/.test(h)) return addDays(todayIso, 1);
  if (/\btoday\b|\btonight\b/.test(h)) return todayIso;
  const nextDow = (target: number) => addDays(todayIso, (target - weekdayIndex(todayIso) + 7) % 7);
  if (/\bweekend\b|\bweekends\b/.test(h)) return nextDow(6); // Saturday
  for (let i = 0; i < 7; i++) if (new RegExp(`\\b${WEEKDAY_NAMES[i]}\\b`).test(h)) return nextDow(i);
  return null;
}

function place(sub: SchedulableSubtask, day: string): SchedulePlacement {
  const deep = sub.energy === 'deep';
  const window: Window = deep ? 'morning' : 'anytime';
  return { subtaskId: sub.id, day, window, rationale: deep ? 'deep work → morning' : 'placed in an open slot' };
}

/**
 * Deterministic offline scheduler (also the runScheduleAgent fallback).
 * - spread=true (project batch): fill each day to LOAD_CAP within HORIZON_DAYS from `now`,
 *   skipping days already full per context.existingItems; overflow stays unscheduled.
 * - spread=false (loose): place each item ONLY on a signal — urgency now/today → today, or
 *   parseDayHint(timeContext) → that day; omit no-signal items.
 */
export function localSchedule(subtasks: SchedulableSubtask[], context: AgentContext, spread = false): SchedulePlacement[] {
  const today = context.now.slice(0, 10);
  const placements: SchedulePlacement[] = [];
  if (spread) {
    const dayCount: Record<string, number> = {};
    for (const it of context.existingItems) if (it.day) dayCount[it.day] = (dayCount[it.day] ?? 0) + 1;
    let cursor = 0;
    for (const sub of subtasks) {
      let placedDay: string | null = null;
      for (let d = cursor; d < HORIZON_DAYS; d++) {
        const date = addDays(today, d);
        if ((dayCount[date] ?? 0) < LOAD_CAP) { placedDay = date; dayCount[date] = (dayCount[date] ?? 0) + 1; cursor = d; break; }
      }
      if (!placedDay) break;
      placements.push(place(sub, placedDay));
    }
  } else {
    for (const sub of subtasks) {
      const target = sub.urgency === 'now' || sub.urgency === 'today' ? today : parseDayHint(sub.timeContext, today);
      if (target) placements.push(place(sub, target));
    }
  }
  return placements;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- schedule`
Expected: PASS (existing schedule tests + 4 new).

- [ ] **Step 5: Commit**
```bash
git add src/state/schedule.ts src/state/schedule.test.ts
git commit -m "Schedule: pure localSchedule (load cap, horizon, energy-aware, existing busy map)"
```

---

### Task 4: Scheduler prompt + `runScheduleAgent` + tests

**Files:**
- Create: `src/agent/scheduleSystemPrompt.ts`
- Create: `src/agent/runScheduleAgent.ts`
- Test: `src/agent/runScheduleAgent.test.ts`

**Interfaces:**
- Consumes: `SchedulePayload`/`ScheduleResult` (Task 1); `localSchedule` (Task 3).
- Produces: `runScheduleAgent(payload: SchedulePayload): Promise<ScheduleResult>`, `isScheduleAgentConfigured(): boolean`, `SCHEDULER_SYSTEM_PROMPT`.

- [ ] **Step 1: Write the failing test**

`src/agent/runScheduleAgent.test.ts`:
```ts
import { runScheduleAgent, isScheduleAgentConfigured } from './runScheduleAgent';
import type { SchedulePayload } from './scheduleContract';

const payload: SchedulePayload = {
  subtasks: [
    { id: 'a', title: 'Deep', energy: 'deep' },
    { id: 'b', title: 'Admin', energy: 'admin' },
  ],
  spread: true, // project batch → both placed by the fallback
  context: {
    now: '2026-07-21T09:00:00+03:00', lang: 'en',
    prayerTimes: { fajr: '03:51', dhuhr: '13:15', asr: '17:13', maghrib: '20:39', isha: '22:21' },
    existingItems: [],
  },
};

describe('runScheduleAgent (unconfigured → local fallback)', () => {
  it('reports not configured with no URL/KEY', () => {
    expect(isScheduleAgentConfigured()).toBe(false);
  });
  it('returns placements for every subtask, echoing ids, without throwing', async () => {
    const { placements } = await runScheduleAgent(payload);
    expect(placements.map((p) => p.subtaskId).sort()).toEqual(['a', 'b']);
    expect(placements[0].day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- runScheduleAgent`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the prompt**

`src/agent/scheduleSystemPrompt.ts`:
```ts
/**
 * System prompt for the Scheduler agent (direct mode; the n8n branch keeps its own copy).
 * Places day-sized subtasks onto days + prayer windows around the user's existing load.
 */
export const SCHEDULER_SYSTEM_PROMPT = `You are Nidham's Scheduler. You place day-sized items
onto days and prayer windows for a Muslim user with ADHD — calm, never overloaded. The items
may be a committed project's subtasks OR a single loose task.

INPUT JSON: { "subtasks": [{ "id","title","estimate"?,"energy"?,"timeContext"?,"urgency"? }],
  "spread"?: boolean, "context": { "now": ISO8601, "lang",
  "prayerTimes": {fajr,dhuhr,asr,maghrib,isha}, "existingItems": [{ "id","title","window","day" }] } }.

POLICY
- If "spread" is true (project batch): schedule the NEAR horizon (~next 7 days from
  context.now), filling days up to the cap; leave overflow unscheduled (omit it).
- If "spread" is false/absent (loose tasks): place an item ONLY when it has a SIGNAL — a
  "timeContext" day hint (resolve "today/tonight", "tomorrow", a weekday like "Wednesday", or
  "weekend" relative to context.now → the nearest such day) OR "urgency" of "now"/"today"
  (→ today). OMIT items with no signal (they stay in the backlog).

RULES (always)
- Max 3 planned items per day. existingItems already occupy their day — count them; never
  exceed the cap. If a chosen day is full, use the next suitable day.
- Energy-aware: "deep" → the day's peak window ("morning" or "dhuhr"); "light"/"admin" →
  short gaps ("asr","maghrib","isha","anytime"). Avoid two "deep" on the same day.
- window ∈ {fajr,morning,dhuhr,afternoon,asr,maghrib,isha,evening,anytime}. Never over a prayer.
- Echo each item's "id" EXACTLY as its "subtaskId". Write "rationale" in context.lang.

OUTPUT: return ONLY JSON: { "placements": [ { "subtaskId","day":"YYYY-MM-DD","window",
  "rationale":"<short>" } ] }. Omitted items simply don't appear. No prose, no code fences.`;
```

- [ ] **Step 4: Write `runScheduleAgent`**

`src/agent/runScheduleAgent.ts`:
```ts
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
        placements.push({ subtaskId: v.subtaskId, day: v.day, window: v.window as Window, rationale: typeof v.rationale === 'string' ? v.rationale : undefined });
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
```

- [ ] **Step 5: Run test + typecheck**

Run: `npm test -- runScheduleAgent` → PASS (2 tests).
Run: `npm run typecheck` → no errors.

- [ ] **Step 6: Commit**
```bash
git add src/agent/scheduleSystemPrompt.ts src/agent/runScheduleAgent.ts src/agent/runScheduleAgent.test.ts
git commit -m "Scheduler agent: prompt + runScheduleAgent transport + localSchedule fallback"
```

---

### Task 5: Store — `subtasksOf` + `scheduledItems`

**Files:**
- Modify: `src/state/store.tsx` (add two helpers to `StoreValue` + provider + value + deps)

**Interfaces:**
- Produces (on `useStore()`): `subtasksOf(projectId: string): Item[]` (the project's step Items, via `project.steps`); `scheduledItems(): Item[]` (all non-done items that have a `day`).

- [ ] **Step 1: Add to `StoreValue` interface**

In `src/state/store.tsx`, in `interface StoreValue`:
```ts
  /** A project's day-sized subtasks (its step Items), in order. */
  subtasksOf: (projectId: string) => Item[];
  /** Every scheduled (has a `day`), not-done item — the scheduler's busy map. */
  scheduledItems: () => Item[];
```

- [ ] **Step 2: Implement in the provider**

Near the other project helpers:
```ts
const subtasksOf = useCallback((projectId: string): Item[] => {
  const proj = itemsById[projectId];
  if (!proj?.steps) return [];
  return proj.steps.map((id) => itemsById[id]).filter((i): i is Item => Boolean(i));
}, [itemsById]);

const scheduledItems = useCallback((): Item[] =>
  Object.values(itemsById).filter((i) => i.day && i.status !== 'done'),
[itemsById]);
```

- [ ] **Step 3: Expose on `value` + deps**

Add `subtasksOf, scheduledItems` to BOTH the `value` object and its `useMemo` dependency array.

- [ ] **Step 4: Verify typecheck + tests**

Run: `npm run typecheck` → no errors. Run: `npm test` → all pass (no regressions).

- [ ] **Step 5: Commit**
```bash
git add src/state/store.tsx
git commit -m "Store: subtasksOf + scheduledItems helpers"
```

---

### Task 6: Upgrade the PM system prompt

**Files:**
- Modify: `src/agent/projectSystemPrompt.ts`

**Interfaces:**
- Produces: an upgraded `PROJECT_SYSTEM_PROMPT` string (contract shape unchanged; steps now carry `estimate`/`energy`).

- [ ] **Step 1: Replace the RULES + OUTPUT sections**

In `src/agent/projectSystemPrompt.ts`, replace the `RULES` block and `OUTPUT` block with:
```ts
RULES
- Behave like a project manager who knows the user has ADHD: research over interrogation,
  minimal questions, calm and small.
- CLARIFY ONCE, ONLY IF NEEDED: if genuine you-only unknowns remain (deadline, budget, what
  they already have, which people), ask them ALL in ONE message (2-3 questions together),
  then stop asking. If the goal is already specific, skip straight to the plan. Never ask
  one-at-a-time; never more than one clarify round.
- GROUND FACTS: when research findings are provided in the input, base real-world specifics
  strictly on them. If a needed fact is missing, put it as a subtask ("Find out X") rather
  than inventing it.
- LANGUAGE — match the user, not a setting: reply in the SAME language the user is actually
  writing in (fallback to context.lang only when unclear). Never switch mid-conversation.
- If a word looks like a speech-to-text slip or contradicts the intent, confirm it in your
  question instead of planning around the wrong reading.
- PLAN: 2-4 phases (milestones), each with 2-4 DAY-SIZED subtasks (each doable in about a
  day). Every subtask has an "estimate" (e.g. "~2h", "~half a day") and an "energy"
  ("deep"|"light"|"admin"). Exactly ONE subtask across the whole plan has "startHere": true
  — the smallest first action. No subtask should feel scary.

OUTPUT: return ONLY minified JSON, no prose, no code fences. One of:
  { "type": "ask", "question": "<one message batching the essential questions, in the user's language>" }
  { "type": "plan", "summary": "<one calm line>", "project": {
      "title": "<short project title>",
      "milestones": [ { "title": "<phase>", "steps": [
        { "title": "<day-sized subtask>", "startHere": true|false, "estimate": "<e.g. ~2h>", "energy": "deep|light|admin", "note": "<optional>" }
      ] } ] } }`;
```
(Leave the intro + INPUT lines above RULES as they are.)

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck` → no errors.

- [ ] **Step 3: Commit**
```bash
git add src/agent/projectSystemPrompt.ts
git commit -m "PM prompt: batched clarify, grounded facts, day-sized subtasks with estimate/energy"
```

---

### Task 7: CaptureScreen — build busy-map + Scheduler owns all placement (projects + loose)

**Files:**
- Modify: `src/screens/CaptureScreen.tsx`
- Modify: `src/state/store.tsx` (`addCaptureTask` → always file to backlog; Scheduler places)

**Interfaces:**
- Consumes: `runScheduleAgent` (Task 4); `subtasksOf`, `scheduledItems` (Task 5); `scheduleItem`, `addCaptureTask` (existing); `CaptureTask` from `../agent/captureContract`.

- [ ] **Step 1: Wire imports + store**

In `src/screens/CaptureScreen.tsx`, add to the store destructure: `subtasksOf, scheduledItems, scheduleItem` (alongside existing `createProject`). Add import:
```ts
import { runScheduleAgent } from '../agent/runScheduleAgent';
```

- [ ] **Step 2: Build `existingItems` and add an auto-schedule helper**

Replace the two `context.existingItems: []` occurrences (in `runTurn` and `firstTurn`) so context is built from the busy map:
```ts
const buildContext = () => ({
  now: DEMO_NOW_ISO, lang, prayerTimes: times,
  existingItems: scheduledItems().map((i) => ({ id: i.id, title: i.title, window: i.window, day: i.day })),
});
```
Use `buildContext()` where the payload `context` is assembled. Then add two helpers — one for
a project batch (`spread:true`), one for a loose task (`spread:false`, on-signal):
```ts
const applyPlacements = (placements: { subtaskId: string; day: string; window: import('../types/item').Window }[]) => {
  for (const p of placements) scheduleItem(p.subtaskId, { date: p.day, window: p.window });
};

const autoScheduleProject = async (projectId: string) => {
  const subs = subtasksOf(projectId).map((i) => ({ id: i.id, title: i.title, estimate: i.note ?? undefined, energy: i.energy }));
  if (subs.length === 0) return;
  const { placements } = await runScheduleAgent({ subtasks: subs, context: buildContext(), spread: true });
  applyPlacements(placements);
};

// Loose task: only call the scheduler when there's a signal (timeContext or urgency now/today).
const scheduleLooseTask = async (taskId: string, task: import('../agent/captureContract').CaptureTask) => {
  const hasSignal = !!task.timeContext || task.urgency === 'now' || task.urgency === 'today';
  if (!hasSignal) return;
  const { placements } = await runScheduleAgent({
    subtasks: [{ id: taskId, title: task.title, energy: task.energy, timeContext: task.timeContext, urgency: task.urgency }],
    context: buildContext(),
    spread: false,
  });
  applyPlacements(placements);
};
```
Also, in `src/state/store.tsx`, change `addCaptureTask` to **always file to the backlog** (remove
its `scheduleToday` auto-schedule branch — the Scheduler now owns all placement): build the item
via `captureTaskToItem(task, id)` with NO schedule argument, and drop the `scheduleToday`/
`scheduledFields` logic in that function. The `timeContext` still lands on the item.

- [ ] **Step 3: Wire both scheduling paths**

- In BOTH plan-handling branches (`runTurn`'s plan branch and `firstTurn`'s `plan` branch),
  immediately after `const id = createProject(...)`, add `await autoScheduleProject(id);`.
- In `firstTurn`'s `task` branch, immediately after `const id = addCaptureTask(res.task);`, add
  `await scheduleLooseTask(id, res.task);`.
Keep the `busy` guard so the "thinking…/scheduling…" state shows until placements are applied
(both handlers are already async, inside `busy` try blocks).

- [ ] **Step 4: Verify typecheck + preview**

Run: `npm run typecheck` → no errors.
Preview (port 8085), three cases (the local fallback handles all offline — console `[runScheduleAgent] using fallback` is expected):
1. Project goal → after the plan card, its subtasks appear on Today/upcoming days (`spread`).
2. Loose "buy a bag, Wednesday or weekends" → lands on the coming Wednesday (on-signal).
3. Loose "call mom" (no signal) → stays in the Tasks backlog (not scheduled).
Screenshot Today + Tasks showing the three outcomes.

- [ ] **Step 5: Commit**
```bash
git add src/screens/CaptureScreen.tsx
git commit -m "Capture: build busy-map context; auto-schedule project subtasks after a plan"
```

---

### Task 8: ProjectDetailScreen — Reschedule action

**Files:**
- Modify: `src/screens/ProjectDetailScreen.tsx`
- Modify: `src/i18n/strings.ts` (add `reschedule` string, en/tr/ar)

**Interfaces:**
- Consumes: `runScheduleAgent`, `subtasksOf`, `scheduledItems`, `scheduleItem`.
- Produces (on `strings`): `reschedule`.

- [ ] **Step 1: Add the i18n string**

In `src/i18n/strings.ts`: add `reschedule: string;` to `interface Strings`, and values — en: `'Reschedule'`, tr: `'Yeniden planla'`, ar: `'إعادة الجدولة'`.

- [ ] **Step 2: Add a Reschedule button to the project screen**

In `src/screens/ProjectDetailScreen.tsx`, add to the store destructure `subtasksOf, scheduledItems, scheduleItem`, import `runScheduleAgent`, and add a pressable (styled like the screen's existing action buttons, flex+gap) labeled `strings.reschedule` whose handler:
```ts
const reschedule = async () => {
  const subs = subtasksOf(projectId).map((i) => ({ id: i.id, title: i.title, estimate: i.note ?? undefined, energy: i.energy }));
  if (subs.length === 0) return;
  const ctx = { now: DEMO_NOW_ISO, lang, prayerTimes: times, existingItems: scheduledItems().map((i) => ({ id: i.id, title: i.title, window: i.window, day: i.day })) };
  const { placements } = await runScheduleAgent({ subtasks: subs, context: ctx });
  for (const p of placements) scheduleItem(p.subtaskId, { date: p.day, window: p.window });
};
```
(Source `DEMO_NOW_ISO`/`times`/`lang` the same way the screen already sources prayer context; if the screen lacks them, import `DEMO_NOW_ISO` from `../data/demo`, `PRAYER_TIMES` from `../data/demo`, `usePrayerTimes`, and `useI18n` as TodayScreen does.)

- [ ] **Step 3: Verify typecheck + preview**

Run: `npm run typecheck` → no errors.
Preview: open a project → tap Reschedule → its subtasks get (re)placed onto days. Screenshot.

- [ ] **Step 4: Commit**
```bash
git add src/screens/ProjectDetailScreen.tsx src/i18n/strings.ts
git commit -m "Project detail: Reschedule action (re-runs the scheduler)"
```

---

### Task 9: n8n workflow — Research (Tavily) + Scheduler branch (local reference, NOT committed)

**Files:**
- Modify (git-ignored): `docs/nidham-agent-openai.n8n.json`
- Modify: `<scratchpad>/gen-n8n.js` generator (extend to inject the scheduler prompt + branch)

**Interfaces:** none (external workflow config).

- [ ] **Step 1: Extend the generator to inject the scheduler prompt + branch**

Update the generator script (in the session scratchpad) to also extract `SCHEDULER_SYSTEM_PROMPT` from `src/agent/scheduleSystemPrompt.ts` and add, to the workflow: a Switch/IF on `body.agent` with a third route `agent === 'schedule'` → an OpenAI node using `SCHEDULER_SYSTEM_PROMPT` (gpt-4o-mini, `response_format: json_object`, user = request body) → Parse → Respond. Keep the existing capture/project routing. Regenerate `docs/nidham-agent-openai.n8n.json`. Validate by running the Code node with `{agent:'schedule', subtasks:[...], context:{...}}` and confirming the scheduler prompt is selected.

- [ ] **Step 2: Add the Research (Tavily) step to the project branch**

In the project branch, before the final Plan LLM: a **Decide** step (LLM: given the conversation, return either `{type:'ask',question}` OR `{queries:[...]}`) → if `queries`, an **HTTP Request** node to `https://api.tavily.com/search` (POST, header `Authorization: Bearer <TAVILY_KEY>`, body `{ "query": <q>, "max_results": 5 }`) → feed the results' summaries into the **Plan** LLM input. Document this node layout in the JSON. (This is n8n-internal; the app contract is unchanged.)

- [ ] **Step 3: Confirm nothing is staged**

Run: `git status --porcelain docs/` → `docs/nidham-agent-openai.n8n.json` must NOT appear (git-ignored). No commit.

- [ ] **Step 4: Hand off import instructions**

Report to the user: re-import `docs/nidham-agent-openai.n8n.json` into n8n, add a **Tavily** credential/key, re-select the OpenAI credential, Save + Activate. Until then, the app's local fallbacks (research-less generic plan; `localSchedule`) keep the journey working.

---

## Notes for the implementer
- The whole journey MUST work offline via fallbacks: PM → `fallbackProjectTurn`, Scheduler → `localSchedule`, Research → plan without findings. Never let a missing webhook break capture or scheduling.
- Do NOT change the loose-task capture flow. Auto-schedule is for project subtasks only.
- Keep the app-facing PM contract `{type:'ask'} | {type:'plan'}` — research stays n8n-internal.
