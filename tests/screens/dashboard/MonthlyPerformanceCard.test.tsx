import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MonthlyPerformanceCard } from '../../../src/screens/dashboard/MonthlyPerformanceCard';
import type { MonthlyPerformanceCardProps } from '../../../src/screens/dashboard/MonthlyPerformanceCard';

describe('MonthlyPerformanceCard', () => {
  it('should render zero-state when no data provided', () => {
    render(<MonthlyPerformanceCard />);
    expect(screen.getByTestId('monthly-performance-card')).toBeInTheDocument();
    expect(screen.getByTestId('monthly-performance-zero-state')).toBeInTheDocument();
    expect(screen.getByText(/monthly spending overview/i)).toBeInTheDocument();
  });

  it('should show "--" placeholder in zero state', () => {
    render(<MonthlyPerformanceCard />);
    expect(screen.getByText('--')).toBeInTheDocument();
  });

  it('should render with live data when under budget', () => {
    const data: MonthlyPerformanceCardProps = {
      totalBudget: 2000.00,
      totalSpent: 800.00,
      netChange: 1200.00,
      monthLabel: 'March 2026',
    };
    render(<MonthlyPerformanceCard data={data} />);
    expect(screen.getByTestId('monthly-performance-remaining')).toHaveTextContent('$1200.00');
    expect(screen.getByTestId('monthly-performance-budget')).toHaveTextContent('Budget: $2000.00');
    expect(screen.getByTestId('monthly-performance-spent')).toHaveTextContent('Spent: $800.00');
    expect(screen.getByTestId('monthly-performance-month')).toHaveTextContent('March 2026');
  });

  it('should display green text for positive net change', () => {
    const data: MonthlyPerformanceCardProps = {
      totalBudget: 2000.00,
      totalSpent: 800.00,
      netChange: 1200.00,
      monthLabel: 'March 2026',
    };
    render(<MonthlyPerformanceCard data={data} />);
    const remaining = screen.getByTestId('monthly-performance-remaining');
    expect(remaining.className).toContain('text-green-600');
  });

  it('should display yellow text for zero net change', () => {
    const data: MonthlyPerformanceCardProps = {
      totalBudget: 2000.00,
      totalSpent: 2000.00,
      netChange: 0,
      monthLabel: 'March 2026',
    };
    render(<MonthlyPerformanceCard data={data} />);
    const remaining = screen.getByTestId('monthly-performance-remaining');
    expect(remaining.className).toContain('text-yellow-600');
  });

  it('should display red text for negative net change', () => {
    const data: MonthlyPerformanceCardProps = {
      totalBudget: 2000.00,
      totalSpent: 2200.00,
      netChange: -200.00,
      monthLabel: 'March 2026',
    };
    render(<MonthlyPerformanceCard data={data} />);
    const remaining = screen.getByTestId('monthly-performance-remaining');
    expect(remaining.className).toContain('text-red-600');
  });

  it('should have the card title "Monthly Performance"', () => {
    render(<MonthlyPerformanceCard />);
    expect(screen.getByText('Monthly Performance')).toBeInTheDocument();
  });
});
