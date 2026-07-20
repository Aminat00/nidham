# Project Agent & Tasks Backlog — Implementation Plan

> **For agentic workers:** implement task-by-task, commit after each. Steps use `- [ ]`.

**Goal:** Add the MVP agentic centerpiece — a talk-to-Nidham Project agent (adaptive
interview → milestones → steps) plus a 3-tab IA (Capture · Today · Tasks) with a
categorized backlog, where dumped items are parked and only reach Today on demand.

**Architecture:** Local-first, unchanged philosophy. New pure-logic modules (triage,
project math, plan flatten, fallback) are unit-tested. A second env-driven swappable
module `runProjectAgent` mirrors `runAgent` (webhook/direct/fallback, never throws). The
store gains backlog + scheduling + project creation; UI gains a Tasks tab, a project
detail view, a conversational Capture thread, and a 3-tab bar with a center mic.

**Tech Stack:** React Native 0.74 / Expo 51 / TS strict, react-native-svg, Supabase,
AsyncStorage. Tests via jest + ts-jest (pure TS logic only, node env).

## Global Constraints
- Never hardcode the model call — env-driven (`EXPO_PUBLIC_AGENT_MODE/URL/KEY`), same as `runAgent`.
- The agent NEVER throws → always falls back so the demo can't break.
- Local-first: agent proposes → store disposes → existing Supabase write-through syncs. No service-key direct DB writes.
- Trilingual en/tr/ar, RTL-correct. Use `ff()`/`amiri()` + palette tokens; layout with gap+flex (no hardcoded mt/mb where gap works).
- Commit messages: plain, NO `Co-Authored-By` trailer.
- `order` is a reserved SQL word → DB column is `sort_order` (mirror of `prayer_window`).

---

## Types (Task 1 — the contract everything shares)
```ts
// src/types/item.ts additions
export type Area = 'chore' | 'admin' | 'personal' | 'self-dev' | 'spiritual' | 'errand' | 'project';
// Category gains 'milestone'; Item gains: day?: string | null; area?: Area; order?: number.

// src/agent/projectContract.ts
export interface ConversationTurn { role: 'user' | 'agent'; text: string }
export interface ProjectPlanStep { title: string; startHere?: boolean; note?: string }
export interface ProjectPlanMilestone { title: string; steps: ProjectPlanStep[] }
export interface ProjectPlan { title: string; milestones: ProjectPlanMilestone[] }
export type ProjectTurn =
  | { type: 'ask'; question: string }
  | { type: 'plan'; summary: string; project: ProjectPlan };
export interface ProjectPayload { conversation: ConversationTurn[]; context: AgentContext }
```

## Key signatures (consistency across tasks)
```ts
triageCapture(text: string): { kind: 'task'|'project'; area: Area; scheduleToday: boolean }   // src/agent/triage.ts
currentStep(projectId: string, byId: Record<string,Item>): Item | undefined                    // src/data/projects.ts
projectProgress(projectId, byId): { done: number; total: number; milestoneTitle?: string }      // src/data/projects.ts
flattenProjectPlan(plan: ProjectPlan, o:{ idSeed:string }): { project: Item; items: Item[] }    // src/state/flattenProject.ts
fallbackProjectTurn(payload: ProjectPayload): ProjectTurn                                        // src/agent/projectFallback.ts
runProjectAgent(payload: ProjectPayload): Promise<ProjectTurn>                                   // src/agent/runProjectAgent.ts
```

## Hierarchy
`project` (no day = backlog, area:'project') → `milestone` (parentId=project, order) →
`step` (parentId=milestone, order, maybe startHere). "Current step" is derived:
first not-done step in the first not-fully-done milestone.

---

## Tasks (execution order)

- **Task 0 — Test harness.** Add `jest` + `ts-jest` (dev). `jest.config.js` (preset ts-jest, testEnvironment node, testMatch `**/*.test.ts`). `test` script. Smoke test.
- **Task 1 — Types.** Extend `Item` (`day?`, `area?`, `order?`, category `'milestone'`), add `Area`, add `src/agent/projectContract.ts`.
- **Task 2 — Triage** (`src/agent/triage.ts`, TDD). Project regex (reuse PROJECT_RE idea) + `area` keyword map + today/tonight detection.
- **Task 3 — Project math** (`src/data/projects.ts`, TDD). `currentStep`, `projectProgress`.
- **Task 4 — Flatten plan** (`src/state/flattenProject.ts`, TDD). `ProjectPlan` → project+milestone+step `Item[]`, deterministic ids, `order`, startHere.
- **Task 5 — Fallback** (`src/agent/projectFallback.ts`, TDD). vague+no-answers → `ask`; else templated `plan`. Always valid.
- **Task 6 — runProjectAgent** (`src/agent/runProjectAgent.ts` + `projectSystemPrompt.ts`). Mirror runAgent; unconfigured/fail → fallback. Test: unconfigured → returns a valid ProjectTurn.
- **Task 7 — Store.** Add `projects`, `backlogByArea()`, `createProject(plan): id`, `addTask(text, triage)`, `scheduleToday(id, window)`, `unschedule(id)`, expose `currentStep`. `itemsForDay` already excludes no-day items; add one-active-step-per-project filter. Keep reseed/persist working with optional `day`.
- **Task 8 — Persistence + schema.** `itemsRepo` maps `area`/`sort_order`/nullable `day`. `schema.sql`: allow `'milestone'`, add `area text`, `sort_order int`, make `day` nullable. Provide migration SQL for the user to run.
- **Task 9 — i18n.** Add strings for Tasks tab, area labels, interview UI, Do-today, project detail (en/tr/ar).
- **Task 10 — TabBar.** 3 tabs (`today` · center mic · `tasks`) + `ListIcon`; center mic = talk. RTL-aware.
- **Task 11 — Capture thread.** Mic/text submit → triage. task → `addTask` (+ landed card). project → inline interview (chat bubbles) via `runProjectAgent` loop, cap 3 answers, then `createProject`. Ephemeral thread.
- **Task 12 — Tasks screen.** Projects section (progress + next action) + loose tasks grouped by `area`. Each task: "Do today" → window picker → `scheduleToday`.
- **Task 13 — Project detail.** Milestones (collapsible) → steps + checkboxes + startHere; "Do today" on current step.
- **Task 14 — App wiring + Today.** 3 screens + project-detail overlay; Today renders scheduled items incl. one active project step; verify in browser.

Each code task: write test (logic tasks) → run red → implement → run green → `npm run typecheck` → commit. UI tasks: implement → `npm run typecheck` → browser-verify → commit.

## Later (explicitly not this plan)
Web research in plans · balance orchestrator · spirituality tracker · native voice · per-item AI actions · auto-scheduling from backlog.
