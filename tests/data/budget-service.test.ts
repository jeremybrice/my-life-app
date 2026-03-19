import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/data/db';
import {
  createBudgetMonth,
  getBudgetMonth,
  updateBudgetMonth,
  calculateDailyAllowance,
  calculateBalance,
} from '@/data/budget-service';

beforeEach(async () => {
  await db.budgetMonths.clear();
  await db.expenses.clear();
});

describe('calculateDailyAllowance', () => {
  it('should calculate daily allowance for a 31-day month', () => {
    expect(calculateDailyAllowance(3100, '2026-03')).toBe(100);
  });

  it('should calculate daily allowance for a 28-day month', () => {
    expect(calculateDailyAllowance(3100, '2026-02')).toBe(110.71);
  });

  it('should round to 2 decimal places on odd divisions', () => {
    // 1000 / 31 = 32.2580645...
    expect(calculateDailyAllowance(1000, '2026-07')).toBe(32.26);
  });
});

describe('createBudgetMonth', () => {
  it('should create a new budget month with calculated daily allowance', async () => {
    const result = await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
    });

    expect(result.yearMonth).toBe('2026-03');
    expect(result.monthlyAmount).toBe(3100);
    expect(result.dailyAllowance).toBe(100);
    expect(result.carryOver).toBe(0);
    expect(result.additionalFunds).toBe(0);
    expect(result.createdAt).toBeDefined();
    expect(result.updatedAt).toBeDefined();
  });

  it('should accept optional carry-over and additional funds', async () => {
    const result = await createBudgetMonth({
      yearMonth: '2026-04',
      monthlyAmount: 3000,
      carryOver: 150.50,
      additionalFunds: 200,
    });

    expect(result.carryOver).toBe(150.5);
    expect(result.additionalFunds).toBe(200);
  });

  it('should reject duplicate year-month', async () => {
    await createBudgetMonth({ yearMonth: '2026-03', monthlyAmount: 3100 });
    await expect(
      createBudgetMonth({ yearMonth: '2026-03', monthlyAmount: 3100 })
    ).rejects.toThrow('already exists');
  });

  it('should reject invalid yearMonth format', async () => {
    await expect(
      createBudgetMonth({ yearMonth: 'March 2026', monthlyAmount: 3100 })
    ).rejects.toThrow('YYYY-MM');
  });

  it('should reject non-positive monthlyAmount', async () => {
    await expect(
      createBudgetMonth({ yearMonth: '2026-03', monthlyAmount: 0 })
    ).rejects.toThrow('positive');
  });

  it('should reject negative monthlyAmount', async () => {
    await expect(
      createBudgetMonth({ yearMonth: '2026-03', monthlyAmount: -100 })
    ).rejects.toThrow('positive');
  });
});

describe('getBudgetMonth', () => {
  it('should return the budget month if it exists', async () => {
    await createBudgetMonth({ yearMonth: '2026-03', monthlyAmount: 3100 });
    const result = await getBudgetMonth('2026-03');
    expect(result).toBeDefined();
    expect(result!.monthlyAmount).toBe(3100);
  });

  it('should return undefined if budget month does not exist', async () => {
    const result = await getBudgetMonth('2099-01');
    expect(result).toBeUndefined();
  });
});

describe('updateBudgetMonth', () => {
  it('should update monthly amount and recalculate daily allowance', async () => {
    await createBudgetMonth({ yearMonth: '2026-04', monthlyAmount: 3000 });
    const result = await updateBudgetMonth('2026-04', { monthlyAmount: 3600 });

    expect(result.monthlyAmount).toBe(3600);
    // 3600 / 30 days in April = 120
    expect(result.dailyAllowance).toBe(120);
  });

  it('should update carry-over without affecting monthly amount', async () => {
    await createBudgetMonth({ yearMonth: '2026-03', monthlyAmount: 3100 });
    const result = await updateBudgetMonth('2026-03', { carryOver: -50.25 });

    expect(result.monthlyAmount).toBe(3100);
    expect(result.carryOver).toBe(-50.25);
  });

  it('should update additional funds', async () => {
    await createBudgetMonth({ yearMonth: '2026-03', monthlyAmount: 3100 });
    const result = await updateBudgetMonth('2026-03', { additionalFunds: 500 });
    expect(result.additionalFunds).toBe(500);
  });

  it('should throw if budget month does not exist', async () => {
    await expect(
      updateBudgetMonth('2099-01', { monthlyAmount: 1000 })
    ).rejects.toThrow('not found');
  });

  it('should reject non-positive monthly amount on update', async () => {
    await createBudgetMonth({ yearMonth: '2026-03', monthlyAmount: 3100 });
    await expect(
      updateBudgetMonth('2026-03', { monthlyAmount: 0 })
    ).rejects.toThrow('positive');
  });

  it('should update the updatedAt timestamp', async () => {
    const created = await createBudgetMonth({
      yearMonth: '2026-05',
      monthlyAmount: 2000,
    });
    // Small delay to ensure different timestamp
    await new Promise((r) => setTimeout(r, 10));
    const updated = await updateBudgetMonth('2026-05', { monthlyAmount: 2500 });
    expect(updated.updatedAt).not.toBe(created.updatedAt);
  });
});

describe('calculateBalance', () => {
  it('should throw if budget month does not exist', async () => {
    await expect(calculateBalance('2099-01')).rejects.toThrow('not found');
  });

  it('should return zero totalExpenses when no expenses exist', async () => {
    await createBudgetMonth({ yearMonth: '2026-03', monthlyAmount: 3100 });
    const snapshot = await calculateBalance('2026-03');

    expect(snapshot.totalExpenses).toBe(0);
    expect(snapshot.todaySpent).toBe(0);
    expect(snapshot.dailyAllowance).toBe(100);
    expect(snapshot.carryOver).toBe(0);
    expect(snapshot.additionalFunds).toBe(0);
  });

  it('should include carry-over and additional funds in balance', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
      carryOver: 50,
      additionalFunds: 25,
    });
    const snapshot = await calculateBalance('2026-03');

    // balance = (100 * daysElapsed) + 50 + 25 - 0
    expect(snapshot.carryOver).toBe(50);
    expect(snapshot.additionalFunds).toBe(25);
    expect(snapshot.balance).toBe(
      snapshot.dailyAllowance * snapshot.daysElapsed + 50 + 25
    );
  });
});
