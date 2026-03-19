import { useState } from 'react';
import type { Goal } from '@/lib/types';
import type { UpdateGoalInput } from '@/data/goal-service';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { roundCurrency } from '@/lib/currency';

interface GoalDetailProps {
  goal: Goal;
  onUpdate: (id: number, input: UpdateGoalInput) => Promise<Goal>;
  onComplete: (id: number) => Promise<Goal>;
  onArchive: (id: number) => Promise<Goal>;
  onReactivate: (id: number) => Promise<Goal>;
  onDelete: (id: number) => Promise<void>;
  onBack: () => void;
}

export default function GoalDetail({
  goal,
  onUpdate,
  onComplete,
  onArchive,
  onReactivate,
  onDelete,
  onBack,
}: GoalDetailProps) {
  const [editingProgress, setEditingProgress] = useState(false);
  const [numericValue, setNumericValue] = useState(String(goal.currentValue ?? 0));
  const [incrementValue, setIncrementValue] = useState('');
  const [percentValue, setPercentValue] = useState(String(goal.percentage ?? 0));
  const [freeformLabel, setFreeformLabel] = useState(goal.statusLabel ?? '');
  const [targetDateValue, setTargetDateValue] = useState(goal.targetDate ?? '');
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCompletionPrompt, setShowCompletionPrompt] = useState(false);

  const isAtTarget =
    (goal.progressModel === 'numeric' &&
      goal.targetValue !== undefined &&
      (goal.currentValue ?? 0) >= goal.targetValue) ||
    (goal.progressModel === 'percentage' && (goal.percentage ?? 0) >= 100);

  async function handleUpdateNumeric(mode: 'absolute' | 'increment') {
    setError('');
    try {
      let newValue: number;
      if (mode === 'absolute') {
        newValue = roundCurrency(parseFloat(numericValue));
      } else {
        const inc = parseFloat(incrementValue);
        if (isNaN(inc)) {
          setError('Increment must be a number');
          return;
        }
        newValue = roundCurrency((goal.currentValue ?? 0) + inc);
      }

      if (isNaN(newValue) || newValue < 0) {
        setError('Value must be zero or positive');
        return;
      }

      const updated = await onUpdate(goal.id!, { currentValue: newValue });
      setNumericValue(String(updated.currentValue ?? 0));
      setIncrementValue('');
      setEditingProgress(false);

      // Check if target is reached
      if (
        goal.targetValue !== undefined &&
        newValue >= goal.targetValue &&
        goal.status === 'active'
      ) {
        setShowCompletionPrompt(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  }

  async function handleUpdatePercentage() {
    setError('');
    try {
      const pct = parseFloat(percentValue);
      if (isNaN(pct) || pct < 0 || pct > 100) {
        setError('Percentage must be between 0 and 100');
        return;
      }
      await onUpdate(goal.id!, { percentage: pct });
      setEditingProgress(false);

      if (pct >= 100 && goal.status === 'active') {
        setShowCompletionPrompt(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  }

  async function handleUpdateFreeform() {
    setError('');
    try {
      if (!freeformLabel.trim()) {
        setError('Status label must not be blank');
        return;
      }
      await onUpdate(goal.id!, { statusLabel: freeformLabel.trim() });
      setEditingProgress(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  }

  async function handleUpdateTargetDate() {
    setError('');
    try {
      await onUpdate(goal.id!, { targetDate: targetDateValue });
      setEditingProgress(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  }

  async function handleComplete() {
    try {
      await onComplete(goal.id!);
      setShowCompletionPrompt(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not complete goal');
    }
  }

  async function handleArchive() {
    try {
      await onArchive(goal.id!);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not archive goal');
    }
  }

  async function handleReactivate() {
    try {
      await onReactivate(goal.id!);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reactivate goal');
    }
  }

  async function handleDelete() {
    try {
      await onDelete(goal.id!);
      onBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete goal');
    }
  }

  function renderProgressEditor() {
    if (!editingProgress) return null;

    switch (goal.progressModel) {
      case 'numeric':
        return (
          <div className="mt-3 space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
            <div>
              <label htmlFor="absoluteValue" className="block text-sm font-medium text-gray-700">
                Set absolute value
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  id="absoluteValue"
                  type="number"
                  min="0"
                  step="any"
                  value={numericValue}
                  onChange={(e) => setNumericValue(e.target.value)}
                  className="block w-full rounded border border-gray-300 px-3 py-1"
                  data-testid="absolute-value-input"
                />
                <button
                  type="button"
                  onClick={() => handleUpdateNumeric('absolute')}
                  className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
                  data-testid="set-value-button"
                >
                  Set
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="incrementValue" className="block text-sm font-medium text-gray-700">
                Increment by
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  id="incrementValue"
                  type="number"
                  step="any"
                  value={incrementValue}
                  onChange={(e) => setIncrementValue(e.target.value)}
                  className="block w-full rounded border border-gray-300 px-3 py-1"
                  data-testid="increment-value-input"
                />
                <button
                  type="button"
                  onClick={() => handleUpdateNumeric('increment')}
                  className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
                  data-testid="increment-button"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        );

      case 'percentage':
        return (
          <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
            <label htmlFor="percentageEdit" className="block text-sm font-medium text-gray-700">
              Update percentage
            </label>
            <div className="mt-1 flex gap-2">
              <input
                id="percentageEdit"
                type="number"
                min="0"
                max="100"
                value={percentValue}
                onChange={(e) => setPercentValue(e.target.value)}
                className="block w-full rounded border border-gray-300 px-3 py-1"
                data-testid="percentage-edit-input"
              />
              <button
                type="button"
                onClick={handleUpdatePercentage}
                className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
                data-testid="update-percentage-button"
              >
                Update
              </button>
            </div>
          </div>
        );

      case 'freeform':
        return (
          <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
            <label htmlFor="freeformEdit" className="block text-sm font-medium text-gray-700">
              Update status label
            </label>
            <div className="mt-1 flex gap-2">
              <input
                id="freeformEdit"
                type="text"
                value={freeformLabel}
                onChange={(e) => setFreeformLabel(e.target.value)}
                className="block w-full rounded border border-gray-300 px-3 py-1"
                data-testid="freeform-edit-input"
              />
              <button
                type="button"
                onClick={handleUpdateFreeform}
                className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
                data-testid="update-freeform-button"
              >
                Update
              </button>
            </div>
          </div>
        );

      case 'date-based':
        return (
          <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
            <label htmlFor="targetDateEdit" className="block text-sm font-medium text-gray-700">
              Update target date
            </label>
            <div className="mt-1 flex gap-2">
              <input
                id="targetDateEdit"
                type="date"
                value={targetDateValue}
                onChange={(e) => setTargetDateValue(e.target.value)}
                className="block w-full rounded border border-gray-300 px-3 py-1"
                data-testid="target-date-edit-input"
              />
              <button
                type="button"
                onClick={handleUpdateTargetDate}
                className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
                data-testid="update-date-button"
              >
                Update
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <div className="mx-auto max-w-lg p-4">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 text-sm text-blue-600 hover:underline"
        data-testid="back-button"
      >
        &larr; Back to Goals
      </button>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h1 className="text-2xl font-bold text-gray-900">{goal.title}</h1>

        <div className="mt-2 flex gap-2">
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
            {goal.type}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs ${
              goal.status === 'active'
                ? 'bg-blue-100 text-blue-700'
                : goal.status === 'completed'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-500'
            }`}
            data-testid="goal-status"
          >
            {goal.status}
          </span>
        </div>

        {goal.description && (
          <p className="mt-3 text-sm text-gray-600">{goal.description}</p>
        )}

        {/* Progress display */}
        <div className="mt-4" data-testid="progress-section">
          {goal.progressModel === 'numeric' && (
            <div>
              <div className="text-lg font-medium">
                {(goal.currentValue ?? 0).toLocaleString()} / {(goal.targetValue ?? 0).toLocaleString()}
              </div>
              <div className="mt-1 h-3 w-full rounded-full bg-gray-200">
                <div
                  className="h-3 rounded-full bg-blue-500"
                  style={{
                    width: `${Math.min(100, Math.round(((goal.currentValue ?? 0) / (goal.targetValue ?? 1)) * 100))}%`,
                  }}
                />
              </div>
            </div>
          )}
          {goal.progressModel === 'percentage' && (
            <div>
              <div className="text-lg font-medium">{goal.percentage ?? 0}%</div>
              <div className="mt-1 h-3 w-full rounded-full bg-gray-200">
                <div
                  className="h-3 rounded-full bg-green-500"
                  style={{ width: `${goal.percentage ?? 0}%` }}
                />
              </div>
            </div>
          )}
          {goal.progressModel === 'freeform' && (
            <div className="text-lg font-medium">
              Status: {goal.statusLabel ?? 'No status'}
            </div>
          )}
          {goal.progressModel === 'date-based' && goal.targetDate && (
            <div className="text-lg font-medium">
              Target: {new Date(goal.targetDate).toLocaleDateString()}
            </div>
          )}
        </div>

        {/* At-target notification */}
        {isAtTarget && goal.status === 'active' && (
          <div
            className="mt-3 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800"
            data-testid="target-reached-prompt"
          >
            You have reached your target! Would you like to mark this goal as complete?
            <button
              type="button"
              onClick={handleComplete}
              className="ml-2 font-medium text-yellow-900 underline"
              data-testid="prompt-complete-button"
            >
              Mark Complete
            </button>
          </div>
        )}

        {/* Update progress button */}
        {goal.status === 'active' && (
          <button
            type="button"
            onClick={() => setEditingProgress(!editingProgress)}
            className="mt-4 rounded-lg border border-blue-300 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
            data-testid="update-progress-button"
          >
            {editingProgress ? 'Cancel Edit' : 'Update Progress'}
          </button>
        )}

        {renderProgressEditor()}

        {/* Error */}
        {error && (
          <p className="mt-3 text-sm text-red-600" data-testid="detail-error">
            {error}
          </p>
        )}

        {/* Status transition buttons */}
        <div className="mt-6 flex flex-wrap gap-2 border-t border-gray-200 pt-4">
          {goal.status === 'active' && (
            <>
              <button
                type="button"
                onClick={handleComplete}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                data-testid="complete-button"
              >
                Mark Complete
              </button>
              <button
                type="button"
                onClick={handleArchive}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                data-testid="archive-button"
              >
                Archive
              </button>
            </>
          )}
          {goal.status === 'completed' && (
            <>
              <button
                type="button"
                onClick={handleReactivate}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                data-testid="reactivate-button"
              >
                Reactivate
              </button>
              <button
                type="button"
                onClick={handleArchive}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                data-testid="archive-button"
              >
                Archive
              </button>
            </>
          )}
          {goal.status === 'archived' && (
            <button
              type="button"
              onClick={handleReactivate}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              data-testid="reactivate-button"
            >
              Reactivate
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
            data-testid="delete-button"
          >
            Delete
          </button>
        </div>

        {/* Timestamps */}
        <div className="mt-4 text-xs text-gray-400">
          Created: {new Date(goal.createdAt).toLocaleDateString()}
          {goal.completedAt && (
            <> | Completed: {new Date(goal.completedAt).toLocaleDateString()}</>
          )}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete Goal"
        message={`Are you sure you want to permanently delete "${goal.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        variant="danger"
      />

      {/* Completion prompt dialog */}
      <ConfirmDialog
        open={showCompletionPrompt}
        title="Goal Target Reached!"
        message={`You have reached the target for "${goal.title}". Would you like to mark it as complete?`}
        confirmLabel="Mark Complete"
        onConfirm={handleComplete}
        onCancel={() => setShowCompletionPrompt(false)}
      />
    </div>
  );
}
