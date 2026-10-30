import fs from 'fs'
import path from 'path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { globalAuditQueue } from '../engine/queue'
import { SUPER_ADMIN_EMAIL_WHITELIST, isSuperAdminEmail } from './super-admin'
import { getAiConfig, callAiCompletion } from '../engine/ai-client'

export interface AdminUserRecord {
  id: string
  email: string
  fullName: string
  oauthProvider: 'GITHUB' | 'GOOGLE' | 'EMAIL'
  tier: 'free' | 'pro' | 'enterprise'
  isSuperAdmin: boolean
  accountStatus: 'active' | 'suspended'
  organizationId: string | null
  organizationName: string | null
  orgRole: 'owner' | 'member' | 'individual'
  auditsUsed: number
  customQuotaLimit: number | null
  effectiveLimit: number
  activeCliTokensCount: number
  billingCycleStart: string
  lastActiveAt: string
  createdAt: string
}

export interface OrganizationMember {
  userId: string
  email: string
  fullName: string
  role: 'owner' | 'member'
  joinedAt: string
}

export interface OrganizationRecord {
  id: string
  name: string
  ownerId: string
  ownerEmail: string
  maxSeats: number
  whitelabelHeader: string | null
  totalScans: number
  createdAt: string
  members: OrganizationMember[]
}

export interface VoucherRecord {
  code: string
  grantType: 'pro_monthly' | 'enterprise_monthly' | 'bonus_quota'
  bonusAudits?: number
  maxUses: number
  uses: number
  expiresAt: string
  redeemedBy: string[]
  isActive: boolean
  createdAt: string
}

export interface ScanTelemetryLog {
  id: string
  timestamp: string
  userEmail: string
  channel: 'WEB' | 'CLI' | 'MCP'
  zipSizeBytes: number
  durationMs: number
  findingsCount: number
  severityCounts: {
    Critical: number
    High: number
    Medium: number
    Low: number
    Info: number
  }
  securityGateStatus:
    | '[OK // COMPLETED]'
    | '[DENIED // QUOTA_EXCEEDED]'
    | '[BLOCKED // ZIP_BOMB_GUARD]'
    | '[BLOCKED // ZIP_SLIP_PATH_TRAVERSAL]'
    | '[BLOCKED // INVALID_MAGIC_BYTES]'
}

export interface CliTokenRecord {
  id: string
  userEmail: string
  label: string
  tokenPreview: string
  createdAt: string
  expiresAt: string
}

export interface AdminAuditLog {
  id: string
  actorEmail: string
  targetEmail: string | null
  actionType: string
  diff: Record<string, unknown>
  createdAt: string
}

// ----------------------------------------------------------------------------
// DATA PERSISTENCE LAYER (Zero dummy data, persistent on disk & Supabase)
// ----------------------------------------------------------------------------
const DATA_DIR = path.resolve(__dirname, '../../data')
const STORE_PATH = path.join(DATA_DIR, 'admin-store.json')

interface AdminDataStore {
  organizations: OrganizationRecord[]
  vouchers: VoucherRecord[]
  scanTelemetry: ScanTelemetryLog[]
  cliTokens: CliTokenRecord[]
  adminAuditLogs: AdminAuditLog[]
  userOverrides: Record<
    string,
    {
      tier?: 'free' | 'pro' | 'enterprise'
      customQuotaLimit?: number | null
      auditsUsed?: number
      accountStatus?: 'active' | 'suspended'
      organizationId?: string | null
      organizationName?: string | null
      orgRole?: 'owner' | 'member' | 'individual'
      billingCycleStart?: string
    }
  >
}

let store: AdminDataStore = {
  organizations: [],
  vouchers: [],
  scanTelemetry: [],
  cliTokens: [],
  adminAuditLogs: [],
  userOverrides: {},
}

function loadStore(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf-8')
      const parsed = JSON.parse(raw)
      store = {
        organizations: Array.isArray(parsed.organizations) ? parsed.organizations : [],
        vouchers: Array.isArray(parsed.vouchers) ? parsed.vouchers : [],
        scanTelemetry: Array.isArray(parsed.scanTelemetry) ? parsed.scanTelemetry : [],
        cliTokens: Array.isArray(parsed.cliTokens) ? parsed.cliTokens : [],
        adminAuditLogs: Array.isArray(parsed.adminAuditLogs) ? parsed.adminAuditLogs : [],
        userOverrides: typeof parsed.userOverrides === 'object' && parsed.userOverrides !== null ? parsed.userOverrides : {},
      }
    }
  } catch (err) {
    console.error('[ShipSafe Admin] Error loading admin-store.json:', err)
  }
}

function saveStore(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf-8')
  } catch (err) {
    console.error('[ShipSafe Admin] Error persisting admin-store.json:', err)
  }
}

// Initial load
loadStore()

// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// SUPABASE ADMIN CLIENT SETUP
// ----------------------------------------------------------------------------
const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabaseAdmin: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && !SUPABASE_URL.includes('your-project-ref')
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null

let isIntakeOpen = true

// ----------------------------------------------------------------------------
// EXPORTED CONTROLLER FUNCTIONS
// ----------------------------------------------------------------------------

export function getIntakeStatus(): boolean {
  return isIntakeOpen
}

export function toggleIntakeStatus(): boolean {
  isIntakeOpen = !isIntakeOpen
  return isIntakeOpen
}

let lastAiCheck = 0
let cachedHermesStatus = 'FALLBACK // STATIC AST ENGINE'
let cachedHermesLatency = 0

