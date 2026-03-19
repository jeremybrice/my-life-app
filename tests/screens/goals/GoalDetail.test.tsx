import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GoalDetail from '@/screens/goals/GoalDetail';
import type { Goal } from '@/lib/types';

function makeGoal(overrides?: Partial<Goal>): Goal {
  return {
    id: 1,
    title: 'Test Goal',
    type: 'financial',
    progressModel: 'numeric',
    status: 'active',
    targetValue: 1000,
    currentValue: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('GoalDetail', () => {
  const defaultProps = {
    onUpdate: vi.fn().mockResolvedValue(makeGoal({ currentValue: 500 })),
    onComplete: vi.fn().mockResolvedValue(makeGoal({ status: 'completed' })),
    onArchive: vi.fn().mockResolvedValue(makeGoal({ status: 'archived' })),
    onReactivate: vi.fn().mockResolvedValue(makeGoal({ status: 'active' })),
    onDelete: vi.fn().mockResolvedValue(undefined),
    onBack: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display goal title and status', () => {
    render(<GoalDetail goal={makeGoal()} {...defaultProps} />);
    expect(screen.getByText('Test Goal')).toBeInTheDocument();
    expect(screen.getByTestId('goal-status')).toHaveTextContent('active');
  });

  it('should display numeric progress', () => {
    render(<GoalDetail goal={makeGoal({ currentValue: 500, targetValue: 1000 })} {...defaultProps} />);
    expect(screen.getByText(/500/)).toBeInTheDocument();
    expect(screen.getByText(/1,000/)).toBeInTheDocument();
  });

  it('should display freeform status label', () => {
    render(
      <GoalDetail
        goal={makeGoal({ progressModel: 'freeform', statusLabel: 'In Progress' })}
        {...defaultProps}
      />
    );
    expect(screen.getByText(/In Progress/)).toBeInTheDocument();
  });

  it('should show update progress editor when button clicked', async () => {
    render(<GoalDetail goal={makeGoal()} {...defaultProps} />);
    const user = userEvent.setup();

    await user.click(screen.getByTestId('update-progress-button'));
    expect(screen.getByTestId('absolute-value-input')).toBeInTheDocument();
    expect(screen.getByTestId('increment-value-input')).toBeInTheDocument();
  });

  it('should update numeric value via absolute set', async () => {
    render(<GoalDetail goal={makeGoal()} {...defaultProps} />);
    const user = userEvent.setup();

    await user.click(screen.getByTestId('update-progress-button'));
    await user.clear(screen.getByTestId('absolute-value-input'));
    await user.type(screen.getByTestId('absolute-value-input'), '500');
    await user.click(screen.getByTestId('set-value-button'));

    expect(defaultProps.onUpdate).toHaveBeenCalledWith(1, { currentValue: 500 });
  });

  it('should update numeric value via increment', async () => {
    render(<GoalDetail goal={makeGoal({ currentValue: 200 })} {...defaultProps} />);
    const user = userEvent.setup();

    await user.click(screen.getByTestId('update-progress-button'));
    await user.type(screen.getByTestId('increment-value-input'), '100');
    await user.click(screen.getByTestId('increment-button'));

    expect(defaultProps.onUpdate).toHaveBeenCalledWith(1, { currentValue: 300 });
  });

  it('should show Mark Complete button for active goals', () => {
    render(<GoalDetail goal={makeGoal()} {...defaultProps} />);
    expect(screen.getByTestId('complete-button')).toBeInTheDocument();
  });

  it('should show Reactivate button for completed goals', () => {
    render(<GoalDetail goal={makeGoal({ status: 'completed' })} {...defaultProps} />);
    expect(screen.getByTestId('reactivate-button')).toBeInTheDocument();
  });

  it('should show Reactivate button for archived goals', () => {
    render(<GoalDetail goal={makeGoal({ status: 'archived' })} {...defaultProps} />);
    expect(screen.getByTestId('reactivate-button')).toBeInTheDocument();
  });

  it('should not show complete button for archived goals', () => {
    render(<GoalDetail goal={makeGoal({ status: 'archived' })} {...defaultProps} />);
    expect(screen.queryByTestId('complete-button')).not.toBeInTheDocument();
  });

  it('should call onComplete when Mark Complete is clicked', async () => {
    render(<GoalDetail goal={makeGoal()} {...defaultProps} />);
    const user = userEvent.setup();

    await user.click(screen.getByTestId('complete-button'));
    expect(defaultProps.onComplete).toHaveBeenCalledWith(1);
  });

  it('should call onArchive when Archive is clicked', async () => {
    render(<GoalDetail goal={makeGoal()} {...defaultProps} />);
    const user = userEvent.setup();

    await user.click(screen.getByTestId('archive-button'));
    expect(defaultProps.onArchive).toHaveBeenCalledWith(1);
  });

  it('should call onReactivate when Reactivate is clicked', async () => {
    render(<GoalDetail goal={makeGoal({ status: 'completed' })} {...defaultProps} />);
    const user = userEvent.setup();

    await user.click(screen.getByTestId('reactivate-button'));
    expect(defaultProps.onReactivate).toHaveBeenCalledWith(1);
  });

  it('should show target reached prompt when numeric goal reaches target', () => {
    render(
      <GoalDetail
        goal={makeGoal({ currentValue: 1000, targetValue: 1000 })}
        {...defaultProps}
      />
    );
    expect(screen.getByTestId('target-reached-prompt')).toBeInTheDocument();
  });

  it('should show target reached prompt when percentage goal reaches 100', () => {
    render(
      <GoalDetail
        goal={makeGoal({ progressModel: 'percentage', percentage: 100 })}
        {...defaultProps}
      />
    );
    expect(screen.getByTestId('target-reached-prompt')).toBeInTheDocument();
  });

  it('should not show target reached prompt for completed goals', () => {
    render(
      <GoalDetail
        goal={makeGoal({ currentValue: 1000, targetValue: 1000, status: 'completed' })}
        {...defaultProps}
      />
    );
    expect(screen.queryByTestId('target-reached-prompt')).not.toBeInTheDocument();
  });

  it('should call onBack when back button is clicked', async () => {
    render(<GoalDetail goal={makeGoal()} {...defaultProps} />);
    const user = userEvent.setup();

    await user.click(screen.getByTestId('back-button'));
    expect(defaultProps.onBack).toHaveBeenCalled();
  });
});
