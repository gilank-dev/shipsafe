import React, { useState, useEffect } from 'react'
import { useStore } from '../../state/store'
import {
  fetchOrganizationData,
  inviteTeamMember,
  removeTeamMember,
  updateOrgBranding,
  regenerateOrgApiKey,
  type OrganizationData,
} from '../../lib/supabase'
import { TierBadge } from '../ui/TierBadge'
import { toast } from '../ui/Toast'
import {
  Users,
  Building2,
  UserPlus,
  Trash2,
  Key,
  Copy,
  Check,
  RefreshCw,
  ChevronLeft,
  FileCheck,
} from 'lucide-react'

interface TeamManagementPageProps {
  onNavigate?: (path: string) => void
}

export const TeamManagementPage: React.FC<TeamManagementPageProps> = ({ onNavigate }) => {
  const user = useStore((s) => s.auth.user)
  const quota = useStore((s) => s.quota)

  const effectiveTier = user?.organizationId ? 'enterprise' : (user?.tier || quota?.tier || 'free')
  const isTeamUser = Boolean(user && (user.organizationId || user.organizationName || effectiveTier === 'enterprise' || user.isSuperAdmin))

  const [orgData, setOrgData] = useState<OrganizationData | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [isInviting, setIsInviting] = useState(false)
  const [copiedKey, setCopiedKey] = useState(false)

  // White-label form state
  const [companyName, setCompanyName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [isSavingBranding, setIsSavingBranding] = useState(false)

  const handleBackToConsole = () => {
    if (onNavigate) {
      onNavigate('/console')
    } else if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/console')
      window.dispatchEvent(new PopStateEvent('popstate'))
    }
  }

  // Non-team users are strictly prevented from viewing this page
  useEffect(() => {
    if (!isTeamUser) {
      handleBackToConsole()
    }
  }, [isTeamUser])

  useEffect(() => {
    let active = true
    const loadOrg = async () => {
      const res = await fetchOrganizationData(user?.organizationId || undefined)
      if (active && res.data) {
        setOrgData(res.data)
        setCompanyName(res.data.whitelabelCompanyName || res.data.name)
        setLogoUrl(res.data.whitelabelLogoUrl || '')
      }
    }
    void loadOrg()
    return () => {
      active = false
    }
  }, [user?.organizationId])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgData || !inviteEmail.trim()) return

    setIsInviting(true)
    const res = await inviteTeamMember(orgData.id, inviteEmail)
    setIsInviting(false)

    if (res.success) {
      toast.success(res.message)
      setInviteEmail('')
      const updated = await fetchOrganizationData(orgData.id)
      if (updated.data) setOrgData(updated.data)
    } else {
      toast.error(res.message)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!orgData) return
    const confirmed = window.confirm('Apakah Anda yakin ingin menghapus anggota ini dari organisasi?')
    if (!confirmed) return

    const res = await removeTeamMember(orgData.id, memberId)
    if (res.success) {
      toast.success(res.message)
      const updated = await fetchOrganizationData(orgData.id)
      if (updated.data) setOrgData(updated.data)
    } else {
      toast.error(res.message)
    }
  }

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgData) return
    setIsSavingBranding(true)
    const res = await updateOrgBranding(orgData.id, companyName, logoUrl)
    setIsSavingBranding(false)
    if (res.success) {
      toast.success('Pengaturan White-Label branding berhasil disimpan.')
    } else {
      toast.error('Gagal menyimpan branding.')
    }
  }

  const handleCopyKey = () => {
    if (!orgData?.apiKey) return
    navigator.clipboard.writeText(orgData.apiKey).then(() => {
      setCopiedKey(true)
      toast.success('Organization API key berhasil disalin.')
      setTimeout(() => setCopiedKey(false), 2000)
    })
  }

  const handleRegenerateKey = async () => {
    if (!orgData) return
    const confirmed = window.confirm(
      'Regenerasi API key akan membatalkan token CI/CD yang sedang aktif. Lanjutkan?'
    )
    if (!confirmed) return

    const res = await regenerateOrgApiKey(orgData.id)
    if (res.apiKey) {
      setOrgData({ ...orgData, apiKey: res.apiKey })
      toast.success('Organization API key baru berhasil dibuat.')
    }
  }

  const isOwner = orgData?.ownerId === user?.id || user?.isSuperAdmin
  const seatsUsed = orgData?.members.length || 0
  const maxSeats = orgData?.maxSeats || 5
  const isSeatFull = seatsUsed >= maxSeats

  if (!isTeamUser) {
    return null
  }

  return (
    <div className="min-h-screen bg-canvas text-ink font-sans">
      {/* Top Header */}
      <header className="border-b border-rule bg-surface sticky top-0 z-40 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBackToConsole}
            className="inline-flex items-center gap-1.5 text-xs text-ink-2 hover:text-ink transition-colors cursor-pointer font-mono"
          >
            <ChevronLeft className="size-4" strokeWidth={1.5} />
            <span>Kembali ke Console</span>
          </button>
          <span className="text-rule select-none">/</span>
          <span className="text-xs font-mono text-ink">Organization Settings</span>
        </div>
        <div className="flex items-center gap-2">
          <TierBadge tier="enterprise" isSuperAdmin={user?.isSuperAdmin} />
          {user?.isSuperAdmin && (
            <button
              type="button"
              onClick={() => {
                if (onNavigate) onNavigate('/admin')
                else if (typeof window !== 'undefined') {
                  window.history.pushState({}, '', '/admin')
                  window.dispatchEvent(new PopStateEvent('popstate'))
                }
              }}
              className="text-xs px-2.5 py-1 rounded-sm border border-rule bg-surface text-ink font-mono hover:bg-raised transition-colors cursor-pointer"
            >
              Admin Dashboard
            </button>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        {/* Organization Banner */}
        <div className="rounded-sm border border-rule bg-surface p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-sm bg-canvas border border-rule flex items-center justify-center text-ink shrink-0">
              <Building2 className="size-6" strokeWidth={1.5} />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
                  {orgData?.name || 'ShipSafe Core Security'}
                </h1>
                <TierBadge tier="enterprise" size="xs" />
              </div>
              <p className="text-xs font-mono text-ink-2 mt-1">
                Owner ID: <span className="text-ink">{orgData?.ownerEmail || orgData?.ownerId || 'admin@shipsafe.dev'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-rule pt-4 md:pt-0 md:pl-6 shrink-0">
            <div>
              <span className="block text-[11px] font-mono text-ink-3 uppercase tracking-wider">Kapasitas Kursi</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className={`text-2xl font-bold font-mono ${isSeatFull ? 'text-red-500' : 'text-ink'}`}>
                  {seatsUsed}
                </span>
                <span className="text-xs font-mono text-ink-2">/ {maxSeats} kursi</span>
              </div>
            </div>
            {isSeatFull && (
              <span className="px-2 py-0.5 rounded-sm text-[10px] font-mono bg-canvas text-ink border border-rule">
                Penuh
              </span>
            )}
          </div>
        </div>

        {/* Member Management Section */}
        <section className="rounded-sm border border-rule bg-surface p-6 sm:p-7 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-ink flex items-center gap-2">
                <Users className="size-4 text-ink-2" strokeWidth={1.5} />
                <span>Daftar Anggota Tim</span>
              </h2>
              <p className="text-xs text-ink-2 mt-0.5">
                Semua anggota tim secara otomatis mewarisi kuota enterprise, kapasitas 100 MB, dan prompt perbaikan penuh.
              </p>
            </div>

            {/* Invite Button / Form */}
            {isOwner && (
              <form onSubmit={handleInvite} className="flex items-center gap-2">
                <input
                  type="email"
                  required
                  placeholder="developer@agensi.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="px-3 py-1.5 rounded-sm border border-rule bg-canvas text-xs text-ink placeholder:text-ink-3 focus:outline-none focus:border-ink w-52 sm:w-60 font-mono"
                  disabled={isSeatFull || isInviting}
                />
                <button
                  type="submit"
                  disabled={isSeatFull || isInviting}
                  className="py-1.5 px-3 rounded-sm bg-ink text-canvas hover:bg-ink-2 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 font-mono"
                >
                  <UserPlus className="size-3.5" strokeWidth={1.5} />
                  <span>{isInviting ? 'Mengundang...' : 'Undang'}</span>
                </button>
              </form>
            )}
          </div>

          {/* Members Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-rule text-ink-3 font-mono text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 px-3">Anggota</th>
                  <th className="py-2.5 px-3">Peran</th>
                  <th className="py-2.5 px-3">Tier Efektif</th>
                  <th className="py-2.5 px-3">Usage Bulan Ini</th>
                  <th className="py-2.5 px-3">Status</th>
                  {isOwner && <th className="py-2.5 px-3 text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-rule/50">
                {orgData?.members.map((member) => (
                  <tr key={member.userId} className="hover:bg-raised transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="size-7 rounded-sm bg-canvas border border-rule flex items-center justify-center font-mono text-[11px] font-semibold text-ink shrink-0">
                          {((member.fullName || member.email)[0] || 'U').toUpperCase()}
                        </div>
                        <div>
                          <span className="font-medium text-ink block">{member.fullName || 'Member'}</span>
                          <span className="text-[11px] font-mono text-ink-3 block">{member.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono">
                      <span className="inline-block px-2 py-0.5 rounded-sm text-[10px] font-semibold uppercase bg-canvas text-ink border border-rule">
                        {member.role}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <TierBadge tier="enterprise" size="xs" />
                    </td>
                    <td className="py-3 px-3 font-mono text-ink">
                      {member.auditsUsed} audits
                    </td>
                    <td className="py-3 px-3 font-mono">
                      <span className="inline-block px-1.5 py-0.5 rounded-sm text-[10px] bg-canvas text-ink border border-rule uppercase">
                        {member.accountStatus}
                      </span>
                    </td>
                    {isOwner && (
                      <td className="py-3 px-3 text-right">
                        {member.role !== 'owner' ? (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(member.userId)}
                            className="p-1 rounded-sm hover:bg-canvas text-ink-3 hover:text-ink transition-colors cursor-pointer"
                            title="Hapus dari organisasi"
                          >
                            <Trash2 className="size-3.5" strokeWidth={1.5} />
                          </button>
                        ) : (
                          <span className="text-ink-3 text-[11px] font-mono">Owner</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* White-Label Branding Settings */}
        <section className="rounded-sm border border-rule bg-surface p-6 sm:p-7 space-y-6">
          <div>
            <h2 className="text-base font-semibold text-ink flex items-center gap-2">
              <FileCheck className="size-4 text-ink-2" strokeWidth={1.5} />
              <span>White-Label Report Branding</span>
            </h2>
            <p className="text-xs text-ink-2 mt-0.5">
              Kustomisasi nama agensi dan logo yang akan dicetak pada header dokumen PDF hasil audit keamanan.
            </p>
          </div>

          <form onSubmit={handleSaveBranding} className="space-y-4 max-w-xl">
            <div>
              <label htmlFor="companyName" className="block text-xs font-mono text-ink mb-1.5">
                Nama Agensi / Perusahaan
              </label>
              <input
                id="companyName"
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="PT Solusi Keamanan Siber"
                className="w-full px-3.5 py-2 rounded-sm border border-rule bg-canvas text-xs text-ink placeholder:text-ink-3 focus:outline-none focus:border-ink transition-colors font-mono"
              />
            </div>

            <div>
              <label htmlFor="logoUrl" className="block text-xs font-mono text-ink mb-1.5">
                URL Logo Agensi (Transparan / PNG disarankan)
              </label>
              <input
                id="logoUrl"
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://agensi-kamu.com/logo.png"
                className="w-full px-3.5 py-2 rounded-sm border border-rule bg-canvas text-xs text-ink placeholder:text-ink-3 focus:outline-none focus:border-ink transition-colors font-mono"
              />
            </div>

            {/* Live PDF Header Preview */}
            <div className="rounded-sm border border-rule bg-canvas p-4 text-ink text-xs font-sans">
              <span className="text-[10px] font-mono text-ink-3 block mb-2 uppercase tracking-wide">
                Live PDF Header Preview:
              </span>
              <div className="flex items-center gap-3">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="h-8 max-w-[120px] object-contain" />
                ) : (
                  <div className="h-8 w-24 bg-surface border border-rule rounded-sm flex items-center justify-center text-[10px] text-ink-3 font-mono">
                    [LOGO]
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-sm text-ink leading-tight">
                    {companyName || 'Nama Agensi Anda'}
                  </h4>
                  <span className="text-[11px] text-ink-3 font-mono">
                    Pre-Deployment Security Audit Report &bull; Confidential
                  </span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSavingBranding}
              className="py-2 px-4 rounded-sm bg-ink text-canvas hover:bg-ink-2 font-mono font-semibold text-xs transition-colors cursor-pointer"
            >
              {isSavingBranding ? 'Menyimpan...' : 'Simpan Pengaturan Branding'}
            </button>
          </form>
        </section>

        {/* Organization CI/CD API Key */}
        <section className="rounded-sm border border-rule bg-surface p-6 sm:p-7 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-ink flex items-center gap-2">
                <Key className="size-4 text-ink-2" strokeWidth={1.5} />
                <span>Organization CI/CD API Key</span>
              </h2>
              <p className="text-xs text-ink-2 mt-0.5">
                Gunakan kunci ini pada GitHub Actions / GitLab CI pipeline tim Anda untuk scanning otomatis sebelum merge.
              </p>
            </div>
            {isOwner && (
              <button
                type="button"
                onClick={handleRegenerateKey}
                className="text-xs font-mono text-ink-2 hover:text-ink flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Regenerasi token"
              >
                <RefreshCw className="size-3" />
                <span>Regenerate</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 max-w-xl">
            <input
              type="text"
              readOnly
              value={orgData?.apiKey || 'shipsafe_org_live_...'}
              className="flex-1 px-3.5 py-2 rounded-sm border border-rule bg-canvas text-xs text-ink font-mono select-all focus:outline-none"
            />
            <button
              type="button"
              onClick={handleCopyKey}
              className="py-2 px-3 rounded-sm border border-rule bg-surface hover:bg-raised text-ink font-mono text-xs transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              {copiedKey ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              <span>{copiedKey ? 'Disalin' : 'Salin Key'}</span>
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}