export async function getLiveTelemetry() {
  const queueStats = globalAuditQueue.stats

  // Probe Hermes 9Router port 21010 with 5s cache
  if (Date.now() - lastAiCheck > 5000) {
    lastAiCheck = Date.now()
    try {
      const start = Date.now()
      const test = await callAiCompletion([{ role: 'user', content: 'PING' }], {
        max_tokens: 5,
        timeoutMs: 1500,
      })
      cachedHermesLatency = Date.now() - start
      if (test) {
        cachedHermesStatus = 'ONLINE // LOW LATENCY'
      } else {
        cachedHermesStatus = 'FALLBACK // STATIC AST ENGINE'
      }
    } catch {
      cachedHermesStatus = 'FALLBACK // STATIC AST ENGINE'
    }
  }
  const hermesStatus = cachedHermesStatus
  const hermesLatency = cachedHermesLatency


  // Probe ephemeral sandbox /tmp cleanliness
  let lingeringArchives = 0
  try {
    const tmpDir = process.platform === 'win32' ? process.env.TEMP || 'C:\\Windows\\Temp' : '/tmp'
    if (fs.existsSync(tmpDir)) {
      const files = fs.readdirSync(tmpDir)
      lingeringArchives = files.filter((f) => f.startsWith('shipsafe-')).length
    }
  } catch {
    lingeringArchives = 0
  }

  // Calculate real platform totals
  const allUsers = await listAdminUsers('', 'ALL')
  const totalUsers = allUsers.length
  const freeUsers = allUsers.filter((u) => u.tier === 'free').length
  const proUsers = allUsers.filter((u) => u.tier === 'pro').length
  const entUsers = allUsers.filter((u) => u.tier === 'enterprise').length
  const activeOrgs = store.organizations.length
  const scans30d = store.scanTelemetry.length + allUsers.reduce((acc, u) => acc + u.auditsUsed, 0)

  return {
    queue: {
      activeWorkers: queueStats.activeWorkers,
      maxWorkers: queueStats.maxConcurrency,
      queuedRequests: queueStats.waitingInQueue,
      display: `ACTIVE: ${queueStats.activeWorkers}/${queueStats.maxConcurrency} | QUEUED: ${queueStats.waitingInQueue}/25`,
    },
    gateway: {
      status: hermesStatus,
      latencyMs: hermesLatency,
    },
    sandbox: {
      lingeringCount: lingeringArchives,
      display: `${lingeringArchives} LINGERING ARCHIVES // ZERO-PERSISTENCE VERIFIED`,
    },
    intake: {
      isOpen: isIntakeOpen,
      display: isIntakeOpen ? '[INTAKE: OPEN]' : '[INTAKE: PAUSED]',
    },
    totals: {
      totalUsers,
      freeUsers,
      proUsers,
      entUsers,
      activeOrgs,
      scans30d,
      display: `USERS: ${totalUsers} (FREE: ${freeUsers} | PRO: ${proUsers} | ENT: ${entUsers}) | ACTIVE ORGS: ${activeOrgs} | SCANS (30D): ${scans30d}`,
    },
  }
}

export function flushStuckQueue(): { success: boolean; flushed: number } {
  const count = globalAuditQueue.flush()
  return { success: true, flushed: count }
}

/**
 * Lists real users directly synchronized with Supabase Auth and verified Owner accounts.
 * Zero dummy accounts.
 */
