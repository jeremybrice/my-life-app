import type { Goal } from '@/lib/types';

export type UrgencyTier = 'critical' | 'warning' | 'normal' | 'none';

/** Returns the urgency tier for a target based on its progress model and status. */
export function getUrgencyTier(goal: Goal): UrgencyTier {
  if (goal.status === 'completed' || goal.status === 'archived') {
    return 'none';
  }

  switch (goal.progressModel) {
    case 'date-based': {
      if (!goal.targetDate) return 'normal';
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      // Parse as local time to avoid UTC timezone offset issues
      const target = new Date(goal.targetDate + 'T00:00:00');
      const diffMs = target.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays <= 0) return 'critical';  // today or overdue
      if (diffDays <= 7) return 'warning';   // 1-7 days out
      return 'normal';
    }
    case 'numeric':
    case 'percentage':
    case 'freeform':
    default:
      return 'normal';
  }
}

/** Returns a numeric sort score (lower = more urgent). */
export function getUrgencySortScore(goal: Goal): number {
  if (goal.status === 'completed' || goal.status === 'archived') {
    return 9999;
  }

  if (goal.progressModel === 'date-based' && goal.targetDate) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    // Parse as local time to avoid UTC timezone offset issues
    const target = new Date(goal.targetDate + 'T00:00:00');
    const diffMs = target.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  return 5000;
}

/** Sorts targets by urgency (most urgent first). Returns a new array. */
export function sortByUrgency(goals: Goal[]): Goal[] {
  return [...goals].sort((a, b) => getUrgencySortScore(a) - getUrgencySortScore(b));
}

/** Tailwind classes for the left border urgency strip on cards. */
export const URGENCY_STRIP_CLASSES: Record<UrgencyTier, string> = {
  critical: 'border-l-danger-500',
  warning: 'border-l-warning-500',
  normal: 'border-l-success-500',
  none: 'border-l-transparent',
};

/** Tailwind classes for the countdown text color. */
export const URGENCY_TEXT_CLASSES: Record<UrgencyTier, string> = {
  critical: 'text-danger-600',
  warning: 'text-warning-600',
  normal: 'text-fg-secondary',
  none: 'text-fg-secondary',
};
