import { useState, useRef, useEffect } from 'react';
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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isDaily = routine.frequencyType === 'daily';
  const dailyTarget = routine.dailyTarget ?? 1;
  const dailyDone = isDaily && routine.dailyCount >= dailyTarget;
  const weeklyDone = routine.weeklyCount >= routine.targetFrequency;
  const isOnTarget = weeklyDone;

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  // Status dot color
  const dotColor = isOnTarget
    ? 'bg-green-500'
    : routine.weeklyCount > 0
      ? 'bg-amber-500'
      : 'bg-red-400';

  // Primary progress display
  const progressText = isDaily
    ? `${routine.dailyCount}/${dailyTarget} today`
    : `${routine.weeklyCount}/${routine.targetFrequency} this week`;

  // Frequency label
  const freqLabel = isDaily
    ? `${dailyTarget}x daily`
    : `${routine.targetFrequency}x / week`;

  // Secondary info line
  const parts: string[] = [freqLabel];
  if (isDaily) {
    parts.push(`${routine.weeklyCount} of ${routine.targetFrequency} this week`);
  }
  if (routine.streak > 0) {
    parts.push(`${routine.streak}wk streak`);
  }

  return (
    <div
      className="flex items-center gap-3 rounded-lg border border-edge bg-surface-card px-3 py-2.5"
      data-testid={`routine-card-${routine.id}`}
    >
      {/* Status dot */}
      <div
        className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotColor}`}
        data-testid={`status-dot-${routine.id}`}
        aria-label={isOnTarget ? 'On target' : 'Behind'}
      />

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="truncate font-medium text-fg text-sm">{routine.name}</span>
          <span
            className={`shrink-0 text-xs font-medium ${
              isDaily
                ? dailyDone
                  ? 'text-green-600'
                  : 'text-fg-secondary'
                : isOnTarget
                  ? 'text-green-600'
                  : 'text-fg-secondary'
            }`}
            data-testid={`adherence-${routine.id}`}
          >
            {progressText}
            {(isDaily ? dailyDone : weeklyDone) && ' \u2713'}
          </span>
        </div>
        <div className="mt-0.5 text-xs text-fg-muted" data-testid={`routine-details-${routine.id}`}>
          {parts.join(' \u00B7 ')}
        </div>
      </div>

      {/* Quick Log button */}
      <button
        type="button"
        onClick={() => onQuickLog(routine.id!)}
        className="shrink-0 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover transition-colors"
        data-testid={`quick-log-${routine.id}`}
      >
        Log
      </button>

      {/* Overflow menu */}
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="shrink-0 rounded p-1 text-fg-muted hover:bg-surface-hover hover:text-fg-secondary"
          aria-label={`More options for ${routine.name}`}
          data-testid={`menu-toggle-${routine.id}`}
        >
          &#8943;
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full z-10 mt-1 w-32 rounded-lg border border-edge bg-surface-card py-1 shadow-lg">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onEdit(routine);
              }}
              className="block w-full px-3 py-1.5 text-left text-sm text-fg hover:bg-surface-hover"
              data-testid={`edit-routine-${routine.id}`}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onDelete(routine.id!);
              }}
              className="block w-full px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              data-testid={`delete-routine-${routine.id}`}
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
