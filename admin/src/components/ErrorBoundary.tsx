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
      return (
        <div className="h-[100dvh] flex flex-col items-center justify-center bg-background text-foreground px-6 text-center gap-4">
          <h1 className="text-2xl font-bold">Něco se pokazilo</h1>
          <p className="text-muted-foreground text-sm max-w-sm">
            Omlouváme se, došlo k neočekávané chybě při vykreslení komponenty.
          </p>
          
          <div className="mt-2 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-left overflow-auto max-w-2xl max-h-[40vh] text-xs">
            <p className="font-mono font-bold text-red-600 dark:text-red-400 mb-1">CHYBOVÉ HLÁŠENÍ:</p>
            <pre className="font-mono text-[11px] whitespace-pre-wrap break-all text-foreground font-semibold">
              {this.state.errorMessage}
            </pre>
            {this.state.errorStack && (
              <details className="mt-2">
                <summary className="cursor-pointer text-[10px] text-muted-foreground hover:underline font-mono">Stack trace (detail)</summary>
                <pre className="mt-1 font-mono text-[9px] text-muted-foreground whitespace-pre-wrap break-all opacity-70">
                  {this.state.errorStack}
                </pre>
              </details>
            )}
          </div>

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
