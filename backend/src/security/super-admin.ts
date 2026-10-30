import type { Request, Response, NextFunction } from 'express'

/**
 * ShipSafe v4.0 Super Admin & Owner Whitelist Configuration (Backend)
 * 
 * STRICT 3-LAYER OWNER EMAIL WHITELIST (INVISIBLE TO PUBLIC):
 * Only the emails explicitly enumerated in this whitelist may access
 * the /api/admin/* endpoints.
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

export interface AuthenticatedUser {
  id: string
  email?: string
  tier?: 'free' | 'pro' | 'enterprise'
  isSuperAdmin?: boolean
  accountStatus?: 'active' | 'suspended'
}

declare global {
  namespace Express {
    interface Request {
      adminUser?: AuthenticatedUser
    }
  }
}

/**
 * Middleware: requireSuperAdmin
 * Verifies that the requester possesses an authorized token and their
 * email is verified within SUPER_ADMIN_EMAIL_WHITELIST.
 */
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  const user = (req as unknown as { user?: AuthenticatedUser }).user
  // Identity comes ONLY from the verified session (verified JWT / CLI token).
  // The x-admin-email / x-user-email request headers are attacker-controlled
  // and were previously trusted as admin clearance — removed.
  const candidateEmail = user?.email

  if (!candidateEmail || !isSuperAdminEmail(candidateEmail)) {
    res.status(403).json({
      error: 'FORBIDDEN',
      code: 'ADMIN_CLEARANCE_REQUIRED',
      message: 'Access denied: Super Admin cryptographic clearance required.',
    })
    return
  }

  req.adminUser = {
    id: user?.id || 'admin-root',
    email: candidateEmail.toLowerCase().trim(),
    tier: 'enterprise',
    isSuperAdmin: true,
    accountStatus: 'active',
  }

  next()
}
