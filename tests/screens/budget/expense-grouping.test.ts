import { describe, it, expect } from 'vitest';
import { groupExpensesByDay } from '../../../src/screens/budget/expense-grouping';
import type { Expense } from '../../../src/lib/types';

function makeExpense(overrides: Partial<Expense>): Expense {
  return {
    id: Math.floor(Math.random() * 10000),
    yearMonth: '2026-03',
    date: '2026-03-17',
    vendor: 'Test',
    amount: 10,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('groupExpensesByDay', () => {
  it('should group expenses by date', () => {
    const expenses = [
      makeExpense({ date: '2026-03-15', vendor: 'A', amount: 10 }),
      makeExpense({ date: '2026-03-16', vendor: 'B', amount: 20 }),
      makeExpense({ date: '2026-03-15', vendor: 'C', amount: 30 }),
    ];

    const groups = groupExpensesByDay(expenses, 100, 0, 0);
    expect(groups).toHaveLength(2);
  });

  it('should order groups most recent first', () => {
    const expenses = [
      makeExpense({ date: '2026-03-15', amount: 10 }),
      makeExpense({ date: '2026-03-17', amount: 20 }),
      makeExpense({ date: '2026-03-16', amount: 30 }),
    ];

    const groups = groupExpensesByDay(expenses, 100, 0, 0);
    expect(groups[0]!.date).toBe('2026-03-17');
    expect(groups[1]!.date).toBe('2026-03-16');
    expect(groups[2]!.date).toBe('2026-03-15');
  });

  it('should calculate daily totals', () => {
    const expenses = [
      makeExpense({ date: '2026-03-15', amount: 10 }),
      makeExpense({ date: '2026-03-15', amount: 20 }),
      makeExpense({ date: '2026-03-15', amount: 30 }),
    ];

    const groups = groupExpensesByDay(expenses, 100, 0, 0);
    expect(groups[0]!.dailyTotal).toBe(60);
  });

  it('should calculate running balance across days', () => {
    // daily allowance = 100, no carry-over, no additional funds
    // Day 1: budget 100 - spent 80 = 20
    // Day 2: budget 200 - spent (80+120) = 0
    // Day 3: budget 300 - spent (80+120+50) = 50
    const expenses = [
      makeExpense({ date: '2026-03-01', amount: 80 }),
      makeExpense({ date: '2026-03-02', amount: 120 }),
      makeExpense({ date: '2026-03-03', amount: 50 }),
    ];

    const groups = groupExpensesByDay(expenses, 100, 0, 0);

    // Groups are reversed (most recent first)
    expect(groups[2]!.date).toBe('2026-03-01');
    expect(groups[2]!.runningBalance).toBe(20);

    expect(groups[1]!.date).toBe('2026-03-02');
    expect(groups[1]!.runningBalance).toBe(0);

    expect(groups[0]!.date).toBe('2026-03-03');
    expect(groups[0]!.runningBalance).toBe(50);
  });

  it('should include carry-over and additional funds in running balance', () => {
    // daily allowance = 100, carry-over = 50, additional = 25
    // Day 1: 100 + 50 + 25 - 60 = 115
    const expenses = [makeExpense({ date: '2026-03-01', amount: 60 })];

    const groups = groupExpensesByDay(expenses, 100, 50, 25);
    expect(groups[0]!.runningBalance).toBe(115);
  });

  it('should return empty array for no expenses', () => {
    const groups = groupExpensesByDay([], 100, 0, 0);
    expect(groups).toEqual([]);
  });

  it('should round all monetary values to 2 decimal places', () => {
    const expenses = [
      makeExpense({ date: '2026-03-01', amount: 33.33 }),
      makeExpense({ date: '2026-03-01', amount: 33.33 }),
      makeExpense({ date: '2026-03-01', amount: 33.34 }),
    ];

    const groups = groupExpensesByDay(expenses, 100, 0, 0);
    expect(groups[0]!.dailyTotal).toBe(100);
    expect(groups[0]!.runningBalance).toBe(0);
  });
});