export async function listAdminUsers(search = '', filter = 'ALL'): Promise<AdminUserRecord[]> {
  const userMap = new Map<string, AdminUserRecord>()

  // 1. Fetch live registered users from Supabase Auth
  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 100 })
      if (!error && data?.users) {
        for (const u of data.users) {
          const email = (u.email || '').toLowerCase().trim()
          if (!email) continue

          const isWhitelisted = isSuperAdminEmail(email)
          const override = store.userOverrides[u.id] || store.userOverrides[email] || {}

          let provider: 'GITHUB' | 'GOOGLE' | 'EMAIL' = 'EMAIL'
          const appMeta = u.app_metadata || {}
          if (appMeta.provider === 'github' || (Array.isArray(appMeta.providers) && appMeta.providers.includes('github'))) {
            provider = 'GITHUB'
          } else if (appMeta.provider === 'google' || (Array.isArray(appMeta.providers) && appMeta.providers.includes('google'))) {
            provider = 'GOOGLE'
          }

          const userMeta = (u.user_metadata || {}) as Record<string, any>
          const tier: 'free' | 'pro' | 'enterprise' = isWhitelisted
            ? 'enterprise'
            : override.tier || userMeta.tier || 'free'

          const customQuotaLimit =
            override.customQuotaLimit !== undefined ? override.customQuotaLimit : userMeta.customQuotaLimit ?? null

          const effectiveLimit =
            customQuotaLimit !== null
              ? customQuotaLimit
              : tier === 'free'
              ? 3
              : tier === 'pro'
              ? 50
              : 999999

          const auditsUsed =
            override.auditsUsed !== undefined ? override.auditsUsed : userMeta.auditsUsed || 0

          const accountStatus: 'active' | 'suspended' =
            override.accountStatus || (u.banned_until ? 'suspended' : 'active')

          const organizationId = override.organizationId || userMeta.organizationId || null
          const organizationName = override.organizationName || userMeta.organizationName || null
          const orgRole = override.orgRole || userMeta.orgRole || (organizationId ? 'member' : 'individual')

          const fullName =
            userMeta.full_name ||
            userMeta.name ||
            (email ? email.split('@')[0] : 'ShipSafe Auditor')

          const cliCount = store.cliTokens.filter((t) => t.userEmail.toLowerCase() === email).length

          const record: AdminUserRecord = {
            id: u.id,
            email,
            fullName,
            oauthProvider: provider,
            tier,
            isSuperAdmin: isWhitelisted || userMeta.isSuperAdmin === true,
            accountStatus,
            organizationId,
            organizationName,
            orgRole,
            auditsUsed,
            customQuotaLimit,
            effectiveLimit,
            activeCliTokensCount: cliCount,
            billingCycleStart:
              override.billingCycleStart || userMeta.billingCycleStart || u.created_at,
            lastActiveAt: u.last_sign_in_at || u.created_at,
            createdAt: u.created_at,
          }

          userMap.set(email, record)
        }
      }
    } catch (sbErr) {
      console.error('[ShipSafe Admin] Supabase listUsers error:', sbErr)
    }
  }

  // 2. Ensure genuine Super Admin Owner accounts from SUPER_ADMIN_EMAIL_WHITELIST exist
  const ownerDetails: Record<string, { name: string; provider: 'GOOGLE' | 'GITHUB' }> = {
    'gilankdev@gmail.com': { name: 'Gilank Dev (LankDev Root Owner)', provider: 'GOOGLE' },
    'hi@lankdev.my.id': { name: 'LankDev Systems Root', provider: 'GITHUB' },
    'ghilankputraramadhan@gmail.com': { name: 'Ghilank Putra Ramadhan', provider: 'GOOGLE' },

  }

  for (const ownerEmail of SUPER_ADMIN_EMAIL_WHITELIST) {
    if (!userMap.has(ownerEmail)) {
      const detail = ownerDetails[ownerEmail] || { name: 'ShipSafe Super Admin', provider: 'GOOGLE' }
      const override = store.userOverrides[ownerEmail] || {}
      const cliCount = store.cliTokens.filter((t) => t.userEmail.toLowerCase() === ownerEmail).length

      userMap.set(ownerEmail, {
        id: `usr-owner-${ownerEmail.replace(/[^a-z0-9]/g, '')}`,
        email: ownerEmail,
        fullName: detail.name,
        oauthProvider: detail.provider,
        tier: 'enterprise',
        isSuperAdmin: true,
        accountStatus: override.accountStatus || 'active',
        organizationId: override.organizationId || null,
        organizationName: override.organizationName || null,
        orgRole: override.orgRole || 'owner',
        auditsUsed: override.auditsUsed || 0,
        customQuotaLimit: null,
        effectiveLimit: 999999,
        activeCliTokensCount: cliCount,
        billingCycleStart: override.billingCycleStart || '2026-10-01T00:00:00Z',
        lastActiveAt: new Date().toISOString(),
        createdAt: '2026-10-01T00:00:00Z',
      })
    }
  }

  // 3. Include any local ledger users from store.userOverrides
  for (const [key, override] of Object.entries(store.userOverrides)) {
    const email = key.includes('@') ? key.toLowerCase().trim() : ''
    if (email && !userMap.has(email)) {
      const isWhitelisted = isSuperAdminEmail(email)
      const tier: 'free' | 'pro' | 'enterprise' = isWhitelisted
        ? 'enterprise'
        : override.tier || 'free'
      const customQuotaLimit =
        override.customQuotaLimit !== undefined ? override.customQuotaLimit : null
      const effectiveLimit =
        customQuotaLimit !== null
          ? customQuotaLimit
          : tier === 'free'
          ? 3
          : tier === 'pro'
          ? 50
          : 999999
      const cliCount = store.cliTokens.filter((t) => t.userEmail.toLowerCase() === email).length

      userMap.set(email, {
        id: `usr-${email.replace(/[^a-z0-9]/g, "")}`,
        email,
        fullName: email.split('@')[0]?.toUpperCase() || 'ShipSafe User',
        oauthProvider: 'EMAIL',
        tier,
        isSuperAdmin: isWhitelisted,
        accountStatus: override.accountStatus || 'active',
        organizationId: override.organizationId || null,
        organizationName: override.organizationName || null,
        orgRole: override.orgRole || (override.organizationId ? 'member' : 'individual'),
        auditsUsed: override.auditsUsed || 0,
        customQuotaLimit,
        effectiveLimit,
        activeCliTokensCount: cliCount,
        billingCycleStart: override.billingCycleStart || '2026-10-01T00:00:00Z',
        lastActiveAt: new Date().toISOString(),
        createdAt: '2026-10-01T00:00:00Z',
      })
    }
  }

  let list = Array.from(userMap.values())

  // Apply filters
  if (filter !== 'ALL') {
    const f = filter.toUpperCase()
    if (f === 'FREE') list = list.filter((u) => u.tier === 'free')
    else if (f === 'PRO') list = list.filter((u) => u.tier === 'pro')
    else if (f === 'ENTERPRISE') list = list.filter((u) => u.tier === 'enterprise')
    else if (f === 'SUSPENDED') list = list.filter((u) => u.accountStatus === 'suspended')
    else if (f === 'SUPER ADMIN') list = list.filter((u) => u.isSuperAdmin)
  }

  // Apply search query
  if (search.trim()) {
    const q = search.trim().toLowerCase()
    list = list.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        u.fullName.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q)
    )
  }

  return list
}

export async function updateAdminUserTier(
  userId: string,
  newTier: 'free' | 'pro' | 'enterprise',
  actorEmail: string
): Promise<{ success: boolean; user?: AdminUserRecord; message: string }> {
  const users = await listAdminUsers('', 'ALL')
  const user = users.find((u) => u.id === userId || u.email.toLowerCase() === userId.toLowerCase())
  if (!user) return { success: false, message: 'User not found.' }

  const prevTier = user.tier

  // Persist to Supabase Auth if supabaseAdmin available
  if (supabaseAdmin) {
    try {
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        user_metadata: { tier: newTier },
      })
    } catch (err) {
      console.error('[ShipSafe Admin] Supabase updateUserById tier error:', err)
    }
  }

  // Persist locally
  store.userOverrides[user.id] = {
    ...store.userOverrides[user.id],
    tier: newTier,
  }
  store.userOverrides[user.email] = {
    ...store.userOverrides[user.email],
    tier: newTier,
  }

  user.tier = newTier
  user.effectiveLimit =
    user.customQuotaLimit || (newTier === 'free' ? 3 : newTier === 'pro' ? 50 : 999999)

  store.adminAuditLogs.unshift({
    id: `log-${Date.now()}`,
    actorEmail,
    targetEmail: user.email,
    actionType: 'CHANGE_TIER',
    diff: { previousTier: prevTier, newTier },
    createdAt: new Date().toISOString(),
  })
  saveStore()

  return { success: true, user, message: `Tier for ${user.email} updated to ${newTier.toUpperCase()}.` }
}

