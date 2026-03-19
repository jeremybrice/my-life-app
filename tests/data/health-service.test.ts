import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { db } from '@/data/db';
import {
  createRoutine,
  getRoutine,
  getAllRoutines,
  updateRoutine,
  deleteRoutine,
  createLogEntry,
  getLogEntry,
  getLogEntriesByRoutine,
  getLogEntriesByDate,
  getLogEntriesByRoutineAndDateRange,
  deleteLogEntry,
  calculateStreak,
  getWeeklyCount,
  getDailyCount,
  getRoutinesCompletedToday,
  isRoutineOnTrack,
  getHealthAggregation,
} from '@/data/health-service';
import * as dates from '@/lib/dates';

beforeEach(async () => {
  await db.healthRoutines.clear();
  await db.healthLogEntries.clear();
});

// --- Helper to mock today() ---
function mockToday(dateStr: string) {
  vi.spyOn(dates, 'today').mockReturnValue(dateStr);
}

afterEach(() => {
  vi.restoreAllMocks();
});

// --- Routine CRUD tests ---

describe('createRoutine', () => {
  it('should create a weekly routine with frequency and metrics', async () => {
    const routine = await createRoutine({
      name: 'Morning Run',
      frequencyType: 'weekly',
      targetFrequency: 3,
      trackedMetrics: [
        { type: 'duration', unit: 'minutes' },
        { type: 'distance', unit: 'km' },
      ],
    });

    expect(routine.id).toBeDefined();
    expect(routine.name).toBe('Morning Run');
    expect(routine.frequencyType).toBe('weekly');
    expect(routine.targetFrequency).toBe(3);
    expect(routine.dailyTarget).toBe(1);
    expect(routine.trackedMetrics).toHaveLength(2);
    expect(routine.createdAt).toBeDefined();
  });

  it('should create a daily routine with dailyTarget', async () => {
    const routine = await createRoutine({
      name: 'Brush Teeth',
      frequencyType: 'daily',
      dailyTarget: 2,
    });

    expect(routine.frequencyType).toBe('daily');
    expect(routine.dailyTarget).toBe(2);
    expect(routine.targetFrequency).toBe(14); // 2 * 7
  });

  it('should default dailyTarget to 1 for daily routines', async () => {
    const routine = await createRoutine({
      name: 'Take Medicine',
      frequencyType: 'daily',
    });

    expect(routine.dailyTarget).toBe(1);
    expect(routine.targetFrequency).toBe(7);
  });

  it('should create a routine with no tracked metrics', async () => {
    const routine = await createRoutine({
      name: 'Meditation',
      frequencyType: 'weekly',
      targetFrequency: 7,
    });

    expect(routine.trackedMetrics).toEqual([]);
  });

  it('should reject routine with empty name', async () => {
    await expect(
      createRoutine({ name: '', frequencyType: 'weekly', targetFrequency: 3 })
    ).rejects.toThrow('Routine name is required');
  });

  it('should reject routine with non-positive frequency', async () => {
    await expect(
      createRoutine({ name: 'Test', frequencyType: 'weekly', targetFrequency: 0 })
    ).rejects.toThrow('Target frequency must be a positive integer');
  });

  it('should reject routine with non-integer frequency', async () => {
    await expect(
      createRoutine({ name: 'Test', frequencyType: 'weekly', targetFrequency: 2.5 })
    ).rejects.toThrow('Target frequency must be a positive integer');
  });

  it('should reject routine with invalid frequencyType', async () => {
    await expect(
      createRoutine({ name: 'Test', frequencyType: 'monthly' as any, targetFrequency: 3 })
    ).rejects.toThrow('Frequency type must be "daily" or "weekly"');
  });

  it('should reject daily routine with non-positive dailyTarget', async () => {
    await expect(
      createRoutine({ name: 'Test', frequencyType: 'daily', dailyTarget: 0 })
    ).rejects.toThrow('Target frequency must be a positive integer');
  });

  it('should trim routine name', async () => {
    const routine = await createRoutine({
      name: '  Running  ',
      frequencyType: 'weekly',
      targetFrequency: 3,
    });
    expect(routine.name).toBe('Running');
  });
});

describe('getAllRoutines', () => {
  it('should return routines sorted alphabetically', async () => {
    await createRoutine({ name: 'Yoga', frequencyType: 'weekly', targetFrequency: 5 });
    await createRoutine({ name: 'Abs', frequencyType: 'weekly', targetFrequency: 3 });
    await createRoutine({ name: 'Meditation', frequencyType: 'daily', dailyTarget: 1 });

    const routines = await getAllRoutines();
    expect(routines.map((r) => r.name)).toEqual(['Abs', 'Meditation', 'Yoga']);
  });
});

