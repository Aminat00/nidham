# Smart Capture + Task Detail — Design

Date: 2026-07-21
Status: Approved (brainstorming) — ready for implementation plan

## 1. Problem

Today a loose capture is handled by `triageCapture` (local keyword heuristics): it dumps
the **raw sentence** as the task title, guesses an `area` by keywords, and only understands
the literal word "today". It cannot read intent like *"buy a bag, I can go weekends or
Wednesday"* — the whole sentence becomes the title, the time is lost, and nothing is
clean. There is also **no per-task screen** — a task cannot be opened, renamed, or given a
specific day/time. The only scheduling control is "Do today", which pins to today only.

## 2. Product principles (the lens)

Decisions this design commits to, and the reason behind each:

- **Decisive or invisible — never fuzzy.** We do not surface the model's uncertainty as a
  UI element. A task is either cleanly filed (no time noise) or scheduled to a specific
  slot. There is no "kind-of-suggested" third state and no ambiguous "~ weekend" chip.
- **The capture agent's real deliverable is a *clean task*** — a crisp title and correct
  area/category — not a guess about when to do it. That alone is the main upgrade over the
  raw-dump behaviour.
- **A spoken time is preserved as quiet context, not a fake schedule.** If you say
  "weekends or Wednesday", the agent keeps those words as a subtle note on the task's
  detail screen ("You said: weekends or Wednesday"). It informs the decision; it does not
  pretend to *be* the decision.
- **Scheduling is one explicit act with two states:** **Unscheduled** (in the backlog) or
  **Scheduled for `<date · window[ · time]>`**.
- **Don't fake intelligence we don't have.** Real calendar-aware placement belongs to the
  future *planner agent* (out of scope). This design leaves a clean seam for it.

## 3. Goals / Non-goals

**Goals**
- Route captures through an AI **capture agent** that returns a clean, structured task (or
  opens the project interview), with a local fallback so capture never breaks offline.
- Preserve any spoken time as a quiet `timeContext` note on the task.
- Add a **Task Detail screen** where any task can be renamed and scheduled to a specific
  **date + prayer window + optional exact clock time**, marked done, pushed, or deleted.

**Non-goals (explicitly deferred)**
- **Planner agent** — calendar-aware auto-placement ("put it Wednesday 9am"). The
  `timeContext` note is its future input; no auto-scheduling ships now.
- Recurring tasks, reminders/push notifications.
- Changing the project interview itself (only the *entry* into it moves behind the agent).

## 4. n8n architecture — one webhook, a Switch

The existing `/nidham` webhook gains a capture branch. One AI call classifies and, for a
task, parses in the same shot:

```
Webhook (/nidham)
  └─ Capture Agent (OpenAI gpt-4o-mini, 1 call)   ── classify + parse
       └─ Switch on `kind`
            ├─ "task"    → Respond { kind:"task", task:{…} }
            └─ "project" → (interview branch) Respond { kind:"ask" | "plan", … }
```

- **Fresh capture, task** → returns `{ kind:"task", task }` (see §5 for `task`). Exactly
  **1 call**.
- **Fresh capture, project** → returns the first interview question `{ kind:"ask", question }`.
- **Interview continuation** messages stay on the project branch until `{ kind:"plan", … }`.
- **Cost:** task = 1 call; project = 1 (classify + first question) + ≤3 answers = **≤4**.
- **Model swap:** moving OpenAI → an open-source model (e.g. DeepSeek) later is a node/model
  change in n8n. **Zero app change.**
- Webhook node keeps `options.allowedOrigins: "*"` (web preview CORS), matching the STT node.

The n8n workflow JSON is **not committed** (git-ignored `docs/*.n8n.json`), consistent with
existing policy. This spec documents the node shape; the workflow is edited in n8n directly.

## 5. Capture agent contract (app side)

New module `src/agent/captureContract.ts`:

```ts
export interface CaptureTask {
  title: string;                 // clean, imperative — "Buy a bag", NOT the raw sentence
  area: Area;                    // from ../types/item
  category: 'task' | 'errand';   // errand for buy/pickup/return etc., else task
  urgency: Urgency;              // default 'soon'
  energy: Energy;                // default 'light'
  timeContext?: string;          // verbatim-ish time the user mentioned, or omitted
  scheduleToday?: boolean;       // true ONLY when the user clearly said "today"/"tonight"
}

export type CaptureResult =
  | { kind: 'task'; task: CaptureTask }
  | { kind: 'ask'; question: string }
  | { kind: 'plan'; summary: string; project: ProjectPlan };  // ProjectPlan from projectContract
```

New module `src/agent/runCaptureAgent.ts`:

```ts
runCaptureAgent(payload): Promise<CaptureResult>
```

- Posts `{ capture, conversation?, context }` to `EXPO_PUBLIC_AGENT_URL` (the `/nidham`
  webhook), mirroring `runProjectAgent`'s transport (same fetch/error handling).
- On a fresh capture it sends `{ capture, context }`; mid-interview it sends
  `{ conversation, context }` so the project branch continues (reusing today's interview
  payload shape).
- **Offline / webhook failure → local fallback** (never throws):
  - `triageCapture(text).kind === 'project'` → `fallbackProjectTurn(...)` mapped to
    `{ kind:'ask' | 'plan' }` (reuses existing fallback).
  - else → `{ kind:'task', task }` built locally from `triageCapture` (raw title, keyword
    area, no `timeContext`). This is the graceful-degradation path — capture still works,
    it just loses the smart parsing until the workflow is reachable.

