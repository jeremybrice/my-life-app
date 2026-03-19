import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/data/db';
import { createBudgetMonth, calculateBalance } from '@/data/budget-service';
import { createExpense, updateExpense, deleteExpense } from '@/data/expense-service';

beforeEach(async () => {
  await db.budgetMonths.clear();
  await db.expenses.clear();
});

describe('balance recalculation on expense writes', () => {
  it('should reflect expense deduction in balance', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
    });

    await createExpense({
      vendor: 'Starbucks',
      amount: 5.75,
      date: '2026-03-17',
    });

    const snapshot = await calculateBalance('2026-03');
    expect(snapshot.totalExpenses).toBe(5.75);
    // balance = (100 * daysElapsed) + 0 + 0 - 5.75
    expect(snapshot.balance).toBe(
      snapshot.dailyAllowance * snapshot.daysElapsed - 5.75
    );
  });

  it('should reflect multiple expenses', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
    });

    await createExpense({ vendor: 'A', amount: 50, date: '2026-03-15' });
    await createExpense({ vendor: 'B', amount: 50, date: '2026-03-16' });

    const snapshot = await calculateBalance('2026-03');
    expect(snapshot.totalExpenses).toBe(100);
  });

  it('should reflect updated expense amount in balance', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
    });

    const expense = await createExpense({
      vendor: 'Amazon',
      amount: 25,
      date: '2026-03-17',
    });

    await updateExpense(expense.id!, { amount: 40 });
    const snapshot = await calculateBalance('2026-03');
    expect(snapshot.totalExpenses).toBe(40);
  });

  it('should reflect deleted expense in balance', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
    });

    const e1 = await createExpense({ vendor: 'A', amount: 50, date: '2026-03-15' });
    await createExpense({ vendor: 'B', amount: 50, date: '2026-03-16' });

    await deleteExpense(e1.id!);
    const snapshot = await calculateBalance('2026-03');
    expect(snapshot.totalExpenses).toBe(50);
  });

  it('should include carry-over and additional funds in balance', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
      carryOver: 50,
      additionalFunds: 25,
    });

    await createExpense({ vendor: 'Test', amount: 60, date: '2026-03-01' });

    const snapshot = await calculateBalance('2026-03');
    // balance = (100 * daysElapsed) + 50 + 25 - 60
    expect(snapshot.balance).toBe(
      snapshot.dailyAllowance * snapshot.daysElapsed + 50 + 25 - 60
    );
  });
});
