import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage?: string;
  errorStack?: string;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { 
      hasError: true, 
      errorMessage: error.message || error.toString(),
      errorStack: error.stack
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      const isDebug = window.location.search.includes('debug=zrobee');
      const error = (this as any).state.error; // We'll need to update getDerivedStateFromError to capture the error object

      return (
        <div className="h-[100dvh] flex flex-col items-center justify-center bg-background text-foreground px-6 text-center gap-4">
          <h1 className="text-2xl font-bold">Něco se pokazilo</h1>
          <p className="text-muted-foreground text-sm max-w-sm">
            Omlouváme se, došlo k neočekávané chybě. Zkuste stránku načíst znovu.
          </p>
          
          {isDebug && (
            <div className="mt-4 p-4 bg-black/10 rounded-lg text-left overflow-auto max-w-full max-h-[50vh]">
              <p className="font-mono text-xs font-bold text-red-500 mb-2">DIAGNOSTIC MODE:</p>
              <pre className="font-mono text-[10px] whitespace-pre-wrap break-all">
                {this.state.errorMessage}
              </pre>
              {this.state.errorStack && (
                <pre className="mt-2 font-mono text-[8px] text-muted-foreground whitespace-pre-wrap break-all opacity-70">
                  {this.state.errorStack}
                </pre>
              )}
            </div>
          )}

          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors"
          >
            Načíst znovu
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
