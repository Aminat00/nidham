/**
 * The app → agent request contract, verbatim from nidham-spec.md
 * ("Request contract (app → agent)"). One raw brain-dump string in; the
 * orchestrator runs Triage → Planner → Breakdown and returns an AgentResponse.
 */

import type { Lang } from '../i18n/strings';

export interface PrayerTimes {
  fajr: string; // "HH:mm"
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
}

/** A trimmed view of an existing Item, so the planner avoids double-booking. */
export interface ExistingItemRef {
  id: string;
  title: string;
  window: string;
  /** ISO date the item is scheduled for, so the scheduler sees the busy map. */
  day?: string | null;
}

export interface AgentContext {
  /** ISO 8601 with offset, e.g. "2026-07-20T13:02:00+03:00" */
  now: string;
  lang: Lang;
  prayerTimes: PrayerTimes;
  existingItems: ExistingItemRef[];
}

export interface AgentPayload {
  /** The messy, unordered brain-dump. */
  capture: string;
  context: AgentContext;
}
