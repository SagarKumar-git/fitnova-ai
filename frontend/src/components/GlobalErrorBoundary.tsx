/**
 * FitNova AI — Global Error Boundary
 * Catches unhandled runtime exceptions, classifies errors into platform taxonomy,
 * prevents technical stack traces from leaking, and provides graceful recovery.
 */

import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { normalizeError, getUserSafeMessage } from '../platform/errors/index.ts';
import type { FitNovaError } from '../platform/errors/index.ts';
import { logger } from '../utils/logger.ts';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: (error: FitNovaError, reset: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: FitNovaError | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    const normalized = normalizeError(error);
    return { hasError: true, error: normalized };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const normalized = normalizeError(error);

    logger.error(`[GlobalErrorBoundary] Uncaught application error: ${normalized.message}`, {
      code: normalized.code,
      recoverability: normalized.recoverability,
      componentStack: errorInfo.componentStack ? errorInfo.componentStack.substring(0, 500) : undefined,
    });
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  public render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset);
      }

      const safeMessage = getUserSafeMessage(this.state.error);
      const isRetryable = this.state.error.recoverability === 'retryable' || this.state.error.code === 'NETWORK_ERROR';

      return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 text-white">
          <div className="max-w-md w-full glass-panel p-8 rounded-3xl border border-zinc-800/80 shadow-2xl relative overflow-hidden text-center">
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-red-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-red-950/50 border border-red-800/50 flex items-center justify-center text-red-400 shadow-lg">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h2 className="text-2xl font-black tracking-tight mb-2">
              Something went wrong
            </h2>
            <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
              {safeMessage}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {isRetryable && (
                <button
                  type="button"
                  onClick={this.handleReset}
                  className="inline-flex items-center justify-center gap-2 py-3 px-6 bg-gradient-to-r from-neonLime to-emerald-400 text-zinc-950 font-black rounded-xl text-xs uppercase tracking-wider hover:opacity-90 transition-all shadow-lg shadow-neonLime/20 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  this.handleReset();
                  window.location.href = '/dashboard';
                }}
                className="inline-flex items-center justify-center gap-2 py-3 px-6 bg-zinc-900 border border-zinc-800 text-zinc-200 font-bold rounded-xl text-xs uppercase tracking-wider hover:border-zinc-700 hover:text-white transition-all cursor-pointer"
              >
                <Home className="w-4 h-4" />
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
