import { useState } from 'react';
import type { Goal } from '@/lib/types';
import type { CreateGoalInput } from '@/data/goal-service';

interface GoalFormProps {
  onSubmit: (input: CreateGoalInput) => Promise<void>;
  onCancel: () => void;
}

const TYPE_OPTIONS: { value: Goal['type']; label: string }[] = [
  { value: 'financial', label: 'Financial' },
  { value: 'personal', label: 'Personal' },
  { value: 'strategic', label: 'Strategic' },
  { value: 'custom', label: 'Custom' },
];

const PROGRESS_MODEL_OPTIONS: { value: Goal['progressModel']; label: string }[] = [
  { value: 'numeric', label: 'Numeric Target' },
  { value: 'date-based', label: 'Date-Based' },
  { value: 'percentage', label: 'Percentage' },
  { value: 'freeform', label: 'Freeform Status' },
];

export default function GoalForm({ onSubmit, onCancel }: GoalFormProps) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<Goal['type'] | ''>('');
  const [progressModel, setProgressModel] = useState<Goal['progressModel'] | ''>('');
  const [targetValue, setTargetValue] = useState('');
  const [currentValue, setCurrentValue] = useState('0');
  const [targetDate, setTargetDate] = useState('');
  const [percentage, setPercentage] = useState('0');
  const [statusLabel, setStatusLabel] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {};

    if (!title.trim()) {
      errs.title = 'Title is required';
    }
    if (!type) {
      errs.type = 'Type is required';
    }
    if (!progressModel) {
      errs.progressModel = 'Progress model is required';
    }

    if (progressModel === 'numeric') {
      const tv = parseFloat(targetValue);
      if (!targetValue || isNaN(tv) || tv <= 0) {
        errs.targetValue = 'Target value must be a positive number';
      }
      const cv = parseFloat(currentValue);
      if (currentValue && (isNaN(cv) || cv < 0)) {
        errs.currentValue = 'Starting value must be zero or positive';
      }
    }

    if (progressModel === 'date-based') {
      if (!targetDate) {
        errs.targetDate = 'Target date is required';
      } else {
        const target = new Date(targetDate);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        if (target < now) {
          errs.targetDate = 'Target date must be today or in the future';
        }
      }
    }

    if (progressModel === 'percentage') {
      const pct = parseFloat(percentage);
      if (percentage && (isNaN(pct) || pct < 0 || pct > 100)) {
        errs.percentage = 'Percentage must be between 0 and 100';
      }
    }

    if (progressModel === 'freeform') {
      if (!statusLabel.trim()) {
        errs.statusLabel = 'Initial status label is required';
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
      const input: CreateGoalInput = {
        title: title.trim(),
        type: type as Goal['type'],
        progressModel: progressModel as Goal['progressModel'],
        description: description.trim() || undefined,
      };

      switch (progressModel) {
        case 'numeric':
          input.targetValue = parseFloat(targetValue);
          input.currentValue = parseFloat(currentValue) || 0;
          break;
        case 'date-based':
          input.targetDate = targetDate;
          break;
        case 'percentage':
          input.percentage = parseFloat(percentage) || 0;
          break;
        case 'freeform':
          input.statusLabel = statusLabel.trim();
          break;
      }

      await onSubmit(input);
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : 'Failed to create target' });
    } finally {
      setSubmitting(false);
    }
  }

  function renderProgressModelFields() {
    switch (progressModel) {
      case 'numeric':
        return (
          <>
            <div>
              <label htmlFor="targetValue" className="block text-sm font-medium text-fg-secondary">
                Target Value *
              </label>
              <input
                id="targetValue"
                type="number"
                min="1"
                step="any"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-edge px-3 py-2"
                data-testid="target-value-input"
              />
              {errors.targetValue && (
                <p className="mt-1 text-sm text-red-600" data-testid="error-targetValue">
                  {errors.targetValue}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="currentValue" className="block text-sm font-medium text-fg-secondary">
                Starting Value
              </label>
              <input
                id="currentValue"
                type="number"
                min="0"
                step="any"
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-edge px-3 py-2"
                data-testid="current-value-input"
              />
              {errors.currentValue && (
                <p className="mt-1 text-sm text-red-600" data-testid="error-currentValue">
                  {errors.currentValue}
                </p>
              )}
            </div>
          </>
        );

      case 'date-based':
        return (
          <div>
            <label htmlFor="targetDate" className="block text-sm font-medium text-fg-secondary">
              Target Date *
            </label>
            <input
              id="targetDate"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-edge px-3 py-2"
              data-testid="target-date-input"
            />
            {errors.targetDate && (
              <p className="mt-1 text-sm text-red-600" data-testid="error-targetDate">
                {errors.targetDate}
              </p>
            )}
          </div>
        );

      case 'percentage':
        return (
          <div>
            <label htmlFor="percentage" className="block text-sm font-medium text-fg-secondary">
              Starting Percentage
            </label>
            <input
              id="percentage"
              type="number"
              min="0"
              max="100"
              value={percentage}
              onChange={(e) => setPercentage(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-edge px-3 py-2"
              data-testid="percentage-input"
            />
            {errors.percentage && (
              <p className="mt-1 text-sm text-red-600" data-testid="error-percentage">
                {errors.percentage}
              </p>
            )}
          </div>
        );

      case 'freeform':
        return (
          <div>
            <label htmlFor="statusLabel" className="block text-sm font-medium text-fg-secondary">
              Initial Status Label *
            </label>
            <input
              id="statusLabel"
              type="text"
              value={statusLabel}
              onChange={(e) => setStatusLabel(e.target.value)}
              placeholder='e.g., "Not Started", "Planning"'
              className="mt-1 block w-full rounded-lg border border-edge px-3 py-2"
              data-testid="status-label-input"
            />
            {errors.statusLabel && (
              <p className="mt-1 text-sm text-red-600" data-testid="error-statusLabel">
                {errors.statusLabel}
              </p>
            )}
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <div className="mx-auto max-w-lg p-4">
      <h1 className="mb-6 text-2xl font-bold text-fg">Create Target</h1>

      <form onSubmit={handleSubmit} className="space-y-4" data-testid="goal-form">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-fg-secondary">
            Title *
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What do you want to achieve?"
            className="mt-1 block w-full rounded-lg border border-edge px-3 py-2"
            data-testid="title-input"
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-600" data-testid="error-title">
              {errors.title}
            </p>
          )}
        </div>

        {/* Type */}
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-fg-secondary">
            Type *
          </label>
          <select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value as Goal['type'])}
            className="mt-1 block w-full rounded-lg border border-edge bg-surface-card px-3 py-2"
            data-testid="type-select"
          >
            <option value="">Select type...</option>
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {errors.type && (
            <p className="mt-1 text-sm text-red-600" data-testid="error-type">
              {errors.type}
            </p>
          )}
        </div>

        {/* Progress Model */}
        <div>
          <label htmlFor="progressModel" className="block text-sm font-medium text-fg-secondary">
            Progress Model *
          </label>
          <select
            id="progressModel"
            value={progressModel}
            onChange={(e) => setProgressModel(e.target.value as Goal['progressModel'])}
            className="mt-1 block w-full rounded-lg border border-edge bg-surface-card px-3 py-2"
            data-testid="progress-model-select"
          >
            <option value="">Select progress model...</option>
            {PROGRESS_MODEL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {errors.progressModel && (
            <p className="mt-1 text-sm text-red-600" data-testid="error-progressModel">
              {errors.progressModel}
            </p>
          )}
        </div>

        {/* Dynamic fields per progress model */}
        {progressModel && renderProgressModelFields()}

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-fg-secondary">
            Description (optional)
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Any additional context or notes..."
            rows={3}
            className="mt-1 block w-full rounded-lg border border-edge px-3 py-2"
            data-testid="description-input"
          />
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
            className="flex-1 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
            data-testid="submit-button"
          >
            {submitting ? 'Creating...' : 'Create Target'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg border border-edge px-4 py-2 text-sm font-medium text-fg-secondary hover:bg-surface-hover"
            data-testid="cancel-button"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
