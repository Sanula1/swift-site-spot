import React from 'react';

type ErrorBoundaryState = { hasError: boolean; error?: Error; info?: React.ErrorInfo };

class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, ErrorBoundaryState> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // You can log this to an error reporting service
    // eslint-disable-next-line no-console
    console.error('App crashed with error:', error, info);
    this.setState({ info });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, info: undefined });
    // Try reloading the current route to recover
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background text-foreground">
          <div className="max-w-xl w-full rounded-lg border p-6 space-y-4">
            <h1 className="text-xl font-semibold">Something went wrong</h1>
            <p className="text-sm opacity-80">The app encountered an error and couldn’t display this page.</p>
            {this.state.error && (
              <pre className="text-xs p-3 rounded bg-muted/30 overflow-auto max-h-48 whitespace-pre-wrap">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={this.handleReset}
              className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
