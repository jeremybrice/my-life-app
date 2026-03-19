import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorState } from '@/components/ErrorState';

describe('ErrorState', () => {
  it('should render default title and message', () => {
    render(<ErrorState message="Could not load data." />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Could not load data.')).toBeInTheDocument();
  });

  it('should render custom title', () => {
    render(<ErrorState title="Connection Lost" message="Check your internet." />);
    expect(screen.getByText('Connection Lost')).toBeInTheDocument();
  });

  it('should render retry button and handle click with onRetry', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    render(<ErrorState message="Error" onRetry={onRetry} />);
    await user.click(screen.getByText('Try Again'));

    expect(onRetry).toHaveBeenCalled();
  });

  it('should render retry button and handle click with legacy retry prop', async () => {
    const user = userEvent.setup();
    const retry = vi.fn();

    render(<ErrorState message="Error" retry={retry} />);
    await user.click(screen.getByText('Try Again'));

    expect(retry).toHaveBeenCalled();
  });

  it('should not render retry button when neither onRetry nor retry provided', () => {
    render(<ErrorState message="Error" />);
    expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
  });
});
