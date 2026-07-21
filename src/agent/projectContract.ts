/**
 * The Project agent contract — app ⇄ agent for the adaptive interview.
 *
 * The app sends the running conversation + context; the agent replies with EITHER one
 * more question (`ask`) OR the finished plan (`plan`). The interview is capped
 * client-side (max 3 user answers) so it can never loop. Mirrors `contract.ts` for the
 * one-shot capture agent — same `AgentContext`, same swappable-module philosophy.
 */

import type { AgentContext } from './contract';
import type { Energy } from '../types/item';

/** One line of the interview. `agent` = Nidham's question, `user` = the reply. */
export interface ConversationTurn {
  role: 'user' | 'agent';
  text: string;
}

export interface ProjectPlanStep {
  title: string;
  /** The single micro-step to begin with. */
  startHere?: boolean;
  /** Optional meta, e.g. "~30 min". */
  note?: string;
  /** Rough size, e.g. "~half a day", "~2h". */
  estimate?: string;
  /** Cognitive load — drives energy-aware scheduling. */
  energy?: Energy;
}

export interface ProjectPlanMilestone {
  title: string;
  steps: ProjectPlanStep[];
}

/** The plan the agent produces: a project → milestones → steps. */
export interface ProjectPlan {
  title: string;
  milestones: ProjectPlanMilestone[];
}

/** One turn of the agent: another question, or the final plan. */
export type ProjectTurn =
  | { type: 'ask'; question: string }
  | { type: 'plan'; summary: string; project: ProjectPlan };

/** Request body (app → agent). */
export interface ProjectPayload {
  /** The interview so far — first `user` turn is the raw goal. */
  conversation: ConversationTurn[];
  context: AgentContext;
}
