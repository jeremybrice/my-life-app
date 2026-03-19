import { useState } from 'react';
import type { HealthRoutine, TrackedMetric } from '@/lib/types';
import type { CreateRoutineInput, UpdateRoutineInput } from '@/data/health-service';

interface RoutineFormProps {
  routine?: HealthRoutine; // if editing
  onSubmit: (input: CreateRoutineInput | UpdateRoutineInput) => Promise<void>;
  onCancel: () => void;
}

const METRIC_TYPE_OPTIONS: { value: TrackedMetric['type']; label: string }[] = [
  { value: 'duration', label: 'Duration (minutes)' },
  { value: 'distance', label: 'Distance' },
  { value: 'reps', label: 'Reps' },
  { value: 'weight', label: 'Weight' },
];

export function RoutineForm({ routine, onSubmit, onCancel }: RoutineFormProps) {
  const isEditing = !!routine;
  const [name, setName] = useState(routine?.name ?? '');
  const [frequency, setFrequency] = useState(String(routine?.targetFrequency ?? ''));
  const [metrics, setMetrics] = useState<TrackedMetric[]>(
    routine?.trackedMetrics ?? []
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Routine name is required';
    const freq = parseInt(frequency, 10);
    if (!frequency || isNaN(freq) || freq <= 0 || !Number.isInteger(freq)) {
      errs.frequency = 'Frequency must be a positive whole number';
    }
    return errs;
  }

  function addMetric() {
    setMetrics([...metrics, { type: 'duration', unit: 'minutes' }]);
  }

  function removeMetric(index: number) {
    setMetrics(metrics.filter((_, i) => i !== index));
  }

  function updateMetric(index: number, field: 'type' | 'unit', value: string) {
    const updated = [...metrics];
    if (field === 'type') {
      updated[index] = {
        ...updated[index],
        type: value as TrackedMetric['type'],
        unit: value === 'duration' ? 'minutes' : '',
      };
    } else {
      updated[index] = { ...updated[index], unit: value };
    }
    setMetrics(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      const input = {
        name: name.trim(),
        targetFrequency: parseInt(frequency, 10),
        trackedMetrics: metrics,
      };
      await onSubmit(input);
    } catch (err) {
      setErrors({
        form: err instanceof Error ? err.message : 'Failed to save routine',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg p-4">
      <h1 className="mb-6 text-2xl font-bold text-slate-900 dark:text-white">
        {isEditing ? 'Edit Routine' : 'Create Routine'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4" data-testid="routine-form">
        {/* Name */}
        <div>
          <label htmlFor="routineName" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Routine Name *
          </label>
          <input
            id="routineName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Morning Run, Yoga, Meditation"
            className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white"
            data-testid="routine-name-input"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600" data-testid="error-name">
              {errors.name}
            </p>
          )}
        </div>

        {/* Frequency */}
        <div>
          <label htmlFor="frequency" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Target Frequency (per week) *
          </label>
          <input
            id="frequency"
            type="number"
            min="1"
            step="1"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            placeholder="e.g., 3"
            className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white"
            data-testid="frequency-input"
          />
          {errors.frequency && (
            <p className="mt-1 text-sm text-red-600" data-testid="error-frequency">
              {errors.frequency}
            </p>
          )}
        </div>

        {/* Tracked Metrics */}
        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Tracked Metrics (optional)
            </label>
            <button
              type="button"
              onClick={addMetric}
              className="text-sm text-primary-600 hover:underline"
              data-testid="add-metric-button"
            >
              + Add Metric
            </button>
          </div>

          {metrics.length > 0 && (
            <div className="mt-2 space-y-2">
              {metrics.map((metric, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 rounded border border-slate-200 dark:border-slate-600 p-2"
                  data-testid={`metric-${index}`}
                >
                  <select
                    value={metric.type}
                    onChange={(e) => updateMetric(index, 'type', e.target.value)}
                    className="rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1 text-sm text-slate-900 dark:text-white"
                    data-testid={`metric-type-${index}`}
                  >
                    {METRIC_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {metric.type !== 'duration' && metric.type !== 'reps' && (
                    <input
                      type="text"
                      value={metric.unit ?? ''}
                      onChange={(e) => updateMetric(index, 'unit', e.target.value)}
                      placeholder="Unit (e.g., km, lbs)"
                      className="rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1 text-sm text-slate-900 dark:text-white"
                      data-testid={`metric-unit-${index}`}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => removeMetric(index)}
                    className="text-red-400 hover:text-red-600"
                    aria-label="Remove metric"
                    data-testid={`remove-metric-${index}`}
                  >
                    &#10005;
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

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
            className="flex-1 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
            data-testid="submit-routine-button"
          >
            {submitting
              ? 'Saving...'
              : isEditing
                ? 'Save Changes'
                : 'Create Routine'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            data-testid="cancel-routine-button"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
