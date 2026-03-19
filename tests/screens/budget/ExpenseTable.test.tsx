import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExpenseTable } from '../../../src/screens/budget/ExpenseTable';
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

const mockEdit = vi.fn().mockResolvedValue({});
const mockDelete = vi.fn().mockResolvedValue(undefined);

describe('ExpenseTable', () => {
  it('should show empty state when no expenses', () => {
    render(
      <ExpenseTable
        expenses={[]}
        dailyAllowance={100}
        carryOver={0}
        additionalFunds={0}
        onEdit={mockEdit}
        onDelete={mockDelete}
      />
    );

    expect(screen.getByText(/no expenses recorded/i)).toBeInTheDocument();
  });

  it('should render date group headers', () => {
    const expenses = [
      makeExpense({ id: 1, date: '2026-03-15', vendor: 'A', amount: 10 }),
      makeExpense({ id: 2, date: '2026-03-16', vendor: 'B', amount: 20 }),
    ];

    render(
      <ExpenseTable
        expenses={expenses}
        dailyAllowance={100}
        carryOver={0}
        additionalFunds={0}
        onEdit={mockEdit}
        onDelete={mockDelete}
      />
    );

    expect(screen.getByTestId('day-group-2026-03-15')).toBeInTheDocument();
    expect(screen.getByTestId('day-group-2026-03-16')).toBeInTheDocument();
  });

  it('should expand a date group on click to show expense rows', async () => {
    const user = userEvent.setup();
    const expenses = [
      makeExpense({ id: 1, date: '2026-03-15', vendor: 'Starbucks', amount: 5.75 }),
      makeExpense({ id: 2, date: '2026-03-15', vendor: 'Chipotle', amount: 12.50 }),
    ];

    render(
      <ExpenseTable
        expenses={expenses}
        dailyAllowance={100}
        carryOver={0}
        additionalFunds={0}
        onEdit={mockEdit}
        onDelete={mockDelete}
      />
    );

    // Initially, individual expense rows should not be visible
    expect(screen.queryByText('Starbucks')).not.toBeInTheDocument();

    // Click the date header to expand
    const header = screen.getByRole('button', { name: /2026-03-15/i });
    await user.click(header);

    // Now individual rows should appear
    expect(screen.getByText('Starbucks')).toBeInTheDocument();
    expect(screen.getByText('Chipotle')).toBeInTheDocument();
  });

  it('should collapse an expanded date group on second click', async () => {
    const user = userEvent.setup();
    const expenses = [
      makeExpense({ id: 1, date: '2026-03-15', vendor: 'Starbucks', amount: 5 }),
    ];

    render(
      <ExpenseTable
        expenses={expenses}
        dailyAllowance={100}
        carryOver={0}
        additionalFunds={0}
        onEdit={mockEdit}
        onDelete={mockDelete}
      />
    );

    const header = screen.getByRole('button', { name: /2026-03-15/i });

    // Expand
    await user.click(header);
    expect(screen.getByText('Starbucks')).toBeInTheDocument();

    // Collapse
    await user.click(header);
    expect(screen.queryByText('Starbucks')).not.toBeInTheDocument();
  });

  it('should display most recent date first', () => {
    const expenses = [
      makeExpense({ id: 1, date: '2026-03-14', vendor: 'A', amount: 10 }),
      makeExpense({ id: 2, date: '2026-03-16', vendor: 'B', amount: 20 }),
      makeExpense({ id: 3, date: '2026-03-15', vendor: 'C', amount: 30 }),
    ];

    render(
      <ExpenseTable
        expenses={expenses}
        dailyAllowance={100}
        carryOver={0}
        additionalFunds={0}
        onEdit={mockEdit}
        onDelete={mockDelete}
      />
    );

    const groups = screen.getAllByTestId(/^day-group-/);
    expect(groups[0]!.getAttribute('data-testid')).toBe('day-group-2026-03-16');
    expect(groups[1]!.getAttribute('data-testid')).toBe('day-group-2026-03-15');
    expect(groups[2]!.getAttribute('data-testid')).toBe('day-group-2026-03-14');
  });
});
