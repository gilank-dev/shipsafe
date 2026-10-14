import { useEffect, useRef, useState } from 'react'
import { getTurnstileSiteKey, isTurnstileEnabled } from '../../config/turnstile'
import { useStore } from '../../state/store'
import { IconRefresh, IconCloudflare } from './icons'

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

function loadTurnstileScript(forceReload = false): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.turnstile && !forceReload) return Promise.resolve()

  const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
  if (existing) {
    if (forceReload) {
      existing.remove()
    } else {
      if (window.turnstile) return Promise.resolve()
      return new Promise((resolve, reject) => {
        existing.addEventListener('load', () => resolve(), { once: true })
        existing.addEventListener(
          'error',
          () => {
            existing.remove()
            reject(new Error('Cloudflare Turnstile script failed to load (offline or adblocker).'))
          },
          { once: true },
        )
      })
    }
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.src = SCRIPT_URL
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => {
      script.remove()
      reject(new Error('Cloudflare Turnstile script failed to load (offline or adblocker).'))
    }
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
  const storeToken = useStore((s) => s.submission.turnstileToken)
  const setTurnstileToken = useStore((s) => s.setTurnstileToken)
  const theme = useStore((s) => s.theme)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isVerified, setIsVerified] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  const enabled = isTurnstileEnabled()
  const sitekey = propSitekey || getTurnstileSiteKey()
  const isDev = !import.meta.env.PROD
  const isInvisibleDummy = sitekey === '1x00000000000000000000AA'

  // Synchronize with external store token resets (resetAll, cancelAudit, captcha_failed)
  useEffect(() => {
    if (!storeToken && isVerified) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsVerified(false)
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.reset(widgetIdRef.current)
        } catch {
          // ignore
        }
      }
    }
  }, [storeToken, isVerified])

  useEffect(() => {
    // If Turnstile is bypassed or disabled in test/env mode
    if (!enabled) {
      setTurnstileToken('test-token')
      onSuccess?.('test-token')
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsVerified(true)
      return
    }

    let isMounted = true
    setLoadError(null)

    loadTurnstileScript(reloadKey > 0)
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
            appearance: isInvisibleDummy ? 'interaction-only' : 'always',
            size: 'normal',
            callback: (token: string) => {
              if (!isMounted) return
              setIsVerified(true)
              setLoadError(null)
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
          onError?.(message)
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
  }, [enabled, sitekey, theme, reloadKey, setTurnstileToken, onSuccess, onError, onExpire])

  const handleRetry = () => {
    setLoadError(null)
    setReloadKey((k) => k + 1)
  }

  const handleDevBypass = () => {
    setLoadError(null)
    setIsVerified(true)
    setTurnstileToken('dev-bypass-token')
    onSuccess?.('dev-bypass-token')
  }

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
      <div className="flex items-center gap-1.5 mb-2 text-xs font-mono uppercase tracking-wider text-ink-2">
        <IconCloudflare width={16} height={16} />
        <span>Cloudflare Turnstile Verification</span>
      </div>

      <div className="w-full max-w-full overflow-hidden flex justify-center">
        <div
          ref={containerRef}
          className={isInvisibleDummy ? 'h-0 overflow-hidden' : 'min-h-[65px] flex items-center justify-center'}
        />
      </div>

      {loadError && (
        <div className="mt-2 space-y-2 border border-status-fail bg-surface p-2.5 text-small text-status-fail" role="alert">
          <p>{loadError}</p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              className="btn btn-quiet text-xs flex items-center gap-1 cursor-pointer"
              onClick={handleRetry}
            >
              <IconRefresh />
              Coba Muat Ulang
            </button>
            {isDev && (
              <button
                type="button"
                className="btn text-xs text-ink-2 hover:text-ink cursor-pointer"
                onClick={handleDevBypass}
              >
                Bypass CAPTCHA (Development Mode)
              </button>
            )}
          </div>
        </div>
      )}

      {isVerified && (
        <div className="mt-1 flex items-center justify-between gap-3 py-2 px-3 border border-rule bg-surface rounded-[var(--radius-control)]">
          <div className="flex items-center gap-2.5 min-w-0">
            <IconCloudflare width={20} height={20} className="shrink-0" />
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-mono">
              <span className="text-ink-2">Cloudflare Turnstile:</span>
              <span className="font-semibold text-status-pass flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-status-pass" aria-hidden="true" />
                Human Verified
              </span>
            </div>
          </div>
          <span className="text-[11px] font-mono text-ink-3 shrink-0">Edge Protected</span>
          <span className="sr-only">Verified by Cloudflare Turnstile</span>
        </div>
      )}
    </div>
  )
}

