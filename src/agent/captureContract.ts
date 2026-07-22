/**
 * Capture agent contract — the FIRST turn of a capture. The agent is a pure classifier:
 * a small thing → a clean parsed task; a project-sized goal → `route` (hand off to the
 * Project agent, which then owns the whole interview + research + plan). The capture agent
 * never asks the project's questions itself.
 */
import type { Area, Urgency, Energy } from '../types/item';
import type { AgentContext } from './contract';

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
  | { kind: 'route'; to: 'project' };

/** Request body (app → agent) for a fresh capture. */
export interface CapturePayload {
  capture: string;
  context: AgentContext;
}
