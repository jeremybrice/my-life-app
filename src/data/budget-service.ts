import { db } from '@/data/db';
import type { BudgetMonth } from '@/lib/types';
import { roundCurrency } from '@/lib/currency';
import { recordQualifyingAction } from '@/data/notification-service';
import {
  daysInMonth,
  daysElapsed as getDaysElapsed,
  today as getToday,
  currentYearMonth,
  previousYearMonth,
  nextYearMonth,
} from '@/lib/dates';
import { SETTINGS_ID } from '@/lib/constants';

// --- Input Types ---

export interface CreateBudgetMonthInput {
  yearMonth: string;
  monthlyAmount: number;
  carryOver?: number;
  additionalFunds?: number;
}

export interface UpdateBudgetMonthInput {
  monthlyAmount?: number;
  carryOver?: number;
  additionalFunds?: number;
}

// --- Balance Calculation ---

export interface BalanceSnapshot {
  balance: number;
  dailyAllowance: number;
  daysElapsed: number;
  carryOver: number;
  additionalFunds: number;
  totalExpenses: number;
  todaySpent: number;
}

// --- Service Functions ---

export function calculateDailyAllowance(monthlyAmount: number, yearMonth: string): number {
  const days = daysInMonth(yearMonth);
  return roundCurrency(monthlyAmount / days);
}

export async function createBudgetMonth(input: CreateBudgetMonthInput): Promise<BudgetMonth> {
  const { yearMonth, monthlyAmount, carryOver = 0, additionalFunds = 0 } = input;

  if (!yearMonth || !/^\d{4}-\d{2}$/.test(yearMonth)) {
    throw new Error('yearMonth must be in "YYYY-MM" format');
  }
  if (monthlyAmount == null || monthlyAmount <= 0) {
    throw new Error('monthlyAmount must be a positive number');
  }

  const existing = await db.budgetMonths.get(yearMonth);
  if (existing) {
    throw new Error(`Budget month "${yearMonth}" already exists`);
  }

  const dailyAllowance = calculateDailyAllowance(monthlyAmount, yearMonth);
  const now = new Date().toISOString();

  const record: BudgetMonth = {
    yearMonth,
    monthlyAmount: roundCurrency(monthlyAmount),
    dailyAllowance,
    carryOver: roundCurrency(carryOver),
    additionalFunds: roundCurrency(additionalFunds),
    createdAt: now,
    updatedAt: now,
  };

  await db.budgetMonths.add(record);

  recordQualifyingAction().catch(() => {});

  return record;
}

export async function getBudgetMonth(yearMonth: string): Promise<BudgetMonth | undefined> {
  return db.budgetMonths.get(yearMonth);
}

export async function updateBudgetMonth(
  yearMonth: string,
  input: UpdateBudgetMonthInput
): Promise<BudgetMonth> {
  const existing = await db.budgetMonths.get(yearMonth);
  if (!existing) {
    throw new Error(`Budget month "${yearMonth}" not found`);
  }

  const monthlyAmount = input.monthlyAmount ?? existing.monthlyAmount;
  const carryOver = input.carryOver ?? existing.carryOver;
  const additionalFunds = input.additionalFunds ?? existing.additionalFunds;

  if (monthlyAmount <= 0) {
    throw new Error('monthlyAmount must be a positive number');
  }

  const dailyAllowance = calculateDailyAllowance(monthlyAmount, yearMonth);
  const now = new Date().toISOString();

  const updated: BudgetMonth = {
    ...existing,
    monthlyAmount: roundCurrency(monthlyAmount),
    dailyAllowance,
    carryOver: roundCurrency(carryOver),
    additionalFunds: roundCurrency(additionalFunds),
    updatedAt: now,
  };

  await db.budgetMonths.put(updated);
  return updated;
}

export async function calculateBalance(yearMonth: string): Promise<BalanceSnapshot> {
  const budgetMonth = await db.budgetMonths.get(yearMonth);
  if (!budgetMonth) {
    throw new Error(`Budget month "${yearMonth}" not found`);
  }

  const expenses = await db.expenses.where('yearMonth').equals(yearMonth).toArray();
  const totalExpenses = roundCurrency(
    expenses.reduce((sum, e) => sum + e.amount, 0)
  );

  const elapsed = getDaysElapsed(yearMonth);
  const todayStr = getToday();
  const todayExpenses = expenses.filter((e) => e.date === todayStr);
  const todaySpent = roundCurrency(
    todayExpenses.reduce((sum, e) => sum + e.amount, 0)
  );

  const balance = roundCurrency(
    budgetMonth.dailyAllowance * elapsed +
      budgetMonth.carryOver +
      budgetMonth.additionalFunds -
      totalExpenses
  );

  return {
    balance,
    dailyAllowance: budgetMonth.dailyAllowance,
    daysElapsed: elapsed,
    carryOver: budgetMonth.carryOver,
    additionalFunds: budgetMonth.additionalFunds,
    totalExpenses,
    todaySpent,
  };
}

