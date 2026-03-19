import { useState } from 'react';
import type { HealthRoutine } from '@/lib/types';
import type { CreateLogEntryInput } from '@/data/health-service';
import { today as getToday } from '@/lib/dates';

interface LogEntryFormProps {
  routines: HealthRoutine[];
  preSelectedRoutineId?: number;
  onSubmit: (input: CreateLogEntryInput) => Promise<void>;
  onCancel: () => void;
}

export function LogEntryForm({
  routines,
  preSelectedRoutineId,
  onSubmit,
  onCancel,
}: LogEntryFormProps) {
  const [routineId, setRoutineId] = useState<number | ''>(
    preSelectedRoutineId ?? ''
  );
  const [date, setDate] = useState(getToday());
  const [metricValues, setMetricValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const selectedRoutine = routines.find((r) => r.id === routineId);

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {};
    if (!routineId) errs.routineId = 'Please select a routine';
    if (!date) {
      errs.date = 'Date is required';
    } else if (date > getToday()) {
      errs.date = 'Date cannot be in the future';
    }

    // Validate metric values if provided
    if (selectedRoutine) {
      for (const metric of selectedRoutine.trackedMetrics) {
        const val = metricValues[metric.type];
        if (val && val.trim() !== '') {
          const num = parseFloat(val);
          if (isNaN(num) || num < 0) {
            errs[`metric_${metric.type}`] = `${metric.type} must be a non-negative number`;
          }
        }
      }
    }

    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      const metrics: Record<string, number> = {};
      if (selectedRoutine) {
        for (const metric of selectedRoutine.trackedMetrics) {
          const val = metricValues[metric.type];
          if (val && val.trim() !== '') {
            metrics[metric.type] = parseFloat(val);
          }
        }
      }

      await onSubmit({
        routineId: routineId as number,
        date,
        metrics: Object.keys(metrics).length > 0 ? metrics : undefined,
      });

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onCancel(); // Return to routines screen
      }, 1500);
    } catch (err) {
      setErrors({
        form: err instanceof Error ? err.message : 'Failed to save log entry',
      });
    } finally {
      setSubmitting(false);
    }
  }

  function handleRoutineChange(newId: number | '') {
    setRoutineId(newId);
    setMetricValues({});
  }

  return (
    <div className="mx-auto max-w-lg p-4">
      <h1 className="mb-6 text-2xl font-bold text-fg">Log Routine</h1>

      {showSuccess && (
        <div
          className="mb-4 rounded-lg bg-green-50 dark:bg-green-900/20 p-3 text-sm text-green-700 dark:text-green-400"
          data-testid="success-message"
        >
          Entry logged successfully!
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" data-testid="log-entry-form">
        {/* Routine select */}
        <div>
          <label htmlFor="routineSelect" className="block text-sm font-medium text-fg-secondary">
            Routine *
          </label>
          <select
            id="routineSelect"
            value={routineId}
            onChange={(e) =>
              handleRoutineChange(e.target.value ? parseInt(e.target.value, 10) : '')
            }
            className="mt-1 block w-full rounded-lg border border-edge bg-surface-card px-3 py-2 text-fg"
            data-testid="routine-select"
          >
            <option value="">Select routine...</option>
            {routines.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          {errors.routineId && (
            <p className="mt-1 text-sm text-red-600" data-testid="error-routineId">
              {errors.routineId}
            </p>
          )}
        </div>

        {/* Date */}
        <div>
          <label htmlFor="logDate" className="block text-sm font-medium text-fg-secondary">
            Date *
          </label>
          <input
            id="logDate"
            type="date"
            value={date}
            max={getToday()}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-edge bg-surface-card px-3 py-2 text-fg"
            data-testid="log-date-input"
          />
          {errors.date && (
            <p className="mt-1 text-sm text-red-600" data-testid="error-date">
              {errors.date}
            </p>
          )}
        </div>

        {/* Metric fields (dynamic based on selected routine) */}
        {selectedRoutine && selectedRoutine.trackedMetrics.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-fg-secondary">Metrics (optional)</p>
            {selectedRoutine.trackedMetrics.map((metric) => (
              <div key={metric.type}>
                <label
                  htmlFor={`metric-${metric.type}`}
                  className="block text-sm text-fg-secondary"
                >
                  {metric.type.charAt(0).toUpperCase() + metric.type.slice(1)}
                  {metric.unit ? ` (${metric.unit})` : ''}
                </label>
                <input
                  id={`metric-${metric.type}`}
                  type="number"
                  min="0"
                  step="any"
                  value={metricValues[metric.type] ?? ''}
                  onChange={(e) =>
                    setMetricValues({ ...metricValues, [metric.type]: e.target.value })
                  }
                  className="mt-1 block w-full rounded-lg border border-edge bg-surface-card px-3 py-2 text-fg"
                  data-testid={`metric-input-${metric.type}`}
                />
                {errors[`metric_${metric.type}`] && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors[`metric_${metric.type}`]}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Form-level error */}
        {errors.form && (
          <p className="text-sm text-red-600" data-testid="error-form">
            {errors.form}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50 transition-colors"
            data-testid="submit-log-button"
          >
            {submitting ? 'Logging...' : 'Log Entry'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg border border-edge px-4 py-2 text-sm font-medium text-fg-secondary hover:bg-surface-hover transition-colors"
            data-testid="cancel-log-button"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
