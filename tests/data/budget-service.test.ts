import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/data/db';
import {
  createBudgetMonth,
  getBudgetMonth,
  updateBudgetMonth,
  calculateDailyAllowance,
  calculateBalance,
  getEndingBalance,
  initializeMonth,
  propagateCarryOver,
  updateAdditionalFunds,
  getCategoryBreakdown,
  getVendorBreakdown,
  getMonthlyStats,
  getDailyBudgetCardData,
  getMonthlyPerformanceCardData,
} from '@/data/budget-service';
import { currentYearMonth, today, daysElapsed } from '@/lib/dates';
import { roundCurrency } from '@/lib/currency';
import { createExpense } from '@/data/expense-service';
import { SETTINGS_ID } from '@/lib/constants';

beforeEach(async () => {
  await db.budgetMonths.clear();
  await db.expenses.clear();
  await db.settings.clear();
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

describe('getEndingBalance', () => {
  it('should return monthlyAmount when no expenses exist', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });

    const balance = await getEndingBalance('2026-03');
    expect(balance).toBe(3100);
  });

  it('should subtract total expenses from budget', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });
    await createExpense({ date: '2026-03-01', vendor: 'Store', amount: 500 });
    await createExpense({ date: '2026-03-02', vendor: 'Cafe', amount: 200 });

    const balance = await getEndingBalance('2026-03');
    expect(balance).toBe(2400);
  });

  it('should include carryOver in ending balance', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
      carryOver: 100,
      additionalFunds: 0,
    });
    await createExpense({ date: '2026-03-01', vendor: 'Store', amount: 2900 });

    const balance = await getEndingBalance('2026-03');
    expect(balance).toBe(300);
  });

  it('should include additionalFunds in ending balance', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 200,
    });
    await createExpense({ date: '2026-03-01', vendor: 'Store', amount: 3000 });

    const balance = await getEndingBalance('2026-03');
    expect(balance).toBe(300);
  });

  it('should return negative ending balance when overspent', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });
    await createExpense({ date: '2026-03-01', vendor: 'Store', amount: 3500 });

    const balance = await getEndingBalance('2026-03');
    expect(balance).toBe(-400);
  });

  it('should throw for nonexistent month', async () => {
    await expect(getEndingBalance('2099-01')).rejects.toThrow('No budget month found for 2099-01');
  });
});

describe('initializeMonth', () => {
  it('should return existing month without modification', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
      carryOver: 50,
      additionalFunds: 100,
    });

    const result = await initializeMonth('2026-03');
    expect(result.monthlyAmount).toBe(3100);
    expect(result.carryOver).toBe(50);
    expect(result.additionalFunds).toBe(100);
  });

  it('should create new month with carry-over from previous month ending balance', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });
    await createExpense({ date: '2026-03-15', vendor: 'Store', amount: 2900 });

    const result = await initializeMonth('2026-04');
    expect(result.yearMonth).toBe('2026-04');
    expect(result.monthlyAmount).toBe(3100); // copied from March
    expect(result.carryOver).toBe(200); // 3100 - 2900
    expect(result.additionalFunds).toBe(0); // always 0 for new months
  });

  it('should handle negative carry-over when previous month overspent', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });
    await createExpense({ date: '2026-03-15', vendor: 'Store', amount: 3500 });

    const result = await initializeMonth('2026-04');
    expect(result.carryOver).toBe(-400); // 3100 - 3500
  });

  it('should create first month with zero carry-over using settings budget', async () => {
    await db.settings.put({ id: SETTINGS_ID, monthlyBudget: 3100 });

    const result = await initializeMonth('2026-03');
    expect(result.yearMonth).toBe('2026-03');
    expect(result.monthlyAmount).toBe(3100);
    expect(result.carryOver).toBe(0);
    expect(result.additionalFunds).toBe(0);
  });

  it('should create first month with zero budget when no settings exist', async () => {
    const result = await initializeMonth('2026-03');
    expect(result.monthlyAmount).toBe(0);
    expect(result.carryOver).toBe(0);
  });

  it('should include previous months additionalFunds in carry-over calculation', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 200,
    });
    await createExpense({ date: '2026-03-15', vendor: 'Store', amount: 3000 });

    const result = await initializeMonth('2026-04');
    // carryOver = 3100 + 0 + 200 - 3000 = 300
    expect(result.carryOver).toBe(300);
  });

  it('should not copy additionalFunds from previous month', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 500,
    });

    const result = await initializeMonth('2026-04');
    expect(result.additionalFunds).toBe(0);
  });

  it('should calculate correct daily allowance for the new month', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });

    const result = await initializeMonth('2026-04');
    // April has 30 days, 3100 / 30 = 103.33
    expect(result.dailyAllowance).toBe(103.33);
  });
});

