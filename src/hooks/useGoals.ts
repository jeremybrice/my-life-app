import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/data/db';
import type { Goal } from '@/lib/types';
import {
  createGoal,
  updateGoal,
  deleteGoal,
  completeGoal,
  archiveGoal,
  reactivateGoal,
  getGoalAggregation,
} from '@/data/goal-service';
import type { CreateGoalInput, UpdateGoalInput, GoalAggregation } from '@/data/goal-service';

export interface UseGoalsOptions {
  status?: Goal['status'];
  type?: Goal['type'];
}

export interface UseGoalsReturn {
  goals: Goal[];
  loading: boolean;
  error: Error | null;
  addGoal: (input: CreateGoalInput) => Promise<Goal>;
  editGoal: (id: number, input: UpdateGoalInput) => Promise<Goal>;
  removeGoal: (id: number) => Promise<void>;
  markComplete: (id: number) => Promise<Goal>;
  markArchived: (id: number) => Promise<Goal>;
  markActive: (id: number) => Promise<Goal>;
}

export function useGoals(options: UseGoalsOptions = {}): UseGoalsReturn {
  const { status, type } = options;

  const goals = useLiveQuery(
    async () => {
      let result: Goal[];

      if (status) {
        result = await db.goals.where('status').equals(status).toArray();
      } else {
        result = await db.goals.toArray();
      }

      if (type) {
        result = result.filter((g) => g.type === type);
      }

      // Sort by updatedAt descending
      result.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

      return result;
    },
    [status, type],
    [] as Goal[]
  );

  const loading = goals === undefined;

  return {
    goals: goals ?? [],
    loading,
    error: null,
    addGoal: createGoal,
    editGoal: updateGoal,
    removeGoal: deleteGoal,
    markComplete: completeGoal,
    markArchived: archiveGoal,
    markActive: reactivateGoal,
  };
}

export interface UseGoalAggregationReturn {
  aggregation: GoalAggregation;
  loading: boolean;
}

export function useGoalAggregation(): UseGoalAggregationReturn {
  const defaultAgg: GoalAggregation = {
    activeCount: 0,
    completedCount: 0,
    aggregateProgress: null,
  };

  const aggregation = useLiveQuery(
    () => getGoalAggregation(),
    [],
    defaultAgg
  );

  return {
    aggregation: aggregation ?? defaultAgg,
    loading: aggregation === undefined,
  };
}
