import { Router } from 'express'
import { requireClerkAuth, AuthRequest } from './auth-guard'
import { requireSuperAdmin } from './super-admin'
import {
  getLiveTelemetry,
  flushStuckQueue,
  listAdminUsers,
  updateAdminUserTier,
  updateAdminUserQuota,
  resetAdminUserUsage,
  toggleAdminUserStatus,
  deleteAdminUser,
  listAdminVouchers,
  generateVoucher,
  revokeVoucher,
  redeemVoucherUser,
  listScanTelemetry,
  deleteScanRecord,
  clearAllScanTelemetry,
  listAdminAuditLogs,
  clearAllAuditLogs,
  getUserSyncProfile,
  getIntakeStatus,
  toggleIntakeStatus,
  listAdminOrganizations,
  provisionOrganization,
  updateOrganizationSeats,
  addOrganizationMember,
  removeOrganizationMember,
  listCliTokens,
  revokeCliToken,
} from './admin-controller'
import type { Request, Response, NextFunction } from 'express'

export interface AdminRouterOptions {
  /**
   * 'production' enforces token-verified identity end to end.
   * 'test' swaps in the supplied authMiddleware stub so vitest can simulate
   * verified sessions without contacting Supabase.
   */
  authMode?: 'production' | 'test'
}

type AuthRequestHandler = (req: Request, res: Response, next: NextFunction) => void | Promise<void>

// Production auth middleware: every identity MUST come from a verified
// Supabase/CLI token. No headers are trusted for identity.
export async function verifyJwtAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  await requireClerkAuth(req as AuthRequest, res, next)
}

/**
 * Builds the full ShipSafe admin + user API router mounted under /api.
 *
 * Identity chain (production):
 *   1. verifyJwtAuth      -> req.user from verified CLI/API/Supabase token (401 otherwise)
 *   2. requireSuperAdmin  -> req.user.email must be in OWNER whitelist (403 otherwise)
 *
 * Voucher redemption and /user/sync are available to any verified session,
 * but the account acted upon is ALWAYS the token's own email in production.
 */