describe('propagateCarryOver', () => {
  it('should update next months carry-over after expense change in past month', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });
    await createExpense({ date: '2026-03-15', vendor: 'Store', amount: 2900 });

    await createBudgetMonth({
      yearMonth: '2026-04',
      monthlyAmount: 3100,
      carryOver: 200, // 3100 - 2900
      additionalFunds: 0,
    });

    // Change: add more expense to March
    await createExpense({ date: '2026-03-20', vendor: 'Shop', amount: 300 });

    // Propagate from March forward
    await propagateCarryOver('2026-03');

    const april = await db.budgetMonths.get('2026-04');
    // New carry-over: 3100 - (2900 + 300) = -100
    expect(april!.carryOver).toBe(-100);
  });

  it('should cascade through multiple months', async () => {
    await createBudgetMonth({
      yearMonth: '2026-01',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });
    await createExpense({ date: '2026-01-15', vendor: 'Store', amount: 3000 });

    await createBudgetMonth({
      yearMonth: '2026-02',
      monthlyAmount: 3100,
      carryOver: 100, // 3100 - 3000
      additionalFunds: 0,
    });
    await createExpense({ date: '2026-02-15', vendor: 'Cafe', amount: 3000 });

    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
      carryOver: 200, // 3100 + 100 - 3000
      additionalFunds: 0,
    });

    // Change January: increase expense by 200
    await createExpense({ date: '2026-01-20', vendor: 'Extra', amount: 200 });

    await propagateCarryOver('2026-01');

    const feb = await db.budgetMonths.get('2026-02');
    // Feb carry-over: 3100 - (3000 + 200) = -100
    expect(feb!.carryOver).toBe(-100);

    const march = await db.budgetMonths.get('2026-03');
    // March carry-over: 3100 + (-100) - 3000 = 0
    expect(march!.carryOver).toBe(0);
  });

  it('should stop at month that does not exist', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });

    // No April exists -- propagation should not throw
    await expect(propagateCarryOver('2026-03')).resolves.not.toThrow();
  });

  it('should handle negative carry-over propagation', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });
    await createExpense({ date: '2026-03-15', vendor: 'Store', amount: 4000 });

    await createBudgetMonth({
      yearMonth: '2026-04',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });

    await propagateCarryOver('2026-03');

    const april = await db.budgetMonths.get('2026-04');
    expect(april!.carryOver).toBe(-900); // 3100 - 4000
  });
});

describe('updateAdditionalFunds', () => {
  it('should update additional funds to a positive value', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });

    const result = await updateAdditionalFunds('2026-03', 200);
    expect(result.additionalFunds).toBe(200);
  });

  it('should accept zero additional funds', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 150,
    });

    const result = await updateAdditionalFunds('2026-03', 0);
    expect(result.additionalFunds).toBe(0);
  });

  it('should reject negative additional funds', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });

    await expect(updateAdditionalFunds('2026-03', -50)).rejects.toThrow(
      'Additional funds must be zero or positive'
    );
  });

  it('should round to 2 decimal places', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });

    const result = await updateAdditionalFunds('2026-03', 123.456);
    expect(result.additionalFunds).toBe(123.46);
  });

  it('should throw for nonexistent month', async () => {
    await expect(updateAdditionalFunds('2099-01', 100)).rejects.toThrow(
      'No budget month found for 2099-01'
    );
  });

  it('should propagate carry-over when updating past month', async () => {
    await createBudgetMonth({
      yearMonth: '2025-12',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });
    await createBudgetMonth({
      yearMonth: '2026-01',
      monthlyAmount: 3100,
      carryOver: 3100, // Dec ending balance with no expenses
      additionalFunds: 0,
    });

    await updateAdditionalFunds('2025-12', 200);

    const jan = await db.budgetMonths.get('2026-01');
    // Dec ending balance: 3100 + 0 + 200 - 0 = 3300
    expect(jan!.carryOver).toBe(3300);
  });
});

