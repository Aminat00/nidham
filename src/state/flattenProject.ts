/**
 * Turn a `ProjectPlan` (agent output) into real, standalone `Item`s: one `project`, its
 * `milestone` children, and their `step` children — all wired by `parentId`/`order`.
 *
 * The whole tree lands **unscheduled** (no `day`) → it lives in the Tasks backlog. Only
 * when the user taps "Do today" on the current step does that step get a `day`/`window`.
 * Ids are derived from a caller-supplied seed so re-runs are stable and never collide
 * with other captures.
 */

import type { Item } from '../types/item';
import type { ProjectPlan } from '../agent/projectContract';

export interface FlattenProjectResult {
  project: Item;
  /** Milestones + steps (NOT the project itself). */
  items: Item[];
}

export function flattenProjectPlan(plan: ProjectPlan, opts: { idSeed: string }): FlattenProjectResult {
  const base = `proj_${opts.idSeed}`;

  const project: Item = {
    id: base,
    title: plan.title,
    category: 'project',
    area: 'project',
    window: 'anytime',
    sortTime: '10:00',
    urgency: 'soon',
    energy: 'deep',
    status: 'pending',
    // no `day` → backlog
  };

  const items: Item[] = [];
  const stepIds: string[] = [];

  plan.milestones.forEach((m, mi) => {
    const milestoneId = `${base}_m${mi}`;
    items.push({
      id: milestoneId,
      title: m.title,
      category: 'milestone',
      parentId: project.id,
      order: mi,
      window: 'anytime',
      sortTime: '10:00',
      urgency: 'soon',
      energy: 'light',
      status: 'pending',
    });

    m.steps.forEach((s, si) => {
      const stepId = `${milestoneId}_s${si}`;
      stepIds.push(stepId);
      items.push({
        id: stepId,
        title: s.title,
        category: 'step',
        parentId: milestoneId,
        order: si,
        window: 'anytime',
        sortTime: '10:00',
        urgency: 'soon',
        energy: 'light',
        status: 'pending',
        startHere: s.startHere,
        note: s.note,
      });
    });
  });

  project.steps = stepIds;
  return { project, items };
}
