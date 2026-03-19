import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExpenseEditModal } from '../../../src/screens/budget/ExpenseEditModal';
import type { Expense } from '../../../src/lib/types';

const baseExpense: Expense = {
  id: 1,
  yearMonth: '2026-03',
  date: '2026-03-17',
  vendor: 'Amazon',
  amount: 25,
  category: 'Shopping',
  description: 'Test purchase',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockSave = vi.fn();
const mockDelete = vi.fn();
const mockClose = vi.fn();

beforeEach(() => {
  mockSave.mockReset().mockResolvedValue(undefined);
  mockDelete.mockReset().mockResolvedValue(undefined);
  mockClose.mockReset();
});

describe('ExpenseEditModal', () => {
  it('should pre-populate fields with expense data', () => {
    render(
      <ExpenseEditModal
        expense={baseExpense}
        onSave={mockSave}
        onDelete={mockDelete}
        onClose={mockClose}
      />
    );

    expect((screen.getByLabelText(/vendor/i) as HTMLInputElement).value).toBe('Amazon');
    expect((screen.getByLabelText(/amount/i) as HTMLInputElement).value).toBe('25');
    expect((screen.getByLabelText(/category/i) as HTMLInputElement).value).toBe('Shopping');
    expect((screen.getByLabelText(/description/i) as HTMLInputElement).value).toBe('Test purchase');
  });

  it('should call onSave with updated values', async () => {
    const user = userEvent.setup();
    render(
      <ExpenseEditModal
        expense={baseExpense}
        onSave={mockSave}
        onDelete={mockDelete}
        onClose={mockClose}
      />
    );

    const amountInput = screen.getByLabelText(/amount/i);
    await user.clear(amountInput);
    await user.type(amountInput, '30');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledTimes(1);
    });

    expect(mockSave.mock.calls[0][0].amount).toBe(30);
  });

  it('should show validation error when vendor is cleared', async () => {
    const user = userEvent.setup();
    render(
      <ExpenseEditModal
        expense={baseExpense}
        onSave={mockSave}
        onDelete={mockDelete}
        onClose={mockClose}
      />
    );

    const vendorInput = screen.getByLabelText(/vendor/i);
    await user.clear(vendorInput);
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getByTestId('edit-vendor-error')).toBeInTheDocument();
    });

    expect(mockSave).not.toHaveBeenCalled();
  });

  it('should show delete confirmation dialog', async () => {
    const user = userEvent.setup();
    render(
      <ExpenseEditModal
        expense={baseExpense}
        onSave={mockSave}
        onDelete={mockDelete}
        onClose={mockClose}
      />
    );

    await user.click(screen.getByRole('button', { name: /^delete$/i }));

    await waitFor(() => {
      expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
    });
  });

  it('should call onDelete when delete is confirmed', async () => {
    const user = userEvent.setup();
    render(
      <ExpenseEditModal
        expense={baseExpense}
        onSave={mockSave}
        onDelete={mockDelete}
        onClose={mockClose}
      />
    );

    // Click delete button
    await user.click(screen.getByRole('button', { name: /^delete$/i }));

    // Confirm in dialog
    await waitFor(() => {
      expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
    });

    // The ConfirmDialog renders a "Delete" confirm button
    const confirmBtns = screen.getAllByRole('button', { name: /^delete$/i });
    // The confirm button in the dialog is the last one
    await user.click(confirmBtns[confirmBtns.length - 1]!);

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledTimes(1);
    });
  });

  it('should not call onDelete when delete is cancelled', async () => {
    const user = userEvent.setup();
    render(
      <ExpenseEditModal
        expense={baseExpense}
        onSave={mockSave}
        onDelete={mockDelete}
        onClose={mockClose}
      />
    );

    // Click delete button
    await user.click(screen.getByRole('button', { name: /^delete$/i }));

    // Cancel in dialog
    await waitFor(() => {
      expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
    });

    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelBtn);

    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('should call onClose when backdrop is clicked', async () => {
    const user = userEvent.setup();
    render(
      <ExpenseEditModal
        expense={baseExpense}
        onSave={mockSave}
        onDelete={mockDelete}
        onClose={mockClose}
      />
    );

    await user.click(screen.getByTestId('edit-modal-backdrop'));
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <ExpenseEditModal
        expense={baseExpense}
        onSave={mockSave}
        onDelete={mockDelete}
        onClose={mockClose}
      />
    );

    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});
