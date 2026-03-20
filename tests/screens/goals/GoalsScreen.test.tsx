import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { db } from '@/data/db';
import { createGoal, completeGoal } from '@/data/goal-service';
import GoalsScreen from '@/screens/goals/GoalsScreen';

beforeEach(async () => {
  await db.goals.clear();
});

describe('GoalsScreen', () => {
  const defaultProps = {
    onCreateGoal: vi.fn(),
    onSelectGoal: vi.fn(),
  };

  it('should show empty state when no goals exist', async () => {
    render(<GoalsScreen {...defaultProps} />);
    await waitFor(() => {
      expect(
        screen.getByText(/no targets yet/i)
      ).toBeInTheDocument();
    });
  });

  it('should show create goal button', async () => {
    render(<GoalsScreen {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByTestId('create-goal-button')).toBeInTheDocument();
    });
  });

  it('should call onCreateGoal when create button is clicked', async () => {
    render(<GoalsScreen {...defaultProps} />);
    const user = userEvent.setup();
    await waitFor(() => {
      expect(screen.getByTestId('create-goal-button')).toBeInTheDocument();
    });
    await user.click(screen.getByTestId('create-goal-button'));
    expect(defaultProps.onCreateGoal).toHaveBeenCalled();
  });

  it('should display goals with different progress models', async () => {
    await createGoal({
      title: 'Save Money',
      type: 'financial',
      progressModel: 'numeric',
      targetValue: 1000,
      currentValue: 500,
    });
    await createGoal({
      title: 'Learn Piano',
      type: 'personal',
      progressModel: 'freeform',
      statusLabel: 'Practicing',
    });

    render(<GoalsScreen {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Save Money')).toBeInTheDocument();
      expect(screen.getByText('Learn Piano')).toBeInTheDocument();
      expect(screen.getByText(/500/)).toBeInTheDocument();
      expect(screen.getByText(/1,000/)).toBeInTheDocument();
      expect(screen.getByText('Practicing')).toBeInTheDocument();
    });
  });

  it('should filter by type', async () => {
    await createGoal({
      title: 'Financial Goal',
      type: 'financial',
      progressModel: 'numeric',
      targetValue: 100,
    });
    await createGoal({
      title: 'Personal Goal',
      type: 'personal',
      progressModel: 'freeform',
      statusLabel: 'Started',
    });

    render(<GoalsScreen {...defaultProps} />);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Financial Goal')).toBeInTheDocument();
      expect(screen.getByText('Personal Goal')).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByTestId('type-filter'), 'financial');

    await waitFor(() => {
      expect(screen.getByText('Financial Goal')).toBeInTheDocument();
      expect(screen.queryByText('Personal Goal')).not.toBeInTheDocument();
    });
  });

  it('should default to showing only active goals', async () => {
    await createGoal({
      title: 'Active Goal',
      type: 'personal',
      progressModel: 'freeform',
      statusLabel: 'Todo',
    });
    const g2 = await createGoal({
      title: 'Completed Goal',
      type: 'personal',
      progressModel: 'freeform',
      statusLabel: 'Done',
    });

    await completeGoal(g2.id!);

    render(<GoalsScreen {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Active Goal')).toBeInTheDocument();
      expect(screen.queryByText('Completed Goal')).not.toBeInTheDocument();
    });
  });

  it('should call onSelectGoal when a goal card is clicked', async () => {
    const goal = await createGoal({
      title: 'Click Me',
      type: 'custom',
      progressModel: 'freeform',
      statusLabel: 'Ready',
    });

    render(<GoalsScreen {...defaultProps} />);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Click Me')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId(`goal-card-${goal.id}`));
    expect(defaultProps.onSelectGoal).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Click Me' })
    );
  });
});
