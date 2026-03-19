import { useState } from 'react';
import type { CreateBudgetMonthInput } from '@/data/budget-service';

interface BudgetSetupPromptProps {
  yearMonth: string;
  onSetup: (input: CreateBudgetMonthInput) => Promise<void>;
}

export function BudgetSetupPrompt({ yearMonth, onSetup }: BudgetSetupPromptProps) {
  const [monthlyAmount, setMonthlyAmount] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const amount = parseFloat(monthlyAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid monthly budget amount greater than zero.');
      return;
    }

    setSubmitting(true);
    try {
      await onSetup({ yearMonth, monthlyAmount: amount });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create budget month');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="flex flex-col items-center justify-center px-4 py-12"
      data-testid="budget-setup-prompt"
    >
      <h2 className="text-xl font-semibold text-fg-secondary mb-2">
        No Budget Configured
      </h2>
      <p className="text-fg-muted mb-6 text-center max-w-sm">
        Set your monthly budget to start tracking expenses for{' '}
        <span className="font-medium">{yearMonth}</span>.
      </p>

      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
        <div>
          <label
            htmlFor="monthly-amount"
            className="block text-sm font-medium text-fg-secondary mb-1"
          >
            Monthly Budget Amount
          </label>
          <input
            id="monthly-amount"
            type="number"
            step="0.01"
            min="0.01"
            value={monthlyAmount}
            onChange={(e) => setMonthlyAmount(e.target.value)}
            placeholder="e.g. 3100.00"
            className="w-full px-3 py-2 border border-edge rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
            required
          />
        </div>

        {error && (
          <p className="text-sm text-red-600" data-testid="setup-error">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2 px-4 bg-accent text-white rounded-lg font-medium hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Setting up...' : 'Set Budget'}
        </button>
      </form>
    </div>
  );
}
