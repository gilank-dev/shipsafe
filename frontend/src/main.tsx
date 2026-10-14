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

createRoot(rootEl).render(
  <StrictMode>
    <ErrorBoundary>
      <ClerkProvider publishableKey={clerkPubKey}>
        <App />
      </ClerkProvider>
    </ErrorBoundary>
  </StrictMode>,
)
