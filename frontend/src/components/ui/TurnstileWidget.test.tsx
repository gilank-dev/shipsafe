import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { TurnstileWidget } from './TurnstileWidget'
import { useStore } from '../../state/store'
import * as turnstileConfig from '../../config/turnstile'

interface MockTurnstileOptions {
  sitekey?: string
  callback: (token: string) => void
  'expired-callback': () => void
  'error-callback': (err: unknown) => void
  theme?: string
  action?: string
}

describe('TurnstileWidget', () => {
  beforeEach(() => {
    useStore.getState().setTurnstileToken(null)
    delete window.turnstile
    document.getElementById('cf-turnstile-script')?.remove()
  })

  it('automatically verifies with test-token when bypassed/test mode', () => {
    const onSuccess = vi.fn()
    render(<TurnstileWidget onSuccess={onSuccess} />)

    expect(screen.getByTestId('turnstile-widget')).toBeInTheDocument()
    expect(screen.getByText(/Bot protection verified/i)).toBeInTheDocument()
    expect(onSuccess).toHaveBeenCalledWith('test-token')
    expect(useStore.getState().submission.turnstileToken).toBe('test-token')
  })

  it('renders turnstile container and binds callbacks when enabled', async () => {
    vi.spyOn(turnstileConfig, 'isTurnstileEnabled').mockReturnValue(true)

    let capturedOptions!: MockTurnstileOptions
    window.turnstile = {
      render: vi.fn((_container, options) => {
        capturedOptions = options as unknown as MockTurnstileOptions
        return 'widget-123'
      }),
      reset: vi.fn(),
      remove: vi.fn(),
    }

    const onSuccess = vi.fn()
    const onExpire = vi.fn()
    const onError = vi.fn()

    render(
      <TurnstileWidget
        sitekey="custom-sitekey-abc"
        onSuccess={onSuccess}
        onExpire={onExpire}
        onError={onError}
      />
    )

    await waitFor(() => {
      expect(window.turnstile?.render).toHaveBeenCalled()
    })

    expect(capturedOptions.sitekey).toBe('custom-sitekey-abc')

    // Simulate successful challenge
    capturedOptions.callback('verified-turnstile-token')
    expect(useStore.getState().submission.turnstileToken).toBe('verified-turnstile-token')
    expect(onSuccess).toHaveBeenCalledWith('verified-turnstile-token')

    // Simulate token expiration
    capturedOptions['expired-callback']?.()
    expect(useStore.getState().submission.turnstileToken).toBeNull()
    expect(onExpire).toHaveBeenCalled()

    // Simulate error
    capturedOptions['error-callback']?.('internal_error')
    expect(useStore.getState().submission.turnstileToken).toBeNull()
    expect(onError).toHaveBeenCalledWith('Turnstile challenge error: internal_error')
  })

  it('resets widget and verification when store turnstileToken is cleared', async () => {
    vi.spyOn(turnstileConfig, 'isTurnstileEnabled').mockReturnValue(true)

    let capturedOptions!: MockTurnstileOptions
    const resetMock = vi.fn()
    window.turnstile = {
      render: vi.fn((_container, options) => {
        capturedOptions = options as unknown as MockTurnstileOptions
        return 'widget-456'
      }),
      reset: resetMock,
      remove: vi.fn(),
    }

    render(<TurnstileWidget />)

    await waitFor(() => {
      expect(window.turnstile?.render).toHaveBeenCalled()
    })

    // Verify token initially
    capturedOptions.callback('initial-token')
    await waitFor(() => {
      expect(useStore.getState().submission.turnstileToken).toBe('initial-token')
      expect(screen.getByText(/Verified by Cloudflare Turnstile/i)).toBeInTheDocument()
    })

    // Simulate resetAll or cancelAudit clearing the store token
    useStore.getState().setTurnstileToken(null)

    await waitFor(() => {
      expect(resetMock).toHaveBeenCalledWith('widget-456')
      expect(screen.queryByText(/Verified by Cloudflare Turnstile/i)).not.toBeInTheDocument()
    })
  })

  it('displays friendly error message and development bypass button when script fails to load', async () => {
    vi.spyOn(turnstileConfig, 'isTurnstileEnabled').mockReturnValue(true)
    const onError = vi.fn()

    render(<TurnstileWidget onError={onError} />)

    // In jsdom, the appended script element has an onerror handler
    const script = document.getElementById('cf-turnstile-script') as HTMLScriptElement
    expect(script).toBeTruthy()

    // Trigger error event (simulating adblocker or offline)
    if (script?.onerror) {
      script.onerror('error' as unknown as Event)
    }

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    expect(screen.getByText(/Gagal memuat Cloudflare Turnstile|offline or adblocker/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Coba Muat Ulang/i })).toBeInTheDocument()

    // In non-production mode, development bypass button is available
    const bypassBtn = screen.getByRole('button', { name: /Bypass CAPTCHA \(Development Mode\)/i })
    expect(bypassBtn).toBeInTheDocument()

    fireEvent.click(bypassBtn)

    expect(useStore.getState().submission.turnstileToken).toBe('dev-bypass-token')
    expect(screen.getByText(/Verified by Cloudflare Turnstile/i)).toBeInTheDocument()
  })

  it('hides and disables bypass buttons when in production mode', async () => {
    vi.spyOn(turnstileConfig, 'isTurnstileEnabled').mockReturnValue(true)
    vi.stubEnv('MODE', 'production')

    render(<TurnstileWidget />)

    // Verify "Kendala CAPTCHA? Lewati" is not rendered in production
    expect(screen.queryByRole('button', { name: /Kendala CAPTCHA\? Lewati/i })).not.toBeInTheDocument()

    // Simulate script load failure
    const script = document.getElementById('cf-turnstile-script') as HTMLScriptElement
    if (script?.onerror) {
      script.onerror('error' as unknown as Event)
    }

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    // Retry button is available
    expect(screen.getByRole('button', { name: /Coba Muat Ulang/i })).toBeInTheDocument()

    // Both bypass buttons must be hidden in production
    expect(screen.queryByRole('button', { name: /Bypass CAPTCHA \(Development Mode\)/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Verifikasi Manual \/ Lewati CAPTCHA/i })).not.toBeInTheDocument()
  })
})
