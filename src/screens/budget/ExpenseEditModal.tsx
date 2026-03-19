import type { Expense } from '@/lib/types';
import type { UpdateExpenseInput } from '@/data/expense-service';

interface ExpenseEditModalProps {
  expense: Expense;
  onSave: (input: UpdateExpenseInput) => Promise<void>;
  onDelete: () => Promise<void>;
  onClose: () => void;
}

export function ExpenseEditModal({
  expense: _expense,
  onSave: _onSave,
  onDelete: _onDelete,
  onClose: _onClose,
}: ExpenseEditModalProps) {
  return (
    <div data-testid="expense-edit-modal">
      <p>Edit modal placeholder</p>
    </div>
  );
}
