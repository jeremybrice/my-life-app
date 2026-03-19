import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/data/db';
import type { HealthRoutine, HealthLogEntry } from '@/lib/types';
import {
  createRoutine,
  updateRoutine,
  deleteRoutine,
  createLogEntry,
  deleteLogEntry,
  getWeeklyCount,
  calculateStreak,
  getHealthAggregation,
} from '@/data/health-service';
import type {
  CreateRoutineInput,
  UpdateRoutineInput,
  CreateLogEntryInput,
  HealthAggregation,
} from '@/data/health-service';

// --- Routine adherence info ---

export interface RoutineWithAdherence extends HealthRoutine {
  weeklyCount: number;
  streak: number;
}

export interface UseHealthReturn {
  routines: RoutineWithAdherence[];
  loading: boolean;
  addRoutine: (input: CreateRoutineInput) => Promise<HealthRoutine>;
  editRoutine: (id: number, input: UpdateRoutineInput) => Promise<HealthRoutine>;
  removeRoutine: (id: number) => Promise<void>;
  logEntry: (input: CreateLogEntryInput) => Promise<HealthLogEntry>;
  removeLogEntry: (id: number) => Promise<void>;
}

export function useHealth(): UseHealthReturn {
  const routines = useLiveQuery(
    async () => {
      const allRoutines = await db.healthRoutines.toArray();
      allRoutines.sort((a, b) => a.name.localeCompare(b.name));

      const enriched: RoutineWithAdherence[] = await Promise.all(
        allRoutines.map(async (routine) => {
          const weeklyCount = await getWeeklyCount(routine.id!);
          const streak = await calculateStreak(routine.id!);
          return { ...routine, weeklyCount, streak };
        })
      );

      return enriched;
    },
    [],
    [] as RoutineWithAdherence[]
  );

  const loading = routines === undefined;

  return {
    routines: routines ?? [],
    loading,
    addRoutine: createRoutine,
    editRoutine: updateRoutine,
    removeRoutine: deleteRoutine,
    logEntry: createLogEntry,
    removeLogEntry: deleteLogEntry,
  };
}

export interface UseHealthAggregationReturn {
  aggregation: HealthAggregation;
  loading: boolean;
}

export function useHealthAggregation(): UseHealthAggregationReturn {
  const defaultAgg: HealthAggregation = {
    routinesCompletedToday: 0,
    totalRoutines: 0,
    onTrackCount: 0,
    behindCount: 0,
    bestStreak: null,
  };

  const aggregation = useLiveQuery(
    () => getHealthAggregation(),
    [],
    defaultAgg
  );

  return {
    aggregation: aggregation ?? defaultAgg,
    loading: aggregation === undefined,
  };
}
