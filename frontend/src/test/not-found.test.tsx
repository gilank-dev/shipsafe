import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { NotFoundPage } from '../components/shell/NotFoundPage'

describe('NotFoundPage', () => {
  it('renders tactical 404 security boundary breach heading and telemetry', () => {
    render(<NotFoundPage />)

    expect(screen.getByText(/404 \/\/ Boundary Breach/i)).toBeInTheDocument()
    expect(screen.getByText(/Perimeter Breach: Path Undefined/i)).toBeInTheDocument()
    expect(screen.getByText(/SECURITY_TELEMETRY/i)).toBeInTheDocument()
    expect(screen.getByText(/GATEKEEPER_STATUS: UNRESOLVED/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Return to Security Cockpit/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Inspect API Health/i })).toHaveAttribute('href', '/api/health')
  })

  it('calls onGoHome when Return to Security Cockpit button is clicked', () => {
    const onGoHome = vi.fn()
    render(<NotFoundPage onGoHome={onGoHome} />)

    const returnBtn = screen.getByRole('button', { name: /Return to Security Cockpit/i })
    fireEvent.click(returnBtn)

    expect(onGoHome).toHaveBeenCalledTimes(1)
  })
})
