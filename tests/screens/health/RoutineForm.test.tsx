import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RoutineForm } from '@/screens/health/RoutineForm';

describe('RoutineForm', () => {
  const onSubmit = vi.fn();
  const onCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    onSubmit.mockResolvedValue(undefined);
  });

  it('should render the form with required fields', () => {
    render(<RoutineForm onSubmit={onSubmit} onCancel={onCancel} />);
    expect(screen.getByTestId('routine-name-input')).toBeInTheDocument();
    expect(screen.getByTestId('frequency-input')).toBeInTheDocument();
  });

  it('should show validation errors when submitting empty form', async () => {
    render(<RoutineForm onSubmit={onSubmit} onCancel={onCancel} />);
    const user = userEvent.setup();

    await user.click(screen.getByTestId('submit-routine-button'));

    await waitFor(() => {
      expect(screen.getByTestId('error-name')).toBeInTheDocument();
      expect(screen.getByTestId('error-frequency')).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should submit a valid routine', async () => {
    render(<RoutineForm onSubmit={onSubmit} onCancel={onCancel} />);
    const user = userEvent.setup();

    await user.type(screen.getByTestId('routine-name-input'), 'Morning Run');
    await user.type(screen.getByTestId('frequency-input'), '3');
    await user.click(screen.getByTestId('submit-routine-button'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Morning Run',
          targetFrequency: 3,
          trackedMetrics: [],
        })
      );
    });
  });

  it('should add and remove tracked metrics', async () => {
    render(<RoutineForm onSubmit={onSubmit} onCancel={onCancel} />);
    const user = userEvent.setup();

    await user.click(screen.getByTestId('add-metric-button'));
    expect(screen.getByTestId('metric-0')).toBeInTheDocument();

    await user.click(screen.getByTestId('add-metric-button'));
    expect(screen.getByTestId('metric-1')).toBeInTheDocument();

    await user.click(screen.getByTestId('remove-metric-0'));
    expect(screen.queryByTestId('metric-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('metric-0')).toBeInTheDocument();
  });

  it('should submit routine with metrics', async () => {
    render(<RoutineForm onSubmit={onSubmit} onCancel={onCancel} />);
    const user = userEvent.setup();

    await user.type(screen.getByTestId('routine-name-input'), 'Run');
    await user.type(screen.getByTestId('frequency-input'), '3');
    await user.click(screen.getByTestId('add-metric-button'));
    await user.selectOptions(screen.getByTestId('metric-type-0'), 'distance');
    await user.type(screen.getByTestId('metric-unit-0'), 'km');
    await user.click(screen.getByTestId('submit-routine-button'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          trackedMetrics: [{ type: 'distance', unit: 'km' }],
        })
      );
    });
  });

  it('should call onCancel when cancel is clicked', async () => {
    render(<RoutineForm onSubmit={onSubmit} onCancel={onCancel} />);
    const user = userEvent.setup();

    await user.click(screen.getByTestId('cancel-routine-button'));
    expect(onCancel).toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should pre-fill form when editing', () => {
    render(
      <RoutineForm
        routine={{
          id: 1,
          name: 'Yoga',
          targetFrequency: 5,
          trackedMetrics: [{ type: 'duration', unit: 'minutes' }],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    );

    expect(screen.getByTestId('routine-name-input')).toHaveValue('Yoga');
    expect(screen.getByTestId('frequency-input')).toHaveValue(5);
    expect(screen.getByTestId('metric-0')).toBeInTheDocument();
  });
});
