import { useState } from 'react';
import type { Expense } from '@/lib/types';
import type { UpdateExpenseInput } from '@/data/expense-service';
import { formatCurrency } from '@/lib/currency';
import { groupExpensesByDay, type DailyGroup } from './expense-grouping';
import { ExpenseEditModal } from './ExpenseEditModal';
import { EmptyState } from '@/components/EmptyState';

interface ExpenseTableProps {
  expenses: Expense[];
  dailyAllowance: number;
  carryOver: number;
  additionalFunds: number;
  onEdit: (id: number, input: UpdateExpenseInput) => Promise<Expense>;
  onDelete: (id: number) => Promise<void>;
}

export function ExpenseTable({
  expenses,
  dailyAllowance,
  carryOver,
  additionalFunds,
  onEdit,
  onDelete,
}: ExpenseTableProps) {
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const groups = groupExpensesByDay(expenses, dailyAllowance, carryOver, additionalFunds);

  if (groups.length === 0) {
    return (
      <div className="px-4 py-8">
        <EmptyState
          title="No expenses recorded yet."
          description="Add your first expense above."
        />
      </div>
    );
  }

  const toggleDate = (date: string) => {
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  };

  return (
    <div className="px-4 py-4" data-testid="expense-table">
      {groups.map((group) => (
        <DailyGroupRow
          key={group.date}
          group={group}
          dailyAllowance={dailyAllowance}
          expanded={expandedDates.has(group.date)}
          onToggle={() => toggleDate(group.date)}
          onExpenseClick={(expense) => setEditingExpense(expense)}
        />
      ))}

      {editingExpense && (
        <ExpenseEditModal
          expense={editingExpense}
          onSave={async (input) => {
            await onEdit(editingExpense.id!, input);
            setEditingExpense(null);
          }}
          onDelete={async () => {
            await onDelete(editingExpense.id!);
            setEditingExpense(null);
          }}
          onClose={() => setEditingExpense(null)}
        />
      )}
    </div>
  );
}

// --- DailyGroupRow ---

interface DailyGroupRowProps {
  group: DailyGroup;
  dailyAllowance: number;
  expanded: boolean;
  onToggle: () => void;
  onExpenseClick: (expense: Expense) => void;
}

function DailyGroupRow({
  group,
  dailyAllowance,
  expanded,
  onToggle,
  onExpenseClick,
}: DailyGroupRowProps) {
  const isOverspent = group.runningBalance < 0;

  return (
    <div className="mb-2" data-testid={`day-group-${group.date}`}>
      {/* Date Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 bg-surface-secondary rounded-lg hover:bg-surface-hover transition-colors"
        aria-expanded={expanded}
        aria-label={`${group.date}: spent ${formatCurrency(group.dailyTotal)} of ${formatCurrency(dailyAllowance)}`}
      >
        <div className="flex items-center gap-2">
          <span
            className={`text-xs transition-transform ${expanded ? 'rotate-90' : ''}`}
          >
            &#9654;
          </span>
          <span className="font-medium text-sm text-fg">{group.date}</span>
        </div>

        <div className="flex items-center gap-4 text-xs text-fg-muted">
          <span>Budget: ${formatCurrency(dailyAllowance)}</span>
          <span>Spent: ${formatCurrency(group.dailyTotal)}</span>
          <span
            className={`font-semibold ${isOverspent ? 'text-red-600' : 'text-green-600'}`}
          >
            Bal: {isOverspent ? '-' : ''}${formatCurrency(Math.abs(group.runningBalance))}
          </span>
        </div>
      </button>

      {/* Expense Rows */}
      {expanded && (
        <div className="mt-1 ml-5 space-y-1">
          {group.expenses.map((expense) => (
            <button
              key={expense.id}
              onClick={() => onExpenseClick(expense)}
              className="w-full flex items-center justify-between px-3 py-2 bg-surface-card border border-edge rounded hover:bg-surface-hover transition-colors text-left"
              data-testid={`expense-row-${expense.id}`}
            >
              <div>
                <span className="text-sm font-medium text-fg-secondary">
                  {expense.vendor}
                </span>
                {expense.category && (
                  <span className="ml-2 text-xs text-fg-muted">{expense.category}</span>
                )}
                {expense.description && (
                  <p className="text-xs text-fg-muted mt-0.5">{expense.description}</p>
                )}
              </div>
              <span className="text-sm font-semibold text-fg">
                ${formatCurrency(expense.amount)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
