import type { Goal } from '@/lib/types';
import { getUrgencyTier, URGENCY_STRIP_CLASSES, URGENCY_TEXT_CLASSES } from '@/lib/urgency';

interface GoalCardProps {
  goal: Goal;
  onSelect: (goal: Goal) => void;
}

function GoalProgressIndicator({ goal }: { goal: Goal }) {
  switch (goal.progressModel) {
    case 'numeric': {
      const current = goal.currentValue ?? 0;
      const target = goal.targetValue ?? 1;
      const pct = Math.min(100, Math.round((current / target) * 100));
      return (
        <div>
          <div className="text-sm text-fg-secondary">
            {current.toLocaleString()} / {target.toLocaleString()}
          </div>
          <div className="mt-1 h-2 w-full rounded-full bg-surface-tertiary">
            <div
              className="h-2 rounded-full bg-blue-500"
              style={{ width: `${pct}%` }}
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${pct}% complete`}
            />
          </div>
        </div>
      );
    }

    case 'date-based': {
      if (!goal.targetDate) return null;
      // Parse as local time to avoid UTC timezone offset issues
      const target = new Date(goal.targetDate + 'T00:00:00');
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const diffMs = target.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const tier = getUrgencyTier(goal);
      const textClass = URGENCY_TEXT_CLASSES[tier];
      return (
        <div className={`text-sm font-medium ${textClass}`}>
          {diffDays > 0
            ? `${diffDays} day${diffDays !== 1 ? 's' : ''} remaining`
            : diffDays === 0
              ? 'Due today'
              : `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} overdue`}
        </div>
      );
    }

    case 'percentage': {
      const pct = goal.percentage ?? 0;
      return (
        <div>
          <div className="text-sm text-fg-secondary">{pct}%</div>
          <div className="mt-1 h-2 w-full rounded-full bg-surface-tertiary">
            <div
              className="h-2 rounded-full bg-green-500"
              style={{ width: `${pct}%` }}
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${pct}% complete`}
            />
          </div>
        </div>
      );
    }

    case 'freeform':
      return (
        <div className="text-sm text-fg-secondary">
          {goal.statusLabel ?? 'No status'}
        </div>
      );

    default:
      return null;
  }
}

const TYPE_LABELS: Record<Goal['type'], string> = {
  financial: 'Financial',
  personal: 'Personal',
  strategic: 'Strategic',
  custom: 'Custom',
};

export default function GoalCard({ goal, onSelect }: GoalCardProps) {
  const isCompleted = goal.status === 'completed';
  const isArchived = goal.status === 'archived';
  const tier = getUrgencyTier(goal);
  const stripClass = URGENCY_STRIP_CLASSES[tier];

  return (
    <button
      type="button"
      onClick={() => onSelect(goal)}
      className={`w-full rounded-lg border p-4 text-left transition-colors hover:bg-surface-hover border-l-[3px] ${
        isCompleted
          ? 'border-green-200 bg-green-50 opacity-75 border-l-green-400'
          : isArchived
            ? 'border-edge bg-surface-secondary opacity-60 border-l-transparent'
            : `border-edge bg-surface-card ${stripClass}`
      }`}
      data-testid={`goal-card-${goal.id}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3
            className={`font-medium ${
              isCompleted ? 'text-green-800 line-through' : 'text-fg'
            }`}
          >
            {goal.title}
          </h3>
          <span className="mt-1 inline-block rounded-full bg-surface-tertiary px-2 py-0.5 text-xs text-fg-secondary">
            {TYPE_LABELS[goal.type]}
          </span>
        </div>
        {isCompleted && (
          <span className="text-green-600" aria-label="Completed">
            &#10003;
          </span>
        )}
      </div>
      <div className="mt-3">
        <GoalProgressIndicator goal={goal} />
      </div>
    </button>
  );
}
