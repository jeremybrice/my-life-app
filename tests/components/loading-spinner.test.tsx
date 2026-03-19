import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { LoadingSpinner } from '@/components/LoadingSpinner';

describe('LoadingSpinner', () => {
  it('should render with accessible label', () => {
    render(<LoadingSpinner delay={0} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should accept custom label', () => {
    render(<LoadingSpinner delay={0} label="Saving..." />);
    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });

  it('should display message text when provided', () => {
    render(<LoadingSpinner delay={0} message="Loading budget..." />);
    expect(screen.getByText('Loading budget...')).toBeInTheDocument();
  });

  it('should delay rendering by default', () => {
    vi.useFakeTimers();
    render(<LoadingSpinner />);

    // Not visible initially
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    // Visible after delay
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(screen.getByRole('status')).toBeInTheDocument();

    vi.useRealTimers();
  });
});
