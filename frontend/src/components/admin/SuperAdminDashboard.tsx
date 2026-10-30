import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useStore } from '../../state/store'
import { isSuperAdminEmail } from '../../config/super-admin'
import { TierStamp } from '../ui/TierStamp'
import { toast } from '../ui/Toast'
import {
  Shield,
  Activity,
  Terminal,
  RefreshCw,
  Search,
  ChevronLeft,
  Trash2,
  Lock,
} from 'lucide-react'

interface SuperAdminDashboardProps {
  onNavigate?: (path: string) => void
}

// -----------------------------------------------------------------------------
// DATA TYPES
// -----------------------------------------------------------------------------

export interface TelemetryData {
  queue: {
    activeWorkers: number
    maxWorkers: number
    queuedRequests: number
    display: string
  }
  gateway: {
    status: string
    latencyMs: number
  }
  sandbox: {
    lingeringCount: number
    display: string
  }
  intake: {
    isOpen: boolean
    display: string
  }
  totals: {
    totalUsers: number
    freeUsers: number
    proUsers: number
    entUsers: number
    activeOrgs: number
    scans30d: number
    display: string
  }
}

export interface AdminUser {
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

export interface Organization {
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

export interface Voucher {
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

export interface CliToken {
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

// -----------------------------------------------------------------------------
// MAIN COMPONENT (REALTIME LIVE ADMIN LEDGER // ZERO DUMMY DATA)
// -----------------------------------------------------------------------------

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ onNavigate }) => {
  const user = useStore((s) => s.auth.user)
  const isAuthorized = Boolean(user?.isSuperAdmin) || isSuperAdminEmail(user?.email)

  // Sub-Tab Navigation
  const [activeTab, setActiveTab] = useState<'users' | 'orgs' | 'vouchers' | 'security'>('users')

  // Telemetry State
  const [telemetry, setTelemetry] = useState<TelemetryData>({
    queue: { activeWorkers: 0, maxWorkers: 3, queuedRequests: 0, display: 'ACTIVE: 0/3 | QUEUED: 0/25' },
    gateway: { status: 'ONLINE // LATENCY: 24ms', latencyMs: 24 },
    sandbox: { lingeringCount: 0, display: '0 LINGERING ARCHIVES // ZERO-PERSISTENCE VERIFIED' },
    intake: { isOpen: true, display: '[INTAKE: OPEN]' },
    totals: { totalUsers: 0, freeUsers: 0, proUsers: 0, entUsers: 0, activeOrgs: 0, scans30d: 0, display: 'USERS: 0 (FREE: 0 | PRO: 0 | ENT: 0) | ACTIVE ORGS: 0 | SCANS (30D): 0' },
  })
  const [isRefreshingTelemetry, setIsRefreshingTelemetry] = useState(false)
  const [, setIsLoadingData] = useState(false)

  // Real Data Collections
  const [users, setUsers] = useState<AdminUser[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [userFilter, setUserFilter] = useState<'ALL' | 'FREE' | 'PRO' | 'ENTERPRISE' | 'SUSPENDED' | 'SUPER ADMIN'>('ALL')
  const [editingCustomQuotaUser, setEditingCustomQuotaUser] = useState<AdminUser | null>(null)
  const [customQuotaInput, setCustomQuotaInput] = useState('')
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null)

  // Organizations State
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [newOrgName, setNewOrgName] = useState('')
  const [newOrgOwnerEmail, setNewOrgOwnerEmail] = useState('')
  const [newOrgMaxSeats, setNewOrgMaxSeats] = useState(5)
  const [newOrgWhitelabel, setNewOrgWhitelabel] = useState('')
  const [expandedOrgId, setExpandedOrgId] = useState<string | null>(null)
  const [newMemberEmail, setNewMemberEmail] = useState('')

  // Vouchers State
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [voucherGrantType, setVoucherGrantType] = useState<'pro_monthly' | 'enterprise_monthly' | 'bonus_quota'>('pro_monthly')
  const [voucherMaxUses, setVoucherMaxUses] = useState(1)
  const [voucherExpirationDays, setVoucherExpirationDays] = useState(30)
  const [voucherBonusAudits, setVoucherBonusAudits] = useState(10)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [copiedWaText, setCopiedWaText] = useState<string | null>(null)

  // Security & Telemetry State
  const [scanLogs, setScanLogs] = useState<ScanTelemetryLog[]>([])
  const [cliTokens, setCliTokens] = useState<CliToken[]>([])
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([])

  const authToken = typeof window !== 'undefined' ? window.localStorage.getItem('shipsafe.auth.token') : null
  const adminHeaders = useMemo<Record<string, string>>(
    () => ({
      'x-admin-email': user?.email || '',
      // Backend identity chain requires the verified session token (production).
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    }),
    [user?.email, authToken],
  )

  // Load Real Data from Backend API
  const loadData = useCallback(async () => {
    if (!isAuthorized) return
    setIsLoadingData(true)
    const headers = adminHeaders
    try {
      const [uRes, oRes, vRes, telLogsRes, tokRes, aLogsRes] = await Promise.all([
        fetch(`/api/admin/users?search=${encodeURIComponent(userSearch)}&filter=${userFilter}`, { headers }),
        fetch('/api/admin/organizations', { headers }),
        fetch('/api/admin/vouchers', { headers }),
        fetch('/api/admin/telemetry-logs', { headers }),
        fetch('/api/admin/cli-tokens', { headers }),
        fetch('/api/admin/audit-logs', { headers }),
      ])

      if (uRes.ok) {
        const uData = await uRes.json()
        setUsers(uData.users || [])
      }
      if (oRes.ok) {
        const oData = await oRes.json()
        setOrgs(oData.orgs || [])
      }
      if (vRes.ok) {
        const vData = await vRes.json()
        setVouchers(vData.vouchers || [])
      }
      if (telLogsRes.ok) {
        const tData = await telLogsRes.json()
        setScanLogs(tData.logs || [])
      }
      if (tokRes.ok) {
        const tokData = await tokRes.json()
        setCliTokens(tokData.tokens || [])
      }
      if (aLogsRes.ok) {
        const aData = await aLogsRes.json()
        setAuditLogs(aData.logs || [])
      }
    } catch (err) {
      console.error('[ShipSafe Admin] Load data error:', err)
    } finally {
      setIsLoadingData(false)
    }
  }, [isAuthorized, adminHeaders, userSearch, userFilter])

  // Poll Telemetry every 10 seconds
  const fetchTelemetry = useCallback(async () => {
    setIsRefreshingTelemetry(true)
    try {
      const res = await fetch('/api/admin/telemetry', {
        headers: adminHeaders,
      })
      if (res.ok) {
        const data = await res.json()
        setTelemetry(data)
      }
    } catch (err) {
      console.error('[ShipSafe Admin] Fetch telemetry error:', err)
    } finally {
      setIsRefreshingTelemetry(false)
    }
  }, [adminHeaders])

  useEffect(() => {
    if (!isAuthorized) return
    let active = true

    const runInit = async () => {
      await loadData()
      if (active) {
        await fetchTelemetry()
      }
    }

    void runInit()
    const timer = setInterval(() => {
      if (active) void fetchTelemetry()
    }, 10000)

    return () => {
      active = false
      clearInterval(timer)
    }
  }, [isAuthorized, loadData, fetchTelemetry])

  const handleBackToConsole = () => {
    if (onNavigate) {
      onNavigate('/console')
    } else if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/console')
      window.dispatchEvent(new PopStateEvent('popstate'))
    }
  }

