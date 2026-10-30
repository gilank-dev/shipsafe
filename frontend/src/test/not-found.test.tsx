import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { NotFoundPage } from '../components/shell/NotFoundPage'

describe('NotFoundPage', () => {
  it('renders clean professional 404 error heading and brand identity without tactical badges', () => {
    render(<NotFoundPage />)

    expect(screen.getByText(/ERROR 404/i)).toBeInTheDocument()
    expect(screen.getByText(/Page Not Found/i)).toBeInTheDocument()
    // Strictly no tactical badges or boundary breach slop
    expect(screen.queryByText(/404 \/\/ Boundary Breach/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/SECURITY_TELEMETRY/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Halaman Tidak Ditemukan/i)).not.toBeInTheDocument()

    const homeButtons = screen.getAllByRole('button', { name: /Home/i })
    expect(homeButtons.length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /Open Audit Console/i })).toBeInTheDocument()
  })

  it('calls onGoHome when Home button is clicked', () => {
    const onGoHome = vi.fn()
    render(<NotFoundPage onGoHome={onGoHome} />)

    const returnBtn = screen.getByRole('button', { name: /Return to Home/i })
    fireEvent.click(returnBtn)

    expect(onGoHome).toHaveBeenCalledTimes(1)
  })
})