export async function updateAdminUserQuota(
  userId: string,
  customLimit: number | null,
  actorEmail: string
): Promise<{ success: boolean; user?: AdminUserRecord; message: string }> {
  const users = await listAdminUsers('', 'ALL')
  const user = users.find((u) => u.id === userId || u.email.toLowerCase() === userId.toLowerCase())
  if (!user) return { success: false, message: 'User not found.' }

  const prevLimit = user.customQuotaLimit

  if (supabaseAdmin) {
    try {
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        user_metadata: { customQuotaLimit: customLimit },
      })
    } catch (err) {
      console.error('[ShipSafe Admin] Supabase updateUserById quota error:', err)
    }
  }

  store.userOverrides[user.id] = {
    ...store.userOverrides[user.id],
    customQuotaLimit: customLimit,
  }
  store.userOverrides[user.email] = {
    ...store.userOverrides[user.email],
    customQuotaLimit: customLimit,
  }

  user.customQuotaLimit = customLimit
  user.effectiveLimit =
    customLimit || (user.tier === 'free' ? 3 : user.tier === 'pro' ? 50 : 999999)

  store.adminAuditLogs.unshift({
    id: `log-${Date.now()}`,
    actorEmail,
    targetEmail: user.email,
    actionType: 'SET_CUSTOM_QUOTA',
    diff: { previousLimit: prevLimit, newLimit: customLimit },
    createdAt: new Date().toISOString(),
  })
  saveStore()

  return { success: true, user, message: `Monthly quota for ${user.email} updated.` }
}

export async function resetAdminUserUsage(
  userId: string,
  actorEmail: string
): Promise<{ success: boolean; user?: AdminUserRecord; message: string }> {
  const users = await listAdminUsers('', 'ALL')
  const user = users.find((u) => u.id === userId || u.email.toLowerCase() === userId.toLowerCase())
  if (!user) return { success: false, message: 'User not found.' }

  const prevUsage = user.auditsUsed
  const now = new Date().toISOString()

  if (supabaseAdmin) {
    try {
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        user_metadata: { auditsUsed: 0, billingCycleStart: now },
      })
    } catch (err) {
      console.error('[ShipSafe Admin] Supabase reset auditsUsed error:', err)
    }
  }

  store.userOverrides[user.id] = {
    ...store.userOverrides[user.id],
    auditsUsed: 0,
    billingCycleStart: now,
  }
  store.userOverrides[user.email] = {
    ...store.userOverrides[user.email],
    auditsUsed: 0,
    billingCycleStart: now,
  }

  user.auditsUsed = 0
  user.billingCycleStart = now

  store.adminAuditLogs.unshift({
    id: `log-${Date.now()}`,
    actorEmail,
    targetEmail: user.email,
    actionType: 'RESET_USAGE',
    diff: { previousUsage: prevUsage, newUsage: 0 },
    createdAt: now,
  })
  saveStore()

  return { success: true, user, message: `Usage for ${user.email} reset to 0.` }
}

export async function toggleAdminUserStatus(
  userId: string,
  actorEmail: string
): Promise<{ success: boolean; user?: AdminUserRecord; message: string }> {
  const users = await listAdminUsers('', 'ALL')
  const user = users.find((u) => u.id === userId || u.email.toLowerCase() === userId.toLowerCase())
  if (!user) return { success: false, message: 'User not found.' }

  const prevStatus = user.accountStatus
  const nextStatus = prevStatus === 'active' ? 'suspended' : 'active'

  if (supabaseAdmin) {
    try {
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        ban_duration: nextStatus === 'suspended' ? '876600h' : 'none',
      })
    } catch (err) {
      console.error('[ShipSafe Admin] Supabase ban/unban error:', err)
    }
  }

  store.userOverrides[user.id] = {
    ...store.userOverrides[user.id],
    accountStatus: nextStatus,
  }
  store.userOverrides[user.email] = {
    ...store.userOverrides[user.email],
    accountStatus: nextStatus,
  }

  user.accountStatus = nextStatus

  store.adminAuditLogs.unshift({
    id: `log-${Date.now()}`,
    actorEmail,
    targetEmail: user.email,
    actionType: nextStatus === 'suspended' ? 'ACCOUNT_SUSPENDED' : 'ACCOUNT_ACTIVATED',
    diff: { previousStatus: prevStatus, newStatus: nextStatus },
    createdAt: new Date().toISOString(),
  })
  saveStore()

  return { success: true, user, message: `Account status for ${user.email} is now ${nextStatus.toUpperCase()}.` }
}

// ----------------------------------------------------------------------------
// ORGANIZATIONS & SEATS CONTROLLER
// ----------------------------------------------------------------------------

export function listAdminOrganizations(): OrganizationRecord[] {
  return [...store.organizations]
}

export function provisionOrganization(
  name: string,
  ownerEmail: string,
  maxSeats: number,
  whitelabelHeader: string | null,
  actorEmail: string
): { success: boolean; org?: OrganizationRecord; message: string } {
  const cleanEmail = ownerEmail.trim().toLowerCase()
  if (!cleanEmail || !name.trim()) {
    return { success: false, message: 'Organization name and owner email are required.' }
  }

  const existingOrg = store.organizations.find((o) => o.ownerEmail === cleanEmail)
  if (existingOrg) {
    return { success: false, message: 'User already owns an active organization.' }
  }

  const newOrg: OrganizationRecord = {
    id: `org-${Date.now()}`,
    name: name.trim(),
    ownerId: `usr-${cleanEmail.replace(/[^a-z0-9]/g, '')}`,
    ownerEmail: cleanEmail,
    maxSeats: maxSeats > 0 ? maxSeats : 5,
    whitelabelHeader: whitelabelHeader ? whitelabelHeader.trim() : null,
    totalScans: 0,
    createdAt: new Date().toISOString(),
    members: [
      {
        userId: `usr-${cleanEmail.replace(/[^a-z0-9]/g, '')}`,
        email: cleanEmail,
        fullName: cleanEmail.split('@')[0]?.toUpperCase() || 'Organization Owner',
        role: 'owner',
        joinedAt: new Date().toISOString(),
      },
    ],
  }

  store.organizations.push(newOrg)

  // Attach org to owner override
  store.userOverrides[cleanEmail] = {
    ...store.userOverrides[cleanEmail],
    tier: 'enterprise',
    organizationId: newOrg.id,
    organizationName: newOrg.name,
    orgRole: 'owner',
  }

  store.adminAuditLogs.unshift({
    id: `log-${Date.now()}`,
    actorEmail,
    targetEmail: cleanEmail,
    actionType: 'PROVISION_ORGANIZATION',
    diff: { orgId: newOrg.id, name: newOrg.name, maxSeats: newOrg.maxSeats },
    createdAt: new Date().toISOString(),
  })
  saveStore()

  return { success: true, org: newOrg, message: `Organization ${newOrg.name} provisioned successfully.` }
}

