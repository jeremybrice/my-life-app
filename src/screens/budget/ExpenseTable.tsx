import type { Expense } from '@/lib/types';
import type { UpdateExpenseInput } from '@/data/expense-service';

interface ExpenseTableProps {
  expenses: Expense[];
  dailyAllowance: number;
  carryOver: number;
  additionalFunds: number;
  onEdit: (id: number, input: UpdateExpenseInput) => Promise<Expense>;
  onDelete: (id: number) => Promise<void>;
}

export function ExpenseTable({
  expenses: _expenses,
  dailyAllowance: _dailyAllowance,
  carryOver: _carryOver,
  additionalFunds: _additionalFunds,
  onEdit: _onEdit,
  onDelete: _onDelete,
}: ExpenseTableProps) {
  return (
    <div data-testid="expense-table">
      <p>Expense table placeholder</p>
    </div>
  );
}
