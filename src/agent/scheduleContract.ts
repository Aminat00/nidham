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
  time?: string;       // "HH:mm" exact clock time, set only when the hint named one
  rationale?: string;
}

export interface ScheduleResult {
  placements: SchedulePlacement[];
}