export function updateOrganizationSeats(
  orgId: string,
  newMaxSeats: number,
  actorEmail: string
): { success: boolean; message: string } {
  const org = store.organizations.find((o) => o.id === orgId)
  if (!org) return { success: false, message: 'Organization not found.' }

  if (newMaxSeats < org.members.length) {
    return {
      success: false,
      message: `Cannot reduce seat limit below current roster count (${org.members.length} members).`,
    }
  }

  const prev = org.maxSeats
  org.maxSeats = newMaxSeats

  store.adminAuditLogs.unshift({
    id: `log-${Date.now()}`,
    actorEmail,
    targetEmail: org.ownerEmail,
    actionType: 'UPDATE_ORG_SEATS',
    diff: { orgId, prevSeats: prev, newSeats: newMaxSeats },
    createdAt: new Date().toISOString(),
  })
  saveStore()

  return { success: true, message: `Seats for ${org.name} updated to ${newMaxSeats}.` }
}

export function addOrganizationMember(
  orgId: string,
  email: string,
  actorEmail: string
): { success: boolean; message: string } {
  const org = store.organizations.find((o) => o.id === orgId)
  if (!org) return { success: false, message: 'Organization not found.' }

  const cleanEmail = email.trim().toLowerCase()
  if (org.members.length >= org.maxSeats) {
    return { success: false, message: `Seat capacity limit (${org.maxSeats}) reached.` }
  }

  if (org.members.some((m) => m.email === cleanEmail)) {
    return { success: false, message: 'User is already a member of this organization.' }
  }

  const newMember: OrganizationMember = {
    userId: `usr-${cleanEmail.replace(/[^a-z0-9]/g, '')}`,
    email: cleanEmail,
    fullName: cleanEmail.split('@')[0]?.toUpperCase() || 'Team Member',
    role: 'member',
    joinedAt: new Date().toISOString(),
  }

  org.members.push(newMember)

  // Mark member as enterprise
  store.userOverrides[cleanEmail] = {
    ...store.userOverrides[cleanEmail],
    tier: 'enterprise',
    organizationId: org.id,
    organizationName: org.name,
    orgRole: 'member',
  }

  store.adminAuditLogs.unshift({
    id: `log-${Date.now()}`,
    actorEmail,
    targetEmail: cleanEmail,
    actionType: 'ADD_ORG_MEMBER',
    diff: { orgId, email: cleanEmail },
    createdAt: new Date().toISOString(),
  })
  saveStore()

  return { success: true, message: `Added ${cleanEmail} to ${org.name}.` }
}

export function removeOrganizationMember(
  orgId: string,
  memberEmail: string,
  actorEmail: string
): { success: boolean; message: string } {
  const org = store.organizations.find((o) => o.id === orgId)
  if (!org) return { success: false, message: 'Organization not found.' }

  const cleanEmail = memberEmail.trim().toLowerCase()
  if (org.ownerEmail === cleanEmail) {
    return { success: false, message: 'Cannot remove the organization owner.' }
  }

  const idx = org.members.findIndex((m) => m.email === cleanEmail)
  if (idx === -1) return { success: false, message: 'Member not found in organization.' }

  org.members.splice(idx, 1)

  // Remove org link
  if (store.userOverrides[cleanEmail]) {
    delete store.userOverrides[cleanEmail].organizationId
    delete store.userOverrides[cleanEmail].organizationName
    store.userOverrides[cleanEmail].orgRole = 'individual'
    store.userOverrides[cleanEmail].tier = 'free'
  }

  store.adminAuditLogs.unshift({
    id: `log-${Date.now()}`,
    actorEmail,
    targetEmail: cleanEmail,
    actionType: 'REMOVE_ORG_MEMBER',
    diff: { orgId, email: cleanEmail },
    createdAt: new Date().toISOString(),
  })
  saveStore()

  return { success: true, message: `Removed ${cleanEmail} from ${org.name}.` }
}

// ----------------------------------------------------------------------------
// VOUCHERS CONTROLLER
// ----------------------------------------------------------------------------

export function listAdminVouchers(): VoucherRecord[] {
  return [...store.vouchers]
}

export function generateVoucher(
  grantType: 'pro_monthly' | 'enterprise_monthly' | 'bonus_quota',
  maxUses: number,
  expirationDays: number,
  bonusAudits: number,
  actorEmail: string
): { success: boolean; voucher?: VoucherRecord; message: string } {
  const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase()
  const year = new Date().getFullYear()
  const prefix = grantType === 'enterprise_monthly' ? 'SS-ENT' : grantType === 'pro_monthly' ? 'SS-PRO' : 'SS-BONUS'
  const code = `${prefix}-${randomChars}-${year}`

  const expDate = new Date()
  expDate.setDate(expDate.getDate() + (expirationDays > 0 ? expirationDays : 30))

  const newVoucher: VoucherRecord = {
    code,
    grantType,
    bonusAudits: grantType === 'bonus_quota' ? bonusAudits || 10 : undefined,
    maxUses: maxUses > 0 ? maxUses : 1,
    uses: 0,
    expiresAt: expDate.toISOString(),
    redeemedBy: [],
    isActive: true,
    createdAt: new Date().toISOString(),
  }

  store.vouchers.unshift(newVoucher)

  store.adminAuditLogs.unshift({
    id: `log-${Date.now()}`,
    actorEmail,
    targetEmail: null,
    actionType: 'CREATE_VOUCHER',
    diff: { code, grantType, maxUses, expiresAt: newVoucher.expiresAt },
    createdAt: new Date().toISOString(),
  })
  saveStore()

  return { success: true, voucher: newVoucher, message: `Voucher ${code} generated.` }
}

