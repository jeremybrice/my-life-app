import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/data/db';
import type { Goal } from '@/lib/types';
import {
  createGoal,
  getGoal,
  getAllGoals,
  getGoalsByStatus,
  getGoalsFiltered,
  updateGoal,
  deleteGoal,
  completeGoal,
  archiveGoal,
  reactivateGoal,
  getGoalAggregation,
} from '@/data/goal-service';
import type { CreateGoalInput } from '@/data/goal-service';

beforeEach(async () => {
  await db.goals.clear();
});

// --- Factory helpers ---

function numericGoalInput(overrides?: Partial<CreateGoalInput>): CreateGoalInput {
  return {
    title: 'Save $5,000',
    type: 'financial',
    progressModel: 'numeric',
    targetValue: 5000,
    currentValue: 0,
    ...overrides,
  };
}

function dateGoalInput(overrides?: Partial<CreateGoalInput>): CreateGoalInput {
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 1);
  return {
    title: 'Complete marathon',
    type: 'personal',
    progressModel: 'date-based',
    targetDate: futureDate.toISOString().split('T')[0],
    ...overrides,
  };
}

function percentageGoalInput(overrides?: Partial<CreateGoalInput>): CreateGoalInput {
  return {
    title: 'Read 10 books',
    type: 'personal',
    progressModel: 'percentage',
    percentage: 0,
    ...overrides,
  };
}

function freeformGoalInput(overrides?: Partial<CreateGoalInput>): CreateGoalInput {
  return {
    title: 'Learn Spanish',
    type: 'personal',
    progressModel: 'freeform',
    statusLabel: 'Not Started',
    ...overrides,
  };
}

// --- Create tests ---

describe('createGoal', () => {
  it('should create a numeric target goal with defaults', async () => {
    const goal = await createGoal(numericGoalInput());
    expect(goal.id).toBeDefined();
    expect(goal.title).toBe('Save $5,000');
    expect(goal.type).toBe('financial');
    expect(goal.progressModel).toBe('numeric');
    expect(goal.status).toBe('active');
    expect(goal.targetValue).toBe(5000);
    expect(goal.currentValue).toBe(0);
    expect(goal.createdAt).toBeDefined();
    expect(goal.updatedAt).toBeDefined();
  });

  it('should create a date-based goal', async () => {
    const goal = await createGoal(dateGoalInput());
    expect(goal.progressModel).toBe('date-based');
    expect(goal.targetDate).toBeDefined();
  });

  it('should create a percentage goal with default 0', async () => {
    const goal = await createGoal(percentageGoalInput());
    expect(goal.progressModel).toBe('percentage');
    expect(goal.percentage).toBe(0);
  });

  it('should create a freeform status goal', async () => {
    const goal = await createGoal(freeformGoalInput());
    expect(goal.progressModel).toBe('freeform');
    expect(goal.statusLabel).toBe('Not Started');
  });

  it('should reject goal with empty title', async () => {
    await expect(createGoal(numericGoalInput({ title: '' }))).rejects.toThrow(
      'Goal title is required and must not be blank'
    );
  });

  it('should reject goal with whitespace-only title', async () => {
    await expect(createGoal(numericGoalInput({ title: '   ' }))).rejects.toThrow(
      'Goal title is required and must not be blank'
    );
  });

  it('should reject goal with invalid type', async () => {
    await expect(
      createGoal(numericGoalInput({ type: 'invalid' as Goal['type'] }))
    ).rejects.toThrow('Goal type must be one of');
  });

  it('should reject goal with invalid progress model', async () => {
    await expect(
      createGoal(numericGoalInput({ progressModel: 'invalid' as Goal['progressModel'] }))
    ).rejects.toThrow('Progress model must be one of');
  });

  it('should reject numeric goal without target value', async () => {
    await expect(
      createGoal({ title: 'Test', type: 'financial', progressModel: 'numeric' })
    ).rejects.toThrow('Numeric goals require a target value');
  });

  it('should reject numeric goal with non-positive target value', async () => {
    await expect(
      createGoal(numericGoalInput({ targetValue: 0 }))
    ).rejects.toThrow('Target value must be a positive number');
  });

  it('should reject numeric goal with negative target value', async () => {
    await expect(
      createGoal(numericGoalInput({ targetValue: -100 }))
    ).rejects.toThrow('Target value must be a positive number');
  });

  it('should reject date-based goal with past date', async () => {
    await expect(
      createGoal(dateGoalInput({ targetDate: '2020-01-01' }))
    ).rejects.toThrow('Target date must be today or a future date');
  });

  it('should reject date-based goal without target date', async () => {
    await expect(
      createGoal({
        title: 'Test',
        type: 'personal',
        progressModel: 'date-based',
      })
    ).rejects.toThrow('Date-based goals require a target date');
  });

  it('should reject percentage goal with value over 100', async () => {
    await expect(
      createGoal(percentageGoalInput({ percentage: 105 }))
    ).rejects.toThrow('Percentage must be between 0 and 100');
  });

  it('should reject freeform goal without status label', async () => {
    await expect(
      createGoal({
        title: 'Test',
        type: 'personal',
        progressModel: 'freeform',
      })
    ).rejects.toThrow('Freeform goals require an initial status label');
  });

  it('should reject freeform goal with blank status label', async () => {
    await expect(
      createGoal(freeformGoalInput({ statusLabel: '   ' }))
    ).rejects.toThrow('Status label must not be blank');
  });

  it('should trim title and store it', async () => {
    const goal = await createGoal(numericGoalInput({ title: '  Save Money  ' }));
    expect(goal.title).toBe('Save Money');
  });

  it('should store optional description', async () => {
    const goal = await createGoal(numericGoalInput({ description: 'Emergency fund' }));
    expect(goal.description).toBe('Emergency fund');
  });
});

