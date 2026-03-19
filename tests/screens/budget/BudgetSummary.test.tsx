import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import BudgetSummary from '../../../src/screens/budget/BudgetSummary';
import { createBudgetMonth } from '../../../src/data/budget-service';
import { createExpense } from '../../../src/data/expense-service';
import { db } from '../../../src/data/db';

describe('BudgetSummary', () => {
  beforeEach(async () => {
    await db.budgetMonths.clear();
    await db.expenses.clear();
  });

  it('should display monthly statistics', async () => {
    await createBudgetMonth({
      yearMonth: '2025-02',
      monthlyAmount: 3100,
      carryOver: 100,
      additionalFunds: 50,
    });
    await createExpense({ date: '2025-02-01', vendor: 'Store', amount: 1200 });

    render(<BudgetSummary yearMonth="2025-02" />);

    await waitFor(() => {
      expect(screen.getByTestId('stats-total-budget')).toHaveTextContent('$3,250.00');
      expect(screen.getByTestId('stats-total-spent')).toHaveTextContent('$1,200.00');
      expect(screen.getByTestId('stats-net-change')).toHaveTextContent('$2,050.00');
    });
  });

  it('should display category breakdown sorted by total descending', async () => {
    await createBudgetMonth({
      yearMonth: '2025-02',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });
    await createExpense({ date: '2025-02-01', vendor: 'Starbucks', amount: 5, category: 'Coffee' });
    await createExpense({ date: '2025-02-01', vendor: 'Peets', amount: 4.50, category: 'Coffee' });
    await createExpense({ date: '2025-02-02', vendor: 'Chipotle', amount: 12, category: 'Dining' });
    await createExpense({ date: '2025-02-02', vendor: 'Subway', amount: 8, category: 'Dining' });

    render(<BudgetSummary yearMonth="2025-02" />);

    await waitFor(() => {
      const list = screen.getByTestId('category-breakdown');
      const items = list.querySelectorAll('li');
      expect(items).toHaveLength(2);
      expect(items[0]).toHaveTextContent('Dining');
      expect(items[0]).toHaveTextContent('$20.00');
      expect(items[1]).toHaveTextContent('Coffee');
      expect(items[1]).toHaveTextContent('$9.50');
    });
  });

  it('should display vendor breakdown sorted by total descending', async () => {
    await createBudgetMonth({
      yearMonth: '2025-02',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });
    await createExpense({ date: '2025-02-01', vendor: 'Starbucks', amount: 5, category: 'Coffee' });
    await createExpense({ date: '2025-02-01', vendor: 'Starbucks', amount: 4.50, category: 'Coffee' });
    await createExpense({ date: '2025-02-02', vendor: 'Chipotle', amount: 12, category: 'Dining' });
    await createExpense({ date: '2025-02-02', vendor: 'Subway', amount: 8, category: 'Dining' });

    render(<BudgetSummary yearMonth="2025-02" />);

    await waitFor(() => {
      const list = screen.getByTestId('vendor-breakdown');
      const items = list.querySelectorAll('li');
      expect(items).toHaveLength(3);
      expect(items[0]).toHaveTextContent('Chipotle');
      expect(items[0]).toHaveTextContent('$12.00');
      expect(items[1]).toHaveTextContent('Starbucks');
      expect(items[1]).toHaveTextContent('$9.50');
      expect(items[2]).toHaveTextContent('Subway');
      expect(items[2]).toHaveTextContent('$8.00');
    });
  });

  it('should show Uncategorized for expenses without category', async () => {
    await createBudgetMonth({
      yearMonth: '2025-02',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });
    await createExpense({ date: '2025-02-01', vendor: 'Shell', amount: 40 });
    await createExpense({ date: '2025-02-02', vendor: 'Costco', amount: 85 });

    render(<BudgetSummary yearMonth="2025-02" />);

    await waitFor(() => {
      const list = screen.getByTestId('category-breakdown');
      expect(list).toHaveTextContent('Uncategorized');
      expect(list).toHaveTextContent('$125.00');
    });
  });

  it('should show empty state when no expenses', async () => {
    await createBudgetMonth({
      yearMonth: '2025-02',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });

    render(<BudgetSummary yearMonth="2025-02" />);

    await waitFor(() => {
      expect(screen.getAllByText('No expenses recorded this month.')).toHaveLength(2);
    });
  });

  it('should show error when budget month does not exist', async () => {
    render(<BudgetSummary yearMonth="2099-01" />);

    await waitFor(() => {
      expect(screen.getByTestId('summary-error')).toBeInTheDocument();
    });
  });
});
