import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DatabaseErrorBoundary } from '@/components/DatabaseErrorBoundary';

function ThrowingComponent({ error }: { error: Error }) {
  throw error;
}

describe('DatabaseErrorBoundary', () => {
  const originalError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });
  afterEach(() => {
    console.error = originalError;
  });

  it('should render children when no error', () => {
    render(
      <DatabaseErrorBoundary>
        <p>App content</p>
      </DatabaseErrorBoundary>
    );
    expect(screen.getByText('App content')).toBeInTheDocument();
  });

  it('should show database error message for IndexedDB errors', () => {
    const error = new Error('IndexedDB connection failed');

    render(
      <DatabaseErrorBoundary>
        <ThrowingComponent error={error} />
      </DatabaseErrorBoundary>
    );

    expect(screen.getByText('Database Error')).toBeInTheDocument();
    expect(
      screen.getByText(/problem accessing your data/)
    ).toBeInTheDocument();
  });

  it('should show generic error message for other errors', () => {
    const error = new Error('Some other error');

    render(
      <DatabaseErrorBoundary>
        <ThrowingComponent error={error} />
      </DatabaseErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(
      screen.getByText(/unexpected error occurred/)
    ).toBeInTheDocument();
  });

  it('should show database error for Dexie errors', () => {
    const error = new Error('Dexie.BulkError: could not write');

    render(
      <DatabaseErrorBoundary>
        <ThrowingComponent error={error} />
      </DatabaseErrorBoundary>
    );

    expect(screen.getByText('Database Error')).toBeInTheDocument();
  });

  it('should show retry button', () => {
    const error = new Error('Test error');

    render(
      <DatabaseErrorBoundary>
        <ThrowingComponent error={error} />
      </DatabaseErrorBoundary>
    );

    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });
});