// --- Ending Balance ---

/**
 * Calculate the ending balance for a given month.
 * Ending balance = monthlyAmount + carryOver + additionalFunds - totalExpenses
 * Used for carry-over calculation to the next month.
 */
export async function getEndingBalance(yearMonth: string): Promise<number> {
  const budgetMonth = await db.budgetMonths.get(yearMonth);
  if (!budgetMonth) {
    throw new Error(`No budget month found for ${yearMonth}`);
  }

  const expenses = await db.expenses.where('yearMonth').equals(yearMonth).toArray();
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  return roundCurrency(
    budgetMonth.monthlyAmount + budgetMonth.carryOver + budgetMonth.additionalFunds - totalExpenses
  );
}

// --- Month Initialization (Chaining) ---

/**
 * Initialize a budget month if it does not already exist.
 * Copies monthlyAmount from previous month (or settings if first month).
 * Calculates carryOver from previous month's ending balance.
 * additionalFunds always starts at 0 (not copied).
 * Returns the existing or newly created BudgetMonth.
 */
export async function initializeMonth(yearMonth: string): Promise<BudgetMonth> {
  const existing = await db.budgetMonths.get(yearMonth);
  if (existing) {
    return existing;
  }

  // Always use monthly budget from settings as the source of truth
  const settings = await db.settings.get(SETTINGS_ID);
  const monthlyAmount: number = settings?.monthlyBudget ?? 0;

  // Calculate carry-over from previous month if it exists
  const prevMonth = previousYearMonth(yearMonth);
  const prevBudget = await db.budgetMonths.get(prevMonth);
  const carryOver: number = prevBudget ? await getEndingBalance(prevMonth) : 0;

  const days = daysInMonth(yearMonth);
  const dailyAllowance = roundCurrency(monthlyAmount / days);
  const now = new Date().toISOString();

  const newMonth: BudgetMonth = {
    yearMonth,
    monthlyAmount,
    dailyAllowance,
    carryOver: roundCurrency(carryOver),
    additionalFunds: 0,
    createdAt: now,
    updatedAt: now,
  };

  await db.budgetMonths.put(newMonth);
  return newMonth;
}

// --- Carry-Over Propagation ---

/**
 * Propagate carry-over changes forward starting from the month AFTER startYearMonth.
 * Recalculates carryOver for each subsequent month that exists in the database.
 * Stops when it reaches a month that does not exist.
 * Called after any expense change in a past month.
 */
export async function propagateCarryOver(startYearMonth: string): Promise<void> {
  let currentMonth = startYearMonth;

  while (true) {
    const next = nextYearMonth(currentMonth);
    const nextBudget = await db.budgetMonths.get(next);

    if (!nextBudget) {
      break;
    }

    const newCarryOver = await getEndingBalance(currentMonth);

    await db.budgetMonths.update(next, {
      carryOver: roundCurrency(newCarryOver),
      updatedAt: new Date().toISOString(),
    });

    currentMonth = next;
  }
}

// --- Additional Funds ---

/**
 * Update the additional funds for a given budget month.
 * Validates that the value is >= 0.
 * After updating, propagates carry-over forward if this is a past month.
 */
export async function updateAdditionalFunds(
  yearMonth: string,
  additionalFunds: number
): Promise<BudgetMonth> {
  if (additionalFunds < 0) {
    throw new Error('Additional funds must be zero or positive');
  }

  const budgetMonth = await db.budgetMonths.get(yearMonth);
  if (!budgetMonth) {
    throw new Error(`No budget month found for ${yearMonth}`);
  }

  const rounded = roundCurrency(additionalFunds);
  const now = new Date().toISOString();

  await db.budgetMonths.update(yearMonth, {
    additionalFunds: rounded,
    updatedAt: now,
  });

  if (yearMonth !== currentYearMonth()) {
    await propagateCarryOver(yearMonth);
  }

  const updated = await db.budgetMonths.get(yearMonth);
  return updated!;
}

// --- Report Calculation Functions ---

export interface BreakdownEntry {
  label: string;
  total: number;
}

export interface MonthlyStats {
  totalBudget: number;   // monthlyAmount + carryOver + additionalFunds
  totalSpent: number;    // sum of all expenses
  netChange: number;     // totalBudget - totalSpent
  avgDailySpending: number; // totalSpent / days with data
}

/**
 * Category breakdown for a given month.
 * Groups expenses by category (case-sensitive).
 * Expenses with no/empty category grouped as "Uncategorized".
 * Sorted by total descending.
 */
export async function getCategoryBreakdown(yearMonth: string): Promise<BreakdownEntry[]> {
  const expenses = await db.expenses.where('yearMonth').equals(yearMonth).toArray();

  const map = new Map<string, number>();
  for (const expense of expenses) {
    const category = expense.category?.trim() || 'Uncategorized';
    const current = map.get(category) ?? 0;
    map.set(category, roundCurrency(current + expense.amount));
  }

  const entries: BreakdownEntry[] = [];
  for (const [label, total] of map.entries()) {
    entries.push({ label, total });
  }

  entries.sort((a, b) => b.total - a.total);
  return entries;
}

