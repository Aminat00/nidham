# Smart Capture + Task Detail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route captures through an AI capture agent that files a clean, structured task (or opens the interview), preserve any spoken time as quiet context, and add a Task Detail screen for scheduling a task to a specific date + prayer window + optional exact time. Also bump native font sizes for on-device legibility.

**Architecture:** One `/nidham` webhook classifies each capture (OpenAI) and a Switch routes task vs project; the app calls a new `runCaptureAgent` (mirrors `runProjectAgent`, never throws, local fallback). Pure scheduling logic lives in a testable `schedule.ts`; the store gains `addCaptureTask`, `scheduleItem`, `deleteItem`. A new modal `TaskDetailScreen` (mounted from `App.tsx` like `ProjectDetailScreen`) does the disposing.

**Tech Stack:** Expo SDK 54, React Native 0.81.5, React 19.1.0, TypeScript ~5.9.2 (strict), Jest + ts-jest.

## Global Constraints

- Expo SDK 54 / RN 0.81.5 / React 19.1.0 / TypeScript ~5.9.2 strict — do not change these floors.
- **Jest tests are pure-logic only** (`testEnvironment: node`, `testMatch: **/src/**/*.test.ts`). Do NOT import `react-native` into a `.test.ts`. React Native components are verified with `npm run typecheck` + the Expo **web preview**, never Jest (per `jest.config.js`).
- Test command: `npm test`. Typecheck: `npm run typecheck`. Web preview: dev server on port 8085.
- **Commits: plain messages, NO `Co-Authored-By` trailer.**
- **Layout: use flex + `gap`; avoid hardcoded `margin`/`padding` for spacing where `gap`+flex achieve the same** (user rule).
- **Fonts: the web / design surface must stay pixel-matched to the Nidham design source. Scale native ONLY.**
- **Never commit the n8n workflow JSON** (`docs/*.n8n.json` is git-ignored). The committed app code carries the capture system prompt; n8n changes are applied by the user in n8n.
- Keep the interview contract (`runProjectAgent`, `projectContract.ts`) unchanged — this plan only changes the *entry* into it (first-turn classification).

---

### Task 1: Native font scale (`fs()`)

**Files:**
- Create: `src/theme/fontScale.ts`
- Create: `src/theme/fontScale.test.ts`
- Modify: `src/theme/tokens.ts` (add `fs`, wrap `type` sizes)
- Modify (wrap every numeric `fontSize:` with `fs(...)`, add the import): `src/components/CaptureCard.tsx`, `src/components/Dropdown.tsx`, `src/components/DumpBox.tsx`, `src/components/LanguageToggle.tsx`, `src/components/ProfileButton.tsx`, `src/components/TabBar.tsx`, `src/components/ThinkingCard.tsx`, `src/components/WindowPicker.tsx`, `src/components/primitives.tsx`, `src/screens/CaptureScreen.tsx`, `src/screens/ProfileScreen.tsx`, `src/screens/ProjectDetailScreen.tsx`, `src/screens/TasksScreen.tsx`, `src/screens/TodayScreen.tsx`

**Interfaces:**
- Produces: `fs(size: number): number` (from `tokens.ts`); `scaleFont(size: number, isWeb: boolean): number` and `NATIVE_FONT_SCALE` (from `fontScale.ts`).

- [ ] **Step 1: Write the failing test**

`src/theme/fontScale.test.ts`:
```ts
import { scaleFont, NATIVE_FONT_SCALE } from './fontScale';

describe('scaleFont', () => {
  it('leaves web sizes untouched (design surface stays pixel-matched)', () => {
    expect(scaleFont(16, true)).toBe(16);
    expect(scaleFont(14.5, true)).toBe(14.5);
  });

  it('scales native sizes up and snaps to the nearest 0.5', () => {
    expect(NATIVE_FONT_SCALE).toBeGreaterThan(1);
    expect(scaleFont(16, false)).toBe(17.5); // 16 * 1.08 = 17.28 -> 17.5
    expect(scaleFont(10, false)).toBe(11);   // 10 * 1.08 = 10.8  -> 11
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- fontScale`
Expected: FAIL — cannot find module `./fontScale`.

- [ ] **Step 3: Write minimal implementation**

`src/theme/fontScale.ts`:
```ts
/**
 * Native-only type scale. The web preview IS the design surface (pixel-matched to
 * Nidham.dc.html), so web sizes pass through unchanged; native bumps ~8% for
 * on-device legibility (tested on iPhone 14). Kept RN-free so it unit-tests in node.
 */
export const NATIVE_FONT_SCALE = 1.08;

export function scaleFont(size: number, isWeb: boolean): number {
  if (isWeb) return size;
  return Math.round(size * NATIVE_FONT_SCALE * 2) / 2; // snap to nearest 0.5
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- fontScale`
Expected: PASS (2 tests).

- [ ] **Step 5: Add `fs()` to tokens and scale the `type` object**