export function buildAdminRouter(
  authMiddleware: AuthRequestHandler = verifyJwtAuth,
  options: AdminRouterOptions = {}
): Router {
  const router = Router()
  const isTestMode = options.authMode === 'test'

  // Layer 1: verified session for the entire router surface.
  router.use(authMiddleware)

  const resolveActor = (req: Request): string => {
    const user = (req as AuthRequest).user
    if (user?.email && typeof user.email === 'string') {
      return user.email.toLowerCase().trim()
    }
    return isTestMode ? 'admin@shipsafe.dev' : ''
  }

  // ---------------------------------------------------------------------------
  // /api/admin/* — Super Admin only
  // ---------------------------------------------------------------------------

  router.get('/admin/telemetry', requireSuperAdmin, async (_req: Request, res: Response) => {
    const telemetry = await getLiveTelemetry()
    res.json(telemetry)
  })

  router.post('/admin/queue/flush', requireSuperAdmin, (_req: Request, res: Response) => {
    const result = flushStuckQueue()
    res.json(result)
  })

  router.post('/admin/intake/toggle', requireSuperAdmin, (_req: Request, res: Response) => {
    const nextState = toggleIntakeStatus()
    res.json({ isOpen: nextState, status: nextState ? '[INTAKE: OPEN]' : '[INTAKE: PAUSED]' })
  })

  router.get('/admin/intake/status', requireSuperAdmin, (_req: Request, res: Response) => {
    res.json({ isOpen: getIntakeStatus(), display: getIntakeStatus() ? '[INTAKE: OPEN]' : '[INTAKE: PAUSED]' })
  })

  router.get('/admin/users', requireSuperAdmin, async (req: Request, res: Response) => {
    const search = typeof req.query.search === 'string' ? req.query.search : ''
    const filter = typeof req.query.filter === 'string' ? req.query.filter : 'ALL'
    const users = await listAdminUsers(search, filter)
    res.json({ users })
  })

  router.post('/admin/users/:id/tier', requireSuperAdmin, async (req: Request, res: Response) => {
    const { id } = req.params
    const { tier } = req.body
    const result = await updateAdminUserTier(id, tier, resolveActor(req))
    res.status(result.success ? 200 : 400).json(result)
  })

  router.post('/admin/users/:id/quota', requireSuperAdmin, async (req: Request, res: Response) => {
    const { id } = req.params
    const { customQuotaLimit } = req.body
    const result = await updateAdminUserQuota(id, customQuotaLimit ?? null, resolveActor(req))
    res.status(result.success ? 200 : 400).json(result)
  })

  router.post('/admin/users/:id/reset', requireSuperAdmin, async (req: Request, res: Response) => {
    const { id } = req.params
    const result = await resetAdminUserUsage(id, resolveActor(req))
    res.status(result.success ? 200 : 400).json(result)
  })

  router.post('/admin/users/:id/status', requireSuperAdmin, async (req: Request, res: Response) => {
    const { id } = req.params
    const result = await toggleAdminUserStatus(id, resolveActor(req))
    res.status(result.success ? 200 : 400).json(result)
  })

  router.delete('/admin/users/:id', requireSuperAdmin, async (req: Request, res: Response) => {
    const result = await deleteAdminUser(req.params.id, resolveActor(req))
    res.status(result.success ? 200 : 400).json(result)
  })

  router.get('/admin/vouchers', requireSuperAdmin, (_req: Request, res: Response) => {
    res.json({ vouchers: listAdminVouchers() })
  })

  router.post('/admin/vouchers', requireSuperAdmin, (req: Request, res: Response) => {
    const { grantType, maxUses, expirationDays, bonusAudits } = req.body
    const result = generateVoucher(grantType, maxUses, expirationDays, bonusAudits, resolveActor(req))
    res.status(result.success ? 201 : 400).json(result)
  })

  router.delete('/admin/vouchers/:code', requireSuperAdmin, (req: Request, res: Response) => {
    const result = revokeVoucher(req.params.code, resolveActor(req))
    res.status(result.success ? 200 : 400).json(result)
  })

  router.get('/admin/telemetry-logs', requireSuperAdmin, (_req: Request, res: Response) => {
    res.json({ logs: listScanTelemetry() })
  })

  router.delete('/admin/telemetry-logs/:id', requireSuperAdmin, async (req: Request, res: Response) => {
    const result = await deleteScanRecord(req.params.id, resolveActor(req))
    res.json(result)
  })

  router.delete('/admin/telemetry-logs', requireSuperAdmin, (req: Request, res: Response) => {
    const result = clearAllScanTelemetry(resolveActor(req))
    res.json(result)
  })

  router.delete('/admin/audit-logs', requireSuperAdmin, (req: Request, res: Response) => {
    const result = clearAllAuditLogs(resolveActor(req))
    res.json(result)
  })

  // Organizations & seats
  router.get('/admin/organizations', requireSuperAdmin, (_req: Request, res: Response) => {
    res.json({ orgs: listAdminOrganizations() })
  })

  router.post('/admin/organizations', requireSuperAdmin, (req: Request, res: Response) => {
    const { name, ownerEmail, maxSeats, whitelabelHeader } = req.body || {}
    const result = provisionOrganization(name, ownerEmail, maxSeats, whitelabelHeader ?? null, resolveActor(req))
    res.status(result.success ? 201 : 400).json(result)
  })

  router.patch('/admin/organizations/:orgId/seats', requireSuperAdmin, (req: Request, res: Response) => {
    const { maxSeats } = req.body || {}
    const result = updateOrganizationSeats(req.params.orgId, Number(maxSeats), resolveActor(req))
    res.status(result.success ? 200 : 400).json(result)
  })

  router.post('/admin/organizations/:orgId/members', requireSuperAdmin, (req: Request, res: Response) => {
    const { email } = req.body || {}
    const result = addOrganizationMember(req.params.orgId, email, resolveActor(req))
    res.status(result.success ? 200 : 400).json(result)
  })

  router.delete('/admin/organizations/:orgId/members/:memberEmail', requireSuperAdmin, (req: Request, res: Response) => {
    const result = removeOrganizationMember(req.params.orgId, req.params.memberEmail, resolveActor(req))
    res.status(result.success ? 200 : 400).json(result)
  })

  // CLI token ledger
  router.get('/admin/cli-tokens', requireSuperAdmin, (_req: Request, res: Response) => {
    res.json({ tokens: listCliTokens() })
  })

  router.delete('/admin/cli-tokens/:id', requireSuperAdmin, (req: Request, res: Response) => {
    const result = revokeCliToken(req.params.id, resolveActor(req))
    res.status(result.success ? 200 : 400).json(result)
  })

  // ---------------------------------------------------------------------------
  // /api/vouchers/redeem — any VERIFIED session, account = token's own email.
  // In test mode the body email is honored to preserve legacy test semantics.
  // ---------------------------------------------------------------------------

  router.post('/vouchers/redeem', (req: Request, res: Response) => {
    const user = (req as AuthRequest).user
    let email = ''
    if (user?.email && typeof user.email === 'string') {
      email = user.email.toLowerCase().trim()
    } else if (isTestMode && typeof req.body?.email === 'string') {
      email = req.body.email
    }

    if (!email) {
      res.status(401).json({
        success: false,
        message: 'Sign in with GitHub or Google to redeem vouchers on your own account.',
      })
      return
    }

    const { code } = req.body || {}
    if (!code || typeof code !== 'string') {
      res.status(400).json({ success: false, message: 'Voucher code is required.' })
      return
    }

    const result = redeemVoucherUser(code, email)
    res.status(result.success ? 200 : 400).json(result)
  })

  // ---------------------------------------------------------------------------
  // /api/user/sync — profile + quota for the VERIFIED session.
  // ---------------------------------------------------------------------------

  router.get('/user/sync', (req: Request, res: Response) => {
    const user = (req as AuthRequest).user
    let candidateEmail: string | undefined = user?.email || undefined
    if (!candidateEmail && isTestMode && typeof req.query.email === 'string') {
      candidateEmail = req.query.email
    }

    void (async () => {
      const payload = await getUserSyncProfile(candidateEmail)
      res.json(payload)
    })()
  })

  return router
}
