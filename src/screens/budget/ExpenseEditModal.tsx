import { useState } from 'react';
import type { Expense } from '@/lib/types';
import type { UpdateExpenseInput } from '@/data/expense-service';
import { MAX_VENDOR_LENGTH } from '@/lib/constants';
import { ConfirmDialog } from '@/components/ConfirmDialog';

interface ExpenseEditModalProps {
  expense: Expense;
  onSave: (input: UpdateExpenseInput) => Promise<void>;
  onDelete: () => Promise<void>;
  onClose: () => void;
}

export function ExpenseEditModal({
  expense,
  onSave,
  onDelete,
  onClose,
}: ExpenseEditModalProps) {
  const [date, setDate] = useState(expense.date);
  const [category, setCategory] = useState(expense.category ?? '');
  const [vendor, setVendor] = useState(expense.vendor);
  const [amount, setAmount] = useState(expense.amount.toString());
  const [description, setDescription] = useState(expense.description ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const validate = (): Record<string, string> => {
    const newErrors: Record<string, string> = {};

    if (!vendor.trim()) {
      newErrors.vendor = 'Vendor is required';
    } else if (vendor.trim().length > MAX_VENDOR_LENGTH) {
      newErrors.vendor = `Vendor must be ${MAX_VENDOR_LENGTH} characters or fewer`;
    }

    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      newErrors.amount = 'Amount must be greater than zero';
    }

    return newErrors;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setSubmitting(true);

    try {
      await onSave({
        date,
        category: category.trim() || undefined,
        vendor: vendor.trim(),
        amount: parseFloat(amount),
        description: description.trim() || undefined,
      });
    } catch (err) {
      setErrors({
        form: err instanceof Error ? err.message : 'Failed to save expense',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      await onDelete();
    } catch (err) {
      setErrors({
        form: err instanceof Error ? err.message : 'Failed to delete expense',
      });
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
        data-testid="edit-modal-backdrop"
      />

      {/* Modal */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 bg-surface-card rounded-t-2xl p-4 max-h-[90vh] overflow-y-auto"
        data-testid="expense-edit-modal"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-fg-secondary">Edit Expense</h3>
          <button
            onClick={onClose}
            className="text-fg-muted hover:text-fg-secondary text-xl"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSave} noValidate className="space-y-3">
          {/* Date */}
          <div>
            <label htmlFor="edit-date" className="block text-xs font-medium text-fg-secondary mb-1">
              Date
            </label>
            <input
              id="edit-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-2 py-1.5 border border-edge rounded text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {/* Category */}
          <div>
            <label htmlFor="edit-category" className="block text-xs font-medium text-fg-secondary mb-1">
              Category
            </label>
            <input
              id="edit-category"
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Food"
              className="w-full px-2 py-1.5 border border-edge rounded text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {/* Vendor */}
          <div>
            <label htmlFor="edit-vendor" className="block text-xs font-medium text-fg-secondary mb-1">
              Vendor *
            </label>
            <div className="relative">
              <input
                id="edit-vendor"
                type="text"
                value={vendor}
                onChange={(e) => {
                  if (e.target.value.length <= MAX_VENDOR_LENGTH) {
                    setVendor(e.target.value);
                  }
                }}
                maxLength={MAX_VENDOR_LENGTH}
                className={`w-full px-2 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-accent ${
                  errors.vendor ? 'border-danger-500' : 'border-edge'
                }`}
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-fg-muted">
                {vendor.length}/{MAX_VENDOR_LENGTH}
              </span>
            </div>
            {errors.vendor && (
              <p className="text-xs text-red-600 mt-0.5" data-testid="edit-vendor-error">
                {errors.vendor}
              </p>
            )}
          </div>

          {/* Amount */}
          <div>
            <label htmlFor="edit-amount" className="block text-xs font-medium text-fg-secondary mb-1">
              Amount *
            </label>
            <input
              id="edit-amount"
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={`w-full px-2 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-accent ${
                errors.amount ? 'border-danger-500' : 'border-edge'
              }`}
            />
            {errors.amount && (
              <p className="text-xs text-red-600 mt-0.5" data-testid="edit-amount-error">
                {errors.amount}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="edit-description" className="block text-xs font-medium text-fg-secondary mb-1">
              Description
            </label>
            <input
              id="edit-description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes"
              className="w-full px-2 py-1.5 border border-edge rounded text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {/* Form-level error */}
          {errors.form && (
            <p className="text-sm text-red-600" data-testid="edit-form-error">
              {errors.form}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2 bg-accent text-white rounded-lg font-medium text-sm hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={submitting}
              className="py-2 px-4 bg-red-50 text-red-600 rounded-lg font-medium text-sm hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Delete
            </button>
          </div>
        </form>
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete Expense"
        message={`Delete "${expense.vendor}" for $${expense.amount.toFixed(2)}? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        variant="danger"
      />
    </>
  );
}