In `src/theme/tokens.ts`, add the import after the existing `react-native` import:
```ts
import { scaleFont } from './fontScale';
```
Add the helper next to `ff` (after line ~84):
```ts
/** Font size, scaled up on native only (web = design surface, unscaled). */
export const fs = (size: number): number => scaleFont(size, Platform.OS === 'web');
```
Wrap every `fontSize:` in the `type` object with `fs(...)`, e.g.:
```ts
export const type = {
  screenTitle: { fontSize: fs(22), fontFamily: ff('700'), color: colors.ink, letterSpacing: -0.3 } as TextStyle,
  greeting: { fontSize: fs(21), fontFamily: ff('700'), color: colors.ink, letterSpacing: -0.2 } as TextStyle,
  cardTitle: { fontSize: fs(14.5), fontFamily: ff('700'), color: colors.ink } as TextStyle,
  body: { fontSize: fs(13), fontFamily: ff('600'), color: colors.ink } as TextStyle,
  meta: { fontSize: fs(12), fontFamily: ff('500'), color: colors.muted } as TextStyle,
  label: { fontSize: fs(10), fontFamily: ff('600'), color: colors.muted2, letterSpacing: 0.6 } as TextStyle,
  pill: { fontSize: fs(12), fontFamily: ff('700') } as TextStyle,
  time: { fontSize: fs(12), fontFamily: ff('600'), color: colors.muted } as TextStyle,
} as const;
```

- [ ] **Step 6: Apply `fs()` across the 13 component/screen files**

In each file listed under **Files → Modify** (components + screens), add `fs` to the existing `../theme/tokens` (or `../tokens`) import, and wrap **every** numeric `fontSize:` literal in its `StyleSheet.create` with `fs(...)`. Mechanical rule — `fontSize: 15,` → `fontSize: fs(15),`. Do not touch any other property. Example (`src/components/WindowPicker.tsx`):
```ts
import { colors, ff, fs, radius } from '../theme/tokens';
// ...
title: { fontSize: fs(12), fontFamily: ff('700'), /* … */ },
optionText: { flex: 1, fontSize: fs(15), fontFamily: ff('600'), color: colors.ink },
```

- [ ] **Step 7: Verify typecheck + preview**

Run: `npm run typecheck` → Expected: no errors.
Preview: load port 8085; the web layout must look **unchanged** (web sizes pass through). Take a screenshot to confirm no regression. (Native bump is verified by the user on-device.)

- [ ] **Step 8: Commit**
```bash
git add src/theme/fontScale.ts src/theme/fontScale.test.ts src/theme/tokens.ts src/components src/screens
git commit -m "Type: native-only font scale (~8% larger on device, web unchanged)"
```

---

### Task 2: Item model — `time` + `timeContext`

**Files:**
- Modify: `src/types/item.ts` (add two optional fields to `Item`)

**Interfaces:**
- Produces: `Item.time?: string | null` ("HH:mm" exact clock time), `Item.timeContext?: string` (quiet spoken-time note).

- [ ] **Step 1: Add the fields**

In `src/types/item.ts`, inside `interface Item`, after `dueDate` (line ~77):
```ts
  /** "HH:mm" exact clock time, set only when the user pins one. Overrides sortTime ordering. */
  time?: string | null;
  /** Quiet context: the time the user spoke at capture ("weekends or Wednesday"). Not a schedule. */
  timeContext?: string;
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**
```bash
git add src/types/item.ts
git commit -m "Item: add optional time + timeContext fields"
```

---

### Task 3: Capture agent contract + system prompt

**Files:**
- Create: `src/agent/captureContract.ts`
- Create: `src/agent/captureSystemPrompt.ts`

**Interfaces:**
- Consumes: `Area`, `Urgency`, `Energy` from `../types/item`; `AgentContext` from `./contract`; `ProjectPlan` from `./projectContract`.
- Produces: `CaptureTask`, `CaptureResult`, `CapturePayload` (from `captureContract.ts`); `CAPTURE_SYSTEM_PROMPT` (from `captureSystemPrompt.ts`).

- [ ] **Step 1: Write the contract**

`src/agent/captureContract.ts`:
```ts
/**
 * Capture agent contract — the FIRST turn of a capture. The agent classifies the raw
 * text and returns EITHER a clean parsed task, OR the first interview question / a plan
 * (project branch, reusing the project contract). Continuation turns use runProjectAgent.
 */
import type { Area, Urgency, Energy } from '../types/item';
import type { AgentContext } from './contract';
import type { ProjectPlan } from './projectContract';

/** A clean, structured loose task — the agent's real deliverable (not a raw sentence). */
export interface CaptureTask {
  title: string;                 // clean imperative — "Buy a bag", not the raw sentence
  area: Area;
  category: 'task' | 'errand';
  urgency: Urgency;
  energy: Energy;
  timeContext?: string;          // verbatim-ish time the user mentioned, or omitted
  scheduleToday?: boolean;       // true ONLY when the user clearly said "today"/"tonight"
}

export type CaptureResult =
  | { kind: 'task'; task: CaptureTask }
  | { kind: 'ask'; question: string }
  | { kind: 'plan'; summary: string; project: ProjectPlan };

