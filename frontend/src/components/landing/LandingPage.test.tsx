import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LandingPage } from './LandingPage'

describe('LandingPage', () => {
  it('renders Customs Desk branding, hero section, and launch button', () => {
    const onLaunch = vi.fn()
    render(<LandingPage onLaunchConsole={onLaunch} />)

    const brandingElements = screen.getAllByText(/ShipSafe/i)
    expect(brandingElements.length).toBeGreaterThan(0)
    expect(screen.getByText(/\/\/ CUSTOMS DESK/i)).toBeInTheDocument()
    expect(screen.getByText(/The Customs Desk for/i)).toBeInTheDocument()
    expect(screen.getByText(/Vibe-Coded Web Apps/i)).toBeInTheDocument()

    const launchButtons = screen.getAllByRole('button', { name: /Launch Console/i })
    expect(launchButtons.length).toBeGreaterThan(0)
    expect(launchButtons[0]).toBeDefined()
    fireEvent.click(launchButtons[0]!)
    expect(onLaunch).toHaveBeenCalledTimes(1)
  })

  it('renders 10 threat vectors and radical transparency boundaries', () => {
    render(<LandingPage onLaunchConsole={vi.fn()} />)

    expect(screen.getByText(/10 Critical Threat Vectors Audited/i)).toBeInTheDocument()
    expect(screen.getByText(/SQL Injection/i)).toBeInTheDocument()
    expect(screen.getByText(/Cross-Site Scripting \(XSS\)/i)).toBeInTheDocument()
    expect(screen.getByText(/DDoS & ReDoS/i)).toBeInTheDocument()
    expect(screen.getByText(/WHAT SHIPSAFE DOES NOT DO/i)).toBeInTheDocument()
    expect(screen.getByText(/10MB Archive Upper Limit/i)).toBeInTheDocument()
  })

  it('renders admin direct contact links for WhatsApp and Telegram', () => {
    render(<LandingPage onLaunchConsole={vi.fn()} />)

    const waLink = screen.getByRole('link', { name: /Talk on WhatsApp/i })
    expect(waLink).toHaveAttribute('href', expect.stringContaining('https://wa.me/'))

    const tgLink = screen.getByRole('link', { name: /Talk on Telegram/i })
    expect(tgLink).toHaveAttribute('href', expect.stringContaining('https://t.me/'))
  })

  it('toggles interactive FAQ accordion', () => {
    render(<LandingPage onLaunchConsole={vi.fn()} />)

    const faqButton = screen.getByRole('button', { name: /How does ShipSafe differ from legacy scanners/i })
    expect(faqButton).toBeInTheDocument()

    // First FAQ is open by default
    expect(screen.getByText(/Traditional tools are built for slow, enterprise waterfall cycles/i)).toBeInTheDocument()

    // Click to close
    fireEvent.click(faqButton)
    expect(screen.queryByText(/Traditional tools are built for slow, enterprise waterfall cycles/i)).not.toBeInTheDocument()

    // Click to re-open
    fireEvent.click(faqButton)
    expect(screen.getByText(/Traditional tools are built for slow, enterprise waterfall cycles/i)).toBeInTheDocument()
  })

  it('renders Login / Daftar button and triggers auth modal', () => {
    render(<LandingPage onLaunchConsole={vi.fn()} />)

    const loginButton = screen.getByRole('button', { name: /Login \/ Daftar/i })
    expect(loginButton).toBeInTheDocument()
    fireEvent.click(loginButton)
  })

  it('renders primary pillar buttons (Console, MCP, CLI) and dedicated sections with pricing removed', () => {
    const onLaunch = vi.fn()
    render(<LandingPage onLaunchConsole={onLaunch} />)

    // Navbar & action dock pillar buttons
    const consoleButtons = screen.getAllByRole('button', { name: /Console/i })
    expect(consoleButtons.length).toBeGreaterThan(0)

    const mcpLinks = screen.getAllByRole('link', { name: /MCP/i })
    expect(mcpLinks.length).toBeGreaterThan(0)

    const cliLinks = screen.getAllByRole('link', { name: /CLI/i })
    expect(cliLinks.length).toBeGreaterThan(0)

    // Verify pricing is completely removed
    const pricingLinks = screen.queryAllByRole('link', { name: /Pricing/i })
    expect(pricingLinks.length).toBe(0)
    expect(screen.queryByText(/Developer-First Pricing/i)).not.toBeInTheDocument()

    // Dedicated showcase sections
    expect(screen.getByText(/Autonomous AI Agent Security Bridge/i)).toBeInTheDocument()
    expect(screen.getByText(/ShipSafe Terminal CLI & Git Hook/i)).toBeInTheDocument()
    expect(screen.getByText(/audit_codebase/i)).toBeInTheDocument()
    expect(screen.getByText(/node cli\/scripts\/install-hook.js --install/i)).toBeInTheDocument()
  })
})
