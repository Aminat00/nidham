import type { ProjectPlan } from '../agent/projectContract';
import { flattenProjectPlan } from './flattenProject';
import { currentStep } from '../data/projects';

const PLAN: ProjectPlan = {
  title: 'Solo AI business',
  milestones: [
    {
      title: 'Validate the idea',
      steps: [
        { title: 'Write the one-line pitch', startHere: true },
        { title: 'List 5 people to ask' },
      ],
    },
    {
      title: 'First paying customer',
      steps: [{ title: 'Draft an offer' }],
    },
  ],
};

describe('flattenProjectPlan', () => {
  it('creates a backlog project (no day) with area project', () => {
    const { project } = flattenProjectPlan(PLAN, { idSeed: 'abc' });
    expect(project.category).toBe('project');
    expect(project.area).toBe('project');
    expect(project.title).toBe('Solo AI business');
    expect(project.day == null).toBe(true); // unscheduled → backlog
    expect(project.status).toBe('pending');
  });

  it('produces milestone + step items wired by parentId and order', () => {
    const { project, items } = flattenProjectPlan(PLAN, { idSeed: 'abc' });
    const milestones = items.filter((i) => i.category === 'milestone');
    const steps = items.filter((i) => i.category === 'step');
    expect(milestones).toHaveLength(2);
    expect(steps).toHaveLength(3);

    // Milestones parented to the project, ordered.
    expect(milestones.every((m) => m.parentId === project.id)).toBe(true);
    expect(milestones.map((m) => m.order)).toEqual([0, 1]);

    // Steps parented to their milestone.
    const m0 = milestones.find((m) => m.order === 0)!;
    const m0steps = steps.filter((s) => s.parentId === m0.id).sort((a, b) => (a.order! - b.order!));
    expect(m0steps.map((s) => s.title)).toEqual(['Write the one-line pitch', 'List 5 people to ask']);
  });

  it('marks exactly one startHere and it is the derived current step', () => {
    const { project, items } = flattenProjectPlan(PLAN, { idSeed: 'abc' });
    const startHeres = items.filter((i) => i.startHere);
    expect(startHeres).toHaveLength(1);

    const byId: Record<string, (typeof items)[number]> = { [project.id]: project };
    for (const it of items) byId[it.id] = it;
    expect(currentStep(project.id, byId)?.title).toBe('Write the one-line pitch');
  });

  it('is deterministic for the same seed', () => {
    const a = flattenProjectPlan(PLAN, { idSeed: 'seed1' });
    const b = flattenProjectPlan(PLAN, { idSeed: 'seed1' });
    expect(a.project.id).toBe(b.project.id);
    expect(a.items.map((i) => i.id)).toEqual(b.items.map((i) => i.id));
  });
});

describe('flattenProjectPlan — estimate/energy on subtasks', () => {
  it('maps step energy and uses estimate as note when no note', () => {
    const { items } = flattenProjectPlan(
      { title: 'P', milestones: [{ title: 'M', steps: [
        { title: 'Deep one', energy: 'deep', estimate: '~2h', startHere: true },
        { title: 'Has note', energy: 'admin', estimate: '~30m', note: 'call first' },
      ] }] },
      { idSeed: 'x' },
    );
    const steps = items.filter((i) => i.category === 'step');
    expect(steps[0].energy).toBe('deep');
    expect(steps[0].note).toBe('~2h');       // estimate used when no note
    expect(steps[1].energy).toBe('admin');
    expect(steps[1].note).toBe('call first'); // explicit note wins
  });
});
