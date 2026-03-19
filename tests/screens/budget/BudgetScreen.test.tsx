import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { db } from '../../../src/data/db';
import { BudgetScreen } from '../../../src/screens/budget/BudgetScreen';

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