describe('updateRoutine', () => {
  it('should update routine name', async () => {
    const routine = await createRoutine({ name: 'Run', frequencyType: 'weekly', targetFrequency: 3 });
    const updated = await updateRoutine(routine.id!, { name: 'Morning Run' });
    expect(updated.name).toBe('Morning Run');
  });

  it('should update frequencyType from weekly to daily', async () => {
    const routine = await createRoutine({ name: 'Brush Teeth', frequencyType: 'weekly', targetFrequency: 14 });
    const updated = await updateRoutine(routine.id!, { frequencyType: 'daily', dailyTarget: 2 });
    expect(updated.frequencyType).toBe('daily');
    expect(updated.dailyTarget).toBe(2);
    expect(updated.targetFrequency).toBe(14);
  });

  it('should reject update for non-existent routine', async () => {
    await expect(updateRoutine(99999, { name: 'Nope' })).rejects.toThrow('not found');
  });
});

describe('deleteRoutine', () => {
  it('should delete routine and cascade log entries', async () => {
    const routine = await createRoutine({ name: 'Run', frequencyType: 'weekly', targetFrequency: 3 });
    mockToday('2026-03-18');
    await createLogEntry({ routineId: routine.id!, date: '2026-03-16' });
    await createLogEntry({ routineId: routine.id!, date: '2026-03-17' });
    await createLogEntry({ routineId: routine.id!, date: '2026-03-18' });

    await deleteRoutine(routine.id!);

    const found = await getRoutine(routine.id!);
    expect(found).toBeUndefined();

    const entries = await getLogEntriesByRoutine(routine.id!);
    expect(entries).toHaveLength(0);
  });

  it('should reject deleting non-existent routine', async () => {
    await expect(deleteRoutine(99999)).rejects.toThrow('not found');
  });
});

// --- Log Entry CRUD tests ---

describe('createLogEntry', () => {
  it('should create a log entry with metrics', async () => {
    mockToday('2026-03-18');
    const routine = await createRoutine({
      name: 'Run',
      frequencyType: 'weekly',
      targetFrequency: 3,
      trackedMetrics: [{ type: 'duration', unit: 'minutes' }],
    });

    const entry = await createLogEntry({
      routineId: routine.id!,
      date: '2026-03-18',
      metrics: { duration: 30 },
    });

    expect(entry.id).toBeDefined();
    expect(entry.routineId).toBe(routine.id);
    expect(entry.date).toBe('2026-03-18');
    expect(entry.metrics?.duration).toBe(30);
  });

  it('should create a log entry without metrics', async () => {
    mockToday('2026-03-18');
    const routine = await createRoutine({ name: 'Meditation', frequencyType: 'daily', dailyTarget: 1 });
    const entry = await createLogEntry({
      routineId: routine.id!,
      date: '2026-03-18',
    });

    expect(entry.metrics).toBeUndefined();
  });

  it('should default date to today', async () => {
    mockToday('2026-03-18');
    const routine = await createRoutine({ name: 'Test', frequencyType: 'weekly', targetFrequency: 1 });
    const entry = await createLogEntry({ routineId: routine.id! });
    expect(entry.date).toBe('2026-03-18');
  });

  it('should allow back-dated entries', async () => {
    mockToday('2026-03-18');
    const routine = await createRoutine({ name: 'Test', frequencyType: 'weekly', targetFrequency: 1 });
    const entry = await createLogEntry({
      routineId: routine.id!,
      date: '2026-03-15',
    });
    expect(entry.date).toBe('2026-03-15');
  });

  it('should reject future dates', async () => {
    mockToday('2026-03-18');
    const routine = await createRoutine({ name: 'Test', frequencyType: 'weekly', targetFrequency: 1 });
    await expect(
      createLogEntry({ routineId: routine.id!, date: '2026-03-19' })
    ).rejects.toThrow('Log date cannot be in the future');
  });

  it('should reject non-existent routine', async () => {
    await expect(
      createLogEntry({ routineId: 99999, date: '2026-03-18' })
    ).rejects.toThrow('not found');
  });

  it('should reject negative metric values', async () => {
    mockToday('2026-03-18');
    const routine = await createRoutine({ name: 'Test', frequencyType: 'weekly', targetFrequency: 1 });
    await expect(
      createLogEntry({
        routineId: routine.id!,
        date: '2026-03-18',
        metrics: { duration: -5 },
      })
    ).rejects.toThrow('non-negative');
  });

  it('should allow multiple entries same routine same day', async () => {
    mockToday('2026-03-18');
    const routine = await createRoutine({ name: 'Test', frequencyType: 'daily', dailyTarget: 2 });
    await createLogEntry({ routineId: routine.id!, date: '2026-03-18' });
    await createLogEntry({ routineId: routine.id!, date: '2026-03-18' });

    const entries = await getLogEntriesByRoutine(routine.id!);
    expect(entries).toHaveLength(2);
  });
});