/** Request body (app → agent) for a fresh capture. */
export interface CapturePayload {
  capture: string;
  context: AgentContext;
}
```

- [ ] **Step 2: Write the system prompt**

`src/agent/captureSystemPrompt.ts`:
```ts
/**
 * System prompt for the capture agent (used by the `direct` mode; the n8n webhook keeps
 * its own copy). Classifies task vs project, and for a task returns a clean structured
 * object. It NEVER computes a date — a spoken time is copied verbatim into timeContext.
 */
export const CAPTURE_SYSTEM_PROMPT = `You are Nidham's capture agent. You receive one raw
capture (typed or transcribed) plus context. Decide if it is a small TASK or a big PROJECT.

Return a SINGLE JSON object, nothing else.

If it is a small task or errand, return:
{"kind":"task","task":{
  "title": <clean imperative title, e.g. "Buy a bag" — NOT the raw sentence>,
  "area": one of "chore"|"admin"|"personal"|"self-dev"|"spiritual"|"errand",
  "category": "errand" for buy/order/pick-up/return/collect, otherwise "task",
  "urgency": "now"|"today"|"soon"|"someday" (default "soon"),
  "energy": "deep"|"light"|"admin" (default "light"),
  "timeContext": <the time the user mentioned, copied verbatim, e.g. "weekends or Wednesday" — OMIT if none>,
  "scheduleToday": true ONLY if the user clearly said today/tonight, else false
}}
Do NOT invent a date. Do NOT schedule. timeContext is context, not a schedule.

If it is a project-sized goal (multiple steps / real workflow), return the FIRST clarifying
question to begin an interview:
{"kind":"ask","question": <one short question>}

Reply in the user's language (context.lang). Output JSON only.`;
```

- [ ] **Step 3: Verify typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**
```bash
git add src/agent/captureContract.ts src/agent/captureSystemPrompt.ts
git commit -m "Capture agent: contract types + system prompt"
```

---

### Task 4: Pure scheduling helpers (`schedule.ts`) + store refactor

**Files:**
- Create: `src/state/schedule.ts`
- Create: `src/state/schedule.test.ts`
- Modify: `src/state/store.tsx` (import the moved helpers, delete the local copies)

**Interfaces:**
- Consumes: `Item`, `Window` from `../types/item`; `CaptureTask` from `../agent/captureContract`.
- Produces: `Times`, `hhmmToMin`, `addMinutes`, `windowBaseTime`, `suggestCurrentWindow`, `ScheduleInput`, `scheduledFields`, `captureTaskToItem` (all from `schedule.ts`).

- [ ] **Step 1: Write the failing test**

`src/state/schedule.test.ts`:
```ts
import { scheduledFields, captureTaskToItem, type Times } from './schedule';
import type { CaptureTask } from '../agent/captureContract';

const times: Times = { fajr: '03:51', dhuhr: '13:15', asr: '17:13', maghrib: '20:39', isha: '22:21' };

describe('scheduledFields', () => {
  it('uses windowBaseTime + 10min for sortTime when no exact time', () => {
    const f = scheduledFields({ date: '2026-07-22', window: 'dhuhr' }, times);
    expect(f.day).toBe('2026-07-22');
    expect(f.window).toBe('dhuhr');
    expect(f.time).toBeNull();
    expect(f.sortTime).toBe('13:25');
    expect(f.status).toBe('pending');
  });
  it('uses the exact time for sortTime when pinned', () => {
    const f = scheduledFields({ date: '2026-07-22', window: 'asr', time: '15:30' }, times);
    expect(f.time).toBe('15:30');
    expect(f.sortTime).toBe('15:30');
  });
  it('defaults window to anytime', () => {
    expect(scheduledFields({ date: '2026-07-22' }, times).window).toBe('anytime');
  });
});

