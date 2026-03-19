import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { db } from '@/data/db';
import { useBudget } from '@/hooks/useBudget';

beforeEach(async () => {
  await db.budgetMonths.clear();
  await db.expenses.clear();
});

describe('useBudget', () => {
  it('should return null budgetMonth when none exists', async () => {
    const { result } = renderHook(() => useBudget('2099-01'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.budgetMonth).toBeNull();
    expect(result.current.balance).toBeNull();
  });

  it('should create a budget month and return it', async () => {
    const { result } = renderHook(() => useBudget('2026-03'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await result.current.createMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
    });

    await waitFor(() => {
      expect(result.current.budgetMonth).not.toBeNull();
    });

    expect(result.current.budgetMonth!.monthlyAmount).toBe(3100);
    expect(result.current.balance).not.toBeNull();
  });
});
