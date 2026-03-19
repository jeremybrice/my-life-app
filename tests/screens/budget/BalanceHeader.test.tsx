import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BalanceHeader } from '../../../src/screens/budget/BalanceHeader';
import type { BalanceSnapshot } from '../../../src/data/budget-service';

function makeSnapshot(overrides: Partial<BalanceSnapshot> = {}): BalanceSnapshot {
  return {
    balance: 200,
    dailyAllowance: 100,
    daysElapsed: 17,
    carryOver: 0,
    additionalFunds: 0,
    totalExpenses: 1500,
    todaySpent: 45,
    ...overrides,
  };
}

describe('BalanceHeader', () => {
  it('should display positive balance in green', () => {
    render(<BalanceHeader balance={makeSnapshot({ balance: 200 })} today="2026-03-17" />);

    const balanceEl = screen.getByTestId('balance-amount');
    expect(balanceEl.textContent).toContain('200.00');
    expect(balanceEl.className).toContain('text-green-600');
  });

  it('should display negative balance in red', () => {
    render(<BalanceHeader balance={makeSnapshot({ balance: -300 })} today="2026-03-17" />);

    const balanceEl = screen.getByTestId('balance-amount');
    expect(balanceEl.textContent).toContain('300.00');
    expect(balanceEl.className).toContain('text-red-600');
  });

  it('should display zero balance in green', () => {
    render(<BalanceHeader balance={makeSnapshot({ balance: 0 })} today="2026-03-17" />);

    const balanceEl = screen.getByTestId('balance-amount');
    expect(balanceEl.textContent).toContain('0.00');
    expect(balanceEl.className).toContain('text-green-600');
  });

  it('should display daily budget amount', () => {
    render(<BalanceHeader balance={makeSnapshot({ dailyAllowance: 100 })} today="2026-03-17" />);

    expect(screen.getByText('$100.00')).toBeInTheDocument();
    expect(screen.getByText('Daily Budget')).toBeInTheDocument();
  });

  it('should display today spent amount', () => {
    render(<BalanceHeader balance={makeSnapshot({ todaySpent: 45 })} today="2026-03-17" />);

    expect(screen.getByText('$45.00')).toBeInTheDocument();
    expect(screen.getByText('Spent Today')).toBeInTheDocument();
  });

  it('should display today date', () => {
    render(<BalanceHeader balance={makeSnapshot()} today="2026-03-17" />);

    expect(screen.getByText('2026-03-17')).toBeInTheDocument();
  });
});
