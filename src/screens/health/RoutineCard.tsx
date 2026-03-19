import type { RoutineWithAdherence } from '@/hooks/useHealth';

interface RoutineCardProps {
  routine: RoutineWithAdherence;
  onQuickLog: (routineId: number) => void;
  onEdit: (routine: RoutineWithAdherence) => void;
  onDelete: (routineId: number) => void;
}

export function RoutineCard({
  routine,
  onQuickLog,
  onEdit,
  onDelete,
}: RoutineCardProps) {
  const isOnTarget = routine.weeklyCount >= routine.targetFrequency;

  return (
    <div
      className="rounded-xl border border-edge bg-surface-card p-4 shadow-sm"
      data-testid={`routine-card-${routine.id}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-medium text-fg">{routine.name}</h3>
          <div className="mt-1 text-sm text-fg-muted">
            {routine.targetFrequency}x / week
          </div>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onEdit(routine)}
            className="rounded p-1 text-fg-muted hover:bg-surface-hover hover:text-fg-secondary"
            aria-label={`Edit ${routine.name}`}
            data-testid={`edit-routine-${routine.id}`}
          >
            &#9998;
          </button>
          <button
            type="button"
            onClick={() => onDelete(routine.id!)}
            className="rounded p-1 text-fg-muted hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600"
            aria-label={`Delete ${routine.name}`}
            data-testid={`delete-routine-${routine.id}`}
          >
            &#10005;
          </button>
        </div>
      </div>

      {/* Adherence indicator */}
      <div className="mt-3 flex items-center justify-between">
        <div
          className={`text-sm font-medium ${
            isOnTarget ? 'text-green-600' : 'text-fg-secondary'
          }`}
          data-testid={`adherence-${routine.id}`}
        >
          {routine.weeklyCount} of {routine.targetFrequency} this week
          {isOnTarget && ' \u2713'}
        </div>

        {routine.streak > 0 && (
          <div
            className="text-sm font-medium text-orange-600"
            data-testid={`streak-${routine.id}`}
          >
            {routine.streak} week{routine.streak !== 1 ? 's' : ''} streak
          </div>
        )}
      </div>

      {/* Quick log button */}
      <button
        type="button"
        onClick={() => onQuickLog(routine.id!)}
        className="mt-3 w-full rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
        data-testid={`quick-log-${routine.id}`}
      >
        Log Today
      </button>
    </div>
  );
}
