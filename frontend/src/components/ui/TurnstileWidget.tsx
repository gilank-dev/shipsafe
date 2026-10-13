import { useEffect, useRef, useState } from 'react'
import { getTurnstileSiteKey, isTurnstileEnabled } from '../../config/turnstile'
import { useStore } from '../../state/store'

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        options: {
          sitekey: string
          callback?: (token: string) => void
          'error-callback'?: (errorCode?: string) => void
          'expired-callback'?: () => void
          theme?: 'light' | 'dark' | 'auto'
          size?: 'normal' | 'compact' | 'flexible'
          [key: string]: unknown
        },
      ) => string
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
    }
  }
}

const SCRIPT_ID = 'cf-turnstile-script'
const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

function loadTurnstileScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.turnstile) return Promise.resolve()

  const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
  if (existing) {
    if (window.turnstile) return Promise.resolve()
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Cloudflare Turnstile script failed to load.')), { once: true })
    })
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.src = SCRIPT_URL
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Cloudflare Turnstile script failed to load.'))
    document.head.appendChild(script)
  })
}

export interface TurnstileWidgetProps {
  sitekey?: string
  onSuccess?: (token: string) => void
  onError?: (error?: string) => void
  onExpire?: () => void
  className?: string
}

export function TurnstileWidget({
  sitekey: propSitekey,
  onSuccess,
  onError,
  onExpire,
  className = '',
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const setTurnstileToken = useStore((s) => s.setTurnstileToken)
  const theme = useStore((s) => s.theme)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isVerified, setIsVerified] = useState(false)

  const enabled = isTurnstileEnabled()
  const sitekey = propSitekey || getTurnstileSiteKey()

  useEffect(() => {
    // If Turnstile is bypassed or disabled in test/env mode
    if (!enabled) {
      setTurnstileToken('test-token')
      onSuccess?.('test-token')
      setIsVerified(true)
      return
    }

    let isMounted = true

    loadTurnstileScript()
      .then(() => {
        if (!isMounted || !containerRef.current || !window.turnstile) return

        // Clean up previous widget if any
        if (widgetIdRef.current) {
          try {
            window.turnstile.remove(widgetIdRef.current)
          } catch {
            // ignore
          }
          widgetIdRef.current = null
        }

        try {
          const id = window.turnstile.render(containerRef.current, {
            sitekey,
            theme: theme === 'dark' ? 'dark' : 'light',
            callback: (token: string) => {
              if (!isMounted) return
              setIsVerified(true)
              setTurnstileToken(token)
              onSuccess?.(token)
            },
            'error-callback': (code?: string) => {
              if (!isMounted) return
              setIsVerified(false)
              setTurnstileToken(null)
              const msg = code ? `Turnstile challenge error: ${code}` : 'Turnstile challenge failed'
              setLoadError(msg)
              onError?.(msg)
            },
            'expired-callback': () => {
              if (!isMounted) return
              setIsVerified(false)
              setTurnstileToken(null)
              onExpire?.()
            },
          })
          widgetIdRef.current = id
        } catch (err: unknown) {
          if (isMounted) {
            const message = err instanceof Error ? err.message : 'Failed to render Turnstile widget'
            setLoadError(message)
          }
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          const message = err instanceof Error ? err.message : 'Failed to load Cloudflare Turnstile script'
          setLoadError(message)
        }
      })

    return () => {
      isMounted = false
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current)
        } catch {
          // ignore
        }
        widgetIdRef.current = null
      }
    }
  }, [enabled, sitekey, theme, setTurnstileToken, onSuccess, onError, onExpire])

  if (!enabled) {
    return (
      <div
        data-testid="turnstile-widget"
        className={`py-2 text-small font-mono text-ink-2 ${className}`.trim()}
      >
        <span className="inline-flex items-center gap-1.5 rounded bg-surface-2 px-2 py-0.5 text-xs text-pass">
          ✓ Bot protection verified (Test/Bypass Mode)
        </span>
      </div>
    )
  }

  return (
    <div className={`turnstile-container my-3 ${className}`.trim()} data-testid="turnstile-widget">
      <div className="mb-1.5 text-xs font-mono uppercase tracking-wider text-ink-2">
        Security Verification
      </div>
      <div ref={containerRef} className="min-h-[65px]" />
      {loadError && (
        <p className="mt-1 text-small text-fail" role="alert">
          {loadError}
        </p>
      )}
      {isVerified && (
        <p className="mt-1 text-xs font-mono text-pass">
          ✓ Verified by Cloudflare Turnstile
        </p>
      )}
    </div>
  )
}
