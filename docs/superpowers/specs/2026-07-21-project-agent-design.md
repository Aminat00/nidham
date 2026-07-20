# Nidham — Project Agent & Tasks Backlog (design spec)

**Date:** 2026-07-21
**Status:** Approved design → ready for implementation plan
**Scope:** The MVP agentic centerpiece. One new "talking" capability (the Project
agent) plus the information architecture that holds its output. Deliberately *not*
the balance-orchestrator or the spirituality tracker — those are named as later.

---

## 1. Why

Nidham solves three "it's-in-my-head" problems. Two are already addressed (Capture +
Today). This spec attacks the third and hardest:

> **"I set up big projects and never follow them"** — because (a) it's hard to break a
> goal into small doable steps, and (b) even once broken down, it's hard to keep
> following them day to day.

The fix is an agent you *talk to*: you speak a goal, it interviews you briefly, and it
produces a real plan (milestones → steps) with a single **"start here."** The plan lives
in a categorized backlog so it never floods your day, and the next step reaches Today
only when you choose to do it — placed in a specific prayer window.

North star (explicitly later, not this spec): a balance-orchestrator that allocates time
across all life domains each day. This spec lays the groundwork (`area` field,
scheduled/unscheduled split) without building it.

---

## 2. Information architecture — 3 tabs + center mic

```
┌───────────────────────────────────────────────┐
│  ①  Capture (Talk)      ②  Today       ③ Tasks │
│         └──────── center mic (FAB) ────────┘   │
└───────────────────────────────────────────────┘
```

| Tab | Purpose |
|---|---|
| **① Capture (Talk)** | Mic-first dump. You just talk. Nidham triages each thing into a **task** (with an `area`) or a **project**. Small tasks land in the **Tasks backlog**; a project-sized goal launches the **inline interview** here. Typing still works. |
| **② Today** | The prayer-anchored day (already built). Shows only items **scheduled for today**, each in a prayer window. |
| **③ Tasks** | The categorized **backlog** — everything you dumped that isn't scheduled: loose tasks grouped by `area`, plus **Projects** (with milestones → steps). Home of follow-through. |

