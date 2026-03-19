import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { db } from '@/data/db';
import { useExpenses } from '@/hooks/useExpenses';

beforeEach(async () => {
  await db.budgetMonths.clear();
  await db.expenses.clear();
});

describe('useExpenses', () => {
  it('should return empty array when no expenses exist', async () => {
    const { result } = renderHook(() => useExpenses('2026-03'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.expenses).toEqual([]);
  });

  it('should add an expense and reflect it in the list', async () => {
    const { result } = renderHook(() => useExpenses('2026-03'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.addExpense({
        vendor: 'Test',
        amount: 10,
        date: '2026-03-17',
      });
    });

    await waitFor(() => {
      expect(result.current.expenses).toHaveLength(1);
    });

    expect(result.current.expenses[0]!.vendor).toBe('Test');
  });

  it('should delete an expense and reflect it in the list', async () => {
    const { result } = renderHook(() => useExpenses('2026-03'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let expense: Awaited<ReturnType<typeof result.current.addExpense>>;
    await act(async () => {
      expense = await result.current.addExpense({
        vendor: 'ToDelete',
        amount: 10,
        date: '2026-03-17',
      });
    });

    await waitFor(() => {
      expect(result.current.expenses).toHaveLength(1);
    });

    await act(async () => {
      await result.current.removeExpense(expense.id!);
    });

    await waitFor(() => {
      expect(result.current.expenses).toHaveLength(0);
    });
  });
});