// --- Read tests ---

describe('getGoal', () => {
  it('should return a goal by id', async () => {
    const created = await createGoal(numericGoalInput());
    const found = await getGoal(created.id!);
    expect(found).toBeDefined();
    expect(found!.title).toBe('Save $5,000');
  });

  it('should return undefined for non-existent id', async () => {
    const found = await getGoal(99999);
    expect(found).toBeUndefined();
  });
});

describe('getAllGoals', () => {
  it('should return all goals', async () => {
    await createGoal(numericGoalInput());
    await createGoal(freeformGoalInput());
    const goals = await getAllGoals();
    expect(goals).toHaveLength(2);
  });
});

describe('getGoalsByStatus', () => {
  it('should filter goals by status', async () => {
    await createGoal(numericGoalInput({ title: 'Goal 1' }));
    const g2 = await createGoal(numericGoalInput({ title: 'Goal 2' }));
    await completeGoal(g2.id!);

    const active = await getGoalsByStatus('active');
    expect(active).toHaveLength(1);
    expect(active[0].title).toBe('Goal 1');

    const completed = await getGoalsByStatus('completed');
    expect(completed).toHaveLength(1);
    expect(completed[0].title).toBe('Goal 2');
  });
});

describe('getGoalsFiltered', () => {
  it('should filter by type', async () => {
    await createGoal(numericGoalInput({ type: 'financial' }));
    await createGoal(freeformGoalInput({ type: 'personal' }));
    await createGoal(numericGoalInput({ title: 'Strategic goal', type: 'strategic', targetValue: 100 }));

    const financial = await getGoalsFiltered({ type: 'financial' });
    expect(financial).toHaveLength(1);
  });

  it('should filter by status and type combined', async () => {
    const g1 = await createGoal(numericGoalInput({ type: 'financial' }));
    await createGoal(numericGoalInput({ title: 'Other financial', type: 'financial', targetValue: 200 }));
    await completeGoal(g1.id!);

    const result = await getGoalsFiltered({ status: 'completed', type: 'financial' });
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Save $5,000');
  });

  it('should sort by updatedAt descending', async () => {
    await createGoal(numericGoalInput({ title: 'First' }));
    await new Promise((r) => setTimeout(r, 10));
    await createGoal(numericGoalInput({ title: 'Second', targetValue: 200 }));

    const goals = await getGoalsFiltered({});
    expect(goals[0].title).toBe('Second');
    expect(goals).toHaveLength(2);
  });
});

// --- Update tests ---

describe('updateGoal', () => {
  it('should update current value of numeric goal', async () => {
    const goal = await createGoal(numericGoalInput());
    await new Promise((r) => setTimeout(r, 10));
    const updated = await updateGoal(goal.id!, { currentValue: 2500 });
    expect(updated.currentValue).toBe(2500);
    expect(updated.updatedAt >= goal.updatedAt).toBe(true);
  });

  it('should update percentage of percentage goal', async () => {
    const goal = await createGoal(percentageGoalInput());
    const updated = await updateGoal(goal.id!, { percentage: 50 });
    expect(updated.percentage).toBe(50);
  });

  it('should update status label of freeform goal', async () => {
    const goal = await createGoal(freeformGoalInput());
    const updated = await updateGoal(goal.id!, { statusLabel: 'In Progress' });
    expect(updated.statusLabel).toBe('In Progress');
  });

  it('should reject update with negative current value', async () => {
    const goal = await createGoal(numericGoalInput());
    await expect(updateGoal(goal.id!, { currentValue: -10 })).rejects.toThrow(
      'Current value must be zero or a positive number'
    );
  });

  it('should reject update with percentage over 100', async () => {
    const goal = await createGoal(percentageGoalInput());
    await expect(updateGoal(goal.id!, { percentage: 105 })).rejects.toThrow(
      'Percentage must be between 0 and 100'
    );
  });

  it('should reject update for non-existent goal', async () => {
    await expect(updateGoal(99999, { title: 'Nope' })).rejects.toThrow('not found');
  });

  it('should reject blank title update', async () => {
    const goal = await createGoal(numericGoalInput());
    await expect(updateGoal(goal.id!, { title: '' })).rejects.toThrow(
      'Goal title is required and must not be blank'
    );
  });
});

