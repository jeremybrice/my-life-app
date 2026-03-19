import { useState } from 'react';
import { useGoals } from '@/hooks/useGoals';
import type { Goal } from '@/lib/types';
import GoalCard from './GoalCard';
import { EmptyState } from '@/components/EmptyState';
import { LoadingSpinner } from '@/components/LoadingSpinner';

type TypeFilter = Goal['type'] | 'all';
type StatusFilter = Goal['status'] | 'all';

interface GoalsScreenProps {
  onCreateGoal: () => void;
  onSelectGoal: (goal: Goal) => void;
}

const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'All Types' },
  { value: 'financial', label: 'Financial' },
  { value: 'personal', label: 'Personal' },
  { value: 'strategic', label: 'Strategic' },
  { value: 'custom', label: 'Custom' },
];

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
];

export default function GoalsScreen({ onCreateGoal, onSelectGoal }: GoalsScreenProps) {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');

  const { goals, loading } = useGoals({
    status: statusFilter === 'all' ? undefined : statusFilter,
    type: typeFilter === 'all' ? undefined : typeFilter,
  });

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Goals</h1>
        <button
          type="button"
          onClick={onCreateGoal}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          data-testid="create-goal-button"
        >
          + New Goal
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-3">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
          aria-label="Filter by type"
          data-testid="type-filter"
        >
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
          aria-label="Filter by status"
          data-testid="status-filter"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Goals list */}
      {goals.length === 0 ? (
        statusFilter === 'active' && typeFilter === 'all' ? (
          <EmptyState
            title="No goals yet"
            description="Create your first goal to get started!"
            action={{ label: 'Create Goal', onClick: onCreateGoal }}
          />
        ) : (
          <EmptyState
            title="No goals match"
            description="No goals match the selected filters."
          />
        )
      ) : (
        <div className="space-y-3" data-testid="goals-list">
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} onSelect={onSelectGoal} />
          ))}
        </div>
      )}
    </div>
  );
}
