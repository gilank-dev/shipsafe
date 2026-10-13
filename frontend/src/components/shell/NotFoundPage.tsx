import { ThemeToggle } from './ThemeToggle'
import { IconShield, IconChevron } from '../ui/icons'

interface NotFoundPageProps {
  onGoHome?: () => void
}

export function NotFoundPage({ onGoHome }: NotFoundPageProps) {
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/unknown'

  const handleReturn = () => {
    if (onGoHome) {
      onGoHome()
    } else if (typeof window !== 'undefined') {
      window.location.href = '/'
    }
  }

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col font-mono">
      {/* Top Cockpit Header */}
      <header className="border-b border-rule bg-surface/50 backdrop-blur-xs px-4 py-3 md:px-8">
        <div className="mx-auto flex max-w-[105rem] items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="block size-3.5 bg-ink" aria-hidden="true" />
            <span className="text-h3 leading-none font-extrabold [font-stretch:125%] font-sans">ShipSafe</span>
            <span className="hidden text-small text-ink-3 md:inline">Pre-deployment security gate</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* 404 Incident Radar Content */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-12" role="main">
        <div className="w-full max-w-2xl border-2 border-ink bg-surface p-6 sm:p-8 md:p-10 shadow-lg rounded-[var(--radius-control)]">
          {/* Tactical Badge */}
          <div className="inline-flex items-center gap-2 border border-status-fail bg-surface px-2.5 py-1 text-xs text-status-fail font-bold uppercase tracking-wider mb-4">
            <span className="size-2 rounded-full bg-status-fail animate-pulse" aria-hidden="true" />
            <span>404 // Boundary Breach</span>
          </div>

          <h1 className="text-h2 font-sans font-extrabold tracking-tight mb-2">
            Perimeter Breach: Path Undefined
          </h1>

          <p className="text-body font-sans text-ink-2 mb-6 leading-relaxed">
            The requested location is outside ShipSafe's verified security envelope. No active security gatekeeper service or static rule audit engine is mapped to this route.
          </p>

          {/* Diagnostic Telemetry Box */}
          <div className="border border-rule bg-canvas p-4 text-xs font-mono mb-6 space-y-1.5">
            <div className="flex items-center justify-between border-b border-rule pb-1.5 text-ink-3">
              <span>SECURITY_TELEMETRY</span>
              <span>GATEKEEPER_STATUS: UNRESOLVED</span>
            </div>
            <div className="pt-1">
              <span className="text-ink-3">REQUESTED_URI: </span>
              <span className="text-status-fail font-bold break-all">{currentPath}</span>
            </div>
            <div>
              <span className="text-ink-3">DIAGNOSTIC: </span>
              <span>Unregistered endpoint outside verified pre-deployment perimeter</span>
            </div>
            <div>
              <span className="text-ink-3">RESOLUTION: </span>
              <span>Return to the root gatekeeper cockpit to inspect ZIP archives or import GitHub repositories</span>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleReturn}
              className="btn btn-primary flex items-center justify-center gap-2 py-3 px-5 text-small font-sans font-bold"
            >
              <IconShield width={16} height={16} />
              <span>Return to Security Cockpit</span>
            </button>

            <a
              href="/api/health"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline flex items-center justify-center gap-2 py-3 px-5 text-small font-sans font-semibold hover:border-ink text-center"
            >
              <span>Inspect API Health</span>
              <span className="text-ink-3 rotate-[-90deg] inline-block">
                <IconChevron width={12} height={12} />
              </span>
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-rule py-4 px-6 text-center text-xs text-ink-3">
        ShipSafe Security Architecture. Zero data retention sandbox.
      </footer>
    </div>
  )
}
