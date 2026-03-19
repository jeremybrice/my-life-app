import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExpenseForm } from '../../../src/screens/budget/ExpenseForm';
import type { Expense } from '../../../src/lib/types';

const mockSubmit = vi.fn();

beforeEach(() => {
  mockSubmit.mockReset();
  mockSubmit.mockResolvedValue({
    id: 1,
    vendor: 'Test',
    amount: 10,
    date: '2026-03-17',
    yearMonth: '2026-03',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as Expense);
});

describe('ExpenseForm', () => {
  it('should render all form fields', () => {
    render(<ExpenseForm onSubmit={mockSubmit} />);

    expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/vendor/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add expense/i })).toBeInTheDocument();
  });

  it('should submit with valid required fields only', async () => {
    const user = userEvent.setup();
    render(<ExpenseForm onSubmit={mockSubmit} />);

    await user.type(screen.getByLabelText(/vendor/i), 'Shell');
    await user.type(screen.getByLabelText(/amount/i), '45');
    await user.click(screen.getByRole('button', { name: /add expense/i }));

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledTimes(1);
    });

    const call = mockSubmit.mock.calls[0][0];
    expect(call.vendor).toBe('Shell');
    expect(call.amount).toBe(45);
  });

  it('should submit with all fields filled', async () => {
    const user = userEvent.setup();
    render(<ExpenseForm onSubmit={mockSubmit} />);

    await user.type(screen.getByLabelText(/vendor/i), 'Chipotle');
    await user.type(screen.getByLabelText(/amount/i), '12.50');
    await user.type(screen.getByLabelText(/category/i), 'Dining');
    await user.type(screen.getByLabelText(/description/i), 'Lunch burrito');
    await user.click(screen.getByRole('button', { name: /add expense/i }));

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledTimes(1);
    });

    const call = mockSubmit.mock.calls[0][0];
    expect(call.vendor).toBe('Chipotle');
    expect(call.amount).toBe(12.5);
    expect(call.category).toBe('Dining');
    expect(call.description).toBe('Lunch burrito');
  });

  it('should show error when vendor is empty', async () => {
    const user = userEvent.setup();
    render(<ExpenseForm onSubmit={mockSubmit} />);

    await user.type(screen.getByLabelText(/amount/i), '20');
    await user.click(screen.getByRole('button', { name: /add expense/i }));

    await waitFor(() => {
      expect(screen.getByTestId('vendor-error')).toBeInTheDocument();
    });

    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('should show error when amount is zero', async () => {
    const user = userEvent.setup();
    render(<ExpenseForm onSubmit={mockSubmit} />);

    await user.type(screen.getByLabelText(/vendor/i), 'Test');
    await user.type(screen.getByLabelText(/amount/i), '0');
    await user.click(screen.getByRole('button', { name: /add expense/i }));

    await waitFor(() => {
      expect(screen.getByTestId('amount-error')).toBeInTheDocument();
    });

    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('should enforce vendor character limit', async () => {
    const user = userEvent.setup();
    render(<ExpenseForm onSubmit={mockSubmit} />);

    const vendorInput = screen.getByLabelText(/vendor/i);
    await user.type(vendorInput, 'A'.repeat(25));

    // Input should be capped at 20 chars
    expect((vendorInput as HTMLInputElement).value.length).toBeLessThanOrEqual(20);
  });

  it('should display character counter for vendor', () => {
    render(<ExpenseForm onSubmit={mockSubmit} />);
    expect(screen.getByText('0/20')).toBeInTheDocument();
  });

  it('should clear form after successful submit', async () => {
    const user = userEvent.setup();
    render(<ExpenseForm onSubmit={mockSubmit} />);

    const vendorInput = screen.getByLabelText(/vendor/i) as HTMLInputElement;
    const amountInput = screen.getByLabelText(/amount/i) as HTMLInputElement;

    await user.type(vendorInput, 'Test');
    await user.type(amountInput, '10');
    await user.click(screen.getByRole('button', { name: /add expense/i }));

    await waitFor(() => {
      expect(vendorInput.value).toBe('');
    });
    expect(amountInput.value).toBe('');
  });
});