The **center mic** is the universal "talk to Nidham" button, reachable from anywhere.
(Reintroduces the FAB from the original spec; today's build has 2 tabs and no FAB.)

---

## 3. The core loop

```
Talk (mic)
   │  triage
   ├── small thing ─────────────► Task  (area assigned) ─► Tasks backlog
   │                                          │ "Do today" (pick prayer window)
   │                                          └────────────────────────► Today
   │
   └── big goal ──► Interview (≤3 Qs) ──► Plan: Project → Milestones → Steps
                                                    │  ("start here" on first step)
                                                    └─► Projects (in Tasks backlog)
                                                            │ schedule step → window
                                                            └───────────────► Today
```

**Key rule: Capture ≠ schedule.** Dumping categorizes and parks. Nothing reaches Today
automatically *unless* the user said/implied "today" (then triage schedules it into a
suggested window). Everything else waits in the backlog.

---

## 4. The Project interview (adaptive, inline, capped)

- Lives **inline in the Capture thread**. After you speak a project-sized goal, Nidham
  replies with **one question at a time**.
- **Adaptive:** it asks a follow-up *only when the goal is vague* — e.g. *"What would
  'started' look like in 30 days?"*, *"Any deadline?"*, *"Hours per week?"*. A specific
  goal skips straight to the plan.
- **Hard cap: 3 answers.** After the 3rd user answer the client forces a plan, so the
  conversation can never loop.
- Then it emits a **plan**: `Project → Milestones → Steps`, first step flagged
  **`startHere`**, plus a one-line summary.
- The conversation itself is **ephemeral** (not persisted). Only the resulting
  project/milestones/steps are saved.

---

## 5. Data model — additions to the single `Item`

Everything stays one `Item`. Four small changes:

| Change | Detail |
|---|---|
| `category` gains `'milestone'` | Hierarchy is just `parentId`: **project → milestone → step**. |
| `day` becomes **optional** | No `day` ⇒ **unscheduled** (backlog). `Today` filters `day === today`, so backlog items stay off Today with no extra flag. |
| add `area?` | `'chore' \| 'admin' \| 'personal' \| 'self-dev' \| 'spiritual' \| 'errand' \| 'project'`. Assigned by triage; drives Tasks grouping and seeds the future balance-engine. |
| add `order?: number` | Stable ordering for backlog milestones/steps (they have no clock time). |

**Derived, not stored — the "current step":** the first not-`done` step inside the first
not-`done` milestone of a project. Computed on read; nothing to keep in sync.

**Scheduling an item to Today** = set `day = today` + `window` (a prayer window, "between
which two prayers") + a `sortTime`. Nidham suggests the window; the user can change it.

---

## 6. The agent module & write path

### 6.1 A second swappable module
`runProjectAgent(conversation, context)` — mirrors `runAgent`'s env-driven design
(`EXPO_PUBLIC_AGENT_MODE` = `webhook | direct`, same URL/key, same 20 s timeout). It
returns **one of**:

```ts
type ProjectTurn =
  | { type: 'ask'; question: string }                       // one follow-up
  | { type: 'plan'; summary: string; project: ProjectPlan } // final plan

interface ProjectPlan {
  title: string;
  area: 'project';
  milestones: Array<{
    title: string;
    steps: Array<{ title: string; startHere?: boolean; note?: string }>;
  }>;
}
```

Request payload: `{ conversation: {role:'user'|'agent'; text:string}[], context }`, where
`context` reuses `AgentContext` (now, lang, prayerTimes) plus a trimmed list of existing
projects so the agent avoids duplicates.

Triage (task vs project, and `area`) is a lightweight step: for the MVP it can be a local
heuristic with an agent-backed path behind the same module, so the demo works offline.

### 6.2 Local-first write path (unchanged philosophy)
The agent **proposes**; the store **disposes**. A returned plan is flattened into `Item`s
(project + milestone + step rows via `parentId`/`order`), upserted into the store, and the
existing **debounced Supabase write-through** syncs it. **No service-key direct DB
writes** — that would break local-first.

### 6.3 Never breaks the demo
If unconfigured / offline / timed out / bad shape → a **deterministic fallback**: a
1-question mini-interview, then a plausible templated milestone plan derived from the goal
text. Same guarantee `runAgent` already ships via `buildFallback`.

### 6.4 Supabase schema
- Allow `'milestone'` in the category (and `'project'`/`'step'` already present).
- Add `sort_order int` and `area text` columns. (`order` is a reserved SQL word — we use
  `sort_order`, as we already did with `prayer_window`.)
- Make the `day` column nullable, for unscheduled (backlog) items.
- `itemsRepo` maps the new fields both directions.

---

## 7. Today — one calm step at a time

- Only items with `day === today` appear, each in its prayer window.
- **One active project step at a time:** when a project step is scheduled to today, only
  the *current* "start here" step shows. Complete it → the next step becomes current
  (and can be scheduled next). You never face a wall of 20 project steps.
- Marking a scheduled task/step done in Today reflects back to the Tasks backlog and, for
  projects, advances the current step.

---

## 8. Tasks tab (the follow-through fix)

```
TASKS
 ├─ PROJECTS
 │    └─ Solo AI business        2/9 steps · on "Validate the idea"   → [open]
 ├─ CHORES        groceries · pharmacy
 ├─ ADMIN         reply to advisor · renew ID
 ├─ PERSONAL      call my aunt
 ├─ SELF-DEV      finish course module
 └─ ERRANDS       …
```

- **List:** loose tasks grouped by `area`; a **Projects** section on top with a progress
  hint + next action.
- Each loose task: a **"Do today"** action → prompts/suggests a prayer window, sets
  `day=today`, drops it into Today.
- **Project detail:** milestones (collapsible) → steps with checkboxes; **"start here"**
  on the current step; a **"Do today"** on the current step schedules it into a window.
- Checking a step here reflects in Today and advances the project.

---

## 9. Scope

| ✅ MVP (this spec) | ⏳ Later (named, not built) |
|---|---|
| 3-tab IA + center mic | Real **web research** in the plan (n8n tool) |
| Talk → triage (task vs project, `area`) | Balance-my-day **orchestrator** |
| Adaptive interview (inline, ≤3 Qs) | Spirituality **tracker** (day→week→month) |
| Milestones → steps + "start here" | Native voice (web voice works now) |
| Tasks backlog grouped by `area` | Per-item AI actions (reschedule/protect) |
| Scheduled/unscheduled split; "Do today" → prayer window | Auto-scheduling from backlog |
| One-active-step-into-Today | |
| Local-first + Supabase sync + fallback | |

---

## 10. Testing

Pure-logic harness (no network), so refactors stay safe:
- **Triage heuristic** — task vs project; `area` assignment on representative dumps.
- **Current-step computation** — first not-done step in first not-done milestone; edge
  cases (all done, empty milestone).
- **Plan flatten** — `ProjectPlan` → `Item[]` with correct `parentId`/`order`/`category`.
- **Fallback** — always returns a valid `ProjectTurn` for any input.

The agent network paths keep the existing "never throws → fallback" contract; the demo
survives any agent failure.

---

## 11. Open items to resolve during planning
- Exact copy for the interview questions in en / tr / ar (RTL).
- Default window suggestion logic for "Do today" (nearest upcoming open window vs
  `anytime`).
- Whether the Capture thread shows past project conversations or clears after each plan
  (leaning: clears — conversation is ephemeral).
