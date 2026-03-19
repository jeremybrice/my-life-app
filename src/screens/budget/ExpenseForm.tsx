import type { CreateExpenseInput } from '@/data/expense-service';
import type { Expense } from '@/lib/types';

interface ExpenseFormProps {
  onSubmit: (input: CreateExpenseInput) => Promise<Expense>;
}

export function ExpenseForm({ onSubmit: _onSubmit }: ExpenseFormProps) {
  return (
    <div data-testid="expense-form">
      <p>Expense form placeholder</p>
    </div>
  );
}
