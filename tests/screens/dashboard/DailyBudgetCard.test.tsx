import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DailyBudgetCard } from '../../../src/screens/dashboard/DailyBudgetCard';
import type { DailyBudgetCardProps } from '../../../src/screens/dashboard/DailyBudgetCard';

describe('DailyBudgetCard', () => {
  it('should render zero-state when no data provided', () => {
    render(<DailyBudgetCard />);
    expect(screen.getByTestId('daily-budget-card')).toBeInTheDocument();
    expect(screen.getByTestId('daily-budget-zero-state')).toBeInTheDocument();
    expect(screen.getByText(/set up your monthly budget/i)).toBeInTheDocument();
  });

  it('should show "--" placeholder in zero state', () => {
    render(<DailyBudgetCard />);
    expect(screen.getByText('--')).toBeInTheDocument();
  });

  it('should render with live data under budget', () => {
    const data: DailyBudgetCardProps = {
      todayBalance: 45.50,
      dailyBudget: 65.00,
      todaySpending: 19.50,
      status: 'under',
    };
    render(<DailyBudgetCard data={data} />);
    expect(screen.getByTestId('daily-budget-remaining')).toHaveTextContent('$45.50');
    expect(screen.getByTestId('daily-budget-allowance')).toHaveTextContent('Budget: $65.00');
    expect(screen.getByTestId('daily-budget-spent')).toHaveTextContent('Spent: $19.50');
  });

  it('should display green text when under budget', () => {
    const data: DailyBudgetCardProps = {
      todayBalance: 45.50,
      dailyBudget: 65.00,
      todaySpending: 19.50,
      status: 'under',
    };
    render(<DailyBudgetCard data={data} />);
    const remaining = screen.getByTestId('daily-budget-remaining');
    expect(remaining.className).toContain('text-green-600');
  });

  it('should display red text when over budget', () => {
    const data: DailyBudgetCardProps = {
      todayBalance: -12.30,
      dailyBudget: 65.00,
      todaySpending: 77.30,
      status: 'over',
    };
    render(<DailyBudgetCard data={data} />);
    const remaining = screen.getByTestId('daily-budget-remaining');
    expect(remaining.className).toContain('text-red-600');
  });

  it('should have the card title "Daily Budget"', () => {
    render(<DailyBudgetCard />);
    expect(screen.getByText('Daily Budget')).toBeInTheDocument();
  });
});
