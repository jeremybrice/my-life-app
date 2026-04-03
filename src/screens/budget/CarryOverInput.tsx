import { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/currency';

export interface CarryOverInputProps {
  currentAmount: number;
  onUpdate: (amount: number) => Promise<void>;
}

export default function CarryOverInput({ currentAmount, onUpdate }: CarryOverInputProps) {
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

  const isNegative = currentAmount < 0;

  if (!isEditing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-fg-secondary">Carry Over:</span>
        <span
          className={`text-sm font-medium ${isNegative ? 'text-red-600' : ''}`}
          data-testid="carry-over-display"
        >
          {isNegative ? '-' : ''}${formatCurrency(Math.abs(currentAmount))}
        </span>
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="text-sm text-accent hover:text-accent-hover underline"
          aria-label="Edit carry over"
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-fg-secondary">Carry Over: $</span>
      <input
        type="number"
        step="0.01"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') handleCancel();
        }}
        className="w-24 px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-accent focus:border-accent"
        data-testid="carry-over-input"
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
        className="text-sm text-fg-muted hover:text-fg-secondary"
      >
        Cancel
      </button>
      {error && <span className="text-sm text-red-600" role="alert">{error}</span>}
    </div>
  );
}
