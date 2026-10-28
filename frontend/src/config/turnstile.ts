// Cloudflare Turnstile Sitekey default test fallback (always passes in non-production)
export const DEFAULT_TURNSTILE_SITE_KEY = '1x00000000000000000000BB'

/**
 * Returns the configured Cloudflare Turnstile Sitekey.
 * Reads from VITE_CLOUDFLARE_TURNSTILE_SITE_KEY.
 * If unset in production, logs a loud error.
 */
export function getTurnstileSiteKey(): string {
  const configured = import.meta.env.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY
  if (configured) {
    return configured
  }

  const isProd = import.meta.env.PROD === true || import.meta.env.MODE === 'production'
  if (isProd) {
    console.error('[ShipSafe] Missing VITE_CLOUDFLARE_TURNSTILE_SITE_KEY environment variable in production.')
  }

  return DEFAULT_TURNSTILE_SITE_KEY
}

/**
 * Determines whether Turnstile enforcement is active.
 * Bypassed when VITE_TURNSTILE_ENABLED is explicitly 'false' or in test environment.
 */
export function isTurnstileEnabled(): boolean {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    if (import.meta.env.VITE_TURNSTILE_ENABLED === 'false') {
      return false
    }
    if (import.meta.env.MODE === 'test') {
      return false
    }
  }
  return true
}
