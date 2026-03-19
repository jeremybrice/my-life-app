import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { DashboardScreen } from '../../../src/screens/dashboard/DashboardScreen';
import { createBudgetMonth } from '../../../src/data/budget-service';
import { createExpense } from '../../../src/data/expense-service';
import { db } from '../../../src/data/db';
import { currentYearMonth, today } from '../../../src/lib/dates';

// Mock useSettings for the MilestoneCountdown child
vi.mock('../../../src/hooks/useSettings', () => ({
  useSettings: () => ({
    settings: { id: 1, birthDate: '1985-06-15', targetDate: '2035-06-15', targetDateLabel: 'Age 50' },
    loading: false,
    error: null,
  }),
}));

vi.mock('../../../src/lib/dates', async () => {
  const actual = await vi.importActual<typeof import('../../../src/lib/dates')>('../../../src/lib/dates');
  return {
    ...actual,
    today: vi.fn(() => '2026-03-18'),
  };
});

function renderDashboard() {
  return render(
    <MemoryRouter>
      <DashboardScreen />
    </MemoryRouter>
  );
}

describe('DashboardScreen', () => {
  beforeEach(async () => {
    await db.budgetMonths.clear();
    await db.expenses.clear();
  });

  it('should render the dashboard screen container', () => {
    renderDashboard();
    expect(screen.getByTestId('dashboard-screen')).toBeInTheDocument();
  });

  it('should render the milestone countdown', () => {
    renderDashboard();
    expect(screen.getByTestId('countdown-display')).toBeInTheDocument();
  });

  it('should render the daily budget card in zero state', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByTestId('daily-budget-card')).toBeInTheDocument();
      expect(screen.getByTestId('daily-budget-zero-state')).toBeInTheDocument();
    });
  });

  it('should render the monthly performance card in zero state', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByTestId('monthly-performance-card')).toBeInTheDocument();
      expect(screen.getByTestId('monthly-performance-zero-state')).toBeInTheDocument();
    });
  });

  it('should render the goals widget placeholder', () => {
    renderDashboard();
    expect(screen.getByTestId('goals-widget')).toBeInTheDocument();
    expect(screen.getByTestId('goals-widget-placeholder')).toBeInTheDocument();
  });

  it('should render the health widget placeholder', () => {
    renderDashboard();
    expect(screen.getByTestId('health-widget')).toBeInTheDocument();
    expect(screen.getByTestId('health-widget-placeholder')).toBeInTheDocument();
  });

  it('should render components in correct scroll order (countdown, budget, goals, health)', () => {
    const { container } = renderDashboard();
    const dashboard = container.querySelector('[data-testid="dashboard-screen"]')!;
    const children = Array.from(dashboard.children);

    // Helper: check if element itself or a descendant matches the testid
    const hasTestId = (el: Element, testId: string) =>
      el.matches(`[data-testid="${testId}"]`) || el.querySelector(`[data-testid="${testId}"]`) !== null;

    // First child: MilestoneCountdown
    expect(hasTestId(children[0], 'countdown-display')).toBeTruthy();
    // Second child: budget cards grid
    expect(hasTestId(children[1], 'daily-budget-card')).toBeTruthy();
    expect(hasTestId(children[1], 'monthly-performance-card')).toBeTruthy();
    // Third child: goals widget
    expect(hasTestId(children[2], 'goals-widget')).toBeTruthy();
    // Fourth child: health widget
    expect(hasTestId(children[3], 'health-widget')).toBeTruthy();
  });
});

describe('DashboardScreen - Budget Cards Integration', () => {
  beforeEach(async () => {
    await db.budgetMonths.clear();
    await db.expenses.clear();
  });

  it('should display both budget cards with live data', async () => {
    const ym = currentYearMonth();
    await createBudgetMonth({
      yearMonth: ym,
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });
    await createExpense({ date: today(), vendor: 'Coffee', amount: 5.50 });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByTestId('daily-budget-card')).toBeInTheDocument();
      expect(screen.getByTestId('monthly-performance-card')).toBeInTheDocument();
      expect(screen.getByTestId('daily-budget-balance')).toBeInTheDocument();
      expect(screen.getByTestId('monthly-total-spent')).toHaveTextContent('$5.50');
    });
  });

  it('should show zero state for both cards when no budget configured', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByTestId('daily-budget-zero-state')).toBeInTheDocument();
      expect(screen.getByTestId('monthly-performance-zero-state')).toBeInTheDocument();
    });
  });
});