describe('getLogEntriesByRoutineAndDateRange', () => {
  it('should return entries within date range', async () => {
    mockToday('2026-03-18');
    const routine = await createRoutine({ name: 'Test', frequencyType: 'weekly', targetFrequency: 1 });
    await createLogEntry({ routineId: routine.id!, date: '2026-03-10' });
    await createLogEntry({ routineId: routine.id!, date: '2026-03-15' });
    await createLogEntry({ routineId: routine.id!, date: '2026-03-18' });

    const entries = await getLogEntriesByRoutineAndDateRange(
      routine.id!,
      '2026-03-14',
      '2026-03-16'
    );
    expect(entries).toHaveLength(1);
    expect(entries[0].date).toBe('2026-03-15');
  });
});

// --- Daily count tests ---

describe('getDailyCount', () => {
  it('should count entries for a routine on a specific date', async () => {
    mockToday('2026-03-18');
    const routine = await createRoutine({ name: 'Brush Teeth', frequencyType: 'daily', dailyTarget: 2 });
    await createLogEntry({ routineId: routine.id!, date: '2026-03-18' });
    await createLogEntry({ routineId: routine.id!, date: '2026-03-18' });
    await createLogEntry({ routineId: routine.id!, date: '2026-03-17' }); // different day

    const count = await getDailyCount(routine.id!, '2026-03-18');
    expect(count).toBe(2);
  });

  it('should default to today', async () => {
    mockToday('2026-03-18');
    const routine = await createRoutine({ name: 'Test', frequencyType: 'daily', dailyTarget: 1 });
    await createLogEntry({ routineId: routine.id!, date: '2026-03-18' });

    const count = await getDailyCount(routine.id!);
    expect(count).toBe(1);
  });
});

// --- Streak calculation tests ---

