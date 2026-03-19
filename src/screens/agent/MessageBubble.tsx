import type { ChatMessage } from './agent-types';
import { formatCurrency } from '@/lib/currency';

interface MessageBubbleProps {
  message: ChatMessage;
  onConfirm?: (messageId: string) => void;
  onCancel?: (messageId: string) => void;
}

export function MessageBubble({ message, onConfirm, onCancel }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  // Confirmation cards (all render as structured cards with approve/reject)
  if (isConfirmationCard(message)) {
    return (
      <div className="flex justify-start mb-3">
        <div className="max-w-[85%] rounded-lg bg-surface-card border border-edge shadow-sm p-4">
          <ConfirmationCard
            message={message}
            onConfirm={onConfirm}
            onCancel={onCancel}
          />
        </div>
      </div>
    );
  }

  // Data answer (query response with subtle card styling)
  if (message.contentType === 'data-answer') {
    return (
      <div className="flex justify-start mb-3">
        <div className="max-w-[85%] rounded-lg bg-surface-tertiary border border-edge px-4 py-3">
          <p className="text-sm whitespace-pre-wrap text-fg">{message.text}</p>
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

function isConfirmationCard(message: ChatMessage): boolean {
  const confirmationTypes: ChatMessage['contentType'][] = [
    'expense-confirmation',
    'expense-delete-confirmation',
    'health-log-confirmation',
    'health-delete-confirmation',
    'health-routine-create-confirmation',
    'health-routine-delete-confirmation',
    'goal-create-confirmation',
    'goal-update-confirmation',
    'goal-edit-confirmation',
    'goal-delete-confirmation',
  ];
  return confirmationTypes.includes(message.contentType);
}

function ConfirmationCard({
  message,
  onConfirm,
  onCancel,
}: {
  message: ChatMessage;
  onConfirm?: (messageId: string) => void;
  onCancel?: (messageId: string) => void;
}) {
  const status = message.confirmationStatus;
  const { title, fields, savedMessage } = getCardContent(message);

  return (
    <div>
      <p className="text-sm font-semibold text-fg-secondary mb-2">{title}</p>
      <div className="space-y-1 text-sm">
        {fields.map((field, i) => (
          <div key={i} className="flex justify-between">
            <span className="text-fg-muted">{field.label}</span>
            <span className="font-medium text-fg">{field.value}</span>
          </div>
        ))}
      </div>

      {status === 'pending' && (
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => onConfirm?.(message.id)}
            className="flex-1 bg-green-600 text-white text-sm font-medium py-2 rounded hover:bg-green-700"
            data-testid={`confirm-btn-${message.id}`}
          >
            Approve
          </button>
          <button
            onClick={() => onCancel?.(message.id)}
            className="flex-1 bg-red-100 text-red-700 text-sm font-medium py-2 rounded hover:bg-red-200"
            data-testid={`cancel-btn-${message.id}`}
          >
            Reject
          </button>
        </div>
      )}

      {status === 'saving' && (
        <p className="mt-3 text-sm text-accent">Saving...</p>
      )}

      {status === 'saved' && (
        <p className="mt-3 text-sm text-green-600">{savedMessage}</p>
      )}

      {status === 'cancelled' && (
        <p className="mt-3 text-sm text-fg-muted">Cancelled.</p>
      )}

      {status === 'error' && (
        <p className="mt-3 text-sm text-red-600">Failed to save. Please try again.</p>
      )}
    </div>
  );
}

interface CardField {
  label: string;
  value: string;
}

function getCardContent(message: ChatMessage): {
  title: string;
  fields: CardField[];
  savedMessage: string;
} {
  const { contentType } = message;

  // Expense cards
  if (contentType === 'expense-confirmation' && message.parsedExpense) {
    const e = message.parsedExpense;
    const fields: CardField[] = [
      { label: 'Amount', value: `$${formatCurrency(e.amount)}` },
      { label: 'Vendor', value: e.vendor },
    ];
    if (e.category) fields.push({ label: 'Category', value: e.category });
    fields.push({ label: 'Date', value: e.date });
    if (e.description) fields.push({ label: 'Description', value: e.description });
    if (e.lineItems?.length) {
      for (const item of e.lineItems) {
        fields.push({ label: item.description, value: `$${formatCurrency(item.amount)}` });
      }
    }
    return {
      title: 'Expense to confirm',
      fields,
      savedMessage: `Saved $${formatCurrency(e.amount)} at ${e.vendor} on ${e.date}.`,
    };
  }

  if (contentType === 'expense-delete-confirmation' && message.parsedExpense) {
    const e = message.parsedExpense;
    return {
      title: 'Delete expense?',
      fields: [
        { label: 'Amount', value: `$${formatCurrency(e.amount)}` },
        { label: 'Vendor', value: e.vendor },
        { label: 'Date', value: e.date },
      ],
      savedMessage: 'Expense deleted.',
    };
  }

  // Health log cards
  if (contentType === 'health-log-confirmation' && message.parsedHealthLog) {
    const h = message.parsedHealthLog;
    const fields: CardField[] = [
      { label: 'Routine', value: h.routineName },
      { label: 'Date', value: h.date },
    ];
    if (h.metrics) {
      for (const [key, val] of Object.entries(h.metrics)) {
        fields.push({ label: key.charAt(0).toUpperCase() + key.slice(1), value: String(val) });
      }
    }
    return {
      title: 'Log routine entry',
      fields,
      savedMessage: `Logged ${h.routineName} on ${h.date}.`,
    };
  }

  if (contentType === 'health-delete-confirmation' && message.parsedHealthLog) {
    const h = message.parsedHealthLog;
    return {
      title: 'Delete health log?',
      fields: [
        { label: 'Routine', value: h.routineName },
        { label: 'Date', value: h.date },
      ],
      savedMessage: 'Log entry deleted.',
    };
  }

  if (contentType === 'health-routine-create-confirmation' && message.parsedHealthRoutineAction) {
    const a = message.parsedHealthRoutineAction;
    const freqLabel = a.frequencyType === 'daily'
      ? `${a.dailyTarget ?? 1}x daily`
      : `${a.targetFrequency ?? 1}x per week`;
    return {
      title: 'Create new routine',
      fields: [
        { label: 'Name', value: a.name },
        { label: 'Frequency', value: freqLabel },
      ],
      savedMessage: `Created routine "${a.name}".`,
    };
  }

  if (contentType === 'health-routine-delete-confirmation' && message.parsedHealthRoutineAction) {
    const a = message.parsedHealthRoutineAction;
    return {
      title: 'Delete routine?',
      fields: [{ label: 'Routine', value: a.name }],
      savedMessage: `Deleted routine "${a.name}".`,
    };
  }

  // Goal cards
  if (contentType === 'goal-create-confirmation' && message.parsedGoalAction) {
    const g = message.parsedGoalAction;
    const fields: CardField[] = [
      { label: 'Title', value: g.goalTitle },
      { label: 'Type', value: g.goalType ?? 'custom' },
    ];
    if (g.targetValue) fields.push({ label: 'Target', value: String(g.targetValue) });
    if (g.targetDate) fields.push({ label: 'Target Date', value: g.targetDate });
    return {
      title: 'Create goal',
      fields,
      savedMessage: `Created goal "${g.goalTitle}".`,
    };
  }

  if (contentType === 'goal-update-confirmation' && message.parsedGoalAction) {
    const g = message.parsedGoalAction;
    return {
      title: 'Update goal progress',
      fields: [
        { label: 'Goal', value: g.goalTitle },
        { label: 'Field', value: g.field ?? '' },
        { label: 'Current', value: String(g.oldValue ?? '') },
        { label: 'New', value: String(g.newValue ?? '') },
      ],
      savedMessage: g.message ?? `Updated "${g.goalTitle}".`,
    };
  }

  if (contentType === 'goal-edit-confirmation' && message.parsedGoalAction) {
    const g = message.parsedGoalAction;
    const fields: CardField[] = [{ label: 'Goal', value: g.goalTitle }];
    if (g.updates) {
      for (const [key, val] of Object.entries(g.updates)) {
        if (val !== null && val !== undefined) {
          fields.push({ label: key, value: String(val) });
        }
      }
    }
    return {
      title: 'Edit goal',
      fields,
      savedMessage: g.message ?? `Updated "${g.goalTitle}".`,
    };
  }

  if (contentType === 'goal-delete-confirmation' && message.parsedGoalAction) {
    const g = message.parsedGoalAction;
    return {
      title: 'Delete goal?',
      fields: [{ label: 'Goal', value: g.goalTitle }],
      savedMessage: `Deleted goal "${g.goalTitle}".`,
    };
  }

  // Fallback
  return {
    title: 'Confirm action',
    fields: [],
    savedMessage: 'Done.',
  };
}
