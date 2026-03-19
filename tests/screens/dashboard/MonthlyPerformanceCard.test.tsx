import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MonthlyPerformanceCard } from '../../../src/screens/dashboard/MonthlyPerformanceCard';
import { createBudgetMonth } from '../../../src/data/budget-service';
import { createExpense } from '../../../src/data/expense-service';
import { db } from '../../../src/data/db';
import { currentYearMonth } from '../../../src/lib/dates';

const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderCard() {
  return render(
    <MemoryRouter>
      <MonthlyPerformanceCard />
    </MemoryRouter>
  );
}

describe('MonthlyPerformanceCard', () => {
  beforeEach(async () => {
    await db.budgetMonths.clear();
    await db.expenses.clear();
    mockNavigate.mockClear();
  });

  it('should show zero state when no budget month exists', async () => {
    renderCard();

    await waitFor(() => {
      expect(screen.getByTestId('monthly-performance-zero-state')).toBeInTheDocument();
    });
  });

  it('should display total budget, total spent, and net change', async () => {
    const ym = currentYearMonth();
    await createBudgetMonth({
      yearMonth: ym,
      monthlyAmount: 3100,
      carryOver: 100,
      additionalFunds: 50,
    });
    await createExpense({ date: `${ym}-01`, vendor: 'Store', amount: 1500 });

    renderCard();

    await waitFor(() => {
      expect(screen.getByTestId('monthly-total-budget')).toHaveTextContent('$3,250.00');
      expect(screen.getByTestId('monthly-total-spent')).toHaveTextContent('$1,500.00');
      expect(screen.getByTestId('monthly-net-change')).toHaveTextContent('$1,750.00');
    });
  });

  it('should show net change in green when positive', async () => {
    const ym = currentYearMonth();
    await createBudgetMonth({
      yearMonth: ym,
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });

    renderCard();

    await waitFor(() => {
      const netChange = screen.getByTestId('monthly-net-change');
      expect(netChange.className).toContain('text-green-600');
    });
  });

  it('should show net change in red when negative', async () => {
    const ym = currentYearMonth();
    await createBudgetMonth({
      yearMonth: ym,
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });
    await createExpense({ date: `${ym}-01`, vendor: 'Store', amount: 4000 });

    renderCard();

    await waitFor(() => {
      const netChange = screen.getByTestId('monthly-net-change');
      expect(netChange.className).toContain('text-red-600');
    });
  });

  it('should navigate to /budget when clicked', async () => {
    const user = userEvent.setup();
    renderCard();

    await waitFor(() => {
      expect(screen.getByTestId('monthly-performance-card')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('monthly-performance-card'));
    expect(mockNavigate).toHaveBeenCalledWith('/budget');
  });
});
