import type { ChatMessage } from './agent-types';
import { formatCurrency } from '@/lib/currency';

interface MessageBubbleProps {
  message: ChatMessage;
  onConfirm?: (messageId: string) => void;
  onCancel?: (messageId: string) => void;
}

export function MessageBubble({ message, onConfirm, onCancel }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  if (message.contentType === 'expense-confirmation' && message.parsedExpense) {
    return (
      <div className="flex justify-start mb-3">
        <div className="max-w-[85%] rounded-lg bg-surface-card border border-edge shadow-sm p-4">
          <ExpenseCard
            message={message}
            onConfirm={onConfirm}
            onCancel={onCancel}
          />
        </div>
      </div>
    );
  }

  if (message.contentType === 'disclosure') {
    return (
      <div className="flex justify-center mb-3">
        <div className="max-w-[85%] rounded-lg bg-amber-50 border border-amber-200 px-4 py-2 text-sm text-amber-800">
          {message.text}
        </div>
      </div>
    );
  }

  if (message.contentType === 'error') {
    return (
      <div className="flex justify-start mb-3">
        <div className="max-w-[85%] rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {message.text}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[85%] rounded-lg px-4 py-2 ${
          isUser
            ? 'bg-accent text-white'
            : 'bg-surface-tertiary text-fg'
        }`}
      >
        {message.imageUrl && (
          <img
            src={message.imageUrl}
            alt="Uploaded receipt"
            className="max-w-full max-h-48 rounded mb-2"
          />
        )}
        {message.text && (
          <p className="text-sm whitespace-pre-wrap">{message.text}</p>
        )}
      </div>
    </div>
  );
}

function ExpenseCard({
  message,
  onConfirm,
  onCancel,
}: {
  message: ChatMessage;
  onConfirm?: (messageId: string) => void;
  onCancel?: (messageId: string) => void;
}) {
  const expense = message.parsedExpense!;
  const status = message.confirmationStatus;

  return (
    <div>
      <p className="text-sm font-semibold text-fg-secondary mb-2">
        Expense to confirm:
      </p>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-fg-muted">Amount</span>
          <span className="font-medium">${formatCurrency(expense.amount)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-fg-muted">Vendor</span>
          <span className="font-medium">{expense.vendor}</span>
        </div>
        {expense.category && (
          <div className="flex justify-between">
            <span className="text-fg-muted">Category</span>
            <span className="font-medium">{expense.category}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-fg-muted">Date</span>
          <span className="font-medium">{expense.date}</span>
        </div>
        {expense.description && (
          <div className="flex justify-between">
            <span className="text-fg-muted">Description</span>
            <span className="font-medium">{expense.description}</span>
          </div>
        )}
        {expense.lineItems && expense.lineItems.length > 0 && (
          <div className="mt-2 pt-2 border-t border-edge">
            <p className="text-fg-muted mb-1">Line items:</p>
            {expense.lineItems.map((item, i) => (
              <div key={i} className="flex justify-between text-xs text-fg-secondary">
                <span>{item.description}</span>
                <span>${formatCurrency(item.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {status === 'pending' && (
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => onConfirm?.(message.id)}
            className="flex-1 bg-green-600 text-white text-sm font-medium py-2 rounded hover:bg-green-700"
            data-testid="confirm-expense-btn"
          >
            Confirm
          </button>
          <button
            onClick={() => onCancel?.(message.id)}
            className="flex-1 bg-surface-tertiary text-fg-secondary text-sm font-medium py-2 rounded hover:bg-surface-hover"
            data-testid="cancel-expense-btn"
          >
            Cancel
          </button>
        </div>
      )}

      {status === 'saving' && (
        <p className="mt-3 text-sm text-accent">Saving...</p>
      )}

      {status === 'saved' && (
        <p className="mt-3 text-sm text-green-600">
          Saved ${formatCurrency(expense.amount)} at {expense.vendor} on {expense.date}.
        </p>
      )}

      {status === 'cancelled' && (
        <p className="mt-3 text-sm text-fg-muted">Cancelled. No expense was saved.</p>
      )}

      {status === 'error' && (
        <p className="mt-3 text-sm text-red-600">
          Failed to save. Please try entering it via the manual expense form.
        </p>
      )}
    </div>
  );
}