/**
 * Vendor breakdown for a given month.
 * Groups expenses by vendor (case-sensitive).
 * Sorted by total descending.
 */
export async function getVendorBreakdown(yearMonth: string): Promise<BreakdownEntry[]> {
  const expenses = await db.expenses.where('yearMonth').equals(yearMonth).toArray();

  const map = new Map<string, number>();
  for (const expense of expenses) {
    const current = map.get(expense.vendor) ?? 0;
    map.set(expense.vendor, roundCurrency(current + expense.amount));
  }

  const entries: BreakdownEntry[] = [];
  for (const [label, total] of map.entries()) {
    entries.push({ label, total });
  }

  entries.sort((a, b) => b.total - a.total);
  return entries;
}

/**
 * Monthly statistics for a given month.
 * totalBudget = monthlyAmount + carryOver + additionalFunds
 * totalSpent = sum of expenses
 * netChange = totalBudget - totalSpent
 * avgDailySpending = totalSpent / daysElapsed
 *   - For current month: days elapsed through today
 *   - For past months: total days in the month
 */
export async function getMonthlyStats(yearMonth: string): Promise<MonthlyStats> {
  const budgetMonth = await db.budgetMonths.get(yearMonth);
  if (!budgetMonth) {
    throw new Error(`No budget month found for ${yearMonth}`);
  }

  const expenses = await db.expenses.where('yearMonth').equals(yearMonth).toArray();
  const totalSpent = roundCurrency(expenses.reduce((sum, e) => sum + e.amount, 0));

  const totalBudget = roundCurrency(
    budgetMonth.monthlyAmount + budgetMonth.carryOver + budgetMonth.additionalFunds
  );
  const netChange = roundCurrency(totalBudget - totalSpent);

  const isCurrentMonth = yearMonth === currentYearMonth();
  const days = isCurrentMonth ? getDaysElapsed(yearMonth) : daysInMonth(yearMonth);
  const avgDailySpending = days > 0 ? roundCurrency(totalSpent / days) : 0;

  return { totalBudget, totalSpent, netChange, avgDailySpending };
}

// --- Dashboard Card Data ---

/**
 * Data for the DailyBudgetCard on the dashboard.
 */
export interface DailyBudgetCardData {
  todayBalance: number;
  dailyBudget: number;
  todaySpending: number;
  isPositive: boolean;
}

/**
 * Data for the MonthlyPerformanceCard on the dashboard.
 */
export interface MonthlyPerformanceCardData {
  totalBudget: number;
  totalSpent: number;
  netChange: number;
}

/**
 * Get data for the daily budget dashboard card.
 * Returns null if no budget month exists for the current month.
 */
export async function getDailyBudgetCardData(): Promise<DailyBudgetCardData | null> {
  const yearMonth = currentYearMonth();
  const budgetMonth = await db.budgetMonths.get(yearMonth);
  if (!budgetMonth) {
    return null;
  }

  const expenses = await db.expenses.where('yearMonth').equals(yearMonth).toArray();
  const totalMonthExpenses = roundCurrency(expenses.reduce((sum, e) => sum + e.amount, 0));

  const todayStr = getToday();
  const todayExpenses = expenses.filter((e) => e.date === todayStr);
  const todaySpending = roundCurrency(todayExpenses.reduce((sum, e) => sum + e.amount, 0));

  const elapsed = getDaysElapsed(yearMonth);
  const cumulativeBudget = roundCurrency(budgetMonth.dailyAllowance * elapsed);
  const todayBalance = roundCurrency(
    cumulativeBudget + budgetMonth.carryOver + budgetMonth.additionalFunds - totalMonthExpenses
  );

  return {
    todayBalance,
    dailyBudget: budgetMonth.dailyAllowance,
    todaySpending,
    isPositive: todayBalance >= 0,
  };
}

/**
 * Get data for the monthly performance dashboard card.
 * Returns null if no budget month exists for the current month.
 */
export async function getMonthlyPerformanceCardData(): Promise<MonthlyPerformanceCardData | null> {
  const yearMonth = currentYearMonth();
  const budgetMonth = await db.budgetMonths.get(yearMonth);
  if (!budgetMonth) {
    return null;
  }

  const expenses = await db.expenses.where('yearMonth').equals(yearMonth).toArray();
  const totalSpent = roundCurrency(expenses.reduce((sum, e) => sum + e.amount, 0));

  const totalBudget = roundCurrency(
    budgetMonth.monthlyAmount + budgetMonth.carryOver + budgetMonth.additionalFunds
  );
  const netChange = roundCurrency(totalBudget - totalSpent);

  return { totalBudget, totalSpent, netChange };
}
