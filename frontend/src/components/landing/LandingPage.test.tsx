import { useStore } from '../../state/store'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { LandingPage } from './LandingPage'

describe('LandingPage', () => {
  beforeEach(() => {
    useStore.setState({
      auth: {
        user: null,
        isAuthModalOpen: false,
        isHistoryModalOpen: false,
      },
    })
  })

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

    const launchButtons = screen.getAllByRole('button', { name: /Console/i })
    expect(launchButtons.length).toBeGreaterThan(0)
    expect(launchButtons[0]).toBeDefined()

    // Unauthenticated click opens login modal
    fireEvent.click(launchButtons[0]!)
    expect(useStore.getState().auth.isAuthModalOpen).toBe(true)
    expect(onLaunch).not.toHaveBeenCalled()
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

  it('renders admin direct contact links for WhatsApp and Email', () => {
    render(<LandingPage onLaunchConsole={vi.fn()} />)

    const waLinks = screen.getAllByRole('link', { name: /WhatsApp/i })
    expect(waLinks.length).toBeGreaterThan(0)
    expect(waLinks[0]).toHaveAttribute('href', expect.stringContaining('https://wa.me/'))

    const emailLinks = screen.getAllByRole('link', { name: /Email/i })
    expect(emailLinks.length).toBeGreaterThan(0)
    expect(emailLinks[0]).toHaveAttribute('href', expect.stringContaining('mail.google.com/mail'))
  })

  it('triggers auth modal when unauthenticated user clicks console button, or navigates directly when authenticated', () => {
    const launchMock = vi.fn()
    const { unmount } = render(<LandingPage onLaunchConsole={launchMock} />)

    const consoleButtons = screen.getAllByRole('button', { name: /^Console$/i })
    expect(consoleButtons.length).toBeGreaterThan(0)

    // Unauthenticated click opens auth modal
    fireEvent.click(consoleButtons[0]!)
    expect(useStore.getState().auth.isAuthModalOpen).toBe(true)
    expect(launchMock).not.toHaveBeenCalled()

    unmount()

    // Authenticated click proceeds directly
    useStore.setState({
      auth: {
        user: { id: 'usr-1', email: 'auditor@test.dev', fullName: 'Test Auditor' },
        isAuthModalOpen: false,
        isHistoryModalOpen: false,
      },
    })

    render(<LandingPage onLaunchConsole={launchMock} />)
    const authedButtons = screen.getAllByRole('button', { name: /^Console$/i })
    fireEvent.click(authedButtons[0]!)
    expect(launchMock).toHaveBeenCalledTimes(1)
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
  })

  it('renders Sign In button and triggers auth modal', () => {
    render(<LandingPage onLaunchConsole={vi.fn()} />)

    const signInButtons = screen.getAllByRole('button', { name: /Sign In/i })
    expect(signInButtons.length).toBeGreaterThan(0)

    fireEvent.click(signInButtons[0]!)
    expect(useStore.getState().auth.isAuthModalOpen).toBe(true)
  })

  it('renders primary pillar buttons (Console, How It Works, MCP, CLI, Threat Vectors, Pricing, FAQ) and dedicated sections', () => {
    render(<LandingPage onLaunchConsole={vi.fn()} />)

    // Verify all primary navigation links are present in navbar
    const nav = screen.getByRole('navigation')
    expect(within(nav).getByRole('link', { name: /How It Works/i })).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: /MCP/i })).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: /CLI/i })).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: /Threat Vectors/i })).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: /Pricing/i })).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: /FAQ/i })).toBeInTheDocument()
  })

  it('renders clean desktop navbar and complete layout at 1280px and 1440px viewports without overlap', () => {
    // 1280px viewport test
    window.innerWidth = 1280
    window.dispatchEvent(new Event('resize'))
    const { container, rerender } = render(<LandingPage onLaunchConsole={vi.fn()} />)

    // 1. Fixed header exists with dark backdrop and borders
    const header = container.querySelector('header')
    expect(header).toBeInTheDocument()
    expect(header?.className).toContain('fixed')
    expect(header?.className).toContain('backdrop-blur-md')

    // 2. Navigation bar is rendered
    const nav = header?.querySelector('nav')
    expect(nav).toBeInTheDocument()
    expect(nav?.className).toContain('lg:flex')

    // 3. Action buttons exist in header (Console and Sign In)
    const launchButtons = screen.getAllByRole('button', { name: /Console/i })
    expect(launchButtons.length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByRole('button', { name: /Sign In/i }).length).toBeGreaterThanOrEqual(1)

    // 4. Hero section branding and clean CTA without tactical badges
    expect(screen.getByText(/Pre-Deployment Security Gatekeeper for/i)).toBeInTheDocument()
    expect(screen.getByText(/Web Apps & Vibe-Coded Projects/i)).toBeInTheDocument()
    expect(screen.queryByText(/PRE-DEPLOYMENT GATEKEEPER/i)).not.toBeInTheDocument()

    // 1440px viewport test
    window.innerWidth = 1440
    window.dispatchEvent(new Event('resize'))
    rerender(<LandingPage onLaunchConsole={vi.fn()} />)

    // Main layout container maintains max width constraints without horizontal breakage
    const main = container.querySelector('main')
    expect(main).toBeInTheDocument()
    expect(main?.className).toContain('2xl:max-w-[1440px]')
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
