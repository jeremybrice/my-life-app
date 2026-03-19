import { db } from '@/data/db';
import type { HealthRoutine, HealthLogEntry, TrackedMetric } from '@/lib/types';
import { today as getToday } from '@/lib/dates';

// --- Input types ---

export interface CreateRoutineInput {
  name: string;
  targetFrequency: number;
  trackedMetrics?: TrackedMetric[];
}

export interface UpdateRoutineInput {
  name?: string;
  targetFrequency?: number;
  trackedMetrics?: TrackedMetric[];
}

export interface CreateLogEntryInput {
  routineId: number;
  date?: string; // defaults to today
  metrics?: Record<string, number>;
}

// --- Constants ---

const VALID_METRIC_TYPES: TrackedMetric['type'][] = ['duration', 'distance', 'reps', 'weight'];

// --- Validation helpers ---

function validateRoutineName(name: unknown): asserts name is string {
  if (typeof name !== 'string' || name.trim().length === 0) {
    throw new Error('Routine name is required and must not be blank');
  }
}

function validateTargetFrequency(frequency: unknown): asserts frequency is number {
  if (
    typeof frequency !== 'number' ||
    !Number.isInteger(frequency) ||
    frequency <= 0
  ) {
    throw new Error('Target frequency must be a positive integer');
  }
}

function validateTrackedMetrics(metrics: TrackedMetric[] | undefined): void {
  if (!metrics || metrics.length === 0) return;

  for (const metric of metrics) {
    if (!VALID_METRIC_TYPES.includes(metric.type)) {
      throw new Error(
        `Metric type must be one of: ${VALID_METRIC_TYPES.join(', ')}`
      );
    }
  }
}

function validateLogDate(date: string): void {
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    throw new Error('Log date must be a valid date');
  }

  const todayStr = getToday();
  if (date > todayStr) {
    throw new Error('Log date cannot be in the future');
  }
}

function validateMetricValues(metrics: Record<string, number> | undefined): void {
  if (!metrics) return;

  for (const [key, value] of Object.entries(metrics)) {
    if (typeof value !== 'number' || value < 0) {
      throw new Error(`Metric value for "${key}" must be a non-negative number`);
    }
  }
}

// --- Routine CRUD ---

export async function createRoutine(input: CreateRoutineInput): Promise<HealthRoutine> {
  validateRoutineName(input.name);
  validateTargetFrequency(input.targetFrequency);
  validateTrackedMetrics(input.trackedMetrics);

  const now = new Date().toISOString();
  const routine: Omit<HealthRoutine, 'id'> = {
    name: input.name.trim(),
    targetFrequency: input.targetFrequency,
    trackedMetrics: input.trackedMetrics ?? [],
    createdAt: now,
    updatedAt: now,
  };

  const id = await db.healthRoutines.add(routine as HealthRoutine);
  return { ...routine, id } as HealthRoutine;
}

export async function getRoutine(id: number): Promise<HealthRoutine | undefined> {
  return db.healthRoutines.get(id);
}

export async function getAllRoutines(): Promise<HealthRoutine[]> {
  const routines = await db.healthRoutines.toArray();
  return routines.sort((a, b) => a.name.localeCompare(b.name));
}

export async function updateRoutine(
  id: number,
  input: UpdateRoutineInput
): Promise<HealthRoutine> {
  const existing = await db.healthRoutines.get(id);
  if (!existing) {
    throw new Error(`Routine with id ${id} not found`);
  }

  if (input.name !== undefined) {
    validateRoutineName(input.name);
  }
  if (input.targetFrequency !== undefined) {
    validateTargetFrequency(input.targetFrequency);
  }
  if (input.trackedMetrics !== undefined) {
    validateTrackedMetrics(input.trackedMetrics);
  }

  const updates: Partial<HealthRoutine> = {
    ...input,
    updatedAt: new Date().toISOString(),
  };

  if (input.name !== undefined) {
    updates.name = input.name.trim();
  }

  await db.healthRoutines.update(id, updates);
  return (await db.healthRoutines.get(id))!;
}

