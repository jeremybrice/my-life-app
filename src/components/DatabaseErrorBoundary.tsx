import { Component, type ReactNode, type ErrorInfo } from 'react';
import { ErrorState } from './ErrorState';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class DatabaseErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Database error boundary caught:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const isDbError =
        this.state.error?.message?.includes('IndexedDB') ||
        this.state.error?.message?.includes('Dexie') ||
        this.state.error?.name === 'DatabaseClosedError';

      return (
        <div className="flex min-h-screen items-center justify-center p-4">
          <ErrorState
            title={isDbError ? 'Database Error' : 'Something went wrong'}
            message={
              isDbError
                ? 'There was a problem accessing your data. Try reloading the app. If the problem persists, your browser may have restricted storage access.'
                : 'An unexpected error occurred. Please try reloading the app.'
            }
            onRetry={this.handleRetry}
          />
        </div>
      );
    }

    return this.props.children;
  }
}
