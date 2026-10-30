import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PricingSection } from './PricingSection'

describe('PricingSection Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders exact English copywriting for section header and 3 tiers', () => {
    render(<PricingSection />)

    // Section Header
    expect(screen.getByText('Developer Security for the Price of a Coffee')).toBeInTheDocument()
    expect(
      screen.getByText('Ship code to production with complete peace of mind. Choose the plan tailored to your release velocity.')
    ).toBeInTheDocument()

    // Tier 1: Free (Sandbox)
    expect(screen.getByText('Free (Sandbox)')).toBeInTheDocument()
    expect(screen.getByText('Rp 0')).toBeInTheDocument()
    expect(
      screen.getByText('Ideal for verifying side-project security before your first production launch.')
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start Free Scan' })).toBeInTheDocument()

    // Tier 2: Pro (Indie / Vibe Coder)
    expect(screen.getByText('Pro (Indie / Vibe Coder)')).toBeInTheDocument()
    expect(screen.getByText('Most Popular')).toBeInTheDocument()
    expect(screen.getByText('Rp 79.000')).toBeInTheDocument()
    expect(
      screen.getByText('For solo developers and vibe coders shipping apps to production rapidly and securely.')
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Upgrade to Pro' })).toBeInTheDocument()

    // Tier 3: Enterprise (Custom SLA)
    expect(screen.getByText('Enterprise (Custom SLA)')).toBeInTheDocument()
    expect(screen.getByText('Custom')).toBeInTheDocument()
    expect(
      screen.getByText('For large-scale projects requiring dedicated sandboxes and tailored SLAs.')
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Contact Security Team' })).toBeInTheDocument()
  })

  it('opens Enterprise Lead Qualification Modal and submits structured WhatsApp inquiry', () => {
    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    render(<PricingSection />)

    // Click Contact Security Team
    const enterpriseBtn = screen.getByRole('button', { name: 'Contact Security Team' })
    fireEvent.click(enterpriseBtn)

    // Modal should appear
    expect(screen.getByText('Enterprise Security Consultation')).toBeInTheDocument()
    expect(screen.getByLabelText('Company / Project Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Estimated Deployment / Scan Volume per Month')).toBeInTheDocument()

    // Fill Form
    const companyInput = screen.getByLabelText('Company / Project Name')
    fireEvent.change(companyInput, { target: { value: 'Acme Security Tech' } })

    const volumeSelect = screen.getByLabelText('Estimated Deployment / Scan Volume per Month')
    fireEvent.change(volumeSelect, { target: { value: '500+' } })

    // Submit Form
    const submitBtn = screen.getByRole('button', { name: /Submit Inquiry via WhatsApp/i })
    fireEvent.click(submitBtn)

    expect(windowOpenSpy).toHaveBeenCalledTimes(1)
    const openedUrl = String(windowOpenSpy.mock.calls[0]?.[0] || '')
    expect(openedUrl).toContain('https://wa.me/6282124153732')
    expect(openedUrl).toContain('Acme%20Security%20Tech')
    expect(openedUrl).toContain('500%2B')
  })
})