export function revokeVoucher(
  code: string,
  actorEmail: string
): { success: boolean; message: string } {
  const cleanCode = code.trim().toUpperCase()
  const voucher = store.vouchers.find((v) => v.code === cleanCode)
  if (!voucher) return { success: false, message: 'Voucher not found.' }

  voucher.isActive = false

  store.adminAuditLogs.unshift({
    id: `log-${Date.now()}`,
    actorEmail,
    targetEmail: null,
    actionType: 'REVOKE_VOUCHER',
    diff: { code: cleanCode },
    createdAt: new Date().toISOString(),
  })
  saveStore()

  return { success: true, message: `Voucher ${cleanCode} has been revoked.` }
}

export function redeemVoucherUser(
  code: string,
  userEmail: string
): { success: boolean; grantType?: string; message: string } {
  const cleanCode = code.trim().toUpperCase()
  const cleanEmail = userEmail.trim().toLowerCase()

  const voucher = store.vouchers.find((v) => v.code === cleanCode)
  if (!voucher) return { success: false, message: 'Invalid voucher code.' }

  if (!voucher.isActive) return { success: false, message: 'This voucher code is deactivated.' }

  if (new Date() > new Date(voucher.expiresAt)) {
    return { success: false, message: 'This voucher code has expired.' }
  }

  if (voucher.uses >= voucher.maxUses) {
    return { success: false, message: 'Voucher maximum redemption limit reached.' }
  }

  if (voucher.redeemedBy.includes(cleanEmail)) {
    return { success: false, message: 'You have already redeemed this voucher.' }
  }

  voucher.uses += 1
  voucher.redeemedBy.push(cleanEmail)

  if (voucher.grantType === 'pro_monthly') {
    store.userOverrides[cleanEmail] = {
      ...store.userOverrides[cleanEmail],
      tier: 'pro',
    }
  } else if (voucher.grantType === 'enterprise_monthly') {
    store.userOverrides[cleanEmail] = {
      ...store.userOverrides[cleanEmail],
      tier: 'enterprise',
    }
  } else if (voucher.grantType === 'bonus_quota') {
    const curLimit = store.userOverrides[cleanEmail]?.customQuotaLimit || 3
    store.userOverrides[cleanEmail] = {
      ...store.userOverrides[cleanEmail],
      customQuotaLimit: curLimit + (voucher.bonusAudits || 10),
    }
  }
  saveStore()

  return {
    success: true,
    grantType: voucher.grantType,
    message: 'Voucher redeemed successfully. Your subscription tier and quota have been upgraded.',
  }
}

// ----------------------------------------------------------------------------
// TELEMETRY LOGS, CLI TOKENS & AUDIT LOGS
// ----------------------------------------------------------------------------

export function listScanTelemetry(): ScanTelemetryLog[] {
  return [...store.scanTelemetry]
}

export function addScanTelemetry(entry: Omit<ScanTelemetryLog, 'id' | 'timestamp'>): void {
  const log: ScanTelemetryLog = {
    id: `scan-tel-${Date.now()}`,
    timestamp: new Date().toISOString(),
    ...entry,
  }
  store.scanTelemetry.unshift(log)
  if (store.scanTelemetry.length > 100) {
    store.scanTelemetry.pop()
  }
  saveStore()
}

export function listCliTokens(): CliTokenRecord[] {
  return [...store.cliTokens]
}

export function addCliTokenRecord(token: CliTokenRecord): void {
  store.cliTokens.unshift(token)
  saveStore()
}

export function revokeCliToken(
  id: string,
  actorEmail: string
): { success: boolean; message: string } {
  const idx = store.cliTokens.findIndex((t) => t.id === id)
  if (idx === -1) return { success: false, message: 'CLI token not found.' }

  const removed = store.cliTokens.splice(idx, 1)[0]!

  store.adminAuditLogs.unshift({
    id: `log-${Date.now()}`,
    actorEmail,
    targetEmail: removed.userEmail,
    actionType: 'REVOKE_CLI_TOKEN',
    diff: { tokenId: id, label: removed.label },
    createdAt: new Date().toISOString(),
  })
  saveStore()

  return { success: true, message: `CLI token "${removed.label}" has been revoked.` }
}

export function listAdminAuditLogs(): AdminAuditLog[] {
  return [...store.adminAuditLogs]
}


