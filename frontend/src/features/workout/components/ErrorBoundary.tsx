import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('fitnova:application_error', {
          detail: {
            source: 'WorkoutErrorBoundary',
            error: error.message,
            code: 'REACT_RENDER_ERROR',
            componentStack: errorInfo.componentStack?.substring(0, 500),
          },
        })
      );
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex flex-col items-center justify-center p-6 text-center" role="alert" aria-live="assertive">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4" aria-hidden="true">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
          <p className="text-zinc-400 mb-6 max-w-md">
            {this.props.fallbackMessage || this.state.error?.message || "An unexpected error occurred while loading this view."}
          </p>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="min-h-[44px] flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neonLime cursor-pointer"
            aria-label="Reload page after error"
          >
            <RefreshCcw className="w-4 h-4" aria-hidden="true" />
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
