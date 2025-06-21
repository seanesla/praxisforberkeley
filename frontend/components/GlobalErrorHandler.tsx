'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { showToast } from './Toast';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class GlobalErrorHandler extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by boundary:', error, errorInfo);
    }

    // Update state with error details
    this.setState({
      error,
      errorInfo,
    });

    // Show error toast
    showToast('An unexpected error occurred. Please refresh the page.', 'error');

    // In production, you might want to send this to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: sendErrorToService(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      // In development, show detailed error
      if (process.env.NODE_ENV === 'development') {
        return (
          <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
            <div className="max-w-2xl w-full bg-red-500/10 border border-red-500/20 rounded-lg p-8">
              <h1 className="text-2xl font-bold text-red-400 mb-4">
                Something went wrong
              </h1>
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-red-300 mb-2">Error:</h2>
                  <pre className="bg-gray-800 p-4 rounded text-sm text-gray-300 overflow-auto">
                    {this.state.error?.toString()}
                  </pre>
                </div>
                {this.state.errorInfo && (
                  <div>
                    <h2 className="text-lg font-semibold text-red-300 mb-2">Stack trace:</h2>
                    <pre className="bg-gray-800 p-4 rounded text-xs text-gray-300 overflow-auto max-h-96">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </div>
                )}
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                >
                  Reload Page
                </button>
              </div>
            </div>
          </div>
        );
      }

      // In production, show user-friendly error
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center">
            <div className="mb-8">
              <svg
                className="mx-auto h-24 w-24 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">
              Oops! Something went wrong
            </h1>
            <p className="text-gray-400 mb-8">
              We apologize for the inconvenience. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}