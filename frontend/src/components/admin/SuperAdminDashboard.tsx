import React, { useState, useEffect } from 'react'
import { useStore } from '../../state/store'
import {
  adminFetchMetrics,
  adminFetchUsers,
  adminUpdateUser,
  adminFetchOrganizations,
  adminUpdateOrgSeats,
  type AdminMetrics,
  type AdminUserRecord,
  type OrganizationData,
} from '../../lib/supabase'
import { TierBadge } from '../ui/TierBadge'
import { toast } from '../ui/Toast'
import {
  Users,
  Building2,
  Activity,
  Search,
  RotateCcw,
  ChevronLeft,
  CheckCircle2,
  Lock,
  Shield,
} from 'lucide-react'

interface SuperAdminDashboardProps {
  onNavigate?: (path: string) => void
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ onNavigate }) => {
  const user = useStore((s) => s.auth.user)
  const isSuperAdmin = Boolean(user?.isSuperAdmin)

  const [activeTab, setActiveTab] = useState<'users' | 'orgs'>('users')
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null)
  const [users, setUsers] = useState<AdminUserRecord[]>([])
  const [orgs, setOrgs] = useState<OrganizationData[]>([])

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('')
  const [tierFilter, setTierFilter] = useState('all')

  // Quota Override Modal State
  const [editingQuotaUser, setEditingQuotaUser] = useState<AdminUserRecord | null>(null)
  const [customQuotaInput, setCustomQuotaInput] = useState<string>('')

  // Seat Adjustment State
  const [editingOrg, setEditingOrg] = useState<OrganizationData | null>(null)
  const [seatsInput, setSeatsInput] = useState<number>(5)

  const loadData = async () => {
    const [m, u, o] = await Promise.all([
      adminFetchMetrics(),
      adminFetchUsers(searchQuery, tierFilter),
      adminFetchOrganizations(),
    ])
    setMetrics(m)
    setUsers(u.users)
    setOrgs(o.orgs)
  }

  useEffect(() => {
    if (!isSuperAdmin) return
    let active = true
    void (async () => {
      const [m, u, o] = await Promise.all([
        adminFetchMetrics(),
        adminFetchUsers(searchQuery, tierFilter),
        adminFetchOrganizations(),
      ])
      if (active) {
        setMetrics(m)
        setUsers(u.users)
        setOrgs(o.orgs)
      }
    })()
    return () => {
      active = false
    }
  }, [isSuperAdmin, searchQuery, tierFilter])

  const handleBackToConsole = () => {
    if (onNavigate) {
      onNavigate('/console')
    } else if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/console')
      window.dispatchEvent(new PopStateEvent('popstate'))
    }
  }

  // --------------------------------------------------------------------------
  // USER ACTIONS
  // --------------------------------------------------------------------------
  const handleChangeTier = async (userId: string, newTier: 'free' | 'pro' | 'enterprise') => {
    const res = await adminUpdateUser(userId, { tier: newTier })
    if (res.success) {
      toast.success(res.message)
      await loadData()
    } else {
      toast.error(res.message)
    }
  }

  const handleToggleStatus = async (userRecord: AdminUserRecord) => {
    const nextStatus = userRecord.accountStatus === 'active' ? 'suspended' : 'active'
    const res = await adminUpdateUser(userRecord.id, { accountStatus: nextStatus })
    if (res.success) {
      toast.success(res.message)
      await loadData()
    } else {
      toast.error(res.message)
    }
  }

  const handleResetQuota = async (userId: string) => {
    const res = await adminUpdateUser(userId, { resetQuota: true })
    if (res.success) {
      toast.success('Penggunaan kuota audit direset ke 0.')
      await loadData()
    } else {
      toast.error(res.message)
    }
  }

  const handleToggleSuperAdmin = async (userRecord: AdminUserRecord) => {
    const nextVal = !userRecord.isSuperAdmin
    const confirmed = window.confirm(
      nextVal
        ? `Berikan hak Super Admin kepada ${userRecord.email}?`
        : `Cabut hak Super Admin dari ${userRecord.email}?`
    )
    if (!confirmed) return

    const res = await adminUpdateUser(userRecord.id, { isSuperAdmin: nextVal })
    if (res.success) {
      toast.success(res.message)
      await loadData()
    } else {
      toast.error(res.message)
    }
  }

  const handleSaveCustomQuota = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingQuotaUser) return

    const limitVal = customQuotaInput.trim() === '' ? null : parseInt(customQuotaInput, 10)
    if (limitVal !== null && isNaN(limitVal)) {
      toast.error('Nilai kuota tidak valid.')
      return
    }

    const res = await adminUpdateUser(editingQuotaUser.id, { customQuotaLimit: limitVal })
    if (res.success) {
      toast.success(res.message)
      setEditingQuotaUser(null)
      await loadData()
    } else {
      toast.error(res.message)
    }
  }

  const handleSaveSeats = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingOrg) return

    const res = await adminUpdateOrgSeats(editingOrg.id, seatsInput)
    if (res.success) {
      toast.success(res.message)
      setEditingOrg(null)
      await loadData()
    } else {
      toast.error(res.message)
    }
  }

  // --------------------------------------------------------------------------
  // ACCESS DENIED VIEW
  // --------------------------------------------------------------------------
  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-[#09090B] text-zinc-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-2xl border border-red-500/20 bg-[#121215] p-8 text-center space-y-4">
          <div className="size-12 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto">
            <Lock className="size-6" strokeWidth={1.5} />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Akses Ditolak: Super Admin Only</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Halaman ini khusus untuk System Owner dan Super Admin platform ShipSafe. Hubungi administrator utama jika Anda memerlukan akses.
          </p>
          <button
            type="button"
            onClick={handleBackToConsole}
            className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs transition-colors cursor-pointer"
          >
            Kembali ke Security Console
          </button>
        </div>
      </div>
    )
  }

  // --------------------------------------------------------------------------
  // SUPER ADMIN DASHBOARD
  // --------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 font-sans selection:bg-white selection:text-black">
      {/* Top Navbar */}
      <header className="border-b border-white/10 bg-[#09090B]/90 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBackToConsole}
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronLeft className="size-4" strokeWidth={1.5} />
            <span>Kembali ke Console</span>
          </button>
          <span className="text-zinc-600">/</span>
          <span className="text-xs font-mono text-zinc-300">ShipSafe Super Admin</span>
        </div>
        <div className="flex items-center gap-2">
          <TierBadge tier="enterprise" isSuperAdmin={true} />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Title & Subtitle */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Shield className="size-6 text-white" strokeWidth={1.5} />
            <span>Mission Control & Platform Administration</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Pantau metrik audit real-time, kontrol kuota kustom, kelola hak akses pengguna, dan konfigurasikan kapasitas organisasi enterprise.
          </p>
        </div>

        {/* Overview Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Total Users */}
          <div className="rounded-xl border border-white/10 bg-[#121215] p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Total Users</span>
              <Users className="size-4 text-zinc-400" strokeWidth={1.5} />
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-white">
              {metrics?.totalUsers ?? '...'}
            </div>
            <div className="flex items-center gap-2 mt-2 text-[10px] font-mono text-zinc-400">
              <span className="text-zinc-300">{metrics?.freeUsers || 0} Free</span> /
              <span className="text-white">{metrics?.proUsers || 0} Pro</span> /
              <span className="text-amber-300">{metrics?.enterpriseUsers || 0} Ent</span>
            </div>
          </div>

          {/* Audits This Month */}
          <div className="rounded-xl border border-white/10 bg-[#121215] p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Audits This Month</span>
              <Activity className="size-4 text-white" strokeWidth={1.5} />
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-white">
              {metrics?.totalAuditsThisMonth ?? '...'}
            </div>
            <div className="text-[10px] font-mono text-zinc-400 mt-2 flex items-center gap-1">
              <CheckCircle2 className="size-3 text-white" />
              <span>Zero compute exhaustion</span>
            </div>
          </div>

          {/* Active Organizations */}
          <div className="rounded-xl border border-white/10 bg-[#121215] p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Active Teams / Orgs</span>
              <Building2 className="size-4 text-amber-300" strokeWidth={1.5} />
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-white">
              {metrics?.activeOrganizations ?? '...'}
            </div>
            <div className="text-[10px] font-mono text-zinc-400 mt-2">
              Multi-tenant isolated
            </div>
          </div>

          {/* System Health */}
          <div className="rounded-xl border border-white/10 bg-[#121215] p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Sandbox Status</span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-white">
              {metrics?.sandboxStatus || 'Healthy'}
            </div>
            <div className="text-[10px] font-mono text-zinc-400 mt-2">
              Uptime {metrics?.systemUptime || '99.98%'}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`py-1.5 px-4 rounded-lg font-mono text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'users'
                ? 'bg-white/10 text-white border border-white/20'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            User Management ({users.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('orgs')}
            className={`py-1.5 px-4 rounded-lg font-mono text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'orgs'
                ? 'bg-white/10 text-white border border-white/20'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Enterprise Organizations ({orgs.length})
          </button>
        </div>

        {/* TAB 1: USER MANAGEMENT */}
        {activeTab === 'users' && (
          <section className="rounded-2xl border border-white/10 bg-[#121215] p-6 space-y-5">
            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" strokeWidth={1.5} />
                <input
                  type="text"
                  placeholder="Cari user berdasarkan nama, email, atau organisasi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-white/10 bg-black/40 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/40 font-mono"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-zinc-400">Filter Tier:</span>
                <select
                  value={tierFilter}
                  onChange={(e) => setTierFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-white/10 bg-black/40 text-xs font-mono text-white focus:outline-none focus:border-white/40"
                >
                  <option value="all">Semua Tier</option>
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-zinc-400 font-mono text-[11px] uppercase tracking-wider">
                    <th className="py-2.5 px-3">User</th>
                    <th className="py-2.5 px-3">Tier</th>
                    <th className="py-2.5 px-3">Organisasi</th>
                    <th className="py-2.5 px-3">Audit Quota</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Super Admin</th>
                    <th className="py-2.5 px-3 text-right">Quick Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {users.map((u) => {
                    const isSuspended = u.accountStatus === 'suspended'
                    return (
                      <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                        {/* User Identity */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="size-7 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center font-mono text-[11px] font-semibold text-zinc-300 shrink-0">
                              {((u.fullName || u.email)[0] || 'U').toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium text-white block">{u.fullName}</span>
                                {u.isSuperAdmin && (
                                  <span className="text-[9px] font-mono text-white bg-white/10 px-1 py-0.2 rounded border border-white/20">
                                    ROOT
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] font-mono text-zinc-400 block">{u.email}</span>
                            </div>
                          </div>
                        </td>

                        {/* Tier Switcher Dropdown */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <TierBadge tier={u.tier} size="xs" />
                            <select
                              value={u.tier}
                              onChange={(e) => handleChangeTier(u.id, e.target.value as any)}
                              className="bg-black/60 border border-white/10 text-[10px] font-mono text-zinc-300 rounded px-1.5 py-0.5 cursor-pointer hover:border-white/30 focus:outline-none"
                              title="Ganti tier secara langsung"
                            >
                              <option value="free">Free</option>
                              <option value="pro">Pro</option>
                              <option value="enterprise">Enterprise</option>
                            </select>
                          </div>
                        </td>

                        {/* Organization */}
                        <td className="py-3 px-3 font-mono text-zinc-300 text-[11px]">
                          {u.organizationName ? (
                            <span className="inline-flex items-center gap-1 text-amber-300">
                              <Building2 className="size-3 shrink-0" />
                              <span className="truncate max-w-[120px]">{u.organizationName}</span>
                            </span>
                          ) : (
                            <span className="text-zinc-500">Individual</span>
                          )}
                        </td>

                        {/* Usage & Quota Override */}
                        <td className="py-3 px-3 font-mono">
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-200">
                              {u.auditsUsed} / {u.effectiveLimit >= 999999 ? '∞' : u.effectiveLimit}
                            </span>
                            {u.customQuotaLimit && (
                              <span className="text-[9px] text-amber-400 bg-amber-500/10 px-1 rounded border border-amber-500/20">
                                Custom
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingQuotaUser(u)
                                setCustomQuotaInput(u.customQuotaLimit ? String(u.customQuotaLimit) : '')
                              }}
                              className="text-[10px] text-zinc-400 hover:text-white underline cursor-pointer"
                              title="Atur limit kuota khusus"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleResetQuota(u.id)}
                              className="p-1 text-zinc-500 hover:text-white transition-colors cursor-pointer"
                              title="Reset pemakaian kuota ke 0"
                            >
                              <RotateCcw className="size-3" />
                            </button>
                          </div>
                        </td>

                        {/* Status Toggle */}
                        <td className="py-3 px-3 font-mono">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(u)}
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer transition-colors ${
                              isSuspended
                                ? 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20'
                                : 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
                            }`}
                            title="Klik untuk mengubah status akun"
                          >
                            {isSuspended ? 'SUSPENDED' : 'ACTIVE'}
                          </button>
                        </td>

                        {/* Super Admin Status */}
                        <td className="py-3 px-3 font-mono">
                          <button
                            type="button"
                            onClick={() => handleToggleSuperAdmin(u)}
                            className={`px-2 py-0.5 rounded text-[10px] cursor-pointer transition-colors ${
                              u.isSuperAdmin
                                ? 'bg-white/10 text-white border border-white/20'
                                : 'bg-white/5 text-zinc-500 border border-white/10 hover:text-zinc-300'
                            }`}
                            title="Klik untuk toggle hak Super Admin"
                          >
                            {u.isSuperAdmin ? 'YES' : 'NO'}
                          </button>
                        </td>

                        {/* Quick Controls */}
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              const note = `Akun ${u.email} (${u.tier.toUpperCase()}) - Usage: ${u.auditsUsed}/${u.effectiveLimit}`
                              navigator.clipboard.writeText(note)
                              toast.success('Info user disalin ke clipboard.')
                            }}
                            className="text-[11px] font-mono text-zinc-400 hover:text-white cursor-pointer"
                          >
                            Salin Info
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* TAB 2: ENTERPRISE ORGANIZATIONS */}
        {activeTab === 'orgs' && (
          <section className="rounded-2xl border border-white/10 bg-[#121215] p-6 space-y-6">
            <div>
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Building2 className="size-4 text-amber-300" strokeWidth={1.5} />
                <span>Enterprise Organizations & Seat Limits</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Konfigurasi batas kursi (`max_seats`) untuk setiap tim/agensi enterprise (misalnya 4, 10, 25, atau 50 kursi).
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-zinc-400 font-mono text-[11px] uppercase tracking-wider">
                    <th className="py-2.5 px-3">Organisasi</th>
                    <th className="py-2.5 px-3">Owner</th>
                    <th className="py-2.5 px-3">Kursi Terpakai / Maksimal</th>
                    <th className="py-2.5 px-3">White-Label Branding</th>
                    <th className="py-2.5 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {orgs.map((org) => (
                    <tr key={org.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-3">
                        <span className="font-semibold text-white block">{org.name}</span>
                        <span className="text-[10px] font-mono text-zinc-500 block">ID: {org.id}</span>
                      </td>
                      <td className="py-3 px-3 font-mono text-zinc-300 text-[11px]">
                        {org.ownerEmail || org.ownerId}
                      </td>
                      <td className="py-3 px-3 font-mono">
                        <span className="text-white font-bold">{org.members.length}</span>
                        <span className="text-zinc-400"> / {org.maxSeats} kursi</span>
                      </td>
                      <td className="py-3 px-3 text-[11px]">
                        {org.whitelabelCompanyName ? (
                          <span className="text-white font-mono">
                            {org.whitelabelCompanyName}
                          </span>
                        ) : (
                          <span className="text-zinc-500 font-mono">Default ShipSafe</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingOrg(org)
                            setSeatsInput(org.maxSeats)
                          }}
                          className="py-1 px-3 rounded-lg border border-white/20 bg-white/10 text-white hover:bg-white/20 text-xs font-mono transition-colors cursor-pointer"
                        >
                          Ubah Kursi
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>

      {/* MODAL: CUSTOM QUOTA OVERRIDE */}
      {editingQuotaUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#121215] p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Atur Limit Kuota Kustom</h3>
            <p className="text-xs text-zinc-400 mb-4">
              Atur kuota audit bulanan untuk <span className="text-white font-mono">{editingQuotaUser.email}</span>. Kosongkan untuk menggunakan batas default tier ({editingQuotaUser.tier}).
            </p>

            <form onSubmit={handleSaveCustomQuota} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-zinc-300 mb-1">
                  Batas Scan / Bulan (Angka)
                </label>
                <input
                  type="number"
                  min="0"
                  max="1000000"
                  placeholder="Contoh: 100 (atau kosongkan)"
                  value={customQuotaInput}
                  onChange={(e) => setCustomQuotaInput(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-white/10 bg-black/50 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/40 font-mono"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-medium text-xs transition-colors cursor-pointer"
                >
                  Simpan Perubahan
                </button>
                <button
                  type="button"
                  onClick={() => setEditingQuotaUser(null)}
                  className="py-2 px-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 text-xs transition-colors cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADJUST MAX SEATS */}
      {editingOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#121215] p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Ubah Kapasitas Kursi Tim</h3>
            <p className="text-xs text-zinc-400 mb-4">
              Organisasi: <span className="text-white font-semibold">{editingOrg.name}</span>
            </p>

            <form onSubmit={handleSaveSeats} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-zinc-300 mb-1">
                  Jumlah Kursi Maksimal (Seats)
                </label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  required
                  value={seatsInput}
                  onChange={(e) => setSeatsInput(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3.5 py-2 rounded-xl border border-white/10 bg-black/50 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 font-mono"
                />
                <span className="text-[10px] text-zinc-500 font-mono mt-1 block">
                  Misalnya: 4, 10, 25, atau 50 kursi.
                </span>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs transition-colors cursor-pointer"
                >
                  Perbarui Kursi
                </button>
                <button
                  type="button"
                  onClick={() => setEditingOrg(null)}
                  className="py-2 px-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 text-xs transition-colors cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
