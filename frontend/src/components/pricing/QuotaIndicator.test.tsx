import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QuotaIndicator } from './QuotaIndicator'
import { useStore } from '../../state/store'

describe('QuotaIndicator Component', () => {
  it('renders usage bar and upgrade button for free tier and navigates to pricing on click', () => {
    useStore.setState({
      quota: {
        tier: 'free',
        used: 2,
        limit: 3,
        remaining: 1,
      },
    })

    const pushStateSpy = vi.spyOn(window.history, 'pushState')

    render(<QuotaIndicator />)

    expect(screen.getByRole('status', { name: 'Audit quota: 2 of 3 used' })).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    const upgradeBtn = screen.getByRole('button', { name: 'Upgrade' })
    expect(upgradeBtn).toBeInTheDocument()

    fireEvent.click(upgradeBtn)
    expect(pushStateSpy).toHaveBeenCalledWith({}, '', '/#pricing')
  })

  it('calls onUpgrade callback when provided', () => {
    useStore.setState({
      quota: {
        tier: 'free',
        used: 1,
        limit: 3,
        remaining: 2,
      },
    })

    const onUpgrade = vi.fn()
    render(<QuotaIndicator onUpgrade={onUpgrade} />)

    const upgradeBtn = screen.getByRole('button', { name: 'Upgrade' })
    fireEvent.click(upgradeBtn)
    expect(onUpgrade).toHaveBeenCalled()
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
    expect(screen.getByText('Enterprise: Active FUP')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Upgrade' })).not.toBeInTheDocument()
  })
})
