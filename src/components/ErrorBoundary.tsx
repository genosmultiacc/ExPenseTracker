import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const rawMessage =
      error instanceof Error ? error.message : String(error || 'Unexpected error');

    let friendly = rawMessage;
    try {
      const parsed = JSON.parse(rawMessage) as {
        error?: string;
        operationType?: string;
        path?: string;
      };
      if (parsed && parsed.error) {
        friendly = `${parsed.error}${parsed.path ? ` (${parsed.operationType || 'op'} on ${parsed.path})` : ''}`;
      }
    } catch {
      // Non-JSON error message
    }

    return {
      hasError: true,
      errorMessage: friendly,
    };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error('Application error caught by ErrorBoundary:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F4F6F9] dark:bg-slate-950 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/60 shadow-xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h1 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                Something went wrong
              </h1>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 break-words">
              {this.state.errorMessage || 'An unexpected error occurred while syncing your ledger.'}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-lg bg-[#1E3C72] hover:bg-[#2A5298] text-white text-sm font-semibold inline-flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reload Expense Tracker</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
