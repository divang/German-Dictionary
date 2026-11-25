import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'An unexpected error occurred.',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-6 space-y-3">
            <h1 className="font-display text-xl font-semibold text-slate-900">
              Something went wrong
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              LautBhasha ran into an unexpected error while syncing or rendering this view. Your
              saved progress remains safe.
            </p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, message: '' })}
              className="inline-flex items-center justify-center px-4 py-2 min-h-[40px] text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer"
            >
              Reload Workspace
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
