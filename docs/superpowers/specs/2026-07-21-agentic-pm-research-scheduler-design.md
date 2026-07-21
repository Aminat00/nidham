# Agentic PM System — Research-backed Planner + Auto-Scheduler — Design

Date: 2026-07-21
Status: Approved (brainstorming) — ready for implementation plan

## 1. Problem

Today's Project agent is a fixed ≤3-question interview that emits micro-steps and stops. It
doesn't research real-world specifics (so it invents them), doesn't produce day-sized
schedulable work, and never schedules anything. The app's identity is supposed to carry a
fuzzy goal all the way to **scheduled, doable days** — decomposition is only half.

## 2. Product principles

- **Act like a PM who knows the user has ADHD:** research over interrogation; minimal
  questions; calm, small, day-sized units; one obvious next action; never a wall of steps.
- **Ground facts, never invent them:** real-world specifics come from web search; the model
  only reasons about generic structure. (Carries the anti-hallucination fix already shipped.)
- **A committed project earns automation:** loose captures wait for the user (suggest, they
  dispose); a *project's* subtasks are **auto-scheduled** for them (movable afterward).
- **Systematic agents:** each agent has one responsibility, an explicit JSON contract, is
  stateless (state lives in the app), has its own fallback (never breaks the demo), and its
  own model tier. A thin n8n router; intelligence in the specialists.

## 3. Goals / Non-goals

**Goals**
- Upgrade the **PM agent**: one batched clarify pass (only when needed) → research → a
  phased plan of **day-sized subtasks** (`estimate` + `energy`, first `startHere`).
- Add a **Research capability** (hybrid web search via Tavily) *inside* the PM's plan turn.
- Add a **Scheduler agent** that **auto-schedules** near-horizon subtasks onto days + prayer
  windows, from a self-contained availability model, with ADHD-calm guardrails.

**Non-goals (future)**
- Real Google Calendar integration (design leaves an availability seam for it).
- The scheduler learning the user's habits over time.
- Changing the loose-task capture flow (it keeps suggest-then-confirm).

## 4. System architecture

```
Webhook /nidham (thin router, branches on body.agent)
  ├── agent:'capture'   → Capture/Triage  (exists)
  ├── agent:'project'   → Project Manager  ── internally calls ──▶ Research (Tavily)
  └── agent:'schedule'  → Scheduler
```

One shared `Context` reaches every agent: `{ now, lang, prayerTimes, existingItems[] }`.

### Contracts (canonical)

**Context** — `AgentContext` in `src/agent/contract.ts`. Extend `ExistingItemRef` with `day`:
```ts
interface ExistingItemRef { id: string; title: string; window: string; day?: string | null; }
```
so the Scheduler sees each existing item's day (its "busy map").

**Project Manager** (`src/agent/projectContract.ts`) — contract shape UNCHANGED for the app
(`{type:'ask'} | {type:'plan'}`); research is invisible to the app (n8n-internal). Extend the
step shape:
```ts
interface ProjectPlanStep {
  title: string;
  startHere?: boolean;
  note?: string;
  estimate?: string;             // NEW — e.g. "~half a day", "~2h"
  energy?: 'deep' | 'light' | 'admin';  // NEW
}
```
(`ProjectPlanMilestone`/`ProjectPlan`/`ProjectTurn`/`ProjectPayload` unchanged. "steps" ARE
the day-sized subtasks.)

**Scheduler** — new `src/agent/scheduleContract.ts`:
```ts
import type { AgentContext } from './contract';
import type { Window, Energy } from '../types/item';

export interface SchedulableSubtask { id: string; title: string; estimate?: string; energy?: Energy; }
export interface SchedulePayload { subtasks: SchedulableSubtask[]; context: AgentContext; }
export interface SchedulePlacement { subtaskId: string; day: string; window: Window; rationale?: string; }
export interface ScheduleResult { placements: SchedulePlacement[]; }
```

## 5. Flow (end-to-end)

1. **Goal** → app sends `{conversation, context}` to `agent:'project'`.
2. **Clarify (conditional):** PM returns `{type:'ask', question}` where `question` is ONE
   message batching the 2–3 essential *you-only* unknowns. User answers in free text (one
   reply). Skipped when the goal is already specific.
3. **Research + Plan (n8n-internal):** on the plan turn the PM decides optional search
   queries → Tavily → grounds the plan in findings → returns `{type:'plan', summary, project}`.
4. **Persist:** app `createProject(plan)` → project + subtask Items land in the backlog
   (`flattenProjectPlan` maps `energy`→`item.energy`, `estimate`→`item.note`).
5. **Auto-schedule:** app calls `agent:'schedule'` with the created subtasks + context →
   `{placements}` → app applies `scheduleItem(subtaskId, {date, window})` to each. Subtasks
   appear on their days; user can push/move/unschedule (existing controls).

## 6. Agent details

### 6a. Project Manager (prompt upgrade)
`src/agent/projectSystemPrompt.ts` (+ n8n copy). Changes:
- **One batched clarify**, only when genuine you-only unknowns exist; otherwise go straight
  to plan. Never one-at-a-time; never more than one clarify round.
- **Grounding:** when findings are supplied (n8n injects them), base real-world specifics
  strictly on them; if a needed fact is missing, say so in a subtask rather than inventing.