describe('calculateStreak', () => {
  it('should return 0 for new routine with no entries', async () => {
    const routine = await createRoutine({ name: 'Test', frequencyType: 'weekly', targetFrequency: 3 });
    const streak = await calculateStreak(routine.id!);
    expect(streak).toBe(0);
  });

  it('should calculate multi-week streak', async () => {
    mockToday('2026-03-18');

    const routine = await createRoutine({ name: 'Run', frequencyType: 'weekly', targetFrequency: 3 });

    // Week of 3/2 (3 entries)
    await createLogEntry({ routineId: routine.id!, date: '2026-03-02' });
    await createLogEntry({ routineId: routine.id!, date: '2026-03-04' });
    await createLogEntry({ routineId: routine.id!, date: '2026-03-06' });

    // Week of 3/9 (3 entries)
    await createLogEntry({ routineId: routine.id!, date: '2026-03-09' });
    await createLogEntry({ routineId: routine.id!, date: '2026-03-11' });
    await createLogEntry({ routineId: routine.id!, date: '2026-03-13' });

    // Week of 3/16 (3 entries - current week, target met)
    await createLogEntry({ routineId: routine.id!, date: '2026-03-16' });
    await createLogEntry({ routineId: routine.id!, date: '2026-03-17' });
    await createLogEntry({ routineId: routine.id!, date: '2026-03-18' });

    const streak = await calculateStreak(routine.id!);
    expect(streak).toBe(3);
  });

  it('should reset streak on missed week', async () => {
    mockToday('2026-03-18');

    const routine = await createRoutine({ name: 'Run', frequencyType: 'weekly', targetFrequency: 3 });

    // Week of 3/2 (3 entries - met)
    await createLogEntry({ routineId: routine.id!, date: '2026-03-02' });
    await createLogEntry({ routineId: routine.id!, date: '2026-03-04' });
    await createLogEntry({ routineId: routine.id!, date: '2026-03-06' });

    // Week of 3/9 (1 entry - NOT met, breaks streak)
    await createLogEntry({ routineId: routine.id!, date: '2026-03-09' });

    // Week of 3/16 (3 entries - met)
    await createLogEntry({ routineId: routine.id!, date: '2026-03-16' });
    await createLogEntry({ routineId: routine.id!, date: '2026-03-17' });
    await createLogEntry({ routineId: routine.id!, date: '2026-03-18' });

    const streak = await calculateStreak(routine.id!);
    expect(streak).toBe(1); // Only current week
  });

  it('should not count current week if target not met', async () => {
    mockToday('2026-03-18');

    const routine = await createRoutine({ name: 'Run', frequencyType: 'weekly', targetFrequency: 3 });

    // Week of 3/9 (3 entries - met)
    await createLogEntry({ routineId: routine.id!, date: '2026-03-09' });
    await createLogEntry({ routineId: routine.id!, date: '2026-03-11' });
    await createLogEntry({ routineId: routine.id!, date: '2026-03-13' });

    // Week of 3/16 (1 entry - not met yet)
    await createLogEntry({ routineId: routine.id!, date: '2026-03-16' });

    const streak = await calculateStreak(routine.id!);
    expect(streak).toBe(1); // Only previous week
  });

  it('should count current week if target already met', async () => {
    mockToday('2026-03-18');

    const routine = await createRoutine({ name: 'Run', frequencyType: 'weekly', targetFrequency: 3 });

    // Week of 3/9 (3 entries - met)
    await createLogEntry({ routineId: routine.id!, date: '2026-03-09' });
    await createLogEntry({ routineId: routine.id!, date: '2026-03-11' });
    await createLogEntry({ routineId: routine.id!, date: '2026-03-13' });

    // Week of 3/16 (3 entries - met)
    await createLogEntry({ routineId: routine.id!, date: '2026-03-16' });
    await createLogEntry({ routineId: routine.id!, date: '2026-03-17' });
    await createLogEntry({ routineId: routine.id!, date: '2026-03-18' });

    const streak = await calculateStreak(routine.id!);
    expect(streak).toBe(2);
  });

  it('should recalculate on back-dated entry filling a missed week', async () => {
    mockToday('2026-03-18');

    const routine = await createRoutine({ name: 'Run', frequencyType: 'weekly', targetFrequency: 2 });

    // Week of 3/2 (2 entries - met)
    await createLogEntry({ routineId: routine.id!, date: '2026-03-02' });
    await createLogEntry({ routineId: routine.id!, date: '2026-03-04' });

    // Week of 3/9 (1 entry - not met)
    await createLogEntry({ routineId: routine.id!, date: '2026-03-09' });

    // Week of 3/16 (2 entries - met)
    await createLogEntry({ routineId: routine.id!, date: '2026-03-16' });
    await createLogEntry({ routineId: routine.id!, date: '2026-03-18' });

    let streak = await calculateStreak(routine.id!);
    expect(streak).toBe(1); // Only current week, week 3/9 broke it

    // Back-date an entry to fill week 3/9
    await createLogEntry({ routineId: routine.id!, date: '2026-03-11' });

    streak = await calculateStreak(routine.id!);
    expect(streak).toBe(3); // All three weeks now consecutive
  });
});

// --- Adherence tests ---

describe('getWeeklyCount', () => {
  it('should count entries for current week', async () => {
    mockToday('2026-03-18'); // Wednesday
    const routine = await createRoutine({ name: 'Test', frequencyType: 'weekly', targetFrequency: 3 });

    // Current week (Mon 3/16 - Sun 3/22)
    await createLogEntry({ routineId: routine.id!, date: '2026-03-16' });
    await createLogEntry({ routineId: routine.id!, date: '2026-03-18' });

    // Previous week
    await createLogEntry({ routineId: routine.id!, date: '2026-03-13' });

    const count = await getWeeklyCount(routine.id!);
    expect(count).toBe(2);
  });
});

describe('getRoutinesCompletedToday', () => {
  it('should count distinct routines with entries today (weekly routines)', async () => {
    mockToday('2026-03-18');
    const r1 = await createRoutine({ name: 'Run', frequencyType: 'weekly', targetFrequency: 3 });
    const r2 = await createRoutine({ name: 'Yoga', frequencyType: 'weekly', targetFrequency: 5 });
    await createRoutine({ name: 'Swim', frequencyType: 'weekly', targetFrequency: 2 }); // no entry today

    await createLogEntry({ routineId: r1.id!, date: '2026-03-18' });
    await createLogEntry({ routineId: r1.id!, date: '2026-03-18' }); // same routine twice
    await createLogEntry({ routineId: r2.id!, date: '2026-03-18' });

    const count = await getRoutinesCompletedToday();
    expect(count).toBe(2); // r1 and r2
  });

  it('should require daily target met for daily routines', async () => {
    mockToday('2026-03-18');
    const r1 = await createRoutine({ name: 'Brush Teeth', frequencyType: 'daily', dailyTarget: 2 });
    const r2 = await createRoutine({ name: 'Take Medicine', frequencyType: 'daily', dailyTarget: 1 });

    // Only 1 of 2 for Brush Teeth
    await createLogEntry({ routineId: r1.id!, date: '2026-03-18' });
    // 1 of 1 for Take Medicine
    await createLogEntry({ routineId: r2.id!, date: '2026-03-18' });

    const count = await getRoutinesCompletedToday();
    expect(count).toBe(1); // Only Take Medicine met its daily target
  });
});

