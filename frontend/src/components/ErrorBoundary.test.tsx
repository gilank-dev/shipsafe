import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ErrorBoundary } from './ErrorBoundary'

function Bomb({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Explosive test error')
  }
  return <div>Safe content rendered</div>
}

describe('ErrorBoundary component', () => {
  const originalConsoleError = console.error

  beforeEach(() => {
    console.error = vi.fn()
  })

  afterEach(() => {
    console.error = originalConsoleError
  })

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={false} />
      </ErrorBoundary>,
    )
    expect(screen.getByText('Safe content rendered')).toBeInTheDocument()
  })

  it('renders fallback UI and logs error when child component throws', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>,
    )

    expect(screen.getByRole('heading', { name: /Something went wrong/i })).toBeInTheDocument()
    expect(screen.getByText(/ShipSafe encountered an unexpected client runtime exception/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Reload Application/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Reset Storage & Restart/i })).toBeInTheDocument()
    expect(console.error).toHaveBeenCalled()
  })
})
