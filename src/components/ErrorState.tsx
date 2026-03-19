interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  /** @deprecated Use onRetry instead */
  retry?: () => void;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  retry,
}: ErrorStateProps) {
  const handleRetry = onRetry || retry;

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center animate-fade-in">
      <div className="w-16 h-16 mb-4 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
        <svg className="w-8 h-8 text-negative" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-fg-secondary mb-1">
        {title}
      </h3>
      <p className="text-sm text-fg-muted mb-4 max-w-sm">
        {message}
      </p>
      {handleRetry && (
        <button
          onClick={handleRetry}
          className="px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