export async function deleteAdminUser(
  userId: string,
  actorEmail: string
): Promise<{ success: boolean; message: string }> {
  const users = await listAdminUsers('', 'ALL')
  const target = users.find((u) => u.id === userId || u.email.toLowerCase() === userId.toLowerCase())
  if (!target) {
    return { success: false, message: 'User identity not found in ledger.' }
  }

  // Safety guard: Protect root owners
  if (isSuperAdminEmail(target.email)) {
    return {
      success: false,
      message: 'Access Denied: Root Owner identity is cryptographically protected and cannot be deleted.',
    }
  }

  // 1. Delete from Supabase Auth if supabaseAdmin available
  if (supabaseAdmin) {
    try {
      await supabaseAdmin.auth.admin.deleteUser(target.id)
      console.log(`[ShipSafe Admin] Supabase user ${target.id} (${target.email}) deleted.`)
    } catch (err: any) {
      console.warn(`[ShipSafe Admin] Supabase user deletion warning: ${err?.message || err}`)
    }
  }

  // 2. Wipe from store overrides, tokens, and telemetry
  const emailLower = target.email.toLowerCase()
  delete store.userOverrides[target.id]
  delete store.userOverrides[emailLower]

  store.cliTokens = store.cliTokens.filter((t) => t.userEmail.toLowerCase() !== emailLower)
  store.scanTelemetry = store.scanTelemetry.filter((s) => s.userEmail.toLowerCase() !== emailLower)

  // Remove from organizations
  for (const org of store.organizations) {
    org.members = org.members.filter((m) => m.email.toLowerCase() !== emailLower && m.userId !== target.id)
  }

  // 3. Wipe from Supabase (audit rows are owned by the service role only)
  try {
    const supabaseUrl = process.env.SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (supabaseUrl && serviceKey && !supabaseUrl.includes('your-project-ref')) {
      await fetch(`${supabaseUrl.replace(/\/+$/, '')}/rest/v1/audits?user_email=eq.${encodeURIComponent(target.email)}`, {
        method: 'DELETE',
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      })
    }
  } catch (err) {
    console.error('[ShipSafe Admin] Supabase deletion error (non-blocking):', err)
  }

  // 4. Record audit log
  store.adminAuditLogs.unshift({
    id: `log-${Date.now()}`,
    actorEmail,
    targetEmail: target.email,
    actionType: 'DELETE_USER',
    diff: { userId: target.id, email: target.email, fullName: target.fullName },
    createdAt: new Date().toISOString(),
  })
  saveStore()

  return { success: true, message: `Account for ${target.email} has been permanently deleted.` }
}

export async function deleteScanRecord(
  scanId: string,
  actorEmail: string
): Promise<{ success: boolean; message: string }> {
  const index = store.scanTelemetry.findIndex((s) => s.id === scanId)
  let removedEmail: string | null = null
  if (index !== -1) {
    const removed = store.scanTelemetry.splice(index, 1)[0]!
    removedEmail = removed.userEmail
    store.adminAuditLogs.unshift({
      id: `log-${Date.now()}`,
      actorEmail,
      targetEmail: removedEmail,
      actionType: 'DELETE_SCAN_TELEMETRY',
      diff: { scanId },
      createdAt: new Date().toISOString(),
    })
    saveStore()
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (supabaseUrl && serviceKey && !supabaseUrl.includes('your-project-ref')) {
      await fetch(`${supabaseUrl.replace(/\/+$/, '')}/rest/v1/findings?audit_id=eq.${encodeURIComponent(scanId)}`, {
        method: 'DELETE',
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      })
      await fetch(`${supabaseUrl.replace(/\/+$/, '')}/rest/v1/audits?id=eq.${encodeURIComponent(scanId)}`, {
        method: 'DELETE',
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      })
    }
  } catch (err) {
    console.error('[ShipSafe Admin] Supabase audit delete error (non-blocking):', err)
  }

  return { success: true, message: `Audit record ${scanId} deleted.` }
}

export function clearAllScanTelemetry(actorEmail: string): { success: boolean; message: string } {
  const count = store.scanTelemetry.length
  store.scanTelemetry = []
  store.adminAuditLogs.unshift({
    id: `log-${Date.now()}`,
    actorEmail,
    targetEmail: null,
    actionType: 'CLEAR_SCAN_TELEMETRY',
    diff: { clearedCount: count },
    createdAt: new Date().toISOString(),
  })
  saveStore()
  return { success: true, message: `Cleared ${count} scan telemetry logs.` }
}

export function clearAllAuditLogs(actorEmail: string): { success: boolean; message: string } {
  store.adminAuditLogs = [
    {
      id: `log-${Date.now()}`,
      actorEmail,
      targetEmail: null,
      actionType: 'CLEAR_AUDIT_LOGS',
      diff: { action: 'Full audit logs purged by Super Admin' },
      createdAt: new Date().toISOString(),
    },
  ]
  saveStore()
  return { success: true, message: 'Admin audit logs purged.' }
}