describe('isRoutineOnTrack', () => {
  it('should return true when target already met', async () => {
    mockToday('2026-03-18'); // Wednesday
    const routine = await createRoutine({ name: 'Test', frequencyType: 'weekly', targetFrequency: 2 });
    await createLogEntry({ routineId: routine.id!, date: '2026-03-16' });
    await createLogEntry({ routineId: routine.id!, date: '2026-03-17' });

    const onTrack = await isRoutineOnTrack(routine.id!);
    expect(onTrack).toBe(true);
  });

  it('should return true when remaining is achievable', async () => {
    mockToday('2026-03-16'); // Monday, 7 days remaining in week
    const routine = await createRoutine({ name: 'Test', frequencyType: 'weekly', targetFrequency: 3 });
    // 0 entries but 7 days left -> 3 needed in 7 days = on track

    const onTrack = await isRoutineOnTrack(routine.id!);
    expect(onTrack).toBe(true);
  });

  it('should return false when behind pace', async () => {
    mockToday('2026-03-22'); // Sunday, last day of week
    const routine = await createRoutine({ name: 'Test', frequencyType: 'weekly', targetFrequency: 5 });
    await createLogEntry({ routineId: routine.id!, date: '2026-03-16' });
    // 1 entry, 4 more needed, but only 1 day left -> behind

    const onTrack = await isRoutineOnTrack(routine.id!);
    expect(onTrack).toBe(false);
  });
});

// --- Dashboard aggregation tests ---

describe('getHealthAggregation', () => {
  it('should return zero state when no routines exist', async () => {
    const agg = await getHealthAggregation();
    expect(agg.totalRoutines).toBe(0);
    expect(agg.routinesCompletedToday).toBe(0);
    expect(agg.onTrackCount).toBe(0);
    expect(agg.behindCount).toBe(0);
    expect(agg.bestStreak).toBeNull();
  });

  it('should aggregate data across routines', async () => {
    mockToday('2026-03-18');

    const r1 = await createRoutine({ name: 'Run', frequencyType: 'weekly', targetFrequency: 3 });
    const r2 = await createRoutine({ name: 'Yoga', frequencyType: 'weekly', targetFrequency: 5 });

    // Log r1 today (completed today)
    await createLogEntry({ routineId: r1.id!, date: '2026-03-18' });

    // r1 has 1 of 3 this week, need 2 more in remaining 4 days = on track
    // r2 has 0 of 5 this week, need 5 in remaining 5 days (Wed-Sun) = on track

    const agg = await getHealthAggregation();
    expect(agg.totalRoutines).toBe(2);
    expect(agg.routinesCompletedToday).toBe(1);
    expect(agg.bestStreak).toBeNull(); // no complete weeks yet
  });

  it('should return null bestStreak when all streaks are zero', async () => {
    mockToday('2026-03-18');
    await createRoutine({ name: 'Run', frequencyType: 'weekly', targetFrequency: 3 });

    const agg = await getHealthAggregation();
    expect(agg.bestStreak).toBeNull();
  });

  it('should handle mix of daily and weekly routines', async () => {
    mockToday('2026-03-18');

    const r1 = await createRoutine({ name: 'Brush Teeth', frequencyType: 'daily', dailyTarget: 2 });
    const r2 = await createRoutine({ name: 'Run', frequencyType: 'weekly', targetFrequency: 3 });

    // Brush teeth: 2 logs today (daily target met)
    await createLogEntry({ routineId: r1.id!, date: '2026-03-18' });
    await createLogEntry({ routineId: r1.id!, date: '2026-03-18' });
    // Run: 1 log today
    await createLogEntry({ routineId: r2.id!, date: '2026-03-18' });

    const agg = await getHealthAggregation();
    expect(agg.totalRoutines).toBe(2);
    expect(agg.routinesCompletedToday).toBe(2); // both met today's target
  });
});