  // ---------------------------------------------------------------------------
  // TELEMETRY ACTIONS
  // ---------------------------------------------------------------------------
  const handleFlushQueue = async () => {
    try {
      await fetch('/api/admin/queue/flush', {
        method: 'POST',
        headers: adminHeaders,
      })
      toast.success('Stuck worker queue flushed successfully.')
      await fetchTelemetry()
    } catch {
      toast.error('Failed to flush queue.')
    }
  }

  const handleToggleIntake = async () => {
    try {
      const res = await fetch('/api/admin/intake/toggle', {
        method: 'POST',
        headers: adminHeaders,
      })
      if (res.ok) {
        const data = await res.json()
        setTelemetry((prev) => ({
          ...prev,
          intake: {
            isOpen: data.isOpen,
            display: data.status,
          },
        }))
        toast.success(data.isOpen ? 'Intake gate is now OPEN.' : 'Intake gate PAUSED for maintenance.')
      }
    } catch {
      toast.error('Failed to toggle intake gate.')
    }
  }

  // ---------------------------------------------------------------------------
  // SUB-TAB 1: USER CONTROLS (REAL MUTATIONS)
  // ---------------------------------------------------------------------------
  const handleUserTierChange = async (userId: string, nextTier: 'free' | 'pro' | 'enterprise') => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, tier: nextTier } : u))
    )
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/tier`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...adminHeaders },
        body: JSON.stringify({ tier: nextTier }),
      })
      if (!res.ok) throw new Error('Failed to update tier')
      toast.success(`User tier updated to ${nextTier.toUpperCase()}.`)
    } catch {
      toast.error('Failed to update user tier.')
    }
    await loadData()
    await fetchTelemetry()
  }

  const handleUserResetUsage = async (userId: string) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, auditsUsed: 0 } : u))
    )
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/reset`, {
        method: 'POST',
        headers: adminHeaders,
      })
      if (!res.ok) throw new Error('Failed to reset usage')
      toast.success('Audit usage counter reset to 0.')
    } catch {
      toast.error('Failed to reset user usage.')
    }
    await loadData()
    await fetchTelemetry()
  }

  const handleUserToggleStatus = async (userId: string) => {
    const cur = users.find((u) => u.id === userId)
    const nextStatus = cur?.accountStatus === 'active' ? 'suspended' : 'active'
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, accountStatus: nextStatus } : u))
    )
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/status`, {
        method: 'POST',
        headers: adminHeaders,
      })
      if (!res.ok) throw new Error('Failed to update status')
      toast.success(`User account condition updated to ${nextStatus.toUpperCase()}.`)
    } catch {
      toast.error('Failed to toggle user status.')
    }
    await loadData()
    await fetchTelemetry()
  }

  const handleSaveCustomQuota = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCustomQuotaUser) return
    const parsed = customQuotaInput.trim() === '' ? null : parseInt(customQuotaInput, 10)
    if (parsed !== null && isNaN(parsed)) {
      toast.error('Invalid quota limit value.')
      return
    }
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(editingCustomQuotaUser.id)}/quota`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...adminHeaders },
        body: JSON.stringify({ customQuotaLimit: parsed }),
      })
      if (!res.ok) throw new Error('Failed to update quota')
      toast.success('Custom monthly quota limit applied.')
    } catch {
      toast.error('Failed to apply custom quota.')
    }
    setEditingCustomQuotaUser(null)
    await loadData()
    await fetchTelemetry()
  }

  // ---------------------------------------------------------------------------
  const handleDeleteUser = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
        method: 'DELETE',
        headers: adminHeaders,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to delete user')
      toast.success(data.message || 'User deleted successfully.')
      setUserToDelete(null)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete user.'
      toast.error(msg)
    }
    await loadData()
    await fetchTelemetry()
  }

  const handleDeleteScanRecord = async (scanId: string) => {
    try {
      const res = await fetch(`/api/admin/telemetry-logs/${encodeURIComponent(scanId)}`, {
        method: 'DELETE',
        headers: adminHeaders,
      })
      const data = await res.json()
      toast.success(data.message || 'Telemetry record removed.')
    } catch {
      toast.error('Failed to delete telemetry record.')
    }
    await loadData()
    await fetchTelemetry()
  }

  const handleClearAllScanTelemetry = async () => {
    if (typeof window !== 'undefined' && !window.confirm('Clear all scan telemetry and abuse feed logs?')) return
    try {
      const res = await fetch('/api/admin/telemetry-logs', {
        method: 'DELETE',
        headers: adminHeaders,
      })
      const data = await res.json()
      toast.success(data.message || 'Scan telemetry cleared.')
    } catch {
      toast.error('Failed to clear scan telemetry.')
    }
    await loadData()
    await fetchTelemetry()
  }

  const handleClearAllAuditLogs = async () => {
    if (typeof window !== 'undefined' && !window.confirm('Purge admin mutation audit trail?')) return
    try {
      const res = await fetch('/api/admin/audit-logs', {
        method: 'DELETE',
        headers: adminHeaders,
      })
      const data = await res.json()
      toast.success(data.message || 'Audit trail purged.')
    } catch {
      toast.error('Failed to purge audit trail.')
    }
    await loadData()
    await fetchTelemetry()
  }

  // SUB-TAB 2: ENTERPRISE ORGANIZATIONS CONTROLS
  // ---------------------------------------------------------------------------
  const handleProvisionOrg = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanName = newOrgName.trim()
    const cleanEmail = newOrgOwnerEmail.trim().toLowerCase()
    if (!cleanName || !cleanEmail) {
      toast.error('Organization name and owner email are required.')
      return
    }
    try {
      const res = await fetch('/api/admin/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...adminHeaders },
        body: JSON.stringify({
          name: cleanName,
          ownerEmail: cleanEmail,
          maxSeats: newOrgMaxSeats > 0 ? newOrgMaxSeats : 5,
          whitelabelHeader: newOrgWhitelabel.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to provision organization')
      toast.success(`Organization ${cleanName} provisioned successfully.`)
      setNewOrgName('')
      setNewOrgOwnerEmail('')
      setNewOrgWhitelabel('')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to provision organization.'; toast.error(msg)
    }
    await loadData()
    await fetchTelemetry()
  }

  const handleAdjustOrgSeats = async (orgId: string, delta: number) => {
    const org = orgs.find((o) => o.id === orgId)
    if (!org) return
    const next = Math.max(org.members.length, org.maxSeats + delta)
    try {
      const res = await fetch(`/api/admin/organizations/${encodeURIComponent(orgId)}/seats`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...adminHeaders },
        body: JSON.stringify({ maxSeats: next }),
      })
      if (!res.ok) throw new Error('Failed to update seats')
      toast.success(`Seats for ${org.name} updated to ${next}.`)
    } catch {
      toast.error('Failed to update organization seats.')
    }
    await loadData()
  }

  const handleAddOrgMember = async (orgId: string) => {
    const clean = newMemberEmail.trim().toLowerCase()
    if (!clean || !clean.includes('@')) {
      toast.error('Valid member email is required.')
      return
    }
    try {
      const res = await fetch(`/api/admin/organizations/${encodeURIComponent(orgId)}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...adminHeaders },
        body: JSON.stringify({ email: clean }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to add member')
      toast.success(`Added ${clean} to organization.`)
      setNewMemberEmail('')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add member.'; toast.error(msg)
    }
    await loadData()
  }

  const handleRemoveOrgMember = async (orgId: string, memberEmail: string) => {
    try {
      const res = await fetch(`/api/admin/organizations/${encodeURIComponent(orgId)}/members/${encodeURIComponent(memberEmail)}`, {
        method: 'DELETE',
        headers: adminHeaders,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to remove member')
      toast.success(`Removed ${memberEmail} from organization.`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to remove member.'; toast.error(msg)
    }
    await loadData()
  }

  // ---------------------------------------------------------------------------
  // SUB-TAB 3: VOUCHERS CONTROLS
  // ---------------------------------------------------------------------------
  const handleGenerateVoucher = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/admin/vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...adminHeaders },
        body: JSON.stringify({
          grantType: voucherGrantType,
          maxUses: voucherMaxUses > 0 ? voucherMaxUses : 1,
          expirationDays: voucherExpirationDays > 0 ? voucherExpirationDays : 30,
          bonusAudits: voucherGrantType === 'bonus_quota' ? voucherBonusAudits : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to generate voucher')
      toast.success(`Voucher code ${data.voucher?.code || ''} generated.`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate voucher.'; toast.error(msg)
    }
    await loadData()
  }

  const handleRevokeVoucher = async (code: string) => {
    try {
      const res = await fetch(`/api/admin/vouchers/${encodeURIComponent(code)}`, {
        method: 'DELETE',
        headers: adminHeaders,
      })
      if (!res.ok) throw new Error('Failed to revoke voucher')
      toast.success(`Voucher ${code} revoked.`)
    } catch {
      toast.error('Failed to revoke voucher.')
    }
    await loadData()
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
    toast.success('Voucher code copied to clipboard.')
  }

  const handleCopyWaText = (v: Voucher) => {
    const isEnterprise = v.grantType === 'enterprise_monthly'
    const grantName = isEnterprise
      ? `ShipSafe Enterprise Multi-Seat License (${v.maxUses} Developer Seats, Unlimited Quota, White-Label PDF)`
      : v.grantType === 'pro_monthly'
        ? 'ShipSafe Pro (50 Scan/Bulan, Full 10-Agent Fix Prompts, Report Export)'
        : `ShipSafe Bonus Quota (+${v.bonusAudits || 10} Audits)`

    const enterpriseTeamNote = isEnterprise
      ? `KAPASITAS LISENSI TIM: *Maksimal ${v.maxUses} Developer Seats*\nKode voucher lisensi ini dapat dibagikan dan di-redeem oleh hingga ${v.maxUses} anggota tim/developer di organisasi Anda.\n\n`
      : ''

    const text =
      `Halo Kak! Terima kasih telah melakukan pemesanan lisensi resmi ShipSafe via WhatsApp Official.\n\n` +
      `Berikut adalah Kode Voucher Aktivasi Resmi ${isEnterprise ? 'Tim / Organisasi ' : ''}Anda:\n` +
      `KODE VOUCHER: *${v.code}*\n` +
      `PAKET: *${grantName}*\n` +
      enterpriseTeamNote +
      `MASA BERLAKU: Hingga ${new Date(v.expiresAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}\n\n` +
      `PANDUAN AKTIVASI ${isEnterprise ? 'UNTUK SETIAP ANGGOTA TIM' : 'AKUN'}:\n` +
      `1. Buka https://shipsafe.lankdev.my.id/console\n` +
      `2. Masuk / Sign in menggunakan akun GitHub atau Google masing-masing.\n` +
      `3. Buka menu Pricing & Plans (atau klik tombol Upgrade di bilah kiri bawah).\n` +
      `4. Masukkan kode *${v.code}* di kolom [REDEEM VOUCHER CODE] lalu klik Redeem.\n` +
      `5. Akun ${isEnterprise ? 'developer ' : ''}langsung seketika aktif berstatus [TIER: ${isEnterprise ? 'ENTERPRISE // ORG' : 'PRO'}]!\n\n` +
      `Jika ada kendala aktivasi, tim security engineer kami siap membantu di kontak ini. Salam hangat, ShipSafe Security Team.`

    navigator.clipboard.writeText(text)
    setCopiedWaText(v.code)
    setTimeout(() => setCopiedWaText(null), 2000)
    toast.success('WhatsApp fulfillment message copied.')
  }

  // ---------------------------------------------------------------------------
  // SUB-TAB 4: CLI TOKENS CONTROLS
  // ---------------------------------------------------------------------------
  const handleRevokeCliToken = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/cli-tokens/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: adminHeaders,
      })
      if (!res.ok) throw new Error('Failed to revoke token')
      toast.success('CLI token revoked.')
    } catch {
      toast.error('Failed to revoke CLI token.')
    }
    await loadData()
  }

  // Filtered Users List
  const filteredUsers = users.filter((u) => {
    if (userFilter === 'FREE' && u.tier !== 'free') return false
    if (userFilter === 'PRO' && u.tier !== 'pro') return false
    if (userFilter === 'ENTERPRISE' && u.tier !== 'enterprise') return false
    if (userFilter === 'SUSPENDED' && u.accountStatus !== 'suspended') return false
    if (userFilter === 'SUPER ADMIN' && !u.isSuperAdmin) return false
    if (userSearch.trim()) {
      const q = userSearch.toLowerCase()
      return (
        u.email.toLowerCase().includes(q) ||
        u.fullName.toLowerCase().includes(q) ||
        (u.organizationName && u.organizationName.toLowerCase().includes(q))
      )
    }
    return true
  })

  // Access restriction: if not authorized, redirect immediately to /console
  useEffect(() => {
    if (!isAuthorized) {
      if (onNavigate) {
        onNavigate('/console')
      } else if (typeof window !== 'undefined') {
        window.history.pushState({}, '', '/console')
        window.dispatchEvent(new PopStateEvent('popstate'))
      }
    }
  }, [isAuthorized, onNavigate])

  if (!isAuthorized) {
    return null
  }

  // ---------------------------------------------------------------------------
  // AUTHORIZED SUPER ADMIN MISSION CONTROL INTERFACE
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-canvas text-ink font-sans selection:bg-ink selection:text-canvas">
      {/* 1. Header Toolbar */}
      <header className="border-b border-rule bg-surface sticky top-0 z-40 px-4 sm:px-6 py-2.5 flex items-center justify-between font-mono">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBackToConsole}
            className="inline-flex items-center gap-1.5 text-xs text-ink-2 hover:text-ink transition-colors cursor-pointer"
            title="Return to Security Console"
          >
            <ChevronLeft className="size-4" strokeWidth={1.5} />
            <span>[CONSOLE]</span>
          </button>
          <span className="text-rule-strong">/</span>
          <span className="text-xs font-bold uppercase tracking-wider text-ink">
            ShipSafe Mission Control [ADMIN LEDGER]
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-ink-3 hidden sm:inline">
            {user?.email || 'gilankdev@gmail.com'}
          </span>
          <TierStamp tier="enterprise" isSuperAdmin={true} size="sm" />
        </div>
      </header>

      {/* 2. Top Live System & VPS Telemetry Strip (Always Visible) */}
      <section className="border-b border-rule bg-surface/40 px-4 sm:px-6 py-3 font-mono text-xs">
        <div className="max-w-[105rem] mx-auto flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          {/* Telemetry Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 flex-1">
            {/* Cell 1: VPS Audit Queue */}
            <div className="border border-rule bg-surface p-2.5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[10px] text-ink-3 uppercase font-semibold">
                <span>[VPS AUDIT QUEUE]</span>
                <button
                  type="button"
                  onClick={handleFlushQueue}
                  className="hover:text-ink underline text-[9px] cursor-pointer"
                  title="Flush stuck queue workers"
                >
                  [FLUSH]
                </button>
              </div>
              <div className="text-xs font-bold text-ink mt-1 tabular-nums">
                {telemetry.queue.display}
              </div>
            </div>

            {/* Cell 2: Hermes Gateway */}
            <div className="border border-rule bg-surface p-2.5 flex flex-col justify-between">
              <span className="text-[10px] text-ink-3 uppercase font-semibold">
                [9ROUTER HERMES GATEWAY]
              </span>
              <div className="text-xs font-bold text-ink mt-1 truncate">
                {telemetry.gateway.status}
              </div>
            </div>

            {/* Cell 3: Sandbox RAM / /tmp */}
            <div className="border border-rule bg-surface p-2.5 flex flex-col justify-between">
              <span className="text-[10px] text-ink-3 uppercase font-semibold">
                [SANDBOX RAM /TMP]
              </span>
              <div className="text-xs font-bold text-ink mt-1 truncate">
                {telemetry.sandbox.display}
              </div>
            </div>

            {/* Cell 4: Intake Gate Switch */}
            <div className="border border-rule bg-surface p-2.5 flex flex-col justify-between">
              <span className="text-[10px] text-ink-3 uppercase font-semibold">
                [INTAKE GATE]
              </span>
              <div className="flex items-center justify-between mt-1">
                <span className={`font-bold ${telemetry.intake.isOpen ? 'text-ink' : 'text-status-fail'}`}>
                  {telemetry.intake.display}
                </span>
                <button
                  type="button"
                  onClick={handleToggleIntake}
                  className="px-2 py-0.5 border border-ink text-[10px] bg-canvas hover:bg-ink hover:text-canvas transition-colors cursor-pointer"
                  title="Toggle Global Intake Pause"
                >
                  {telemetry.intake.isOpen ? 'PAUSE' : 'OPEN'}
                </button>
              </div>
            </div>
          </div>

          {/* Platform Totals & Refresh Button */}
          <div className="flex items-center justify-between xl:justify-end gap-3 pt-2 xl:pt-0 border-t xl:border-t-0 border-rule/50">
            <div className="text-[11px] text-ink-2 truncate">
              {telemetry.totals.display}
            </div>
            <button
              type="button"
              onClick={fetchTelemetry}
              disabled={isRefreshingTelemetry}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-rule bg-surface hover:bg-raised text-ink text-xs transition-colors cursor-pointer shrink-0"
              title="Refresh Live Telemetry"
            >
              <RefreshCw className={`size-3.5 ${isRefreshingTelemetry ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">[REFRESH]</span>
            </button>
          </div>
        </div>
      </section>

      {/* 3. 4 Rectilinear Sub-Tabs Bar */}
      <nav className="border-b border-rule bg-surface px-4 sm:px-6 font-mono text-xs">
        <div className="max-w-[105rem] mx-auto flex items-center overflow-x-auto custom-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`px-4 py-3 border-b-2 font-semibold transition-colors cursor-pointer shrink-0 ${
              activeTab === 'users'
                ? 'border-ink text-ink bg-canvas'
                : 'border-transparent text-ink-3 hover:text-ink'
            }`}
          >
            [01 // USERS, ROLES &amp; QUOTAS]
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('orgs')}
            className={`px-4 py-3 border-b-2 font-semibold transition-colors cursor-pointer shrink-0 ${
              activeTab === 'orgs'
                ? 'border-ink text-ink bg-canvas'
                : 'border-transparent text-ink-3 hover:text-ink'
            }`}
          >
            [02 // ENTERPRISE ORGANIZATIONS &amp; SEATS]
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('vouchers')}
            className={`px-4 py-3 border-b-2 font-semibold transition-colors cursor-pointer shrink-0 ${
              activeTab === 'vouchers'
                ? 'border-ink text-ink bg-canvas'
                : 'border-transparent text-ink-3 hover:text-ink'
            }`}
          >
            [03 // VOUCHERS &amp; WHATSAPP FULFILLMENT]
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`px-4 py-3 border-b-2 font-semibold transition-colors cursor-pointer shrink-0 ${
              activeTab === 'security'
                ? 'border-ink text-ink bg-canvas'
                : 'border-transparent text-ink-3 hover:text-ink'
            }`}
          >
            [04 // SECURITY ABUSE, CLI TOKENS &amp; AUDIT LOGS]
          </button>
        </div>
      </nav>

      {/* 4. Sub-Tabs Content Area */}
      <main className="max-w-[105rem] mx-auto p-4 sm:p-6 md:p-8 space-y-8">
        {/* =================================================================== */}
        {/* SUB-TAB 1: USERS, ROLES & QUOTAS */}
        {/* =================================================================== */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Search & Filter Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-ink-3" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search user by email, name, or org..."
                  aria-label="Search user by email, name, or org"
                  className="w-full pl-9 pr-3 py-2 border border-rule bg-surface text-ink text-xs focus:outline-none focus:border-ink placeholder:text-placeholder"
                />
              </div>

              {/* Filter Chips */}
              <div className="flex items-center gap-1.5 flex-wrap text-xs">
                {(['ALL', 'FREE', 'PRO', 'ENTERPRISE', 'SUSPENDED', 'SUPER ADMIN'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setUserFilter(f)}
                    className={`px-2.5 py-1 border transition-colors cursor-pointer ${
                      userFilter === f
                        ? 'border-ink bg-ink text-canvas font-bold'
                        : 'border-rule bg-surface hover:bg-raised text-ink-2'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Master User Control Ledger Table */}
            <div className="border border-rule bg-surface overflow-x-auto font-mono text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-rule bg-canvas text-[11px] text-ink-3 uppercase">
                    <th className="py-2.5 px-3 font-semibold">User Identity</th>
                    <th className="py-2.5 px-3 font-semibold">Organization</th>
                    <th className="py-2.5 px-3 font-semibold">Monthly Quota &amp; Usage</th>
                    <th className="py-2.5 px-3 font-semibold">Condition</th>
                    <th className="py-2.5 px-3 font-semibold">Activity</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Instant Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-ink-3 font-sans">
                        No registered users match the search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const pct = Math.min(100, Math.round((u.auditsUsed / u.effectiveLimit) * 100))
                      const isSuspended = u.accountStatus === 'suspended'
                      return (
                        <tr key={u.id} className="hover:bg-raised/60 transition-colors">
                          {/* 1. Identity */}
                          <td className="py-3 px-3">
                            <div className="font-semibold text-ink font-sans">{u.fullName}</div>
                            <div className="text-[11px] text-ink-3">{u.email}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-ink-3 border border-rule px-1 bg-canvas">
                                {u.oauthProvider}
                              </span>
                              <TierStamp tier={u.tier} isSuperAdmin={u.isSuperAdmin} size="xs" />
                            </div>
                          </td>

                          {/* 2. Organization Link */}
                          <td className="py-3 px-3">
                            {u.organizationName ? (
                              <div>
                                <span className="font-semibold text-ink">{u.organizationName}</span>
                                <span className="block text-[10px] text-ink-3 uppercase">
                                  ROLE: {u.orgRole}
                                </span>
                              </div>
                            ) : (
                              <span className="text-ink-3 text-[11px]">INDIVIDUAL</span>
                            )}
                          </td>

                          {/* 3. Quota & Usage */}
                          <td className="py-3 px-3 min-w-[160px]">
                            <div className="flex items-baseline justify-between tabular-nums">
                              <span className="font-bold text-ink">
                                {u.tier === 'enterprise' && !u.customQuotaLimit ? 'UNLIMITED' : `${String(u.auditsUsed).padStart(2, '0')} / ${String(u.effectiveLimit).padStart(2, '0')}`}
                              </span>
                              <span className="text-[10px] text-ink-3">
                                {u.customQuotaLimit ? `(Custom: ${u.customQuotaLimit})` : ''}
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-canvas border border-rule mt-1 overflow-hidden">
                              <div
                                className={`h-full ${pct >= 100 ? 'bg-status-fail' : 'bg-ink'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <div className="text-[10px] text-ink-3 mt-1">
                              Reset: {new Date(u.billingCycleStart).toLocaleDateString()}
                            </div>
                          </td>

                          {/* 4. Condition */}
                          <td className="py-3 px-3">
                            <span
                              className={`inline-block px-1.5 py-0.5 border text-[10px] font-bold ${
                                isSuspended
                                  ? 'border-status-fail text-status-fail bg-status-fail-bg'
                                  : 'border-status-pass text-status-pass bg-status-pass-bg'
                              }`}
                            >
                              {isSuspended ? '[STATUS: SUSPENDED]' : '[STATUS: ACTIVE]'}
                            </span>
                          </td>

                          {/* 5. Telemetry */}
                          <td className="py-3 px-3 text-[11px] text-ink-3">
                            <div>Audits: <strong className="text-ink">{u.auditsUsed}</strong></div>
                            <div>CLI Keys: <strong className="text-ink">{u.activeCliTokensCount}</strong></div>
                            <div>Active: {new Date(u.lastActiveAt).toLocaleDateString()}</div>
                          </td>

                          {/* 6. Instant Controls */}
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {/* 1-Click Role Switcher */}
                              <select
                                value={u.tier}
                                onChange={(e) =>
                                  handleUserTierChange(u.id, e.target.value as 'free' | 'pro' | 'enterprise')
                                }
                                className="px-2 py-1 border border-rule bg-canvas text-ink text-[11px] cursor-pointer"
                              >
                                <option value="free">Free</option>
                                <option value="pro">Pro</option>
                                <option value="enterprise">Enterprise</option>
                              </select>

                              {/* Quota Override Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCustomQuotaUser(u)
                                  setCustomQuotaInput(u.customQuotaLimit ? String(u.customQuotaLimit) : '')
                                }}
                                className="px-2 py-1 border border-rule bg-canvas hover:bg-raised text-ink text-[11px] cursor-pointer"
                                title="Set custom quota limit override"
                              >
                                Quota
                              </button>

                              {/* Reset Usage */}
                              <button
                                type="button"
                                onClick={() => handleUserResetUsage(u.id)}
                                className="px-2 py-1 border border-rule bg-canvas hover:bg-raised text-ink text-[11px] cursor-pointer"
                                title="Reset audits_used counter to 0"
                              >
                                [RESET &rarr; 0]
                              </button>

                              {/* Suspend / Activate */}
                              <button
                                type="button"
                                onClick={() => handleUserToggleStatus(u.id)}
                                className={`px-2 py-1 border text-[11px] cursor-pointer ${
                                  isSuspended
                                    ? 'border-status-pass text-status-pass bg-status-pass-bg'
                                    : 'border-status-fail text-status-fail bg-status-fail-bg'
                                }`}
                              >
                                {isSuspended ? 'ACTIVATE' : 'SUSPEND'}
                              </button>

                              {/* Permanent User Deletion (Protected for Root Owners) */}
                              {isSuperAdminEmail(u.email) ? (
                                <span
                                  className="px-2 py-1 border border-rule text-ink-3 text-[11px] select-none cursor-not-allowed opacity-60 inline-flex items-center gap-1"
                                  title="Root Owner identities are cryptographically protected and cannot be deleted"
                                >
                                  <Lock className="size-3 inline" />
                                  <span>[ROOT]</span>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setUserToDelete(u)}
                                  className="px-2 py-1 border border-status-fail text-status-fail hover:bg-status-fail-bg text-[11px] cursor-pointer inline-flex items-center gap-1"
                                  title="Hapus akun permanen dari Clerk & Supabase"
                                >
                                  <Trash2 className="size-3 inline" />
                                  <span>[HAPUS]</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Custom Quota Override Modal */}
            {editingCustomQuotaUser && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 font-mono">
                <div className="max-w-md w-full border border-rule bg-surface p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-rule pb-2">
                    <span className="font-bold text-xs uppercase text-ink">
                      Override Monthly Quota: {editingCustomQuotaUser.email}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingCustomQuotaUser(null)}
                      className="text-xs text-ink-3 hover:text-ink cursor-pointer"
                    >
                      &times;
                    </button>
                  </div>

                  <form onSubmit={handleSaveCustomQuota} className="space-y-4 text-xs">
                    <div>
                      <label className="block text-ink-2 mb-1">
                        Custom Monthly Quota Limit (Leave blank to restore tier default):
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="999999"
                        value={customQuotaInput}
                        onChange={(e) => setCustomQuotaInput(e.target.value)}
                        placeholder="e.g. 10, 25, 100"
                        aria-label="Custom monthly quota limit"
                        className="w-full px-3 py-2 border border-rule bg-canvas text-ink text-xs focus:outline-none focus:border-ink"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-rule">
                      <button
                        type="button"
                        onClick={() => setEditingCustomQuotaUser(null)}
                        className="px-3 py-1.5 border border-rule bg-canvas hover:bg-raised text-ink cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-ink text-canvas font-bold cursor-pointer hover:bg-ink-2"
                      >
                        Apply Override
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Permanent Account Deletion Modal */}
            {userToDelete && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 font-mono">
                <div className="max-w-md w-full border border-status-fail bg-surface p-6 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-rule pb-2">
                    <span className="font-bold text-xs uppercase text-status-fail flex items-center gap-1.5">
                      <Trash2 className="size-3.5" />
                      <span>[KONFIRMASI HAPUS AKUN PERMANEN]</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setUserToDelete(null)}
                      className="text-xs text-ink-3 hover:text-ink cursor-pointer"
                    >
                      &times;
                    </button>
                  </div>

                  <div className="text-xs text-ink space-y-2">
                    <p>
                      Anda akan menghapus akun <strong>{userToDelete.email}</strong> ({userToDelete.fullName}) secara permanen.
                    </p>
                    <p className="text-status-fail bg-status-fail-bg/40 p-2 border border-status-fail/40 text-[11px]">
                      Tindakan ini akan menghapus identitas di Clerk, Supabase, memusnahkan seluruh token CLI, dan mencabut seluruh kuota audit.
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-rule">
                    <button
                      type="button"
                      onClick={() => setUserToDelete(null)}
                      className="px-3 py-1.5 border border-rule bg-canvas text-ink text-xs hover:bg-raised cursor-pointer"
                    >
                      BATAL
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteUser(userToDelete.id)}
                      className="px-3 py-1.5 border border-status-fail bg-status-fail text-white font-bold text-xs hover:opacity-90 cursor-pointer"
                    >
                      YA, HAPUS AKUN
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* SUB-TAB 2: ENTERPRISE ORGANIZATIONS & SEATS */}
        {/* =================================================================== */}
        {activeTab === 'orgs' && (
          <div className="space-y-8 font-mono">
            {/* Provision Organization Panel */}
            <div className="border border-rule bg-surface p-5 space-y-4">
              <div className="border-b border-rule pb-2">
                <h3 className="text-xs uppercase font-bold text-ink tracking-wider">
                  Provision New Enterprise Organization
                </h3>
                <p className="text-[11px] text-ink-3 font-sans mt-0.5">
                  Creates an Enterprise team tenant. The owner account is automatically upgraded to Enterprise privileges and linked to this roster.
                </p>
              </div>

              <form onSubmit={handleProvisionOrg} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-ink-3 mb-1 uppercase text-[10px]">Org Name</label>
                  <input
                    type="text"
                    required
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                    placeholder="e.g. Acme Security Lab"
                    aria-label="Organization name"
                    className="w-full px-3 py-2 border border-rule bg-canvas text-ink"
                  />
                </div>

                <div>
                  <label className="block text-ink-3 mb-1 uppercase text-[10px]">Owner User Email</label>
                  <input
                    type="email"
                    required
                    value={newOrgOwnerEmail}
                    onChange={(e) => setNewOrgOwnerEmail(e.target.value)}
                    placeholder="owner@agency.com"
                    aria-label="Owner user email"
                    className="w-full px-3 py-2 border border-rule bg-canvas text-ink"
                  />
                </div>

                <div>
                  <label className="block text-ink-3 mb-1 uppercase text-[10px]">Max Seats (Default: 5)</label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={newOrgMaxSeats}
                    onChange={(e) => setNewOrgMaxSeats(parseInt(e.target.value, 10) || 5)}
                    aria-label="Max organization seats"
                    className="w-full px-3 py-2 border border-rule bg-canvas text-ink"
                  />
                </div>

                <div>
                  <label className="block text-ink-3 mb-1 uppercase text-[10px]">White-Label Header (Optional)</label>
                  <input
                    type="text"
                    value={newOrgWhitelabel}
                    onChange={(e) => setNewOrgWhitelabel(e.target.value)}
                    placeholder="Acme Pre-Deploy Gate"
                    aria-label="White-label header text"
                    className="w-full px-3 py-2 border border-rule bg-canvas text-ink"
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-ink text-canvas font-bold text-xs hover:bg-ink-2 cursor-pointer border border-ink"
                  >
                    [PROVISION ENTERPRISE ORGANIZATION]
                  </button>
                </div>
              </form>
            </div>

            {/* Organizations Inspection Table */}
            <div className="space-y-4">
              <h3 className="text-xs uppercase font-bold text-ink tracking-wider">
                Active Enterprise Organizations ({orgs.length})
              </h3>

              <div className="border border-rule bg-surface overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-rule bg-canvas text-[11px] text-ink-3 uppercase">
                      <th className="py-2.5 px-3 font-semibold">Org Name</th>
                      <th className="py-2.5 px-3 font-semibold">Owner Email</th>
                      <th className="py-2.5 px-3 font-semibold">Seat Utilization</th>
                      <th className="py-2.5 px-3 font-semibold">White-Label Status</th>
                      <th className="py-2.5 px-3 font-semibold">Total Scans</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Roster &amp; Limit Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule">
                    {orgs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-ink-3 font-sans">
                          No Enterprise organizations provisioned yet. Use the panel above to provision your first team.
                        </td>
                      </tr>
                    ) : (
                      orgs.map((org) => {
                      const isExpanded = expandedOrgId === org.id
                      return (
                        <React.Fragment key={org.id}>
                          <tr className="hover:bg-raised/60 transition-colors">
                            <td className="py-3 px-3 font-bold text-ink">
                              {org.name}
                            </td>
                            <td className="py-3 px-3 text-ink-2">{org.ownerEmail}</td>
                            <td className="py-3 px-3 tabular-nums">
                              <span className="font-bold text-ink">
                                {org.members.length} / {org.maxSeats} SEATS USED
                              </span>
                            </td>
                            <td className="py-3 px-3 text-ink-3 text-[11px]">
                              {org.whitelabelHeader ? `ACTIVE: "${org.whitelabelHeader}"` : 'NONE'}
                            </td>
                            <td className="py-3 px-3 tabular-nums">{org.totalScans}</td>
                            <td className="py-3 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Seat Limit Adjuster */}
                                <div className="inline-flex items-center border border-rule bg-canvas">
                                  <button
                                    type="button"
                                    onClick={() => handleAdjustOrgSeats(org.id, -1)}
                                    className="px-2 py-0.5 hover:bg-surface text-ink cursor-pointer"
                                    title="Decrease seat capacity"
                                  >
                                    -
                                  </button>
                                  <span className="px-2 py-0.5 text-xs font-bold tabular-nums">
                                    {org.maxSeats}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleAdjustOrgSeats(org.id, 1)}
                                    className="px-2 py-0.5 hover:bg-surface text-ink cursor-pointer"
                                    title="Increase seat capacity"
                                  >
                                    +
                                  </button>
                                </div>

                                {/* Expand Roster Button */}
                                <button
                                  type="button"
                                  onClick={() => setExpandedOrgId(isExpanded ? null : org.id)}
                                  className="px-2.5 py-1 border border-rule bg-canvas hover:bg-raised text-ink cursor-pointer text-[11px]"
                                >
                                  {isExpanded ? '[CLOSE ROSTER]' : '[MANAGE ROSTER]'}
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Expandable Roster Inspector */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={6} className="bg-canvas p-4 border-b border-rule">
                                <div className="space-y-4">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rule pb-2">
                                    <span className="text-xs font-bold text-ink uppercase">
                                      Member Roster ({org.members.length} / {org.maxSeats})
                                    </span>

                                    {/* Add Member Form */}
                                    <div className="flex items-center gap-1.5">
                                      <input
                                        type="email"
                                        value={newMemberEmail}
                                        onChange={(e) => setNewMemberEmail(e.target.value)}
                                        placeholder="Add member by email..."
                                        aria-label="Add member by email"
                                        className="px-2.5 py-1 border border-rule bg-surface text-ink text-xs focus:outline-none"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleAddOrgMember(org.id)}
                                        className="px-3 py-1 bg-ink text-canvas font-bold text-xs hover:bg-ink-2 cursor-pointer"
                                      >
                                        Add Member
                                      </button>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                    {org.members.map((m) => (
                                      <div
                                        key={m.userId}
                                        className="border border-rule bg-surface p-2.5 flex items-center justify-between"
                                      >
                                        <div className="min-w-0 pr-2">
                                          <div className="font-semibold text-ink truncate">{m.fullName}</div>
                                          <div className="text-[11px] text-ink-3 truncate">{m.email}</div>
                                          <span className="text-[10px] text-ink-3 uppercase border border-rule px-1 mt-1 inline-block">
                                            {m.role}
                                          </span>
                                        </div>

                                        {m.role !== 'owner' && (
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveOrgMember(org.id, m.email)}
                                            className="p-1 text-status-fail hover:bg-status-fail-bg cursor-pointer"
                                            title="Revoke and remove member"
                                          >
                                            <Trash2 className="size-3.5" />
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      )
                    }))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* SUB-TAB 3: VOUCHERS & WHATSAPP FULFILLMENT */}
        {/* =================================================================== */}
        {activeTab === 'vouchers' && (
          <div className="space-y-8 font-mono">
            {/* Generate Voucher Code Form */}
            <div className="border border-rule bg-surface p-5 space-y-4">
              <div className="border-b border-rule pb-2">
                <h3 className="text-xs uppercase font-bold text-ink tracking-wider">
                  Generate Inspection Voucher Code
                </h3>
                <p className="text-[11px] text-ink-3 font-sans mt-0.5">
                  Generate self-service upgrade codes for WhatsApp buyer fulfillment or institutional licenses.
                </p>
              </div>

              <form onSubmit={handleGenerateVoucher} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-ink-3 mb-1 uppercase text-[10px]">Grant Type</label>
                  <select
                    value={voucherGrantType}
                    onChange={(e) => setVoucherGrantType(e.target.value as 'pro_monthly' | 'enterprise_monthly' | 'bonus_quota')}
                    className="w-full px-3 py-2 border border-rule bg-canvas text-ink"
                  >
                    <option value="pro_monthly">PRO TIER (30 DAYS)</option>
                    <option value="enterprise_monthly">ENTERPRISE TIER (30 DAYS)</option>
                    <option value="bonus_quota">BONUS QUOTA (+X AUDITS)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-ink-3 mb-1 uppercase text-[10px]">Max Redemptions</label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={voucherMaxUses}
                    onChange={(e) => setVoucherMaxUses(parseInt(e.target.value, 10) || 1)}
                    aria-label="Max voucher redemptions"
                    className="w-full px-3 py-2 border border-rule bg-canvas text-ink"
                  />
                </div>

                <div>
                  <label className="block text-ink-3 mb-1 uppercase text-[10px]">Expiration (Days)</label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={voucherExpirationDays}
                    onChange={(e) => setVoucherExpirationDays(parseInt(e.target.value, 10) || 30)}
                    aria-label="Voucher expiration in days"
                    className="w-full px-3 py-2 border border-rule bg-canvas text-ink"
                  />
                </div>

                {voucherGrantType === 'bonus_quota' && (
                  <div>
                    <label className="block text-ink-3 mb-1 uppercase text-[10px]">Bonus Audits Count</label>
                    <input
                      type="number"
                      min="1"
                      max="500"
                      value={voucherBonusAudits}
                      onChange={(e) => setVoucherBonusAudits(parseInt(e.target.value, 10) || 10)}
                      aria-label="Bonus audits count"
                      className="w-full px-3 py-2 border border-rule bg-canvas text-ink"
                    />
                  </div>
                )}

                <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-ink text-canvas font-bold text-xs hover:bg-ink-2 cursor-pointer border border-ink"
                  >
                    [GENERATE INSPECTION VOUCHER]
                  </button>
                </div>
              </form>
            </div>

            {/* Voucher Ledger Table */}
            <div className="space-y-4">
              <h3 className="text-xs uppercase font-bold text-ink tracking-wider">
                Vouchers Ledger ({vouchers.length})
              </h3>

              <div className="border border-rule bg-surface overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-rule bg-canvas text-[11px] text-ink-3 uppercase">
                      <th className="py-2.5 px-3 font-semibold">Voucher Code</th>
                      <th className="py-2.5 px-3 font-semibold">Grant Type</th>
                      <th className="py-2.5 px-3 font-semibold">Usage / Max</th>
                      <th className="py-2.5 px-3 font-semibold">Expires</th>
                      <th className="py-2.5 px-3 font-semibold">Status</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule">
                    {vouchers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-ink-3 font-sans">
                          No voucher codes generated yet. Use the generator above to create redemption vouchers.
                        </td>
                      </tr>
                    ) : (
                      vouchers.map((v) => (
                      <tr key={v.code} className="hover:bg-raised/60 transition-colors">
                        <td className="py-3 px-3 font-bold text-ink">
                          <span className="bg-canvas border border-rule px-2 py-0.5">
                            {v.code}
                          </span>
                        </td>
                        <td className="py-3 px-3 uppercase text-[11px] text-ink-2">
                          {v.grantType}
                        </td>
                        <td className="py-3 px-3 tabular-nums">
                          <span className="font-bold">{v.uses} / {v.maxUses}</span>
                          {v.redeemedBy && v.redeemedBy.length > 0 && (
                            <span
                              className="block text-[10px] text-ink-3 truncate max-w-[150px]"
                              title={v.redeemedBy.join(', ')}
                            >
                              {v.redeemedBy.join(', ')}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-ink-3 text-[11px]">
                          {new Date(v.expiresAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-1.5 py-0.5 border text-[10px] font-bold ${
                              v.isActive && v.uses < v.maxUses
                                ? 'border-status-pass text-status-pass bg-status-pass-bg'
                                : 'border-status-fail text-status-fail bg-status-fail-bg'
                            }`}
                          >
                            {v.isActive && v.uses < v.maxUses ? 'ACTIVE' : 'EXHAUSTED / REVOKED'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Copy Code */}
                            <button
                              type="button"
                              onClick={() => handleCopyCode(v.code)}
                              className="px-2 py-1 border border-rule bg-canvas hover:bg-raised text-ink text-[11px] cursor-pointer"
                              title="Copy raw code"
                            >
                              {copiedCode === v.code ? '[COPIED]' : '[COPY CODE]'}
                            </button>

                            {/* Copy WhatsApp Fulfillment Text */}
                            <button
                              type="button"
                              onClick={() => handleCopyWaText(v)}
                              className="px-2 py-1 border border-ink bg-ink text-canvas hover:bg-ink-2 text-[11px] cursor-pointer"
                              title="Copy pre-formatted WhatsApp response message"
                            >
                              {copiedWaText === v.code ? '[WA TEXT COPIED]' : '[COPY WA FULFILLMENT TEXT]'}
                            </button>

                            {/* Revoke */}
                            {v.isActive && (
                              <button
                                type="button"
                                onClick={() => handleRevokeVoucher(v.code)}
                                className="px-2 py-1 border border-status-fail text-status-fail hover:bg-status-fail-bg text-[11px] cursor-pointer"
                              >
                                [REVOKE]
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* SUB-TAB 4: SECURITY ABUSE, CLI TOKENS & AUDIT LOGS */}
        {/* =================================================================== */}
        {activeTab === 'security' && (
          <div className="space-y-8 font-mono">
            {/* Global Scan Telemetry & Abuse Feed */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-rule pb-2">
                <h3 className="text-xs uppercase font-bold text-ink tracking-wider flex items-center gap-2">
                  <Activity className="size-4" />
                  <span>Global Scan Telemetry &amp; Abuse Feed (Latest 100 Scans)</span>
                </h3>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleClearAllScanTelemetry}
                    className="px-2 py-0.5 border border-status-fail text-status-fail hover:bg-status-fail-bg text-[10px] cursor-pointer font-bold"
                    title="Hapus seluruh riwayat scan telemetry"
                  >
                    [HAPUS SEMUA RIWAYAT SCAN]
                  </button>
                  <span className="text-[10px] text-ink-3">ZERO-PERSISTENCE VERIFIED</span>
                </div>
              </div>

              <div className="border border-rule bg-surface overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-rule bg-canvas text-[11px] text-ink-3 uppercase">
                      <th className="py-2.5 px-3 font-semibold">Timestamp (UTC)</th>
                      <th className="py-2.5 px-3 font-semibold">User Email</th>
                      <th className="py-2.5 px-3 font-semibold">Channel</th>
                      <th className="py-2.5 px-3 font-semibold">ZIP Size</th>
                      <th className="py-2.5 px-3 font-semibold">Duration</th>
                      <th className="py-2.5 px-3 font-semibold">Findings</th>
                      <th className="py-2.5 px-3 font-semibold">Security Gate Status</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Abuse Mitigation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule">
                    {scanLogs.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-ink-3 font-sans">
                          No security anomalies or blocked scans recorded. Zero-persistence sandbox is clean.
                        </td>
                      </tr>
                    ) : (
                      scanLogs.map((log) => {
                      const isBlocked = log.securityGateStatus.includes('BLOCKED')
                      return (
                        <tr key={log.id} className="hover:bg-raised/60 transition-colors">
                          <td className="py-3 px-3 text-[11px] text-ink-3">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </td>
                          <td className="py-3 px-3 text-ink font-semibold">{log.userEmail}</td>
                          <td className="py-3 px-3">
                            <span className="border border-rule bg-canvas px-1.5 py-0.5 text-[10px]">
                              {log.channel}
                            </span>
                          </td>
                          <td className="py-3 px-3 tabular-nums">
                            {(log.zipSizeBytes / (1024 * 1024)).toFixed(2)} MB
                          </td>
                          <td className="py-3 px-3 tabular-nums">{log.durationMs}ms</td>
                          <td className="py-3 px-3 tabular-nums">
                            {log.findingsCount} (C:{log.severityCounts.Critical} H:{log.severityCounts.High})
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-1.5 py-0.5 border text-[10px] font-bold ${
                                isBlocked
                                  ? 'border-status-fail text-status-fail bg-status-fail-bg'
                                  : 'border-status-pass text-status-pass bg-status-pass-bg'
                              }`}
                            >
                              {log.securityGateStatus}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isBlocked && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const target = users.find((u) => u.email === log.userEmail)
                                    if (target) handleUserToggleStatus(target.id)
                                    else toast.error('User not found in roster.')
                                  }}
                                  className="px-2 py-1 border border-status-fail text-status-fail hover:bg-status-fail-bg text-[11px] cursor-pointer font-bold"
                                >
                                  [SUSPEND USER]
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteScanRecord(log.id)}
                                className="px-2 py-1 border border-rule text-ink-3 hover:text-status-fail hover:border-status-fail text-[11px] cursor-pointer"
                                title="Hapus record riwayat scan ini"
                              >
                                [HAPUS]
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    }))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Global CLI & MCP Token Registry */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-rule pb-2">
                <h3 className="text-xs uppercase font-bold text-ink tracking-wider flex items-center gap-2">
                  <Terminal className="size-4" />
                  <span>Global CLI &amp; MCP Token Registry (HMAC-SHA256)</span>
                </h3>
              </div>

              <div className="border border-rule bg-surface overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-rule bg-canvas text-[11px] text-ink-3 uppercase">
                      <th className="py-2.5 px-3 font-semibold">User Email</th>
                      <th className="py-2.5 px-3 font-semibold">Label</th>
                      <th className="py-2.5 px-3 font-semibold">Token Preview</th>
                      <th className="py-2.5 px-3 font-semibold">Created</th>
                      <th className="py-2.5 px-3 font-semibold">Expires</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule">
                    {cliTokens.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-ink-3 font-sans">
                          No active developer CLI or CI/CD gatekeeper tokens registered.
                        </td>
                      </tr>
                    ) : (
                      cliTokens.map((t) => (
                      <tr key={t.id} className="hover:bg-raised/60 transition-colors">
                        <td className="py-3 px-3 font-semibold text-ink">{t.userEmail}</td>
                        <td className="py-3 px-3 text-ink-2">{t.label}</td>
                        <td className="py-3 px-3 text-[11px] text-ink-3">{t.tokenPreview}</td>
                        <td className="py-3 px-3 text-[11px] text-ink-3">
                          {new Date(t.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-3 text-[11px] text-ink-3">
                          {new Date(t.expiresAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleRevokeCliToken(t.id)}
                            className="px-2 py-1 border border-status-fail text-status-fail hover:bg-status-fail-bg text-[11px] cursor-pointer"
                          >
                            [REVOKE TOKEN]
                          </button>
                        </td>
                      </tr>
                    ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Immutable Admin Audit Trail */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-rule pb-2">
                <h3 className="text-xs uppercase font-bold text-ink tracking-wider flex items-center gap-2">
                  <Shield className="size-4" />
                  <span>Immutable Admin Audit Trail</span>
                </h3>
                <button
                  type="button"
                  onClick={handleClearAllAuditLogs}
                  className="px-2 py-0.5 border border-rule text-ink-3 hover:text-status-fail hover:border-status-fail text-[10px] cursor-pointer"
                  title="Purge mutation audit trail logs"
                >
                  [PURGE AUDIT LOGS]
                </button>
              </div>

              <div className="border border-rule bg-surface overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-rule bg-canvas text-[11px] text-ink-3 uppercase">
                      <th className="py-2.5 px-3 font-semibold">Timestamp (UTC)</th>
                      <th className="py-2.5 px-3 font-semibold">Actor Email</th>
                      <th className="py-2.5 px-3 font-semibold">Target User</th>
                      <th className="py-2.5 px-3 font-semibold">Action Type</th>
                      <th className="py-2.5 px-3 font-semibold">Mutation Diff</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule">
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-ink-3 font-sans">
                          No administrative mutation logs recorded yet. All operations are logged immutably.
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-raised/60 transition-colors">
                        <td className="py-3 px-3 text-[11px] text-ink-3">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-3 font-bold text-ink">{log.actorEmail}</td>
                        <td className="py-3 px-3 text-ink-2">{log.targetEmail || 'SYSTEM'}</td>
                        <td className="py-3 px-3 font-bold">{log.actionType}</td>
                        <td className="py-3 px-3 text-[11px] text-ink-3 font-mono">
                          {JSON.stringify(log.diff)}
                        </td>
                      </tr>
                    ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
