/**
 * Flatten an AgentResponse into real, standalone `Item`s.
 *
 * Projects arrive with their steps nested inline (NestedStep[]). Here we lift each
 * nested step into its own `Item` — inheriting the project's day/window and getting
 * a resolved sortTime and pending status — and replace the project's `steps` with
 * the resulting ids. Step-id lists that are already flat are passed through.
 */

import type { AgentResponse, Item, NestedStep, RawItem } from '../types/item';

/** Add `minutes` to an "HH:mm" clock string (clamped to 23:59). */
function addMinutes(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  const total = Math.min(h * 60 + m + minutes, 23 * 60 + 59);
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

function isNestedStepArray(steps: RawItem['steps']): steps is NestedStep[] {
  return Array.isArray(steps) && steps.length > 0 && typeof steps[0] !== 'string';
}

export interface FlattenResult {
  /** All items — projects/tasks/errands plus lifted step items. */
  items: Item[];
  /** Ids of the top-level captured items, in response order (for the feed). */
  topLevelIds: string[];
}

export function flattenResponse(res: AgentResponse): FlattenResult {
  const items: Item[] = [];
  const topLevelIds: string[] = [];

  for (const raw of res.items) {
    topLevelIds.push(raw.id);

    if (raw.category === 'project' && isNestedStepArray(raw.steps)) {
      const stepIds: string[] = [];
      raw.steps.forEach((step, index) => {
        stepIds.push(step.id);
        items.push({
          id: step.id,
          title: step.title,
          category: 'step',
          day: raw.day,
          window: raw.window,
          sortTime: addMinutes(raw.sortTime, (index + 1) * 5),
          urgency: raw.urgency,
          energy: 'light',
          parentId: raw.id,
          startHere: step.startHere,
          status: 'pending',
        });
      });
      items.push({ ...(raw as Omit<RawItem, 'steps'>), steps: stepIds } as Item);
    } else {
      // Task / errand / already-flat project.
      const { steps, ...rest } = raw;
      items.push({
        ...(rest as Omit<RawItem, 'steps'>),
        steps: Array.isArray(steps) && typeof steps[0] === 'string' ? (steps as string[]) : undefined,
      } as Item);
    }
  }

  return { items, topLevelIds };
}
