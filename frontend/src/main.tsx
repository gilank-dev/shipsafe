import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useStore } from './state/store'

if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as { __store?: typeof useStore }).__store = useStore
}

const rootEl = document.getElementById('root')
if (!rootEl) {
  throw new Error('Root element #root not found in document')
}

createRoot(rootEl).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
