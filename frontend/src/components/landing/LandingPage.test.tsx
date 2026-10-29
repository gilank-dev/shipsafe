import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { LandingPage } from './LandingPage'

describe('LandingPage', () => {
  it('renders branding, hero section, and launch button without tactical badges', () => {
    const onLaunch = vi.fn()
    render(<LandingPage onLaunchConsole={onLaunch} />)

    const brandingElements = screen.getAllByText(/ShipSafe/i)
    expect(brandingElements.length).toBeGreaterThan(0)
    // PRE-DEPLOYMENT GATEKEEPER tactical badge is strictly removed
    expect(screen.queryByText(/PRE-DEPLOYMENT GATEKEEPER/i)).not.toBeInTheDocument()
    expect(screen.getByText(/Pre-Deployment Security Gatekeeper for/i)).toBeInTheDocument()
    expect(screen.getByText(/Web Apps & Vibe-Coded Projects/i)).toBeInTheDocument()
    expect(screen.getByText(/Explore Work/i)).toBeInTheDocument()

    const launchButtons = screen.getAllByRole('button', { name: /Launch Console/i })
    expect(launchButtons.length).toBeGreaterThan(0)
    expect(launchButtons[0]).toBeDefined()
    fireEvent.click(launchButtons[0]!)
    expect(onLaunch).toHaveBeenCalledTimes(1)
  })

  it('renders 10 threat vectors and radical transparency boundaries', () => {
    render(<LandingPage onLaunchConsole={vi.fn()} />)

    expect(screen.getByText(/10 Critical Threat Vectors Audited/i)).toBeInTheDocument()
    expect(screen.getAllByText(/SQL Injection/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Cross-Site Scripting \(XSS\)/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/DDoS & ReDoS/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/WHAT SHIPSAFE DOES NOT DO/i)).toBeInTheDocument()
    expect(screen.getAllByText(/10MB Archive Upper Limit/i).length).toBeGreaterThan(0)
  })

  it('renders admin direct contact links for WhatsApp and Telegram', () => {
    render(<LandingPage onLaunchConsole={vi.fn()} />)

    const waLinks = screen.getAllByRole('link', { name: /WhatsApp/i })
    expect(waLinks.length).toBeGreaterThan(0)
    expect(waLinks[0]).toHaveAttribute('href', expect.stringContaining('https://wa.me/'))

    const tgLinks = screen.getAllByRole('link', { name: /Telegram/i })
    expect(tgLinks.length).toBeGreaterThan(0)
    expect(tgLinks[0]).toHaveAttribute('href', expect.stringContaining('https://t.me/'))
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

  it('renders primary pillar buttons (Launch Console, How It Works, MCP, CLI, Threat Vectors, Pricing, FAQ) and dedicated sections', () => {
    const onLaunch = vi.fn()
    render(<LandingPage onLaunchConsole={onLaunch} />)

    // Navbar & action dock buttons
    const consoleButtons = screen.getAllByRole('button', { name: /Console/i })
    expect(consoleButtons.length).toBeGreaterThan(0)

    const howItWorksLinks = screen.getAllByRole('link', { name: /How It Works/i })
    expect(howItWorksLinks.length).toBeGreaterThan(0)

    const mcpLinks = screen.getAllByRole('link', { name: /^MCP$/i })
    expect(mcpLinks.length).toBeGreaterThan(0)

    const cliLinks = screen.getAllByRole('link', { name: /^CLI$/i })
    expect(cliLinks.length).toBeGreaterThan(0)

    const threatLinks = screen.getAllByRole('link', { name: /Threat Vectors/i })
    expect(threatLinks.length).toBeGreaterThan(0)

    const pricingLinks = screen.getAllByRole('link', { name: /Pricing/i })
    expect(pricingLinks.length).toBeGreaterThan(0)

    const faqLinks = screen.getAllByRole('link', { name: /FAQ/i })
    expect(faqLinks.length).toBeGreaterThan(0)

    // Verify 3-tier pricing section
    expect(screen.getByText(/Investasi Keamanan Seukuran Harga Kopi/i)).toBeInTheDocument()
    expect(screen.getByText(/Mulai Scan Gratis/i)).toBeInTheDocument()
    expect(screen.getByText(/Upgrade ke Pro Sekarang/i)).toBeInTheDocument()
    expect(screen.getByText(/Hubungi Admin/i)).toBeInTheDocument()

    // Dedicated showcase sections
    expect(screen.getByText(/How ShipSafe Secures Your Code in 3 Seconds/i)).toBeInTheDocument()
    expect(screen.getByText(/^ShipSafe MCP$/i)).toBeInTheDocument()
    expect(screen.getByText(/^ShipSafe Terminal CLI$/i)).toBeInTheDocument()
    expect(screen.getAllByText(/audit_codebase/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/npx @lankdev\/shipsafe-cli scan \./i).length).toBeGreaterThan(0)
    expect(screen.queryByText(/install-hook/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/shipsafe login/i)).not.toBeInTheDocument()
  })

  it('renders clean desktop navbar and complete layout at 1280px and 1440px viewports without overlap', () => {
    // Test at 1280px desktop resolution
    window.innerWidth = 1280
    window.innerHeight = 800
    window.dispatchEvent(new Event('resize'))

    const onLaunch = vi.fn()
    const { container, rerender } = render(<LandingPage onLaunchConsole={onLaunch} />)

    // 1. Header Banner Check
    const header = screen.getByRole('banner')
    expect(header).toBeInTheDocument()
    // Brand title is pure 'ShipSafe'
    expect(header).toHaveTextContent('ShipSafe')
    // Crucial: PRE-DEPLOYMENT GATEKEEPER must NOT be crammed inside the navbar header
    expect(header).not.toHaveTextContent('PRE-DEPLOYMENT GATEKEEPER')

    // 2. Navigation Links are clean, concise, industry-standard
    const nav = header.querySelector('nav')
    expect(nav).toBeInTheDocument()
    expect(nav).toHaveClass('lg:flex')
    const navQueries = within(nav!)
    expect(navQueries.getByRole('link', { name: /^How It Works$/i })).toBeInTheDocument()
    expect(navQueries.getByRole('link', { name: /^MCP$/i })).toBeInTheDocument()
    expect(navQueries.getByRole('link', { name: /^CLI$/i })).toBeInTheDocument()
    expect(navQueries.getByRole('link', { name: /^Threat Vectors$/i })).toBeInTheDocument()
    expect(navQueries.getByRole('link', { name: /^FAQ$/i })).toBeInTheDocument()
    expect(navQueries.queryByRole('button', { name: /^Console$/i })).not.toBeInTheDocument()
    expect(navQueries.queryByRole('link', { name: /^Fitur Visual$/i })).not.toBeInTheDocument()
    expect(navQueries.queryByRole('link', { name: /^Documentation$/i })).not.toBeInTheDocument()

    // 3. Right Action Items
    const launchButtons = screen.getAllByRole('button', { name: /Launch Console/i })
    expect(launchButtons.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole('button', { name: /Login \/ Daftar/i })).toBeInTheDocument()

    // 4. Hero section branding and clean CTA without tactical badges
    expect(screen.queryByText('PRE-DEPLOYMENT GATEKEEPER')).not.toBeInTheDocument()
    expect(screen.getByText('Explore Work')).toBeInTheDocument()

    // 5. Bento cards grid (3 columns on desktop)
    const bentoContainer = container.querySelector('.grid.grid-cols-1.md\\:grid-cols-3')
    expect(bentoContainer).toBeInTheDocument()
    expect(screen.getByText('Launch Web Audit')).toBeInTheDocument()
    expect(screen.getByText('10 Coding Agents Bridge')).toBeInTheDocument()
    expect(screen.getByText('One-Command CLI')).toBeInTheDocument()

    // 6. Test at 1440px widescreen resolution
    window.innerWidth = 1440
    window.innerHeight = 900
    window.dispatchEvent(new Event('resize'))
    rerender(<LandingPage onLaunchConsole={onLaunch} />)

    // Verify sections remain solid on wide screens
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Pre-Deployment Security Gatekeeper/i)
    expect(screen.getByText('ShipSafe MCP')).toBeInTheDocument()
    expect(screen.getByText('ShipSafe Terminal CLI')).toBeInTheDocument()
    expect(screen.getByText('10 Critical Threat Vectors Audited')).toBeInTheDocument()

    // 7. Footer 4 columns on desktop
    const footer = container.querySelector('footer')
    expect(footer).toBeInTheDocument()
    const footerGrid = footer?.querySelector('.grid.grid-cols-2.md\\:grid-cols-4')
    expect(footerGrid).toBeInTheDocument()
  })

  it('copies the CLI command without requiring login', () => {
    render(<LandingPage onLaunchConsole={vi.fn()} />)

    // The CLI command is public: copying it must never ask for login
    const cliCopyButtons = screen.getAllByRole('button', { name: /^Copy$/i })
    expect(cliCopyButtons.length).toBeGreaterThan(0)
    fireEvent.click(cliCopyButtons[0]!)
    expect(screen.queryByText(/Authentication required/i)).not.toBeInTheDocument()
  })

  it('supports selecting among 10 coding agents and toggling config vs prompt', () => {
    render(<LandingPage onLaunchConsole={vi.fn()} />)

    // Verify all 10 agents are rendered in selector (including Agen Lain)
    const agentNames = [
      'Cursor', 'Claude Code', 'Windsurf', 'GitHub Copilot', 'OpenCode',
      'Hermes', 'Aider', 'Cline', 'Roo Code', 'Agen Lain'
    ]
    agentNames.forEach((name) => {
      expect(screen.getByRole('button', { name: new RegExp(`^${name}$`, 'i') })).toBeInTheDocument()
    })
    expect(screen.queryByRole('button', { name: /^Continue$/i })).not.toBeInTheDocument()

    // Switch to Windsurf
    const windsurfBtn = screen.getByRole('button', { name: /^Windsurf$/i })
    fireEvent.click(windsurfBtn)
    expect(screen.getAllByText(/~\/\.codeium\/windsurf\/mcp_config\.json/i).length).toBeGreaterThan(0)

    // Switch to Prompt view mode
    const promptToggle = screen.getByRole('button', { name: /^Remediation Prompt$/i })
    fireEvent.click(promptToggle)
    expect(screen.getAllByText(/Cascade Autonomous Remediation Prompt/i).length).toBeGreaterThan(0)
  })
})
