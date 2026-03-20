import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getUrgencyTier, getUrgencySortScore, sortByUrgency } from '@/lib/urgency';
import type { Goal } from '@/lib/types';

function makeGoal(overrides: Partial<Goal>): Goal {
  return {
    id: 1,
    title: 'Test',
    type: 'strategic',
    progressModel: 'date-based',
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('getUrgencyTier', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns critical for date-based target due today', () => {
    const goal = makeGoal({ targetDate: '2026-03-19' });
    expect(getUrgencyTier(goal)).toBe('critical');
  });

  it('returns critical for overdue date-based target', () => {
    const goal = makeGoal({ targetDate: '2026-03-17' });
    expect(getUrgencyTier(goal)).toBe('critical');
  });

  it('returns warning for target due tomorrow', () => {
    const goal = makeGoal({ targetDate: '2026-03-20' });
    expect(getUrgencyTier(goal)).toBe('warning');
  });

  it('returns warning for target due in 5 days', () => {
    const goal = makeGoal({ targetDate: '2026-03-24' });
    expect(getUrgencyTier(goal)).toBe('warning');
  });

  it('returns warning for target due in 7 days', () => {
    const goal = makeGoal({ targetDate: '2026-03-26' });
    expect(getUrgencyTier(goal)).toBe('warning');
  });

  it('returns normal for target due in 8 days', () => {
    const goal = makeGoal({ targetDate: '2026-03-27' });
    expect(getUrgencyTier(goal)).toBe('normal');
  });

  it('returns normal for target due in 20 days', () => {
    const goal = makeGoal({ targetDate: '2026-04-08' });
    expect(getUrgencyTier(goal)).toBe('normal');
  });

  it('returns none for completed target', () => {
    const goal = makeGoal({ status: 'completed', targetDate: '2026-03-19' });
    expect(getUrgencyTier(goal)).toBe('none');
  });

  it('returns none for archived target', () => {
    const goal = makeGoal({ status: 'archived', targetDate: '2026-03-19' });
    expect(getUrgencyTier(goal)).toBe('none');
  });

  it('returns normal for freeform target', () => {
    const goal = makeGoal({ progressModel: 'freeform', statusLabel: 'In progress' });
    expect(getUrgencyTier(goal)).toBe('normal');
  });

  it('returns normal for numeric target with high progress', () => {
    const goal = makeGoal({ progressModel: 'numeric', targetValue: 100, currentValue: 95 });
    expect(getUrgencyTier(goal)).toBe('normal');
  });

  it('returns normal for percentage target at 80%', () => {
    const goal = makeGoal({ progressModel: 'percentage', percentage: 80 });
    expect(getUrgencyTier(goal)).toBe('normal');
  });
});

describe('sortByUrgency', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('sorts critical before warning before normal', () => {
    const critical = makeGoal({ id: 1, title: 'A', targetDate: '2026-03-19' });
    const warning = makeGoal({ id: 2, title: 'B', targetDate: '2026-03-24' });
    const normal = makeGoal({ id: 3, title: 'C', targetDate: '2026-04-20' });
    const sorted = sortByUrgency([normal, critical, warning]);
    expect(sorted.map((g) => g.id)).toEqual([1, 2, 3]);
  });

  it('sorts overdue before due-today', () => {
    const overdue = makeGoal({ id: 1, targetDate: '2026-03-15' });
    const today = makeGoal({ id: 2, targetDate: '2026-03-19' });
    const sorted = sortByUrgency([today, overdue]);
    expect(sorted.map((g) => g.id)).toEqual([1, 2]);
  });
});