export async function deleteRoutine(id: number): Promise<void> {
  const existing = await db.healthRoutines.get(id);
  if (!existing) {
    throw new Error(`Routine with id ${id} not found`);
  }

  // Cascade delete: remove all log entries for this routine
  await db.healthLogEntries.where('routineId').equals(id).delete();
  await db.healthRoutines.delete(id);
}

// --- Log Entry CRUD ---

export async function createLogEntry(input: CreateLogEntryInput): Promise<HealthLogEntry> {
  const routine = await db.healthRoutines.get(input.routineId);
  if (!routine) {
    throw new Error(`Routine with id ${input.routineId} not found`);
  }

  const date = input.date ?? getToday();
  validateLogDate(date);
  validateMetricValues(input.metrics);

  const entry: Omit<HealthLogEntry, 'id'> = {
    routineId: input.routineId,
    date,
    metrics: input.metrics,
    createdAt: new Date().toISOString(),
  };

  const id = await db.healthLogEntries.add(entry as HealthLogEntry);
  return { ...entry, id } as HealthLogEntry;
}

export async function getLogEntry(id: number): Promise<HealthLogEntry | undefined> {
  return db.healthLogEntries.get(id);
}

export async function getLogEntriesByRoutine(routineId: number): Promise<HealthLogEntry[]> {
  return db.healthLogEntries.where('routineId').equals(routineId).toArray();
}

export async function getLogEntriesByDate(date: string): Promise<HealthLogEntry[]> {
  return db.healthLogEntries.where('date').equals(date).toArray();
}

export async function getLogEntriesByRoutineAndDateRange(
  routineId: number,
  startDate: string,
  endDate: string
): Promise<HealthLogEntry[]> {
  const entries = await db.healthLogEntries
    .where('routineId')
    .equals(routineId)
    .toArray();
  return entries.filter((e) => e.date >= startDate && e.date <= endDate);
}

export async function deleteLogEntry(id: number): Promise<void> {
  const existing = await db.healthLogEntries.get(id);
  if (!existing) {
    throw new Error(`Log entry with id ${id} not found`);
  }
  await db.healthLogEntries.delete(id);
}

// --- Week helpers ---

/**
 * Get the Monday (start) of the ISO week containing the given date.
 * Returns YYYY-MM-DD string.
 */
function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getWeekMonday(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const day = date.getDay();
  // day: 0=Sun,1=Mon,...,6=Sat -> offset to Monday
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  return formatLocalDate(monday);
}

/**
 * Get the Sunday (end) of the ISO week containing the given date.
 */
function getWeekSunday(mondayStr: string): string {
  const monday = new Date(mondayStr + 'T00:00:00');
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return formatLocalDate(sunday);
}

/**
 * Get the Monday of the previous week.
 */
function getPreviousWeekMonday(mondayStr: string): string {
  const monday = new Date(mondayStr + 'T00:00:00');
  const prev = new Date(monday);
  prev.setDate(monday.getDate() - 7);
  return formatLocalDate(prev);
}

// --- Streak calculation ---

/**
 * Calculate the streak (consecutive completed weeks) for a routine.
 *
 * Rules:
 * - A streak counts consecutive weeks (Mon-Sun) where log count >= targetFrequency.
 * - Current week counts only if target is already met.
 * - If the most recently completed week did not meet target, streak is 0.
 * - Calculated on demand from log data.
 */