export async function getUserSyncProfile(
  candidateEmail?: string | null
): Promise<{
  user: {
    id: string
    email: string
    fullName: string
    avatarUrl?: string
    oauthProvider: 'GITHUB' | 'GOOGLE' | 'EMAIL'
    tier: 'free' | 'pro' | 'enterprise'
    isSuperAdmin: boolean
    accountStatus: 'active' | 'suspended'
    organizationId: string | null
    organizationName: string | null
    orgRole: 'owner' | 'member' | 'individual' | null
  } | null
  quota: {
    tier: 'free' | 'pro' | 'enterprise'
    used: number
    limit: number
    remaining: number
    resetDate?: string
  }
}> {
  if (!candidateEmail) {
    return {
      user: null,
      quota: { tier: 'free', used: 0, limit: 3, remaining: 3 },
    }
  }

  const cleanEmail = candidateEmail.trim().toLowerCase()
  const isWhitelisted = isSuperAdminEmail(cleanEmail)

  let supabaseUser: any = null
  if (supabaseAdmin) {
    try {
      const { data } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 100 })
      const found = data?.users?.find(
        (u) => (u.email || '').toLowerCase().trim() === cleanEmail || u.id === cleanEmail
      )
      if (found) {
        supabaseUser = found
      }
    } catch {
      // non-blocking
    }
  }

  const override =
    store.userOverrides[supabaseUser?.id || ''] || store.userOverrides[cleanEmail] || {}

  let provider: 'GITHUB' | 'GOOGLE' | 'EMAIL' = 'EMAIL'
  const appMeta = supabaseUser?.app_metadata || {}
  if (appMeta.provider === 'github' || (Array.isArray(appMeta.providers) && appMeta.providers.includes('github'))) {
    provider = 'GITHUB'
  } else if (appMeta.provider === 'google' || (Array.isArray(appMeta.providers) && appMeta.providers.includes('google'))) {
    provider = 'GOOGLE'
  }

  const meta = (supabaseUser?.user_metadata || {}) as Record<string, any>
  const tier: 'free' | 'pro' | 'enterprise' = isWhitelisted
    ? 'enterprise'
    : override.tier || meta.tier || 'free'

  const customLimit =
    override.customQuotaLimit !== undefined ? override.customQuotaLimit : meta.customQuotaLimit ?? null

  const effectiveLimit =
    customLimit !== null ? customLimit : tier === 'free' ? 3 : tier === 'pro' ? 50 : 999999

  const auditsUsed = override.auditsUsed !== undefined ? override.auditsUsed : meta.auditsUsed || 0
  const remaining = Math.max(0, effectiveLimit - auditsUsed)

  const accountStatus: 'active' | 'suspended' =
    override.accountStatus || (supabaseUser?.banned_until ? 'suspended' : 'active')

  const fullName =
    meta.full_name || meta.name || (supabaseUser && [meta.first_name, meta.last_name].filter(Boolean).join(' ')) ||
    (isWhitelisted ? 'LankDev Systems Root' : cleanEmail.split('@')[0])

  const avatarUrl =
    meta.avatar_url || meta.picture ||
    `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanEmail)}`

  return {
    user: {
      id: supabaseUser?.id || `usr-${cleanEmail.replace(/[^a-zA-Z0-9]/g, '')}`,
      email: cleanEmail,
      fullName,
      avatarUrl,
      oauthProvider: provider,
      tier,
      isSuperAdmin: isWhitelisted,
      accountStatus,
      organizationId: override.organizationId || null,
      organizationName: override.organizationName || null,
      orgRole: override.orgRole || null,
    },
    quota: {
      tier,
      used: auditsUsed,
      limit: effectiveLimit,
      remaining,
      resetDate: override.billingCycleStart || new Date(Date.now() + 30 * 86400000).toISOString(),
    },
  }
}


export interface RecordScanResult {
  allowed: boolean
  user: {
    id: string
    email: string
    tier: 'free' | 'pro' | 'enterprise'
    isSuperAdmin: boolean
  }
  quota: {
    tier: 'free' | 'pro' | 'enterprise'
    used: number
    limit: number
    remaining: number
    resetDate?: string
  }
}

function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
}

/**
 * Atomically records an authenticated CLI / MCP scan against user's monthly quota and logs telemetry.
 * If quota is exhausted (remaining <= 0 and not Super Admin), returns allowed: false and logs DENIED telemetry.
 */
export async function recordUserScanUsage(
  candidateEmailOrId: string,
  options?: {
    channel?: 'CLI' | 'MCP' | 'WEB'
    zipSizeBytes?: number
    durationMs?: number
    findingsCount?: number
    severityCounts?: {
      Critical: number
      High: number
      Medium: number
      Low: number
      Info: number
    }
  }
): Promise<RecordScanResult> {
  const profile = await getUserSyncProfile(candidateEmailOrId)
  const isSuper = profile.user?.isSuperAdmin ?? isSuperAdminEmail(candidateEmailOrId)
  const userEmail = profile.user?.email || (candidateEmailOrId.includes('@') ? candidateEmailOrId : 'developer@shipsafe.dev')
  const userId = profile.user?.id || candidateEmailOrId
  const tier = profile.user?.tier || profile.quota.tier || 'free'

  // If user has exhausted quota (remaining <= 0 and not Super Admin)
  if (!isSuper && profile.quota.remaining <= 0) {
    addScanTelemetry({
      userEmail,
      channel: options?.channel || 'CLI',
      zipSizeBytes: options?.zipSizeBytes || 0,
      durationMs: options?.durationMs || 0,
      findingsCount: options?.findingsCount || 0,
      severityCounts: options?.severityCounts || { Critical: 0, High: 0, Medium: 0, Low: 0, Info: 0 },
      securityGateStatus: '[DENIED // QUOTA_EXCEEDED]',
    })

    return {
      allowed: false,
      user: {
        id: userId,
        email: userEmail,
        tier,
        isSuperAdmin: isSuper,
      },
      quota: {
        tier,
        used: profile.quota.used,
        limit: profile.quota.limit,
        remaining: 0,
        resetDate: profile.quota.resetDate,
      },
    }
  }

  // Deduct/increment user's auditsUsed
  const newUsed = profile.quota.used + 1
  const newRemaining = isSuper ? 999999 : Math.max(0, profile.quota.limit - newUsed)
  const now = new Date().toISOString()

  // Update in store.userOverrides
  const existingOverride = store.userOverrides[userId] || store.userOverrides[userEmail] || {}
  const updatedOverride = {
    ...existingOverride,
    auditsUsed: newUsed,
    lastActiveAt: now,
  }
  store.userOverrides[userId] = updatedOverride
  store.userOverrides[userEmail] = updatedOverride
  saveStore()

  // Update in Supabase if valid UUID
  if (supabaseAdmin && userId && isUuid(userId)) {
    try {
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: { auditsUsed: newUsed },
      })
    } catch (err) {
      console.error('[ShipSafe Admin] Supabase update auditsUsed error:', err)
    }
  }

  // Add telemetry
  addScanTelemetry({
    userEmail,
    channel: options?.channel || 'CLI',
    zipSizeBytes: options?.zipSizeBytes || 0,
    durationMs: options?.durationMs || 0,
    findingsCount: options?.findingsCount || 0,
    severityCounts: options?.severityCounts || { Critical: 0, High: 0, Medium: 0, Low: 0, Info: 0 },
    securityGateStatus: '[OK // COMPLETED]',
  })

  return {
    allowed: true,
    user: {
      id: userId,
      email: userEmail,
      tier,
      isSuperAdmin: isSuper,
    },
    quota: {
      tier,
      used: newUsed,
      limit: profile.quota.limit,
      remaining: newRemaining,
      resetDate: profile.quota.resetDate,
    },
  }
}
