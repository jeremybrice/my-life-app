import { useState, useEffect } from 'react';

interface LoadingSpinnerProps {
  /** Delay in ms before showing the spinner (prevents flash for fast loads) */
  delay?: number;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Optional label for accessibility */
  label?: string;
  /** Optional message to display below the spinner (legacy prop) */
  message?: string;
}

const SIZE_CLASSES = {
  sm: 'h-5 w-5',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
};

export function LoadingSpinner({
  delay = 100,
  size = 'md',
  label,
  message,
}: LoadingSpinnerProps) {
  const [visible, setVisible] = useState(delay === 0);

  useEffect(() => {
    if (delay === 0) return;
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  if (!visible) return null;

  const accessibleLabel = label || message || 'Loading...';

  return (
    <div className="flex flex-col items-center justify-center py-12" role="status" aria-label={accessibleLabel}>
      <svg
        className={`${SIZE_CLASSES[size]} animate-spin text-accent`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
      {message ? (
        <p className="mt-3 text-sm text-fg-muted">
          {message}
        </p>
      ) : (
        <span className="sr-only">{accessibleLabel}</span>
      )}
    </div>
  );
}
