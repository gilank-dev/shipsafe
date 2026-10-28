import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import './styles/index.css'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!clerkPubKey) {
  const errMsg =
    '[ShipSafe] Missing VITE_CLERK_PUBLISHABLE_KEY environment variable. Authentication via Clerk will be unavailable.'
  if (import.meta.env.DEV) {
    throw new Error(errMsg)
  } else {
    console.error(errMsg)
  }
}

const rootEl = document.getElementById('root')
if (!rootEl) {
  throw new Error('Root element #root not found in document')
}

createRoot(rootEl).render(
  <StrictMode>
    <ErrorBoundary>
      <ClerkProvider publishableKey={clerkPubKey || ''}>
        <App />
      </ClerkProvider>
    </ErrorBoundary>
  </StrictMode>,
)
