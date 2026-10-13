import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { TurnstileWidget } from './TurnstileWidget'
import { useStore } from '../../state/store'
import * as turnstileConfig from '../../config/turnstile'

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

    let capturedOptions: any = null
    window.turnstile = {
      render: vi.fn((_container, options) => {
        capturedOptions = options
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
    capturedOptions['expired-callback']()
    expect(useStore.getState().submission.turnstileToken).toBeNull()
    expect(onExpire).toHaveBeenCalled()

    // Simulate error
    capturedOptions['error-callback']('internal_error')
    expect(useStore.getState().submission.turnstileToken).toBeNull()
    expect(onError).toHaveBeenCalledWith('Turnstile challenge error: internal_error')
  })
})
