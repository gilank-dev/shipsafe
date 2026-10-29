import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PaywallModal } from './PaywallModal'
import { useStore } from '../../state/store'

describe('PaywallModal Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    useStore.setState({ isPaywallModalOpen: false, paywallReason: 'quota' })
  })

  it('renders nothing when closed', () => {
    const { container } = render(<PaywallModal />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders quota exceeded state with reset date and upgrade benefits when opened for quota', () => {
    useStore.setState({
      isPaywallModalOpen: true,
      paywallReason: 'quota',
      quota: {
        tier: 'free',
        used: 3,
        limit: 3,
        remaining: 0,
        resetDate: '2026-11-28T00:00:00Z',
      },
    })

    render(<PaywallModal />)

    expect(screen.getByText('Batas Kuota Audit Bulanan Tercapai')).toBeInTheDocument()
    expect(screen.getByText(/3x audit gratis/i)).toBeInTheDocument()
    expect(screen.getByText(/28 November 2026/i)).toBeInTheDocument()
    expect(screen.getByText('Rp 79.000')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Upgrade ke Pro Sekarang' })).toBeInTheDocument()
  })

  it('renders remediation locked paywall state when triggered from finding #2+', () => {
    useStore.setState({
      isPaywallModalOpen: true,
      paywallReason: 'remediation',
    })

    render(<PaywallModal />)

    expect(screen.getByText('Buka Semua Prompt Perbaikan AI Instan')).toBeInTheDocument()
    expect(
      screen.getByText(/Pada paket Free, prompt perbaikan instan terbuka untuk temuan pertama/i)
    ).toBeInTheDocument()
  })

  it('triggers upgrade WhatsApp URL and closes modal on CTA click', () => {
    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    useStore.setState({ isPaywallModalOpen: true, paywallReason: 'remediation' })

    render(<PaywallModal />)

    const upgradeBtn = screen.getByRole('button', { name: 'Upgrade ke Pro Sekarang' })
    fireEvent.click(upgradeBtn)

    expect(windowOpenSpy).toHaveBeenCalledTimes(1)
    expect(String(windowOpenSpy.mock.calls[0]?.[0])).toContain('https://wa.me/6282124153732')
    expect(useStore.getState().isPaywallModalOpen).toBe(false)
  })

  it('closes modal when Escape key is pressed', () => {
    useStore.setState({ isPaywallModalOpen: true })
    render(<PaywallModal />)

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(useStore.getState().isPaywallModalOpen).toBe(false)
  })
})
