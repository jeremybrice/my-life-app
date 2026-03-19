import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { db } from '@/data/db';
import { useHealth, useHealthAggregation } from '@/hooks/useHealth';
import * as dates from '@/lib/dates';

beforeEach(async () => {
  await db.healthRoutines.clear();
  await db.healthLogEntries.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useHealth', () => {
  it('should return empty array when no routines exist', async () => {
    const { result } = renderHook(() => useHealth());
    await waitFor(() => {
      expect(result.current.routines).toEqual([]);
    });
  });

  it('should add a routine and reflect it in the list', async () => {
    vi.spyOn(dates, 'today').mockReturnValue('2026-03-18');
    const { result } = renderHook(() => useHealth());

    await act(async () => {
      await result.current.addRoutine({
        name: 'Morning Run',
        targetFrequency: 3,
      });
    });

    await waitFor(() => {
      expect(result.current.routines).toHaveLength(1);
      expect(result.current.routines[0].name).toBe('Morning Run');
      expect(result.current.routines[0].weeklyCount).toBe(0);
      expect(result.current.routines[0].streak).toBe(0);
    });
  });

  it('should delete a routine', async () => {
    vi.spyOn(dates, 'today').mockReturnValue('2026-03-18');
    const { result } = renderHook(() => useHealth());

    let routineId: number;
    await act(async () => {
      const r = await result.current.addRoutine({
        name: 'Delete Me',
        targetFrequency: 1,
      });
      routineId = r.id!;
    });

    await act(async () => {
      await result.current.removeRoutine(routineId);
    });

    await waitFor(() => {
      expect(result.current.routines).toHaveLength(0);
    });
  });
});

describe('useHealthAggregation', () => {
  it('should return zero state initially', async () => {
    const { result } = renderHook(() => useHealthAggregation());
    await waitFor(() => {
      expect(result.current.aggregation.totalRoutines).toBe(0);
      expect(result.current.aggregation.bestStreak).toBeNull();
    });
  });
});
