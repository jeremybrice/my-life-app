import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GoalForm from '@/screens/goals/GoalForm';

describe('GoalForm', () => {
  const onSubmit = vi.fn();
  const onCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    onSubmit.mockResolvedValue(undefined);
  });

  it('should render the form with required fields', () => {
    render(<GoalForm onSubmit={onSubmit} onCancel={onCancel} />);
    expect(screen.getByTestId('title-input')).toBeInTheDocument();
    expect(screen.getByTestId('type-select')).toBeInTheDocument();
    expect(screen.getByTestId('progress-model-select')).toBeInTheDocument();
  });

  it('should show validation errors when submitting empty form', async () => {
    render(<GoalForm onSubmit={onSubmit} onCancel={onCancel} />);
    const user = userEvent.setup();

    await user.click(screen.getByTestId('submit-button'));

    await waitFor(() => {
      expect(screen.getByTestId('error-title')).toBeInTheDocument();
      expect(screen.getByTestId('error-type')).toBeInTheDocument();
      expect(screen.getByTestId('error-progressModel')).toBeInTheDocument();
    });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should show numeric fields when numeric model is selected', async () => {
    render(<GoalForm onSubmit={onSubmit} onCancel={onCancel} />);
    const user = userEvent.setup();

    await user.selectOptions(screen.getByTestId('progress-model-select'), 'numeric');

    expect(screen.getByTestId('target-value-input')).toBeInTheDocument();
    expect(screen.getByTestId('current-value-input')).toBeInTheDocument();
  });

  it('should show date field when date-based model is selected', async () => {
    render(<GoalForm onSubmit={onSubmit} onCancel={onCancel} />);
    const user = userEvent.setup();

    await user.selectOptions(screen.getByTestId('progress-model-select'), 'date-based');

    expect(screen.getByTestId('target-date-input')).toBeInTheDocument();
  });

  it('should show status label field when freeform model is selected', async () => {
    render(<GoalForm onSubmit={onSubmit} onCancel={onCancel} />);
    const user = userEvent.setup();

    await user.selectOptions(screen.getByTestId('progress-model-select'), 'freeform');

    expect(screen.getByTestId('status-label-input')).toBeInTheDocument();
  });

  it('should switch dynamic fields when model changes', async () => {
    render(<GoalForm onSubmit={onSubmit} onCancel={onCancel} />);
    const user = userEvent.setup();

    await user.selectOptions(screen.getByTestId('progress-model-select'), 'numeric');
    expect(screen.getByTestId('target-value-input')).toBeInTheDocument();

    await user.selectOptions(screen.getByTestId('progress-model-select'), 'freeform');
    expect(screen.queryByTestId('target-value-input')).not.toBeInTheDocument();
    expect(screen.getByTestId('status-label-input')).toBeInTheDocument();
  });

  it('should submit a valid numeric goal', async () => {
    render(<GoalForm onSubmit={onSubmit} onCancel={onCancel} />);
    const user = userEvent.setup();

    await user.type(screen.getByTestId('title-input'), 'Save $10,000');
    await user.selectOptions(screen.getByTestId('type-select'), 'financial');
    await user.selectOptions(screen.getByTestId('progress-model-select'), 'numeric');
    await user.clear(screen.getByTestId('target-value-input'));
    await user.type(screen.getByTestId('target-value-input'), '10000');
    await user.click(screen.getByTestId('submit-button'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Save $10,000',
          type: 'financial',
          progressModel: 'numeric',
          targetValue: 10000,
          currentValue: 0,
        })
      );
    });
  });

  it('should submit a valid freeform goal', async () => {
    render(<GoalForm onSubmit={onSubmit} onCancel={onCancel} />);
    const user = userEvent.setup();

    await user.type(screen.getByTestId('title-input'), 'Write a novel');
    await user.selectOptions(screen.getByTestId('type-select'), 'personal');
    await user.selectOptions(screen.getByTestId('progress-model-select'), 'freeform');
    await user.type(screen.getByTestId('status-label-input'), 'Brainstorming');
    await user.click(screen.getByTestId('submit-button'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Write a novel',
          type: 'personal',
          progressModel: 'freeform',
          statusLabel: 'Brainstorming',
        })
      );
    });
  });

  it('should call onCancel when cancel button is clicked', async () => {
    render(<GoalForm onSubmit={onSubmit} onCancel={onCancel} />);
    const user = userEvent.setup();

    await user.click(screen.getByTestId('cancel-button'));
    expect(onCancel).toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should validate numeric target value is positive', async () => {
    render(<GoalForm onSubmit={onSubmit} onCancel={onCancel} />);
    const user = userEvent.setup();

    await user.type(screen.getByTestId('title-input'), 'Test');
    await user.selectOptions(screen.getByTestId('type-select'), 'financial');
    await user.selectOptions(screen.getByTestId('progress-model-select'), 'numeric');
    await user.clear(screen.getByTestId('target-value-input'));
    // Leave target value empty
    await user.click(screen.getByTestId('submit-button'));

    await waitFor(() => {
      expect(screen.getByTestId('error-targetValue')).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should validate freeform status label is required', async () => {
    render(<GoalForm onSubmit={onSubmit} onCancel={onCancel} />);
    const user = userEvent.setup();

    await user.type(screen.getByTestId('title-input'), 'Test');
    await user.selectOptions(screen.getByTestId('type-select'), 'personal');
    await user.selectOptions(screen.getByTestId('progress-model-select'), 'freeform');
    // Leave status label empty
    await user.click(screen.getByTestId('submit-button'));

    await waitFor(() => {
      expect(screen.getByTestId('error-statusLabel')).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
