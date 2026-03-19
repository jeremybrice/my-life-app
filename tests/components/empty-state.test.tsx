import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmptyState } from '@/components/EmptyState';

describe('EmptyState', () => {
  it('should render title', () => {
    render(<EmptyState title="No expenses yet" />);
    expect(screen.getByText('No expenses yet')).toBeInTheDocument();
  });

  it('should render description when provided', () => {
    render(
      <EmptyState title="Empty" description="Add your first expense." />
    );
    expect(screen.getByText('Add your first expense.')).toBeInTheDocument();
  });

  it('should render action button and handle click', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <EmptyState
        title="Empty"
        action={{ label: 'Add Expense', onClick }}
      />
    );

    await user.click(screen.getByText('Add Expense'));
    expect(onClick).toHaveBeenCalled();
  });

  it('should render without action button when not provided', () => {
    render(<EmptyState title="Empty" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('should render custom icon when provided', () => {
    render(
      <EmptyState
        title="Empty"
        icon={<span data-testid="custom-icon">icon</span>}
      />
    );
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });
});