export async function calculateStreak(routineId: number): Promise<number> {
  const routine = await db.healthRoutines.get(routineId);
  if (!routine) return 0;

  const allEntries = await db.healthLogEntries
    .where('routineId')
    .equals(routineId)
    .toArray();

  if (allEntries.length === 0) return 0;

  const todayStr = getToday();
  const currentWeekMonday = getWeekMonday(todayStr);

  // Group entries by week (keyed by Monday date)
  const entriesByWeek = new Map<string, number>();
  for (const entry of allEntries) {
    const weekMon = getWeekMonday(entry.date);
    entriesByWeek.set(weekMon, (entriesByWeek.get(weekMon) ?? 0) + 1);
  }

  let streak = 0;
  let weekMonday = currentWeekMonday;

  // Check current week first
  const currentWeekCount = entriesByWeek.get(weekMonday) ?? 0;
  if (currentWeekCount >= routine.targetFrequency) {
    streak = 1;
    weekMonday = getPreviousWeekMonday(weekMonday);
  } else {
    // Current week not met; start checking from previous completed week
    weekMonday = getPreviousWeekMonday(weekMonday);
  }

  // Walk backward through previous weeks
  while (true) {
    const count = entriesByWeek.get(weekMonday) ?? 0;
    if (count >= routine.targetFrequency) {
      streak++;
      weekMonday = getPreviousWeekMonday(weekMonday);
    } else {
      break;
    }
  }

  return streak;
}

// --- Weekly adherence ---

/**
 * Get the number of log entries for a routine in the current week (Mon-Sun).
 */
export async function getWeeklyCount(routineId: number): Promise<number> {
  const todayStr = getToday();
  const mondayStr = getWeekMonday(todayStr);
  const sundayStr = getWeekSunday(mondayStr);

  const entries = await getLogEntriesByRoutineAndDateRange(
    routineId,
    mondayStr,
    sundayStr
  );
  return entries.length;
}

/**
 * Get the number of distinct routines completed today.
 */
export async function getRoutinesCompletedToday(): Promise<number> {
  const todayStr = getToday();
  const entries = await db.healthLogEntries.where('date').equals(todayStr).toArray();
  const uniqueRoutineIds = new Set(entries.map((e) => e.routineId));
  return uniqueRoutineIds.size;
}

/**
 * Determine if a routine is "on track" for the current week.
 *
 * A routine is on track if:
 * - It has already met its weekly target, OR
 * - The remaining entries needed can still be achieved in the remaining days
 *   (i.e., remainingNeeded <= remainingDays)
 */
export async function isRoutineOnTrack(routineId: number): Promise<boolean> {
  const routine = await db.healthRoutines.get(routineId);
  if (!routine) return false;

  const weeklyCount = await getWeeklyCount(routineId);

  if (weeklyCount >= routine.targetFrequency) return true;

  const todayStr = getToday();
  const todayDate = new Date(todayStr + 'T00:00:00');
  const mondayStr = getWeekMonday(todayStr);
  const sundayStr = getWeekSunday(mondayStr);
  const sundayDate = new Date(sundayStr + 'T00:00:00');

  const remainingDays = Math.ceil(
    (sundayDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)
  ) + 1; // include today

  const remainingNeeded = routine.targetFrequency - weeklyCount;

  return remainingNeeded <= remainingDays;
}

// --- Dashboard aggregation ---

export interface HealthAggregation {
  routinesCompletedToday: number;
  totalRoutines: number;
  onTrackCount: number;
  behindCount: number;
  bestStreak: { weeks: number; routineName: string } | null;
}

export async function getHealthAggregation(): Promise<HealthAggregation> {
  const routines = await getAllRoutines();

  if (routines.length === 0) {
    return {
      routinesCompletedToday: 0,
      totalRoutines: 0,
      onTrackCount: 0,
      behindCount: 0,
      bestStreak: null,
    };
  }

  const routinesCompletedToday = await getRoutinesCompletedToday();

  let onTrackCount = 0;
  let behindCount = 0;
  let bestStreak: { weeks: number; routineName: string } | null = null;

  for (const routine of routines) {
    const onTrack = await isRoutineOnTrack(routine.id!);
    if (onTrack) {
      onTrackCount++;
    } else {
      behindCount++;
    }

    const streak = await calculateStreak(routine.id!);
    if (bestStreak === null || streak > bestStreak.weeks) {
      bestStreak = { weeks: streak, routineName: routine.name };
    }
  }

  // If all streaks are 0, don't highlight any
  if (bestStreak && bestStreak.weeks === 0) {
    bestStreak = null;
  }

  return {
    routinesCompletedToday,
    totalRoutines: routines.length,
    onTrackCount,
    behindCount,
    bestStreak,
  };
}
