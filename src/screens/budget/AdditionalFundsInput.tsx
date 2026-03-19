import { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/currency';

export interface AdditionalFundsInputProps {
  currentAmount: number;
  onUpdate: (amount: number) => Promise<void>;
}

export default function AdditionalFundsInput({ currentAmount, onUpdate }: AdditionalFundsInputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(String(currentAmount));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setInputValue(String(currentAmount));
  }, [currentAmount]);

  const handleSave = async () => {
    const parsed = parseFloat(inputValue);
    if (isNaN(parsed)) {
      setError('Please enter a valid number');
      return;
    }
    if (parsed < 0) {
      setError('Additional funds must be zero or positive');
      return;
    }

    try {
      await onUpdate(parsed);
      setError(null);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    }
  };

  const handleCancel = () => {
    setInputValue(String(currentAmount));
    setError(null);
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Additional Funds:</span>
        <span className="text-sm font-medium" data-testid="additional-funds-display">
          ${formatCurrency(currentAmount)}
        </span>
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="text-sm text-blue-600 hover:text-blue-800 underline"
          aria-label="Edit additional funds"
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600">Additional Funds: $</span>
      <input
        type="number"
        min="0"
        step="0.01"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') handleCancel();
        }}
        className="w-24 px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        data-testid="additional-funds-input"
        autoFocus
      />
      <button
        type="button"
        onClick={handleSave}
        className="text-sm text-green-600 hover:text-green-800 font-medium"
      >
        Save
      </button>
      <button
        type="button"
        onClick={handleCancel}
        className="text-sm text-gray-500 hover:text-gray-700"
      >
        Cancel
      </button>
      {error && <span className="text-sm text-red-600" role="alert">{error}</span>}
    </div>
  );
}
