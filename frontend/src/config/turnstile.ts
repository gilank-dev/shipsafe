// Official Cloudflare Always-Passes Invisible Sitekey (avoids visible 'For testing only' watermark)
export const DEFAULT_TURNSTILE_SITE_KEY = '1x00000000000000000000BB'

/**
 * Returns the configured Cloudflare Turnstile Sitekey.
 * Defaults to the official Cloudflare Always-Passes Invisible Sitekey:
 * 1x00000000000000000000BB
 */
export function getTurnstileSiteKey(): string {
  const configured = import.meta.env.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY
  if (!configured || configured === '1x00000000000000000000AA') {
    return DEFAULT_TURNSTILE_SITE_KEY
  }
  return configured
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
