import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/data/db';
import type { Expense } from '@/lib/types';
import {
  createExpense,
  updateExpense,
  deleteExpense,
  type CreateExpenseInput,
  type UpdateExpenseInput,
} from '@/data/expense-service';
import { currentYearMonth } from '@/lib/dates';

export function useExpenses(yearMonth?: string) {
  const activeMonth = yearMonth ?? currentYearMonth();

  const expenses = useLiveQuery(
    () => db.expenses.where('yearMonth').equals(activeMonth).toArray(),
    [activeMonth]
  );

  const loading = expenses === undefined;

  const addExpense = async (input: CreateExpenseInput): Promise<Expense> => {
    return createExpense(input);
  };

  const editExpense = async (
    id: number,
    input: UpdateExpenseInput
  ): Promise<Expense> => {
    return updateExpense(id, input);
  };

  const removeExpense = async (id: number): Promise<void> => {
    return deleteExpense(id);
  };

  return {
    expenses: expenses ?? [],
    loading,
    addExpense,
    editExpense,
    removeExpense,
  };
}
