import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ShipSafe Uncaught Exception]:', error, errorInfo)
  }

  private handleReload = () => {
    window.location.reload()
  }

  private handleResetAndReload = () => {
    try {
      window.localStorage.clear()
      window.sessionStorage.clear()
    } catch {
      // storage blocked
    }
    window.location.href = '/'
  }

  public override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[100dvh] w-full items-center justify-center bg-canvas p-4 text-ink">
          <div className="w-full max-w-lg border border-rule bg-surface p-6 shadow-md rounded-[var(--radius-panel)]">
            <div className="mb-4 flex items-center gap-2 border-b border-rule pb-3">
              <span className="size-3 rounded-full bg-status-fail animate-pulse" aria-hidden="true" />
              <h1 className="text-title font-mono font-bold tracking-tight text-status-fail">
                Application Error // Runtime Fault
              </h1>
            </div>
            <p className="text-small text-ink-2 mb-4 leading-relaxed">
              ShipSafe encountered an unexpected client runtime exception. The error was caught before it could compromise your local state.
            </p>
            {this.state.error?.message && (
              <div className="mb-4 overflow-x-auto rounded bg-canvas p-3 font-mono text-xs text-ink-2 border border-rule">
                <code>{this.state.error.message}</code>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="btn btn-primary text-small cursor-pointer px-4 py-2"
              >
                Reload Application
              </button>
              <button
                type="button"
                onClick={this.handleResetAndReload}
                className="btn btn-outline text-small cursor-pointer px-4 py-2"
              >
                Reset Storage &amp; Restart
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
