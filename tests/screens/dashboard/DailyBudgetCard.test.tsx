import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DailyBudgetCard } from '../../../src/screens/dashboard/DailyBudgetCard';
import { createBudgetMonth } from '../../../src/data/budget-service';
import { createExpense } from '../../../src/data/expense-service';
import { db } from '../../../src/data/db';
import { currentYearMonth, today, daysElapsed } from '../../../src/lib/dates';
import { roundCurrency } from '../../../src/lib/currency';

const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderCard() {
  return render(
    <MemoryRouter>
      <DailyBudgetCard />
    </MemoryRouter>
  );
}

describe('DailyBudgetCard', () => {
  beforeEach(async () => {
    await db.budgetMonths.clear();
    await db.expenses.clear();
    mockNavigate.mockClear();
  });

  it('should show zero state when no budget month exists', async () => {
    renderCard();

    await waitFor(() => {
      expect(screen.getByTestId('daily-budget-zero-state')).toBeInTheDocument();
    });
  });

  it('should show balance in green when positive', async () => {
    const ym = currentYearMonth();
    await createBudgetMonth({
      yearMonth: ym,
      monthlyAmount: 3100,
      carryOver: 50,
      additionalFunds: 0,
    });

    renderCard();

    await waitFor(() => {
      const balance = screen.getByTestId('daily-budget-balance');
      expect(balance).toBeInTheDocument();
      expect(balance.className).toContain('text-green-600');
    });
  });

  it('should show balance in red when negative', async () => {
    const ym = currentYearMonth();
    await createBudgetMonth({
      yearMonth: ym,
      monthlyAmount: 100, // very small
      carryOver: 0,
      additionalFunds: 0,
    });
    await createExpense({ date: today(), vendor: 'Big', amount: 9999 });

    renderCard();

    await waitFor(() => {
      const balance = screen.getByTestId('daily-budget-balance');
      expect(balance.className).toContain('text-red-600');
    });
  });

  it('should display today spending', async () => {
    const ym = currentYearMonth();
    const todayStr = today();
    await createBudgetMonth({
      yearMonth: ym,
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });
    await createExpense({ date: todayStr, vendor: 'Coffee', amount: 5.50 });

    renderCard();

    await waitFor(() => {
      expect(screen.getByTestId('daily-budget-today-spent')).toHaveTextContent('$5.50');
    });
  });

  it('should navigate to /budget when clicked', async () => {
    const user = userEvent.setup();
    const ym = currentYearMonth();
    await createBudgetMonth({
      yearMonth: ym,
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });

    renderCard();

    await waitFor(() => {
      expect(screen.getByTestId('daily-budget-card')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('daily-budget-card'));
    expect(mockNavigate).toHaveBeenCalledWith('/budget');
  });

  it('should navigate to /budget when clicked in zero state', async () => {
    const user = userEvent.setup();
    renderCard();

    await waitFor(() => {
      expect(screen.getByTestId('daily-budget-card')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('daily-budget-card'));
    expect(mockNavigate).toHaveBeenCalledWith('/budget');
  });
});
