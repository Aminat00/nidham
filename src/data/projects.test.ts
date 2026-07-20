import type { Item } from '../types/item';
import { currentStep, projectProgress } from './projects';

/** Build a tiny project tree: project → 2 milestones → steps. */
function tree(): Record<string, Item> {
  const mk = (over: Partial<Item> & { id: string; category: Item['category'] }): Item => ({
    title: over.id,
    window: 'anytime',
    sortTime: '10:00',
    urgency: 'soon',
    energy: 'light',
    status: 'pending',
    ...over,
  });
  const items: Item[] = [
    mk({ id: 'p', category: 'project', area: 'project' }),
    mk({ id: 'm1', category: 'milestone', parentId: 'p', order: 0 }),
    mk({ id: 'm2', category: 'milestone', parentId: 'p', order: 1 }),
    mk({ id: 'm1s1', category: 'step', parentId: 'm1', order: 0, startHere: true }),
    mk({ id: 'm1s2', category: 'step', parentId: 'm1', order: 1 }),
    mk({ id: 'm2s1', category: 'step', parentId: 'm2', order: 0 }),
  ];
  const byId: Record<string, Item> = {};
  for (const it of items) byId[it.id] = it;
  return byId;
}

describe('currentStep', () => {
  it('is the first step of the first milestone when nothing is done', () => {
    expect(currentStep('p', tree())?.id).toBe('m1s1');
  });

  it('advances within a milestone as steps complete', () => {
    const byId = tree();
    byId.m1s1 = { ...byId.m1s1, status: 'done' };
    expect(currentStep('p', byId)?.id).toBe('m1s2');
  });

  it('crosses into the next milestone once the first is fully done', () => {
    const byId = tree();
    byId.m1s1 = { ...byId.m1s1, status: 'done' };
    byId.m1s2 = { ...byId.m1s2, status: 'done' };
    expect(currentStep('p', byId)?.id).toBe('m2s1');
  });

  it('is undefined when every step is done', () => {
    const byId = tree();
    for (const id of ['m1s1', 'm1s2', 'm2s1']) byId[id] = { ...byId[id], status: 'done' };
    expect(currentStep('p', byId)).toBeUndefined();
  });
});

describe('flat projects (steps directly under the project, no milestones)', () => {
  function flat(): Record<string, Item> {
    const mk = (over: Partial<Item> & { id: string; category: Item['category'] }): Item => ({
      title: over.id, window: 'anytime', sortTime: '10:00', urgency: 'soon', energy: 'light', status: 'pending', ...over,
    });
    const items: Item[] = [
      mk({ id: 'p', category: 'project' }),
      mk({ id: 's1', category: 'step', parentId: 'p', order: 0, startHere: true }),
      mk({ id: 's2', category: 'step', parentId: 'p', order: 1 }),
      mk({ id: 's3', category: 'step', parentId: 'p', order: 2 }),
    ];
    const byId: Record<string, Item> = {};
    for (const it of items) byId[it.id] = it;
    return byId;
  }

  it('counts direct step children and finds the current step', () => {
    const byId = flat();
    expect(projectProgress('p', byId).total).toBe(3);
    expect(currentStep('p', byId)?.id).toBe('s1');
  });
});

describe('projectProgress', () => {
  it('counts done / total steps and names the active milestone', () => {
    const byId = tree();
    byId.m1s1 = { ...byId.m1s1, status: 'done' };
    const p = projectProgress('p', byId);
    expect(p.done).toBe(1);
    expect(p.total).toBe(3);
    expect(p.milestoneTitle).toBe('m1'); // still on m1 (m1s2 pending)
  });
});
