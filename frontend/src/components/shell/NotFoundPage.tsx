import { ThemeToggle } from './ThemeToggle'
import { BrandLogo } from '../ui/BrandLogo'

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

  const handleLaunchConsole = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/console'
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#090A0B] text-[#18181B] dark:text-[#F4F4F5] font-sans antialiased flex flex-col selection:bg-[#18181B] selection:text-white dark:selection:bg-white dark:selection:text-black transition-colors duration-200">
      {/* Top Header */}
      <header className="border-b border-neutral-200/80 dark:border-neutral-800/80 bg-[#FAFAFA]/80 dark:bg-[#090A0B]/80 backdrop-blur-md px-4 sm:px-6 md:px-8 py-3.5">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <button
            type="button"
            onClick={handleReturn}
            className="flex items-center gap-2 hover:opacity-85 transition-opacity cursor-pointer text-left shrink-0"
            title="ShipSafe"
          >
            <BrandLogo size="md" />
          </button>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              type="button"
              onClick={handleReturn}
              className="rounded-full px-3.5 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
            >
              Home
            </button>
          </div>
        </div>
      </header>

      {/* 404 Main Stage */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-12">
        <div className="w-full max-w-xl rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#121316] p-8 sm:p-10 shadow-sm text-center">
          <div className="font-mono text-xs uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-2">
            ERROR 404
          </div>
          
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 mb-3">
            Page Not Found
          </h1>

          <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 leading-relaxed mb-6 max-w-md mx-auto">
            The page you requested is unavailable or has been moved. Please verify the URL or return to home.
          </p>

          {/* Diagnostic Box */}
          <div className="rounded-xl border border-neutral-100 dark:border-neutral-800/80 bg-neutral-50 dark:bg-neutral-900/50 p-4 font-mono text-xs text-left mb-8 space-y-1 text-neutral-600 dark:text-neutral-400">
            <div className="flex items-center justify-between text-neutral-400 dark:text-neutral-500 border-b border-neutral-200 dark:border-neutral-800 pb-1.5 mb-2">
              <span>DIAGNOSTIC REPORT</span>
              <span>STATUS: NOT_FOUND</span>
            </div>
            <div>
              <span className="text-neutral-400">REQUEST_PATH: </span>
              <span className="text-rose-600 dark:text-rose-400 font-medium break-all">{currentPath}</span>
            </div>
            <div>
              <span className="text-neutral-400">RESOLUTION: </span>
              <span>Return to the main homepage or open the security scanner console.</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleReturn}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 px-6 py-2.5 text-sm font-semibold shadow-xs transition-all cursor-pointer"
            >
              <span>Return to Home</span>
            </button>
            <button
              type="button"
              onClick={handleLaunchConsole}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 px-6 py-2.5 text-sm font-medium transition-all cursor-pointer"
            >
              <span>Open Audit Console</span>
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200/80 dark:border-neutral-800/80 py-4 px-6 text-center text-xs text-neutral-500 dark:text-neutral-400">
        ShipSafe Security Architecture. Zero data retention sandbox.
      </footer>
    </div>
  )
}
