/**
 * ShipSafe v4.0 Super Admin & Owner Whitelist Configuration
 * 
 * STRICT 3-LAYER OWNER EMAIL WHITELIST (INVISIBLE TO PUBLIC):
 * Only the emails explicitly enumerated in this whitelist may access
 * the Admin Ledger, administrative endpoints, and [CLEARANCE: SUPER ADMIN] stamps.
 */

export const SUPER_ADMIN_EMAIL_WHITELIST = new Set([
  'hi@lankdev.my.id',
  'gilankdev@gmail.com',
  'ghilankputraramadhan@gmail.com',
])

/**
 * Validates whether an email has Super Admin clearance.
 * Performs case-insensitive, whitespace-trimmed comparison.
 */
export function isSuperAdminEmail(email?: string | null): boolean {
  if (!email || typeof email !== 'string') return false
  return SUPER_ADMIN_EMAIL_WHITELIST.has(email.trim().toLowerCase())
}
