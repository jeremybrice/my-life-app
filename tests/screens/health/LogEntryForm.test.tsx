import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LogEntryForm } from '@/screens/health/LogEntryForm';
import type { HealthRoutine } from '@/lib/types';
import * as dates from '@/lib/dates';

const mockRoutines: HealthRoutine[] = [
  {
    id: 1,
    name: 'Morning Run',
    targetFrequency: 3,
    trackedMetrics: [
      { type: 'duration', unit: 'minutes' },
      { type: 'distance', unit: 'km' },
    ],
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
  },
  {
    id: 2,
    name: 'Meditation',
    targetFrequency: 7,
    trackedMetrics: [],
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
  },
];

describe('LogEntryForm', () => {
  const onSubmit = vi.fn();
  const onCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    onSubmit.mockResolvedValue(undefined);
    vi.spyOn(dates, 'today').mockReturnValue('2026-03-18');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render with routine selector and date', () => {
    render(
      <LogEntryForm
        routines={mockRoutines}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    );
    expect(screen.getByTestId('routine-select')).toBeInTheDocument();
    expect(screen.getByTestId('log-date-input')).toBeInTheDocument();
  });

  it('should pre-select routine when preSelectedRoutineId is provided', () => {
    render(
      <LogEntryForm
        routines={mockRoutines}
        preSelectedRoutineId={1}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    );
    expect(screen.getByTestId('routine-select')).toHaveValue('1');
  });

  it('should show metric fields when routine with metrics is selected', async () => {
    render(
      <LogEntryForm
        routines={mockRoutines}
        preSelectedRoutineId={1}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    );
    expect(screen.getByTestId('metric-input-duration')).toBeInTheDocument();
    expect(screen.getByTestId('metric-input-distance')).toBeInTheDocument();
  });

  it('should not show metric fields for routine without metrics', async () => {
    render(
      <LogEntryForm
        routines={mockRoutines}
        preSelectedRoutineId={2}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    );
    expect(screen.queryByTestId('metric-input-duration')).not.toBeInTheDocument();
  });

  it('should submit log entry with metrics', async () => {
    render(
      <LogEntryForm
        routines={mockRoutines}
        preSelectedRoutineId={1}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    );
    const user = userEvent.setup();

    await user.type(screen.getByTestId('metric-input-duration'), '30');
    await user.type(screen.getByTestId('metric-input-distance'), '5');
    await user.click(screen.getByTestId('submit-log-button'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        routineId: 1,
        date: '2026-03-18',
        metrics: { duration: 30, distance: 5 },
      });
    });
  });

  it('should submit log entry without metrics', async () => {
    render(
      <LogEntryForm
        routines={mockRoutines}
        preSelectedRoutineId={2}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    );
    const user = userEvent.setup();

    await user.click(screen.getByTestId('submit-log-button'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        routineId: 2,
        date: '2026-03-18',
        metrics: undefined,
      });
    });
  });

  it('should default date to today', () => {
    render(
      <LogEntryForm
        routines={mockRoutines}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    );
    expect(screen.getByTestId('log-date-input')).toHaveValue('2026-03-18');
  });

  it('should validate routine selection', async () => {
    render(
      <LogEntryForm
        routines={mockRoutines}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    );
    const user = userEvent.setup();

    await user.click(screen.getByTestId('submit-log-button'));

    await waitFor(() => {
      expect(screen.getByTestId('error-routineId')).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should call onCancel when cancel is clicked', async () => {
    render(
      <LogEntryForm
        routines={mockRoutines}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    );
    const user = userEvent.setup();

    await user.click(screen.getByTestId('cancel-log-button'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('should show success message after submission', async () => {
    render(
      <LogEntryForm
        routines={mockRoutines}
        preSelectedRoutineId={2}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    );
    const user = userEvent.setup();

    await user.click(screen.getByTestId('submit-log-button'));

    await waitFor(() => {
      expect(screen.getByTestId('success-message')).toBeInTheDocument();
    });
  });
});