- **Output:** 2–4 phases (milestones) → **day-sized subtasks** each with `estimate` +
  `energy`; exactly one `startHere`. Calm, encouraging, small.
- **Keeps:** reply in the user's actual written language; confirm garbled/odd input.

### 6b. Research (n8n-internal, hybrid)
n8n project branch becomes: **Decide** LLM (given conversation → `{mode:'ask',question}` |
`{mode:'plan', queries?:[...] }`) → if `queries`, **Tavily** HTTP node (POST
`https://api.tavily.com/search`, `{query, max_results:5}`, Bearer key) → **Plan** LLM
(conversation + findings) → Respond. If no queries, skip straight to Plan. Provider: **Tavily**
(free tier); one API key in n8n credentials. Findings summarized to keep tokens bounded.

### 6c. Scheduler
New `src/agent/scheduleSystemPrompt.ts` (`SCHEDULER_SYSTEM_PROMPT`, + n8n `agent:'schedule'`
branch) and `src/agent/runScheduleAgent.ts` (mirrors `runProjectAgent`: same env transport,
20s timeout, NEVER throws → deterministic local fallback). Places subtasks per the guardrails:

**Guardrails (keep "auto" ADHD-calm):**
- **Availability** = prayer windows + `context.existingItems` (their `day`+`window`) + a
  **daily load cap** (default 3 planned items/day). *(Seam: swap availability source later.)*
- **Near-horizon only:** schedule the current phase / ~next 7 days; later-phase subtasks stay
  unscheduled in the backlog until closer. No dumping a months-long wall.
- **Energy-aware:** `deep` → the day's peak window (morning / first long gap after Dhuhr);
  `light`/`admin` → short post-prayer gaps; never two `deep` back-to-back on one day.
- **Prayer-anchored:** every placement names a `window`; never over a prayer.

Every placement's `subtaskId` MUST be echoed verbatim from the payload's subtask ids (the
prompt states this; the local fallback uses them directly), so the app can map each placement
back to its Item.

**Local fallback** (`localSchedule(subtasks, context)` in `src/state/schedule.ts`, pure &
unit-tested): spread subtasks from today forward, ≤ load-cap/day, `deep`→morning window else
`suggestCurrentWindow`/anytime, respecting days already at cap in `existingItems`.

## 7. App changes
- `src/agent/contract.ts`: add `day?` to `ExistingItemRef`; build `existingItems` with `day`
  where CaptureScreen assembles context.
- `src/agent/projectContract.ts`: add `estimate`/`energy` to `ProjectPlanStep`.
- `src/state/flattenProject.ts`: map `estimate`→`note`, `energy`→`item.energy` on steps.
- `src/agent/scheduleContract.ts`, `scheduleSystemPrompt.ts`, `runScheduleAgent.ts`: new.
- `src/state/schedule.ts`: add pure `localSchedule(...)` (+ tests).
- `src/state/store.tsx`: add `subtasksOf(projectId): Item[]` helper — the project's leaf
  subtasks, i.e. flatMap over its milestones (`projectMilestones`) → their steps
  (`milestoneSteps`); each has the id `scheduleItem` needs.
- `src/screens/CaptureScreen.tsx`: after `createProject`, gather `subtasksOf`, call
  `runScheduleAgent`, apply `scheduleItem` per placement; show a brief "Scheduling…" state.
- `src/screens/ProjectDetailScreen.tsx`: a **Reschedule** action (re-runs `runScheduleAgent`).
- `runProjectAgent` normalize already tolerant; `estimate`/`energy` are additive.

## 8. n8n changes (user applies via import; JSON stays git-ignored)
- **Project branch** → Decide-LLM → (Tavily) → Plan-LLM, prompts synced from the TS copies.
- **New Scheduler branch** (`agent:'schedule'`) → Scheduler-LLM → Respond `{placements}`.
- One new credential: **Tavily API key**. `allowedOrigins:'*'` kept.
- Regenerate `docs/nidham-agent-openai.n8n.json` from the canonical TS prompts (generator
  already injects prompts; extend it to inject the scheduler prompt + add the branch).

## 9. Cost per project
~1 clarify call + (1 decide + 1 Tavily search + 1 plan call) + 1 schedule call — bounded,
`gpt-4o-mini` tier; search only when real-world specifics exist.

## 10. Testing
- `localSchedule` (pure): respects load cap; `deep`→morning; spreads across days; skips days
  already full per `existingItems`; near-horizon bound.
- `runScheduleAgent` unconfigured → returns a valid `{placements}` via local fallback (no throw).
- `flattenProjectPlan`: `energy`/`estimate` land on step Items.
- `runProjectAgent` still returns valid `ask`/`plan` (extended step shape parses).
- Contract parse: malformed scheduler/plan payloads degrade to fallback, never crash.
- Component flows (interview batched-clarify, auto-schedule, Reschedule) verified in web preview.

## 11. Fallbacks (never break the demo)
Each agent degrades locally: PM → existing `fallbackProjectTurn`; Scheduler → `localSchedule`;
Research → PM plans without findings (generic, flagged). Offline, the whole journey still
completes with local logic.

## 12. Out of scope
Google Calendar; habit-learning; changing loose-task capture. The Scheduler's availability
input and the `agent:'schedule'` contract are the seams these plug into later.
