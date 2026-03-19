import type { Expense } from '@/lib/types';
import { roundCurrency } from '@/lib/currency';

export interface DailyGroup {
  date: string;
  expenses: Expense[];
  dailyTotal: number;
  runningBalance: number;
}

/**
 * Groups expenses by date and calculates running balances.
 *
 * Running balance for a given date =
 *   (dailyAllowance x dayNumber) + carryOver + additionalFunds - cumulativeExpenses
 *
 * dayNumber is derived from the date (e.g., "2026-03-17" -> day 17).
 *
 * Returns groups sorted by date descending (most recent first).
 */
export function groupExpensesByDay(
  expenses: Expense[],
  dailyAllowance: number,
  carryOver: number,
  additionalFunds: number
): DailyGroup[] {
  // Group by date
  const groupMap = new Map<string, Expense[]>();
  for (const expense of expenses) {
    const existing = groupMap.get(expense.date);
    if (existing) {
      existing.push(expense);
    } else {
      groupMap.set(expense.date, [expense]);
    }
  }

  // Sort dates ascending for running balance calculation
  const sortedDates = Array.from(groupMap.keys()).sort();

  // Calculate cumulative expenses for running balance
  let cumulativeExpenses = 0;
  const groups: DailyGroup[] = [];

  for (const date of sortedDates) {
    const dayExpenses = groupMap.get(date)!;
    const dailyTotal = roundCurrency(
      dayExpenses.reduce((sum, e) => sum + e.amount, 0)
    );
    cumulativeExpenses = roundCurrency(cumulativeExpenses + dailyTotal);

    // dayNumber from the date string (e.g., "2026-03-17" -> 17)
    const dayNumber = parseInt(date.split('-')[2]!, 10);

    const runningBalance = roundCurrency(
      dailyAllowance * dayNumber + carryOver + additionalFunds - cumulativeExpenses
    );

    groups.push({
      date,
      expenses: dayExpenses,
      dailyTotal,
      runningBalance,
    });
  }

  // Reverse to show most recent first
  return groups.reverse();
}
