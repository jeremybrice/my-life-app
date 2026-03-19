import { db } from '@/data/db';
import type { BudgetMonth } from '@/lib/types';
import { roundCurrency } from '@/lib/currency';
import { daysInMonth, daysElapsed as getDaysElapsed, today as getToday } from '@/lib/dates';

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
