import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/data/db';
import type { BudgetMonth } from '@/lib/types';
import {
  calculateBalance,
  createBudgetMonth,
  updateBudgetMonth,
  type CreateBudgetMonthInput,
  type UpdateBudgetMonthInput,
  type BalanceSnapshot,
} from '@/data/budget-service';
import { currentYearMonth } from '@/lib/dates';

export function useBudget(yearMonth?: string) {
  const activeMonth = yearMonth ?? currentYearMonth();

  const budgetMonth = useLiveQuery(
    () => db.budgetMonths.get(activeMonth),
    [activeMonth]
  );

  // Re-query balance whenever expenses or budgetMonths change
  const balance = useLiveQuery(
    async () => {
      const bm = await db.budgetMonths.get(activeMonth);
      if (!bm) return null;
      return calculateBalance(activeMonth);
    },
    [activeMonth]
  );

  const loading = budgetMonth === undefined && balance === undefined;

  const createMonth = async (input: CreateBudgetMonthInput) => {
    await createBudgetMonth(input);
  };

  const updateMonth = async (input: UpdateBudgetMonthInput) => {
    await updateBudgetMonth(activeMonth, input);
  };

  return {
    budgetMonth: budgetMonth ?? null,
    balance: balance ?? null,
    loading,
    createMonth,
    updateMonth,
  };
}
