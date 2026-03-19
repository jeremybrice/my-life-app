import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { db } from '../../../src/data/db';
import { BudgetScreen } from '../../../src/screens/budget/BudgetScreen';
import { createBudgetMonth } from '../../../src/data/budget-service';
import { createExpense } from '../../../src/data/expense-service';
import { currentYearMonth, previousYearMonth } from '../../../src/lib/dates';

beforeEach(async () => {
  await db.budgetMonths.clear();
  await db.expenses.clear();
});

describe('BudgetScreen', () => {
  it('should show setup prompt when no budget month exists', async () => {
    render(<BudgetScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('budget-setup-prompt')).toBeInTheDocument();
    });
  });

  it('should show balance header after budget is created', async () => {
    const user = userEvent.setup();
    render(<BudgetScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('budget-setup-prompt')).toBeInTheDocument();
    });

    // Fill in the monthly amount and submit
    const input = screen.getByLabelText(/monthly budget amount/i);
    await user.type(input, '3100');
    await user.click(screen.getByRole('button', { name: /set budget/i }));

    await waitFor(() => {
      expect(screen.getByTestId('balance-header')).toBeInTheDocument();
    });
  });
});

describe('BudgetScreen - Month Selector Integration', () => {
  beforeEach(async () => {
    await db.budgetMonths.clear();
    await db.expenses.clear();
  });

  it('should default to current month on initial render', async () => {
    await createBudgetMonth({
      yearMonth: currentYearMonth(),
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });

    render(<BudgetScreen />);

    await waitFor(() => {
      const label = screen.getByTestId('month-label');
      const now = new Date();
      const expectedLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      expect(label).toHaveTextContent(expectedLabel);
    });
  });

  it('should navigate to previous month and show that month data', async () => {
    const user = userEvent.setup();
    const current = currentYearMonth();
    const prev = previousYearMonth(current);

    await createBudgetMonth({
      yearMonth: current,
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });
    await createBudgetMonth({
      yearMonth: prev,
      monthlyAmount: 2800,
      carryOver: 0,
      additionalFunds: 0,
    });

    render(<BudgetScreen />);

    // Wait for the screen to finish loading
    await waitFor(() => {
      expect(screen.getByTestId('budget-screen')).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText('Previous month'));

    await waitFor(() => {
      const [yearStr, monthStr] = prev.split('-');
      const date = new Date(Number(yearStr), Number(monthStr) - 1, 1);
      const expectedLabel = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      expect(screen.getByTestId('month-label')).toHaveTextContent(expectedLabel);
    });
  });

  it('should show setup prompt for month with no budget record', async () => {
    render(<BudgetScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('budget-setup-prompt')).toBeInTheDocument();
    });
  });
});

describe('BudgetScreen - Summary Tab', () => {
  beforeEach(async () => {
    await db.budgetMonths.clear();
    await db.expenses.clear();
  });

  it('should default to Expenses tab', async () => {
    await createBudgetMonth({
      yearMonth: currentYearMonth(),
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });

    render(<BudgetScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('tab-expenses')).toHaveClass('border-accent');
    });
  });

  it('should switch to Summary tab and show summary content', async () => {
    const user = userEvent.setup();
    await createBudgetMonth({
      yearMonth: currentYearMonth(),
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });

    render(<BudgetScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('tab-summary')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('tab-summary'));

    await waitFor(() => {
      expect(screen.getByTestId('budget-summary')).toBeInTheDocument();
    });
  });

  it('should scope summary to selected month', async () => {
    const user = userEvent.setup();
    const current = currentYearMonth();
    const prev = previousYearMonth(current);

    await createBudgetMonth({
      yearMonth: current,
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });
    await createBudgetMonth({
      yearMonth: prev,
      monthlyAmount: 2800,
      carryOver: 0,
      additionalFunds: 0,
    });
    await createExpense({ date: `${current}-01`, vendor: 'Store', amount: 2000 });
    await createExpense({ date: `${prev}-01`, vendor: 'Shop', amount: 1500 });

    render(<BudgetScreen />);

    // Switch to summary tab
    await waitFor(() => {
      expect(screen.getByTestId('tab-summary')).toBeInTheDocument();
    });
    await user.click(screen.getByTestId('tab-summary'));

    // Verify current month stats
    await waitFor(() => {
      expect(screen.getByTestId('stats-total-spent')).toHaveTextContent('$2,000.00');
    });

    // Navigate to previous month
    await user.click(screen.getByLabelText('Previous month'));

    // Verify previous month stats
    await waitFor(() => {
      expect(screen.getByTestId('stats-total-spent')).toHaveTextContent('$1,500.00');
    });
  });
});
