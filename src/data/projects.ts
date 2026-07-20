/**
 * Project math — everything about a project's progress is *derived* from its item tree,
 * never stored. A project has `milestone` children (ordered), each with `step` children
 * (ordered). The "current step" is the single next action: the first not-done step in the
 * first not-fully-done milestone. Keeping this computed means the tree can't drift out of
 * sync with a cached pointer.
 */

import type { Item } from '../types/item';

const byOrder = (a: Item, b: Item) => (a.order ?? 0) - (b.order ?? 0);

/** Direct children of `parentId` of a given category, in `order`. */
function children(parentId: string, category: Item['category'], byId: Record<string, Item>): Item[] {
  return Object.values(byId)
    .filter((i) => i.parentId === parentId && i.category === category)
    .sort(byOrder);
}

/** The project's milestones in order. */
export function milestonesOf(projectId: string, byId: Record<string, Item>): Item[] {
  return children(projectId, 'milestone', byId);
}

/** The steps of a milestone in order. */
export function stepsOf(milestoneId: string, byId: Record<string, Item>): Item[] {
  return children(milestoneId, 'step', byId);
}

/**
 * The ids to look for steps under: each milestone, or the project itself when it has no
 * milestone layer (older/flat projects whose steps hang directly off the project).
 */
function stepGroups(projectId: string, byId: Record<string, Item>): string[] {
  const milestones = milestonesOf(projectId, byId);
  return milestones.length ? milestones.map((m) => m.id) : [projectId];
}

/** The single next action: first not-done step in the first not-fully-done group. */
export function currentStep(projectId: string, byId: Record<string, Item>): Item | undefined {
  for (const gid of stepGroups(projectId, byId)) {
    const next = stepsOf(gid, byId).find((s) => s.status !== 'done');
    if (next) return next;
  }
  return undefined;
}

export interface ProjectProgress {
  done: number;
  total: number;
  /** Title of the milestone the current step lives in (undefined when complete). */
  milestoneTitle?: string;
}

export function projectProgress(projectId: string, byId: Record<string, Item>): ProjectProgress {
  const milestones = milestonesOf(projectId, byId);
  let done = 0;
  let total = 0;
  for (const gid of stepGroups(projectId, byId)) {
    for (const s of stepsOf(gid, byId)) {
      total += 1;
      if (s.status === 'done') done += 1;
    }
  }
  const current = currentStep(projectId, byId);
  const activeMilestone = current ? milestones.find((m) => m.id === current.parentId) : undefined;
  return { done, total, milestoneTitle: activeMilestone?.title };
}