The system prompt lives in `src/agent/captureSystemPrompt.ts` and instructs: classify
task vs project; for a task return a clean imperative title + area + category + urgency +
energy, and copy any mentioned time into `timeContext` **without** computing a date; for a
project return the first clarifying question. Output is a single JSON object (OpenAI
`response_format: json_object`).

## 6. App capture flow (CaptureScreen)

`CaptureScreen.onSubmit` replaces the local `triageCapture`/`addTask` fork with a single
call and a switch on `kind`:

- Not mid-interview → `runCaptureAgent({ capture, context })`.
  - `task` → `addTask(task)` (enriched signature, §7) → append a `task` entry to the thread
    ("Saved to Tasks" / "Added to today"). No chip.
  - `ask` → enter interview mode, append the question (unchanged behaviour).
  - `plan` → `createProject(project)`, append the plan card (unchanged behaviour).
- Mid-interview → `runCaptureAgent({ conversation, context })`, same `ask`/`plan` handling
  as `runProjectAgent` does today.

The `MAX_ANSWERS = 3` cap and `fallbackProjectTurn` guard stay exactly as they are.

## 7. Data model + store changes

**`src/types/item.ts` — add two optional fields to `Item`:**

```ts
time?: string | null;      // "HH:mm" exact clock time, only when the user pins one
timeContext?: string;      // quiet note: the time the user spoke at capture ("weekends or Wednesday")
```

`time` is optional and independent of `window`. When present it (a) is displayed and (b)
overrides `sortTime` for within-day ordering (`sortTime` is set from `time` when scheduling).

**`src/state/store.tsx`:**

- **`addTask(task: CaptureTask): string`** — replaces the `(text, triage)` signature.
  Builds the `Item` from the parsed fields: `title`, `area`, `category`, `urgency`,
  `energy`, and `timeContext`. Default: loose captures land **unscheduled** (`day` unset)
  in the backlog ("capture ≠ schedule"). The one exception preserves today's behaviour —
  when `task.scheduleToday` is true (the user clearly said "today"/"tonight"), `addTask`
  schedules it into today's current window via `scheduleItem` right away.
- **`scheduleItem(id, { date, window, time? }): void`** — new general scheduler. Sets
  `day = date`, `window`, `time ?? null`, and `sortTime` from `time` (or `windowBaseTime`
  when no exact time), `status = 'pending'`. Works for **any** date, not just today.
- **`scheduleToday(id, window?)`** — kept as a thin wrapper over `scheduleItem` with
  `date = DEMO_TODAY`, so existing "Do today" callers are unchanged.
- `unschedule(id)` — unchanged (clears `day`; also clears `time`).
- `backlogByArea` — unchanged; an item leaves the backlog the moment it has a `day`.

## 8. Task Detail screen

New screen `src/screens/TaskDetailScreen.tsx`, opened by tapping any task (Tasks backlog
rows and the Capture thread's landed-task card become pressable; wire a `onOpenTask(id)`
route alongside the existing `onOpenProject`).

**Layout (top → bottom), styled from existing tokens; layout uses flex + gap:**

- **Title** — editable `TextInput` (saves on blur).
- **Area** — label/pill (read-only for v1).
- **Context row** — shown only if `timeContext`: "You said: *weekends or Wednesday*".
  Subtle, muted; no action attached (it is context, not a control).
- **Day** — segmented: Today · Tomorrow · Pick a date (date picker for the third).
- **Window** — reuses `WindowPicker` (after Fajr … anytime); the default placement control.
- **Exact time** — a "Set exact time" toggle, **off by default**; when on, a time input sets
  `time`. Keeps the prayer-window rhythm primary.
- **Actions** — Save/Schedule (primary), Mark done, Push to tomorrow, Delete.

**States reflected in the screen and the Tasks list row:**
- **Unscheduled** — no day chip; sits in its area group.
- **Scheduled** — shows `<weekday · after {prayer}[ · HH:mm]>`; appears on that day in Today.

A `deleteItem(id)` store action is added for Delete (removes the Item; guarded to captures,
not seed ids).

## 9. i18n

New strings (en/tr/ar) in `src/i18n/strings.ts`: `taskDetailTitle`, `youSaid` ("You said:
{text}"), `day`, `pickDate`, `setExactTime`, `save`, `markDone`, `deleteTask`,
`scheduledFor` ("{day} · after {prayer}"), plus reuse of existing `today`/`tomorrow`/
`after`/`whenToday`/`unschedule` copy where possible.

## 10. Testing

- **`runCaptureAgent` fallback** — mock a failed fetch → returns a local `{ kind:'task' }`
  for a plain capture and `{ kind:'ask'|'plan' }` for a project-signal capture. No throw.
- **`scheduleItem`** — sets `day/window/time/sortTime`; `time` overrides `sortTime` ordering;
  scheduling a non-today date keeps it out of today's list until that day; `unschedule`
  clears `day` and `time`.
- **`addTask(CaptureTask)`** — files unscheduled with the parsed fields incl. `timeContext`.
- **Capture agent contract** — parsing a well-formed `{kind:'task', task}` and a malformed
  payload (missing fields) degrades to the local fallback rather than crashing.
- Existing `collapseRepeats` and interview tests stay green.

## 11. Future seam — planner agent (not built now)

When the planner agent ships, it reads `timeContext` (+ the user's calendar/free time) and
proposes a **concrete** slot the user accepts in one tap ("free Wednesday morning — schedule
after Fajr?"). It writes through the same `scheduleItem({ date, window, time? })` action.
Nothing in this design needs to change to accommodate it; the fuzzy chip is intentionally
never introduced, so there is nothing to remove later.