// --- Delete tests ---

describe('deleteGoal', () => {
  it('should delete a goal by id', async () => {
    const goal = await createGoal(numericGoalInput());
    await deleteGoal(goal.id!);
    const found = await getGoal(goal.id!);
    expect(found).toBeUndefined();
  });

  it('should reject deleting a non-existent goal', async () => {
    await expect(deleteGoal(99999)).rejects.toThrow('not found');
  });
});

// --- Status transition tests ---

describe('status transitions', () => {
  it('should complete an active goal', async () => {
    const goal = await createGoal(numericGoalInput());
    const completed = await completeGoal(goal.id!);
    expect(completed.status).toBe('completed');
    expect(completed.completedAt).toBeDefined();
  });

  it('should archive an active goal', async () => {
    const goal = await createGoal(numericGoalInput());
    const archived = await archiveGoal(goal.id!);
    expect(archived.status).toBe('archived');
  });

  it('should archive a completed goal', async () => {
    const goal = await createGoal(numericGoalInput());
    await completeGoal(goal.id!);
    const archived = await archiveGoal(goal.id!);
    expect(archived.status).toBe('archived');
  });

  it('should reactivate a completed goal', async () => {
    const goal = await createGoal(numericGoalInput());
    await completeGoal(goal.id!);
    const reactivated = await reactivateGoal(goal.id!);
    expect(reactivated.status).toBe('active');
    expect(reactivated.completedAt).toBeUndefined();
  });

  it('should reactivate an archived goal', async () => {
    const goal = await createGoal(numericGoalInput());
    await archiveGoal(goal.id!);
    const reactivated = await reactivateGoal(goal.id!);
    expect(reactivated.status).toBe('active');
  });

  it('should reject completing a non-active goal (archived)', async () => {
    const goal = await createGoal(numericGoalInput());
    await archiveGoal(goal.id!);
    await expect(completeGoal(goal.id!)).rejects.toThrow('Cannot transition from archived to completed');
  });

  it('should reject transition on non-existent goal', async () => {
    await expect(completeGoal(99999)).rejects.toThrow('not found');
  });
});

// --- Aggregation tests ---

describe('getGoalAggregation', () => {
  it('should return zero counts when no goals exist', async () => {
    const agg = await getGoalAggregation();
    expect(agg.activeCount).toBe(0);
    expect(agg.completedCount).toBe(0);
    expect(agg.aggregateProgress).toBeNull();
  });

  it('should count active and completed goals', async () => {
    await createGoal(numericGoalInput({ title: 'G1' }));
    await createGoal(numericGoalInput({ title: 'G2', targetValue: 200 }));
    const g3 = await createGoal(numericGoalInput({ title: 'G3', targetValue: 300 }));
    await completeGoal(g3.id!);

    const agg = await getGoalAggregation();
    expect(agg.activeCount).toBe(2);
    expect(agg.completedCount).toBe(1);
  });

  it('should exclude archived goals from all counts', async () => {
    const g1 = await createGoal(numericGoalInput({ title: 'G1' }));
    await createGoal(numericGoalInput({ title: 'G2', targetValue: 200 }));
    await archiveGoal(g1.id!);

    const agg = await getGoalAggregation();
    expect(agg.activeCount).toBe(1);
    expect(agg.completedCount).toBe(0);
  });

  it('should calculate aggregate progress from numeric and percentage goals', async () => {
    // Goal A: 50/100 = 50%
    const gA = await createGoal(numericGoalInput({ title: 'A', targetValue: 100 }));
    await updateGoal(gA.id!, { currentValue: 50 });

    // Goal B: 50% percentage
    const gB = await createGoal(percentageGoalInput({ title: 'B' }));
    await updateGoal(gB.id!, { percentage: 50 });

    const agg = await getGoalAggregation();
    expect(agg.aggregateProgress).toBe(50);
  });

  it('should return null aggregate when only freeform/date-based goals exist', async () => {
    await createGoal(freeformGoalInput());
    await createGoal(dateGoalInput());

    const agg = await getGoalAggregation();
    expect(agg.activeCount).toBe(2);
    expect(agg.aggregateProgress).toBeNull();
  });
});
