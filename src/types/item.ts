/**
 * Nidham — the single `Item` object.
 *
 * Everything in Nidham is one `Item`. Prayers, tesbihat, wird, tasks, projects,
 * steps and errands are all `Item`s that differ ONLY by field values. This is the
 * data model verbatim from nidham-spec.md ("Data model — the single `Item`").
 */

/** What kind of thing this is. Prayers/tesbihat/wird are seeded; the rest come from capture. */
export type Category =
  | 'prayer'
  | 'tesbihat'
  | 'wird'
  | 'task'
  | 'project'
  | 'step'
  | 'errand';

/** Prayer-anchored slot the item lives in — never floating clock-time. */
export type Window =
  | 'fajr'
  | 'morning'
  | 'dhuhr'
  | 'afternoon'
  | 'asr'
  | 'maghrib'
  | 'isha'
  | 'evening'
  | 'anytime';

/** How pressing it is. Default vague items to `soon`. */
export type Urgency = 'now' | 'today' | 'soon' | 'someday';

/** Cognitive load required — drives energy-aware scheduling and the energy dot. */
export type Energy = 'deep' | 'light' | 'admin';

/** Lifecycle. Manual control on Today toggles between these. */
export type Status = 'pending' | 'now' | 'done' | 'pushed';

export interface Item {
  id: string;
  /** e.g. "Reply to advisor email" */
  title: string;
  category: Category;
  /** ISO date the item is scheduled for, e.g. "2026-07-20" */
  day: string;
  /** Prayer-anchored slot it lives in. */
  window: Window;
  /** "HH:mm" — resolved clock time, used only for ordering within a day. */
  sortTime: string;
  urgency: Urgency;
  energy: Energy;
  /** Hard deadline if any (ISO date). */
  dueDate?: string | null;
  /** Set on steps → points to their project Item. */
  parentId?: string | null;
  /**
   * Set on projects → ordered step ids. The agent may also return steps inline as
   * nested step Items (pre-persist); the store flattens those into real Items and
   * fills this with their ids. See `NestedStep`.
   */
  steps?: string[];
  /** The one micro-step to begin with. */
  startHere?: boolean;
  status: Status;
  /** True for prayers and "protected projects" (priority-ladder rung 2). */
  protected?: boolean;
  /** Optional display meta, e.g. "Admin · 5 min". */
  note?: string;
}

/**
 * Shape a project uses to carry its steps inline before they become real Items.
 * The agent response nests these under a project's `steps`; the store flattens
 * them into standalone step `Item`s (assigning `day`/`window`/`sortTime`/`status`)
 * and replaces the project's `steps` with the resulting ids.
 */
export interface NestedStep {
  id: string;
  title: string;
  parentId: string;
  category: 'step';
  startHere?: boolean;
}

/** A project Item as it arrives from the agent: `steps` may be nested step objects. */
export interface RawItem extends Omit<Item, 'steps'> {
  steps?: string[] | NestedStep[];
}

/** The full agent response: a flat-ish `items[]` plus a one-line calm summary. */
export interface AgentResponse {
  summary: string;
  items: RawItem[];
}
