interface LoadingSpinnerProps {
  /** Optional message to display below the spinner */
  message?: string;
}

export function LoadingSpinner({ message }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="w-8 h-8 border-4 border-slate-200 dark:border-slate-700 border-t-primary-600 rounded-full animate-spin" />
      {message && (
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          {message}
        </p>
      )}
    </div>
  );
}
