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
