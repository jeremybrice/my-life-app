import { useState } from 'react';
import { today as getToday } from '@/lib/dates';
import { MAX_VENDOR_LENGTH } from '@/lib/constants';
import type { CreateExpenseInput } from '@/data/expense-service';
import type { Expense } from '@/lib/types';

interface ExpenseFormProps {
  onSubmit: (input: CreateExpenseInput) => Promise<Expense>;
}

export function ExpenseForm({ onSubmit }: ExpenseFormProps) {
  const [date, setDate] = useState(getToday());
  const [category, setCategory] = useState('');
  const [vendor, setVendor] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setSubmitting(true);

    try {
      await onSubmit({
        date,
        category: category.trim() || undefined,
        vendor: vendor.trim(),
        amount: parseFloat(amount),
        description: description.trim() || undefined,
      });

      // Clear form on success
      setDate(getToday());
      setCategory('');
      setVendor('');
      setAmount('');
      setDescription('');
    } catch (err) {
      setErrors({
        form: err instanceof Error ? err.message : 'Failed to save expense',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="px-4 py-4 border-b border-gray-200"
      data-testid="expense-form"
    >
      <h3 className="text-lg font-semibold text-gray-700 mb-3">Add Expense</h3>

      <div className="grid grid-cols-2 gap-3">
        {/* Date */}
        <div>
          <label htmlFor="expense-date" className="block text-xs font-medium text-gray-600 mb-1">
            Date
          </label>
          <input
            id="expense-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Category */}
        <div>
          <label htmlFor="expense-category" className="block text-xs font-medium text-gray-600 mb-1">
            Category
          </label>
          <input
            id="expense-category"
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Food"
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Vendor */}
        <div>
          <label htmlFor="expense-vendor" className="block text-xs font-medium text-gray-600 mb-1">
            Vendor *
          </label>
          <div className="relative">
            <input
              id="expense-vendor"
              type="text"
              value={vendor}
              onChange={(e) => {
                if (e.target.value.length <= MAX_VENDOR_LENGTH) {
                  setVendor(e.target.value);
                }
              }}
              maxLength={MAX_VENDOR_LENGTH}
              placeholder="e.g. Starbucks"
              className={`w-full px-2 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.vendor ? 'border-red-500' : 'border-gray-300'
              }`}
              aria-describedby="vendor-counter"
            />
            <span
              id="vendor-counter"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400"
            >
              {vendor.length}/{MAX_VENDOR_LENGTH}
            </span>
          </div>
          {errors.vendor && (
            <p className="text-xs text-red-600 mt-0.5" data-testid="vendor-error">
              {errors.vendor}
            </p>
          )}
        </div>

        {/* Amount */}
        <div>
          <label htmlFor="expense-amount" className="block text-xs font-medium text-gray-600 mb-1">
            Amount *
          </label>
          <input
            id="expense-amount"
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className={`w-full px-2 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.amount ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.amount && (
            <p className="text-xs text-red-600 mt-0.5" data-testid="amount-error">
              {errors.amount}
            </p>
          )}
        </div>
      </div>

      {/* Description (full width) */}
      <div className="mt-3">
        <label htmlFor="expense-description" className="block text-xs font-medium text-gray-600 mb-1">
          Description
        </label>
        <input
          id="expense-description"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional notes"
          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Form-level error */}
      {errors.form && (
        <p className="text-sm text-red-600 mt-2" data-testid="form-error">
          {errors.form}
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting}
        className="mt-3 w-full py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? 'Adding...' : 'Add Expense'}
      </button>
    </form>
  );
}
