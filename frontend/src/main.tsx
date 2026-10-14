import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import './styles/index.css'
import App from './App'
import { ErrorBoundary } from './components/common/ErrorBoundary'

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || 'pk_test_cG9ldGljLWxvY3VzdC01MzI2LmNsZXJrLmFjY291bnRzLmRldiQ'

const rootEl = document.getElementById('root')
if (!rootEl) {
  throw new Error('Root element #root not found in document')
}

function DevKeyOnProductionFallback() {
  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center bg-canvas p-4 text-ink">
      <div className="w-full max-w-lg border border-rule bg-surface p-6 shadow-md rounded-[var(--radius-panel)]">
        <div className="mb-4 flex items-center gap-2 border-b border-rule pb-3">
          <span className="size-3 rounded-full bg-fail animate-pulse" aria-hidden="true" />
          <h1 className="text-title font-mono font-bold tracking-tight text-fail">
            Configuration Error
          </h1>
        </div>
        <p className="text-small text-ink-2 mb-4 leading-relaxed">
          This site is using a Clerk development key on a production domain. Set VITE_CLERK_PUBLISHABLE_KEY to a pk_live_ key and redeploy.
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn btn-primary text-small cursor-pointer px-4 py-2"
          >
            Reload Application
          </button>
        </div>
      </div>
    </div>
  )
}

const host = window.location.hostname
const isLocalHost = host === 'localhost' || host === '127.0.0.1' || host === '[::1]'

if (clerkPubKey.startsWith('pk_test_') && !isLocalHost) {
  createRoot(rootEl).render(
    <StrictMode>
      <DevKeyOnProductionFallback />
    </StrictMode>,
  )
} else {
  createRoot(rootEl).render(
    <StrictMode>
      <ErrorBoundary>
        <ClerkProvider publishableKey={clerkPubKey}>
          <App />
        </ClerkProvider>
      </ErrorBoundary>
    </StrictMode>,
  )
}
