// Official Cloudflare Turnstile Sitekey
export const DEFAULT_TURNSTILE_SITE_KEY = '0x4AAAAAAFWIfT5Sj972IRnm'

/**
 * Returns the configured Cloudflare Turnstile Sitekey.
 * Defaults to the production Turnstile Sitekey:
 * 0x4AAAAAAFWIfT5Sj972IRnm
 */
export function getTurnstileSiteKey(): string {
  const configured = import.meta.env.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY
  if (!configured || configured === '1x00000000000000000000AA' || configured === '1x00000000000000000000BB') {
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