describe('captureTaskToItem', () => {
  const task: CaptureTask = { title: '  Buy a bag ', area: 'errand', category: 'errand', urgency: 'soon', energy: 'light', timeContext: 'weekends or Wednesday' };
  it('files an unscheduled item (no day) with trimmed title + fields', () => {
    const it = captureTaskToItem(task, 'cap_1');
    expect(it.day).toBeUndefined();
    expect(it.title).toBe('Buy a bag');
    expect(it.area).toBe('errand');
    expect(it.category).toBe('errand');
    expect(it.timeContext).toBe('weekends or Wednesday');
    expect(it.status).toBe('pending');
  });
  it('merges a schedule when provided', () => {
    const sched = scheduledFields({ date: '2026-07-22', window: 'dhuhr' }, times);
    const it = captureTaskToItem(task, 'cap_1', sched);
    expect(it.day).toBe('2026-07-22');
    expect(it.window).toBe('dhuhr');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- schedule`
Expected: FAIL — cannot find module `./schedule`.

- [ ] **Step 3: Write `schedule.ts`**

`src/state/schedule.ts` (move the four helpers verbatim out of `store.tsx`, add the two new functions):
```ts
/**
 * Pure scheduling logic — extracted from the store so it unit-tests in node (RN-free).
 * Places prayer-anchored items on a clock and builds Items from captures.
 */
import type { Item, Window } from '../types/item';
import type { CaptureTask } from '../agent/captureContract';

/** "HH:mm" prayer times used to place scheduled items in a window. */
export type Times = { fajr: string; dhuhr: string; asr: string; maghrib: string; isha: string };

export function hhmmToMin(hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
}

export function addMinutes(hhmm: string, minutes: number): string {
  const total = Math.min(hhmmToMin(hhmm) + minutes, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** A representative clock time for a prayer window, so scheduled items order sensibly. */
export function windowBaseTime(window: Window, t: Times): string {
  switch (window) {
    case 'fajr': return t.fajr;
    case 'morning': return addMinutes(t.fajr, 120);
    case 'dhuhr': return t.dhuhr;
    case 'afternoon': return addMinutes(t.dhuhr, 90);
    case 'asr': return t.asr;
    case 'maghrib': return t.maghrib;
    case 'isha': return t.isha;
    case 'evening': return addMinutes(t.isha, 60);
    default: return t.dhuhr; // anytime
  }
}

/** The prayer window active at `now` (wraps to isha overnight). */
export function suggestCurrentWindow(t: Times, now: Date): Window {
  const mins = now.getHours() * 60 + now.getMinutes();
  const seq: Array<[Window, number]> = [
    ['fajr', hhmmToMin(t.fajr)], ['dhuhr', hhmmToMin(t.dhuhr)], ['asr', hhmmToMin(t.asr)],
    ['maghrib', hhmmToMin(t.maghrib)], ['isha', hhmmToMin(t.isha)],
  ];
  let cur: Window = 'isha';
  for (const [w, m] of seq) if (mins >= m) cur = w;
  return cur;
}

export interface ScheduleInput { date: string; window?: Window; time?: string | null; }

/** Resolve a schedule request into the Item fields that place it on a day. */
export function scheduledFields(input: ScheduleInput, times: Times): Pick<Item, 'day' | 'window' | 'time' | 'sortTime' | 'status'> {
  const window: Window = input.window ?? 'anytime';
  const time = input.time ?? null;
  const sortTime = time ?? addMinutes(windowBaseTime(window, times), 10);
  return { day: input.date, window, time, sortTime, status: 'pending' };
}

/** Build an Item from a parsed capture. Unscheduled by default; pass `schedule` to place it. */
export function captureTaskToItem(
  task: CaptureTask,
  id: string,
  schedule?: ReturnType<typeof scheduledFields>,
): Item {
  const base: Item = {
    id,
    title: task.title.trim(),
    category: task.category,
    area: task.area,
    window: 'anytime',
    sortTime: '10:00',
    urgency: task.urgency,
    energy: task.energy,
    status: 'pending',
    ...(task.timeContext ? { timeContext: task.timeContext } : {}),
  };
  return schedule ? { ...base, ...schedule } : base;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- schedule`
Expected: PASS (6 tests).

- [ ] **Step 5: Refactor the store to consume `schedule.ts`**

In `src/state/store.tsx`: delete the local `Times` type and the `hhmmToMin`, `addMinutes`, `windowBaseTime`, `suggestCurrentWindow` functions (lines ~40–81), and import them instead:
```ts
import { addMinutes, windowBaseTime, suggestCurrentWindow, type Times } from './schedule';
```
Leave the existing `addTask`/`scheduleToday` bodies working (they call the now-imported helpers). Nothing else changes in this task.

- [ ] **Step 6: Verify typecheck + tests**

Run: `npm run typecheck` → Expected: no errors.
Run: `npm test` → Expected: all pass (existing suites + new `schedule` suite).

- [ ] **Step 7: Commit**
```bash
git add src/state/schedule.ts src/state/schedule.test.ts src/state/store.tsx
git commit -m "Store: extract pure scheduling helpers into schedule.ts (+ scheduledFields, captureTaskToItem)"
```

---

### Task 5: `runCaptureAgent` (transport + fallback) + tests

**Files:**
- Create: `src/agent/runCaptureAgent.ts`
- Create: `src/agent/runCaptureAgent.test.ts`

**Interfaces:**
- Consumes: `CapturePayload`, `CaptureResult`, `CaptureTask` from `./captureContract`; `triageCapture` from `./triage`; `fallbackProjectTurn` from `./projectFallback`; `CAPTURE_SYSTEM_PROMPT` from `./captureSystemPrompt`.
- Produces: `runCaptureAgent(payload: CapturePayload): Promise<CaptureResult>`, `isCaptureAgentConfigured(): boolean`.

- [ ] **Step 1: Write the failing test**

`src/agent/runCaptureAgent.test.ts` (unconfigured → exercises the local fallback; no network, no RN import):
```ts
import { runCaptureAgent, isCaptureAgentConfigured } from './runCaptureAgent';
import type { CapturePayload } from './captureContract';

const ctx = {
  now: '2026-07-21T13:00:00+03:00', lang: 'en' as const,
  prayerTimes: { fajr: '03:51', dhuhr: '13:15', asr: '17:13', maghrib: '20:39', isha: '22:21' },
  existingItems: [],
};
const p = (capture: string): CapturePayload => ({ capture, context: ctx });

describe('runCaptureAgent (unconfigured → local fallback)', () => {
  it('reports not configured with no URL/KEY set', () => {
    expect(isCaptureAgentConfigured()).toBe(false);
  });
  it('classifies a plain capture as a task with a title', async () => {
    const r = await runCaptureAgent(p('call mom'));
    expect(r.kind).toBe('task');
    if (r.kind === 'task') {
      expect(r.task.title.length).toBeGreaterThan(0);
      expect(r.task.scheduleToday).toBe(false);
    }
  });
  it('flags an explicit "today" capture as scheduleToday', async () => {
    const r = await runCaptureAgent(p('call the bank today'));
    expect(r.kind === 'task' && r.task.scheduleToday).toBe(true);
  });
  it('routes a project-sized goal into the interview', async () => {
    const r = await runCaptureAgent(p('start a business'));
    expect(['ask', 'plan']).toContain(r.kind);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- runCaptureAgent`
Expected: FAIL — cannot find module `./runCaptureAgent`.

- [ ] **Step 3: Write the implementation**

`src/agent/runCaptureAgent.ts`:
```ts
/**
 * runCaptureAgent — the FIRST turn of a capture. Mirrors runProjectAgent's transport
 * (same env, 20s timeout, never throws). Returns a clean task, or routes to the interview
 * (ask/plan). On unconfigured/failure it falls back to the local triage so capture always
 * works offline (losing only the smart parsing).
 */
import type { CapturePayload, CaptureResult, CaptureTask } from './captureContract';
import type { ProjectPayload, ProjectPlan } from './projectContract';
import { CAPTURE_SYSTEM_PROMPT } from './captureSystemPrompt';
import { triageCapture } from './triage';
import { fallbackProjectTurn } from './projectFallback';
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
  if (tri.kind === 'project') {
    const pp: ProjectPayload = { conversation: [{ role: 'user', text }], context: payload.context };
    const turn = fallbackProjectTurn(pp);
    return turn.type === 'ask'
      ? { kind: 'ask', question: turn.question }
      : { kind: 'plan', summary: turn.summary, project: turn.project };
  }
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
  const candidates: unknown[] = [raw];
  if (raw && typeof raw === 'object') {
    const r = raw as Record<string, unknown>;
    candidates.push(r.output, r.data, r.json, r.result, r.response);
    if (Array.isArray(raw)) candidates.push(raw[0]);
  }
  for (const c of candidates) {
    if (!c || typeof c !== 'object') continue;
    const v = c as Record<string, unknown>;
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
    if (kind === 'ask' && typeof v.question === 'string') return { kind: 'ask', question: v.question };
    if (kind === 'plan' && typeof v.summary === 'string' && v.project && typeof v.project === 'object') {
      const proj = v.project as Record<string, unknown>;
      if (typeof proj.title === 'string' && Array.isArray(proj.milestones)) {
        return { kind: 'plan', summary: v.summary, project: v.project as ProjectPlan };
      }
    }
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- runCaptureAgent`
Expected: PASS (4 tests).

- [ ] **Step 5: Verify typecheck**

Run: `npm run typecheck`
Expected: no errors. (Fix the `ProjectPlan` import/cast noted above if `tsc` complains.)

- [ ] **Step 6: Commit**
```bash
git add src/agent/runCaptureAgent.ts src/agent/runCaptureAgent.test.ts
git commit -m "Capture agent: runCaptureAgent transport + local fallback"
```

---

### Task 6: Store — `addCaptureTask`, `scheduleItem`, `deleteItem`

**Files:**
- Modify: `src/state/store.tsx` (add 3 actions to `StoreValue` + provider; extend `unschedule`)

**Interfaces:**
- Consumes: `scheduledFields`, `captureTaskToItem`, `suggestCurrentWindow` from `./schedule`; `CaptureTask` from `../agent/captureContract`; `ScheduleInput` from `./schedule`.
- Produces (on `useStore()`): `addCaptureTask(task: CaptureTask): string`, `scheduleItem(id: string, input: { date: string; window?: Window; time?: string | null }): void`, `deleteItem(id: string): void`.

- [ ] **Step 1: Add imports + `StoreValue` signatures**

In `src/state/store.tsx` add to imports:
```ts
import { scheduledFields, captureTaskToItem } from './schedule';
import type { CaptureTask } from '../agent/captureContract';
```
Add to the `StoreValue` interface (near `addTask`):
```ts
  /** File a loose task from the capture agent's parsed result (backlog, or today if flagged). */
  addCaptureTask: (task: CaptureTask) => string;
  /** Schedule an item to any date + window (+ optional exact time). */
  scheduleItem: (id: string, input: { date: string; window?: Window; time?: string | null }) => void;
  /** Delete a captured item (guarded — seed items are never removed). */
  deleteItem: (id: string) => void;
```

- [ ] **Step 2: Implement the three actions**

Add inside `StoreProvider` (near `addTask`, ~line 421):
```ts
const addCaptureTask = useCallback((task: CaptureTask): string => {
  const id = 'cap_' + Date.now().toString(36);
  const schedule = task.scheduleToday
    ? scheduledFields({ date: DEMO_TODAY, window: suggestCurrentWindow(timesRef.current, new Date()) }, timesRef.current)
    : undefined;
  upsertItems([captureTaskToItem(task, id, schedule)]);
  return id;
}, [upsertItems]);

const scheduleItem = useCallback((id: string, input: { date: string; window?: Window; time?: string | null }) => {
  setItemsById((prev) => {
    const it = prev[id];
    if (!it) return prev;
    return { ...prev, [id]: { ...it, ...scheduledFields(input, timesRef.current) } };
  });
}, []);

const deleteItem = useCallback((id: string) => {
  if (SEED_IDS.has(id)) return;
  setItemsById((prev) => {
    if (!prev[id]) return prev;
    const next = { ...prev };
    delete next[id];
    return next;
  });
  setFeedIds((prev) => prev.filter((f) => f !== id));
}, []);
```
Extend `unschedule` to also clear the exact time:
```ts
return { ...prev, [id]: { ...it, day: undefined, time: null } };
```

- [ ] **Step 3: Expose them on the context value**

Add `addCaptureTask, scheduleItem, deleteItem` to BOTH the `value` object and its `useMemo` dependency array (alongside the existing `addTask`, `scheduleToday`, `unschedule`).

- [ ] **Step 4: Verify typecheck + tests**

Run: `npm run typecheck` → Expected: no errors.
Run: `npm test` → Expected: all pass (no behavior change to existing suites).

- [ ] **Step 5: Commit**
```bash
git add src/state/store.tsx
git commit -m "Store: addCaptureTask, scheduleItem (any date + optional time), deleteItem"
```

---

### Task 7: i18n strings for the task detail screen

**Files:**
- Modify: `src/i18n/strings.ts` (extend `Strings` interface + all three `UI` locales)

**Interfaces:**
- Produces (on `strings`): `taskDetailTitle`, `youSaid`, `dayLabel`, `pickDate`, `setExactTime`, `save`, `markDone`, `deleteTask`, `scheduledFor`, `unscheduleLabel`.

- [ ] **Step 1: Add to the `Strings` interface**

In `src/i18n/strings.ts`, add to `interface Strings` (near the Voice block):
```ts
  // Task detail
  taskDetailTitle: string;
  youSaid: string;          // "You said: {text}"
  dayLabel: string;
  pickDate: string;
  setExactTime: string;
  save: string;
  markDone: string;
  deleteTask: string;
  scheduledFor: string;     // "{day} · after {prayer}"
  unscheduleLabel: string;
```

- [ ] **Step 2: Add the values to all three locales**

`en`:
```ts
  taskDetailTitle: 'Task',
  youSaid: 'You said: {text}',
  dayLabel: 'Day',
  pickDate: 'Pick a date',
  setExactTime: 'Set exact time',
  save: 'Save',
  markDone: 'Mark done',
  deleteTask: 'Delete',
  scheduledFor: '{day} · {when}',
  unscheduleLabel: 'Unschedule',
```
`tr`:
```ts
  taskDetailTitle: 'Görev',
  youSaid: 'Şöyle dedin: {text}',
  dayLabel: 'Gün',
  pickDate: 'Tarih seç',
  setExactTime: 'Kesin saat belirle',
  save: 'Kaydet',
  markDone: 'Tamamlandı',
  deleteTask: 'Sil',
  scheduledFor: '{day} · {when}',
  unscheduleLabel: 'Programdan çıkar',
```
`ar`:
```ts
  taskDetailTitle: 'مهمة',
  youSaid: 'قلت: {text}',
  dayLabel: 'اليوم',
  pickDate: 'اختر تاريخًا',
  setExactTime: 'حدّد وقتًا دقيقًا',
  save: 'حفظ',
  markDone: 'تمّ',
  deleteTask: 'حذف',
  scheduledFor: '{day} · {when}',
  unscheduleLabel: 'إلغاء الجدولة',
```

- [ ] **Step 3: Verify typecheck**

Run: `npm run typecheck`
Expected: no errors (the `Strings` interface forces all three locales to be complete).

- [ ] **Step 4: Commit**
```bash
git add src/i18n/strings.ts
git commit -m "i18n: task detail strings (en/tr/ar)"
```

---

### Task 8: `TaskDetailScreen` component

**Files:**
- Create: `src/screens/TaskDetailScreen.tsx`

**Interfaces:**
- Consumes: `useStore` (`getItem`, `scheduleItem`, `unschedule`, `deleteItem`, `toggleDone`), `WindowPicker`, `useI18n`, `prayers`/`dates` helpers, `t()` from strings.
- Produces: `TaskDetailScreen({ taskId, onClose }: { taskId: string; onClose: () => void })`.

- [ ] **Step 1: Build the screen**

`src/screens/TaskDetailScreen.tsx`. Layout with flex + `gap` (no hardcoded spacing margins). Structure:
- Header row: back/close button + `strings.taskDetailTitle`.
- **Title**: `TextInput` seeded from `item.title` into local `draftTitle` state; on blur, call `renameItem(taskId, draftTitle)` (the store action added in Step 2).
- **Area** pill (read-only), from `AREA_LABEL[lang][item.area]`.
- **Context row**, only if `item.timeContext`: `t(strings.youSaid, { text: item.timeContext })`, muted.
- **Day** segmented control: Today / Tomorrow / Pick a date. Today = `DEMO_TODAY`; Tomorrow = `addDays(DEMO_TODAY, 1)`; Pick a date = a date input (`@react-native-community/datetimepicker` is NOT a dependency — for v1 use a minimal inline stepper: buttons `−1 day` / `+1 day` around a shown ISO date, starting from the current selection). Track `selectedDate` in local state.
- **Window**: a button showing the current window that opens `WindowPicker`; selection sets `selectedWindow`.
- **Exact time**: a `Switch` "Set exact time"; when on, show a compact HH:mm input (two-field or a text input validated to `HH:mm`), bound to `selectedTime`.
- **Actions** (flex row / column, `gap`): **Save** → `scheduleItem(taskId, { date: selectedDate, window: selectedWindow, time: exactOn ? selectedTime : null })` then `onClose()`. **Mark done** → `toggleDone(taskId); onClose()`. **Unschedule** (only if `item.day`) → `unschedule(taskId)`. **Delete** → `deleteItem(taskId); onClose()`.
- If the item is already scheduled, seed `selectedDate/selectedWindow/selectedTime` from the item.

- [ ] **Step 2: Title editing decision (resolve inline)**

Add a `renameItem(id, title)` action to keep the title editable (small, expected on a detail screen). In `src/state/store.tsx` add to `StoreValue`: `renameItem: (id: string, title: string) => void;` and implement:
```ts
const renameItem = useCallback((id: string, title: string) => {
  const clean = title.trim();
  if (!clean) return;
  setItemsById((prev) => (prev[id] ? { ...prev, [id]: { ...prev[id], title: clean } } : prev));
}, []);
```
Expose it on `value` + deps. Then in `TaskDetailScreen`, the title `TextInput` calls `renameItem(taskId, draftTitle)` on blur. (Commit this store change together with Task 8.)

- [ ] **Step 3: Verify typecheck + preview**

Run: `npm run typecheck` → Expected: no errors.
Preview (after Task 9 wires it): confirm the screen renders, WindowPicker opens, Save schedules, Delete removes.

- [ ] **Step 4: Commit**
```bash
git add src/screens/TaskDetailScreen.tsx src/state/store.tsx
git commit -m "Task detail: scheduling screen (date + window + optional exact time) + renameItem"
```

---

### Task 9: Wire routing — App.tsx + TasksScreen open the task

**Files:**
- Modify: `App.tsx` (add `taskOpen` state, mount `TaskDetailScreen`, pass `onOpenTask`)
- Modify: `src/screens/TasksScreen.tsx` (make loose-task rows pressable → `onOpenTask(id)`)

**Interfaces:**
- Consumes: `TaskDetailScreen` from `./src/screens/TaskDetailScreen`.
- Produces: `onOpenTask(id: string)` passed to `TasksScreen` and `CaptureScreen`.

- [ ] **Step 1: App.tsx routing**

In `App.tsx` `AppInner`:
```ts
const [taskOpen, setTaskOpen] = useState<string | null>(null);
const openTask = (id: string) => setTaskOpen(id);
```
Pass `onOpenTask={openTask}` to `<TasksScreen … />` and `<CaptureScreen … />`. Add the mount alongside the project one:
```tsx
{taskOpen && (
  <View style={StyleSheet.absoluteFill}>
    <TaskDetailScreen taskId={taskOpen} onClose={() => setTaskOpen(null)} />
  </View>
)}
```
Add the import: `import { TaskDetailScreen } from './src/screens/TaskDetailScreen';`.

- [ ] **Step 2: TasksScreen — open on tap**

In `src/screens/TasksScreen.tsx`, add `onOpenTask: (id: string) => void` to the component props. Wrap each loose-task row in a `Pressable` with `onPress={() => onOpenTask(item.id)}` (keep the existing "Do today" button working — it should `stopPropagation` or sit as a sibling so tapping it doesn't also open the detail).

- [ ] **Step 3: CaptureScreen prop stub**

In `src/screens/CaptureScreen.tsx`, add `onOpenTask: (id: string) => void` to its props type (used fully in Task 10). This keeps `App.tsx` typechecking now that it passes the prop.

- [ ] **Step 4: Verify typecheck + preview**

Run: `npm run typecheck` → Expected: no errors.
Preview: go to Tasks, tap a loose task → TaskDetailScreen opens; schedule it → it leaves the backlog and appears on that day in Today; Delete removes it. Screenshot.

- [ ] **Step 5: Commit**
```bash
git add App.tsx src/screens/TasksScreen.tsx src/screens/CaptureScreen.tsx
git commit -m "Routing: open TaskDetailScreen from Tasks (+ App mount, onOpenTask plumbing)"
```

---

### Task 10: CaptureScreen — route captures through the agent

**Files:**
- Modify: `src/screens/CaptureScreen.tsx` (replace local triage fork with `runCaptureAgent`; make landed task cards open the detail)
- Modify: `src/state/store.tsx` (remove the now-unused `addTask(text, triage)` + its `triageCapture` import, if no other caller remains)

**Interfaces:**
- Consumes: `runCaptureAgent` from `../agent/runCaptureAgent`; `addCaptureTask` from `useStore`; `onOpenTask` prop.

- [ ] **Step 1: Rewire `onSubmit`**

In `src/screens/CaptureScreen.tsx`:
- Replace the `triageCapture`/`addTask` import usage with `runCaptureAgent` + `addCaptureTask`.
- Change the `task` thread entry type to carry the created id: `{ kind: 'task'; taskId: string; title: string; scheduled: boolean }`.
- `onSubmit` (when not interviewing) becomes async: set `busy`, call `runCaptureAgent({ capture: trimmed, context: { now: DEMO_NOW_ISO, lang, prayerTimes: times, existingItems: [] } })`, then switch:
```ts
if (res.kind === 'task') {
  const id = addCaptureTask(res.task);
  setThread((t) => [...t, { kind: 'user', text: trimmed }, { kind: 'task', taskId: id, title: res.task.title, scheduled: !!res.task.scheduleToday }]);
} else if (res.kind === 'ask') {
  modeRef.current = 'interview';
  convoRef.current = [{ role: 'user', text: trimmed }, { role: 'agent', text: res.question }];
  setThread((t) => [...t, { kind: 'user', text: trimmed }, { kind: 'agent', text: res.question }]);
} else { // plan (rare on first turn)
  const id = createProject(res.project);
  const steps = res.project.milestones[0]?.steps ?? [];
  const first = steps.find((s) => s.startHere) ?? steps[0];
  setThread((t) => [...t, { kind: 'user', text: trimmed }, { kind: 'agent', text: res.summary }, { kind: 'plan', projectId: id, title: res.project.title, firstStep: first?.title }]);
}
```
- Keep the `busy` guard and set `busy=false` in a `finally`. Show `<ThinkingCard />` while busy (already wired).
- Continuation answers still go through the existing `runTurn`/`runProjectAgent` path — unchanged.
- Make the landed task card pressable: `onPress={() => onOpenTask(e.taskId)}`.

- [ ] **Step 2: Remove the dead `addTask` path**

Search for remaining callers of the old `addTask`:
```bash
grep -rn "\.addTask\|addTask(" src
```
If `CaptureScreen` was the only caller, remove `addTask` from `StoreValue`, the provider `value`, its `useMemo` deps, and its implementation in `src/state/store.tsx`, plus the `triageCapture`/`Triage` import if now unused. (Keep `triageCapture` itself — `runCaptureAgent`'s fallback uses it.)

- [ ] **Step 3: Verify typecheck + tests + preview**

Run: `npm run typecheck` → Expected: no errors.
Run: `npm test` → Expected: all pass.
Preview: type "buy a bag, maybe weekends or Wednesday" → a clean task lands (no chip); open it → the "You said:" context row shows the phrase; type "start a podcast" → the interview begins. Screenshot both.

- [ ] **Step 4: Commit**
```bash
git add src/screens/CaptureScreen.tsx src/state/store.tsx
git commit -m "Capture: route captures through runCaptureAgent (clean task + quiet time context); open task detail"
```

---

### Task 11: n8n capture branch (local note — NOT committed)

**Files:**
- Modify (git-ignored, local only): `docs/nidham-agent.n8n.json` — add the capture branch. Do NOT `git add` it.

**Interfaces:** none (external workflow config).

- [ ] **Step 1: Update the local workflow note**

In n8n, on the existing `/nidham` workflow, add a **Switch** node right after the Webhook that reads `{{$json.body.agent}}`:
- `agent === "capture"` → an **OpenAI** node using `CAPTURE_SYSTEM_PROMPT` (copy verbatim from `src/agent/captureSystemPrompt.ts`), model `gpt-4o-mini`, `response_format: json_object`, user message = the request body → **Respond** with the model's JSON (already `{kind:"task"|"ask"|"plan", …}`).
- `agent === "project"` → the existing interview branch (unchanged).
Keep the webhook node's `options.allowedOrigins: "*"`.

- [ ] **Step 2: Verify against the app**

With the workflow **Active** and `.env` `EXPO_PUBLIC_AGENT_MODE=webhook` + `EXPO_PUBLIC_AGENT_URL` set: capture "call my aunt about the trip" → app files a clean task; capture "start a business" → interview begins. Confirm `runCaptureAgent` does NOT hit its fallback (no `[runCaptureAgent] using fallback` warning in the console).

- [ ] **Step 3: Confirm nothing workflow-related is staged**

Run: `git status --porcelain docs/` → Expected: `docs/nidham-agent.n8n.json` does NOT appear (it is git-ignored). No commit for this task.

---

## Notes for the implementer

- The **planner agent** (calendar-aware auto-scheduling) is explicitly **out of scope**. `timeContext` is stored precisely so that agent can later read it; do not build auto-placement now.
- Do not introduce a "suggested time" chip anywhere. A task is **Unscheduled** or **Scheduled for a specific slot** — no third state (see the spec's product principles).
