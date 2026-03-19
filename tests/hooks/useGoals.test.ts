import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { db } from '@/data/db';
import { useGoals, useGoalAggregation } from '@/hooks/useGoals';

beforeEach(async () => {
  await db.goals.clear();
});

describe('useGoals', () => {
  it('should return empty array when no goals exist', async () => {
    const { result } = renderHook(() => useGoals());
    await waitFor(() => {
      expect(result.current.goals).toEqual([]);
    });
  });

  it('should add a goal and reflect it in the list', async () => {
    const { result } = renderHook(() => useGoals());

    await act(async () => {
      await result.current.addGoal({
        title: 'Test Goal',
        type: 'personal',
        progressModel: 'freeform',
        statusLabel: 'Starting',
      });
    });

    await waitFor(() => {
      expect(result.current.goals).toHaveLength(1);
      expect(result.current.goals[0].title).toBe('Test Goal');
    });
  });

  it('should filter by status', async () => {
    const { result: allResult } = renderHook(() => useGoals());

    await act(async () => {
      const g = await allResult.current.addGoal({
        title: 'Goal A',
        type: 'financial',
        progressModel: 'numeric',
        targetValue: 100,
      });
      await allResult.current.addGoal({
        title: 'Goal B',
        type: 'personal',
        progressModel: 'freeform',
        statusLabel: 'Todo',
      });
      await allResult.current.markComplete(g.id!);
    });

    const { result: activeResult } = renderHook(() => useGoals({ status: 'active' }));

    await waitFor(() => {
      expect(activeResult.current.goals).toHaveLength(1);
      expect(activeResult.current.goals[0].title).toBe('Goal B');
    });
  });

  it('should delete a goal', async () => {
    const { result } = renderHook(() => useGoals());

    let goalId: number;
    await act(async () => {
      const g = await result.current.addGoal({
        title: 'Delete Me',
        type: 'custom',
        progressModel: 'freeform',
        statusLabel: 'N/A',
      });
      goalId = g.id!;
    });

    await act(async () => {
      await result.current.removeGoal(goalId);
    });

    await waitFor(() => {
      expect(result.current.goals).toHaveLength(0);
    });
  });
});

describe('useGoalAggregation', () => {
  it('should return zero counts initially', async () => {
    const { result } = renderHook(() => useGoalAggregation());
    await waitFor(() => {
      expect(result.current.aggregation.activeCount).toBe(0);
      expect(result.current.aggregation.completedCount).toBe(0);
      expect(result.current.aggregation.aggregateProgress).toBeNull();
    });
  });
});