describe('getCategoryBreakdown', () => {
  it('should group expenses by category sorted by total descending', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });
    await createExpense({ date: '2026-03-01', vendor: 'Starbucks', amount: 5.00, category: 'Coffee' });
    await createExpense({ date: '2026-03-01', vendor: 'Peets', amount: 4.50, category: 'Coffee' });
    await createExpense({ date: '2026-03-02', vendor: 'Chipotle', amount: 12.00, category: 'Dining' });
    await createExpense({ date: '2026-03-02', vendor: 'Subway', amount: 8.00, category: 'Dining' });

    const result = await getCategoryBreakdown('2026-03');

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ label: 'Dining', total: 20.00 });
    expect(result[1]).toEqual({ label: 'Coffee', total: 9.50 });
  });

  it('should group expenses with no category as Uncategorized', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });
    await createExpense({ date: '2026-03-01', vendor: 'Shell', amount: 40.00 });
    await createExpense({ date: '2026-03-02', vendor: 'Costco', amount: 85.00 });

    const result = await getCategoryBreakdown('2026-03');

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ label: 'Uncategorized', total: 125.00 });
  });

  it('should treat different cases as separate categories', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });
    await createExpense({ date: '2026-03-01', vendor: 'A', amount: 10, category: 'Dining' });
    await createExpense({ date: '2026-03-02', vendor: 'B', amount: 20, category: 'dining' });

    const result = await getCategoryBreakdown('2026-03');

    expect(result).toHaveLength(2);
    expect(result.find(e => e.label === 'Dining')!.total).toBe(10);
    expect(result.find(e => e.label === 'dining')!.total).toBe(20);
  });

  it('should return empty array when no expenses', async () => {
    const result = await getCategoryBreakdown('2026-03');
    expect(result).toEqual([]);
  });

  it('should handle single expense per category', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });
    await createExpense({ date: '2026-03-01', vendor: 'Store', amount: 25.00, category: 'Groceries' });

    const result = await getCategoryBreakdown('2026-03');

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ label: 'Groceries', total: 25.00 });
  });
});

describe('getVendorBreakdown', () => {
  it('should group expenses by vendor sorted by total descending', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });
    await createExpense({ date: '2026-03-01', vendor: 'Starbucks', amount: 5.00, category: 'Coffee' });
    await createExpense({ date: '2026-03-01', vendor: 'Starbucks', amount: 4.50, category: 'Coffee' });
    await createExpense({ date: '2026-03-02', vendor: 'Chipotle', amount: 12.00, category: 'Dining' });
    await createExpense({ date: '2026-03-02', vendor: 'Subway', amount: 8.00, category: 'Dining' });

    const result = await getVendorBreakdown('2026-03');

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ label: 'Chipotle', total: 12.00 });
    expect(result[1]).toEqual({ label: 'Starbucks', total: 9.50 });
    expect(result[2]).toEqual({ label: 'Subway', total: 8.00 });
  });

  it('should return empty array when no expenses', async () => {
    const result = await getVendorBreakdown('2026-03');
    expect(result).toEqual([]);
  });

  it('should handle single vendor', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });
    await createExpense({ date: '2026-03-01', vendor: 'Target', amount: 50 });
    await createExpense({ date: '2026-03-02', vendor: 'Target', amount: 30 });

    const result = await getVendorBreakdown('2026-03');

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ label: 'Target', total: 80 });
  });
});

describe('getMonthlyStats', () => {
  it('should calculate total budget as monthlyAmount + carryOver + additionalFunds', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
      carryOver: 100,
      additionalFunds: 50,
    });

    const stats = await getMonthlyStats('2026-03');
    expect(stats.totalBudget).toBe(3250);
  });

  it('should calculate total spent as sum of expenses', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });
    await createExpense({ date: '2026-03-01', vendor: 'A', amount: 500 });
    await createExpense({ date: '2026-03-02', vendor: 'B', amount: 700 });

    const stats = await getMonthlyStats('2026-03');
    expect(stats.totalSpent).toBe(1200);
  });

  it('should calculate net change as totalBudget minus totalSpent', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
      carryOver: 100,
      additionalFunds: 50,
    });
    await createExpense({ date: '2026-03-01', vendor: 'Store', amount: 1200 });

    const stats = await getMonthlyStats('2026-03');
    expect(stats.netChange).toBe(2050); // 3250 - 1200
  });

  it('should handle negative net change when overspent', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });
    await createExpense({ date: '2026-03-01', vendor: 'Store', amount: 4000 });

    const stats = await getMonthlyStats('2026-03');
    expect(stats.netChange).toBe(-900);
  });

  it('should return zero stats when no expenses', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });

    const stats = await getMonthlyStats('2026-03');
    expect(stats.totalSpent).toBe(0);
    expect(stats.netChange).toBe(3100);
    expect(stats.avgDailySpending).toBe(0);
  });

  it('should throw for nonexistent month', async () => {
    await expect(getMonthlyStats('2099-01')).rejects.toThrow('No budget month found for 2099-01');
  });

  it('should use full days in month for past month avg daily spending', async () => {
    // February 2025 has 28 days -- definitely a past month
    await createBudgetMonth({
      yearMonth: '2025-02',
      monthlyAmount: 2800,
      carryOver: 0,
      additionalFunds: 0,
    });
    await createExpense({ date: '2025-02-01', vendor: 'Store', amount: 1400 });

    const stats = await getMonthlyStats('2025-02');
    // 1400 / 28 = 50
    expect(stats.avgDailySpending).toBe(50);
  });
});

