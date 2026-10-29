import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QuotaIndicator } from './QuotaIndicator'
import { useStore } from '../../state/store'

describe('QuotaIndicator Component', () => {
  it('renders usage bar and upgrade button for free tier', () => {
    useStore.setState({
      quota: {
        tier: 'free',
        used: 2,
        limit: 3,
        remaining: 1,
      },
    })

    render(<QuotaIndicator />)

    expect(screen.getByRole('status', { name: 'Kuota audit: 2 dari 3 digunakan' })).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    const upgradeBtn = screen.getByRole('button', { name: 'Upgrade' })
    expect(upgradeBtn).toBeInTheDocument()

    fireEvent.click(upgradeBtn)
    expect(useStore.getState().isPaywallModalOpen).toBe(true)
    expect(useStore.getState().paywallReason).toBe('quota')
  })

  it('renders enterprise status when user is on enterprise tier', () => {
    useStore.setState({
      quota: {
        tier: 'enterprise',
        used: 12,
        limit: 999999,
        remaining: 999987,
      },
    })

    render(<QuotaIndicator />)
    expect(screen.getByText('Enterprise: FUP Aktif')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Upgrade' })).not.toBeInTheDocument()
  })
})