describe('getDailyBudgetCardData', () => {
  it('should return null when no budget month exists', async () => {
    const result = await getDailyBudgetCardData();
    expect(result).toBeNull();
  });

  it('should return correct balance with no expenses', async () => {
    const ym = currentYearMonth();
    await createBudgetMonth({
      yearMonth: ym,
      monthlyAmount: 3100,
      carryOver: 50,
      additionalFunds: 0,
    });

    const result = await getDailyBudgetCardData();
    expect(result).not.toBeNull();

    const budgetMonth = await db.budgetMonths.get(ym);
    const elapsed = daysElapsed(ym);
    const expectedBalance = roundCurrency(budgetMonth!.dailyAllowance * elapsed + 50);

    expect(result!.todayBalance).toBe(expectedBalance);
    expect(result!.dailyBudget).toBe(budgetMonth!.dailyAllowance);
    expect(result!.todaySpending).toBe(0);
    expect(result!.isPositive).toBe(true);
  });

  it('should calculate today spending from todays expenses only', async () => {
    const ym = currentYearMonth();
    const todayStr = today();
    await createBudgetMonth({
      yearMonth: ym,
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });
    await createExpense({ date: todayStr, vendor: 'Coffee', amount: 5 });
    await createExpense({ date: todayStr, vendor: 'Lunch', amount: 12 });
    await createExpense({ date: `${ym}-01`, vendor: 'Old', amount: 100 });

    const result = await getDailyBudgetCardData();
    expect(result!.todaySpending).toBe(17);
  });

  it('should return isPositive false for negative balance', async () => {
    const ym = currentYearMonth();
    await createBudgetMonth({
      yearMonth: ym,
      monthlyAmount: 100, // very small budget
      carryOver: 0,
      additionalFunds: 0,
    });
    await createExpense({ date: today(), vendor: 'Big', amount: 9999 });

    const result = await getDailyBudgetCardData();
    expect(result!.isPositive).toBe(false);
  });

  it('should include carry-over and additional funds in balance', async () => {
    const ym = currentYearMonth();
    await createBudgetMonth({
      yearMonth: ym,
      monthlyAmount: 3100,
      carryOver: 50,
      additionalFunds: 100,
    });

    const result = await getDailyBudgetCardData();
    expect(result).not.toBeNull();

    const budgetMonth = await db.budgetMonths.get(ym);
    const elapsed = daysElapsed(ym);
    const expectedBalance = roundCurrency(budgetMonth!.dailyAllowance * elapsed + 50 + 100);
    expect(result!.todayBalance).toBe(expectedBalance);
  });
});

describe('getMonthlyPerformanceCardData', () => {
  it('should return null when no budget month exists', async () => {
    const result = await getMonthlyPerformanceCardData();
    expect(result).toBeNull();
  });

  it('should calculate total budget as monthlyAmount + carryOver + additionalFunds', async () => {
    const ym = currentYearMonth();
    await createBudgetMonth({
      yearMonth: ym,
      monthlyAmount: 3100,
      carryOver: 100,
      additionalFunds: 50,
    });

    const result = await getMonthlyPerformanceCardData();
    expect(result!.totalBudget).toBe(3250);
  });

  it('should calculate total spent as sum of all month expenses', async () => {
    const ym = currentYearMonth();
    await createBudgetMonth({
      yearMonth: ym,
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });
    await createExpense({ date: `${ym}-01`, vendor: 'A', amount: 500 });
    await createExpense({ date: `${ym}-02`, vendor: 'B', amount: 700 });

    const result = await getMonthlyPerformanceCardData();
    expect(result!.totalSpent).toBe(1200);
  });

  it('should calculate net change as totalBudget minus totalSpent', async () => {
    const ym = currentYearMonth();
    await createBudgetMonth({
      yearMonth: ym,
      monthlyAmount: 3100,
      carryOver: 100,
      additionalFunds: 50,
    });
    await createExpense({ date: `${ym}-01`, vendor: 'Store', amount: 1500 });

    const result = await getMonthlyPerformanceCardData();
    expect(result!.totalBudget).toBe(3250);
    expect(result!.totalSpent).toBe(1500);
    expect(result!.netChange).toBe(1750);
  });

  it('should handle negative net change', async () => {
    const ym = currentYearMonth();
    await createBudgetMonth({
      yearMonth: ym,
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });
    await createExpense({ date: `${ym}-01`, vendor: 'Store', amount: 4000 });

    const result = await getMonthlyPerformanceCardData();
    expect(result!.netChange).toBe(-900);
  });
});
