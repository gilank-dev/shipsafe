import React from 'react'
import { useClerk } from '@clerk/clerk-react'
import { Shield, BookOpen, Clock, Users, Terminal, ChevronLeft, CreditCard, LogOut } from 'lucide-react'
import { signOut } from '../../lib/supabase'
import { announce } from '../../state/announcer'
import { useStore } from '../../state/store'
import { QuotaIndicator } from '../pricing/QuotaIndicator'
import { TierBadge } from '../ui/TierBadge'

interface ConsoleSidebarProps {
  activeView: 'audit' | 'docs' | 'pricing'
  onSelectView: (view: 'audit' | 'docs' | 'pricing') => void
  onNavigate?: (path: string) => void
}

export const ConsoleSidebar: React.FC<ConsoleSidebarProps> = ({
  activeView,
  onSelectView,
  onNavigate,
}) => {
  const user = useStore((s) => s.auth.user)
  const quota = useStore((s) => s.quota)
  const isSidebarOpen = useStore((s) => s.isSidebarOpen)
  const setSidebarOpen = useStore((s) => s.setSidebarOpen)
  const setHistoryModalOpen = useStore((s) => s.setHistoryModalOpen)
  const setAuthModalOpen = useStore((s) => s.setAuthModalOpen)
  const setAuthUser = useStore((s) => s.setAuthUser)
  const clerk = useClerk()

  const effectiveTier = user?.organizationId ? 'enterprise' : (user?.tier || quota?.tier || 'free')
  const isTeamUser = Boolean(user && (user.organizationId || user.organizationName || effectiveTier === 'enterprise'))
  const isSuperAdmin = Boolean(user?.isSuperAdmin)

  const handleSignOut = async () => {
    try {
      if (clerk?.signOut) {
        await clerk.signOut()
      }
    } catch {
      // non-blocking
    }
    await signOut()
    setAuthUser(null)
    announce('Signed out')
  }

  const handleNavigate = (path: string) => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setSidebarOpen(false)
    }
    if (onNavigate) {
      onNavigate(path)
    } else if (typeof window !== 'undefined') {
      window.history.pushState({}, '', path)
      window.dispatchEvent(new PopStateEvent('popstate'))
    }
  }

  const handleSelectView = (view: 'audit' | 'docs' | 'pricing') => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setSidebarOpen(false)
    }
    onSelectView(view)
  }

  return (
    <>
      {/* Mobile Backdrop when Sidebar is Open */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`${
          isSidebarOpen ? 'flex' : 'hidden'
        } fixed md:sticky top-[var(--rail-h,3.5rem)] left-0 z-50 md:z-10 flex-col justify-between w-64 md:w-56 lg:w-60 shrink-0 border-r border-rule bg-canvas py-4 px-2.5 h-[calc(100dvh-var(--rail-h,3.5rem))] shadow-lg md:shadow-none transition-all overflow-y-auto custom-scrollbar`}
        data-print="hide"
        aria-label="Console Navigation Sidebar"
      >
        <div className="flex flex-col space-y-6">
          {/* Navigation Group Header with Collapse Button */}
          <div className="space-y-1">
            <div className="flex items-center justify-between px-2.5 mb-2">
              <p className="text-[10px] font-mono uppercase tracking-wider text-ink-3 font-semibold">
                Workspace
              </p>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="p-1 text-ink-3 hover:text-ink hover:bg-surface rounded-sm cursor-pointer transition-colors"
                title="Sembunyikan Sidebar"
                aria-label="Sembunyikan Sidebar"
              >
                <ChevronLeft className="size-3.5" strokeWidth={1.5} />
              </button>
            </div>

            {/* Audit Scanner Tab */}
            <button
              type="button"
              onClick={() => handleSelectView('audit')}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-mono transition-colors text-left cursor-pointer rounded-sm ${
                activeView === 'audit'
                  ? 'bg-ink text-canvas font-semibold shadow-xs'
                  : 'text-ink-2 hover:text-ink hover:bg-surface'
              }`}
            >
              <Shield className="size-4 shrink-0" strokeWidth={1.5} />
              <span className="truncate">Audit Scanner</span>
            </button>

            {/* Documentation Tab */}
            <button
              type="button"
              onClick={() => handleSelectView('docs')}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-mono transition-colors text-left cursor-pointer rounded-sm ${
                activeView === 'docs'
                  ? 'bg-ink text-canvas font-semibold shadow-xs'
                  : 'text-ink-2 hover:text-ink hover:bg-surface'
              }`}
            >
              <BookOpen className="size-4 shrink-0" strokeWidth={1.5} />
              <span className="truncate">Documentation</span>
            </button>

            {/* Pricing Tab */}
            <button
              type="button"
              onClick={() => handleSelectView('pricing')}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-mono transition-colors text-left cursor-pointer rounded-sm ${
                activeView === 'pricing'
                  ? 'bg-ink text-canvas font-semibold shadow-xs'
                  : 'text-ink-2 hover:text-ink hover:bg-surface'
              }`}
            >
              <CreditCard className="size-4 shrink-0" strokeWidth={1.5} />
              <span className="truncate">Pricing &amp; Plans</span>
            </button>

            {/* History Button */}
            {user && (
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined' && window.innerWidth < 768) {
                    setSidebarOpen(false)
                  }
                  setHistoryModalOpen(true)
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-mono text-ink-2 hover:text-ink hover:bg-surface transition-colors text-left cursor-pointer rounded-sm"
                title="Buka riwayat audit tersimpan"
              >
                <Clock className="size-4 shrink-0" strokeWidth={1.5} />
                <span className="truncate">Riwayat Audit</span>
              </button>
            )}
          </div>

          {/* Enterprise & Admin Group (Strictly gated: ONLY shown if user is in team or super admin!) */}
          {(isTeamUser || isSuperAdmin) && (
            <div className="space-y-1 border-t border-rule pt-4">
              <p className="px-2.5 text-[10px] font-mono uppercase tracking-wider text-ink-3 font-semibold mb-2">
                Management
              </p>

              {isTeamUser && (
                <button
                  type="button"
                  onClick={() => handleNavigate('/dashboard/team')}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-mono text-ink-2 hover:text-ink hover:bg-surface transition-colors text-left cursor-pointer rounded-sm"
                  title="Kelola anggota tim dan organisasi Enterprise"
                >
                  <Users className="size-4 shrink-0" strokeWidth={1.5} />
                  <span className="truncate">Enterprise Team</span>
                </button>
              )}

              {isSuperAdmin && (
                <button
                  type="button"
                  onClick={() => handleNavigate('/admin')}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-mono text-ink hover:bg-surface border border-rule transition-colors text-left cursor-pointer rounded-sm"
                  title="Super Admin Dashboard & System Ledger"
                >
                  <Terminal className="size-4 shrink-0" strokeWidth={1.5} />
                  <span className="truncate">Admin Ledger</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Bottom Section: Quota & User Profile (Moved from header to keep header uncluttered) */}
        <div className="border-t border-rule pt-3 px-1 flex flex-col gap-2.5 font-mono">
          {user ? (
            <>
              {/* Quota Indicator */}
              <div className="w-full">
                <QuotaIndicator className="w-full justify-between" />
              </div>

              {/* User Profile Card */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-rule/60">
                <div className="flex items-center gap-2 min-w-0">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.fullName || user.email || 'User avatar'}
                      className="size-7 rounded-none border border-ink object-cover shrink-0"
                    />
                  ) : (
                    <span className="size-7 rounded-none border border-ink bg-surface flex items-center justify-center text-[11px] font-bold shrink-0">
                      {((user.fullName || user.email || 'U')[0] || 'U').toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex flex-col">
                    <span
                      className="text-xs text-ink truncate font-medium"
                      title={user.email || user.fullName}
                    >
                      {user.fullName || (user.email ? user.email.split('@')[0] : 'User')}
                    </span>
                    <div className="mt-0.5">
                      <TierBadge tier={effectiveTier} isSuperAdmin={user.isSuperAdmin} size="xs" />
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="p-1.5 text-ink-3 hover:text-ink hover:bg-surface border border-transparent hover:border-rule rounded-sm transition-colors cursor-pointer shrink-0"
                  title="Sign out / Keluar"
                  aria-label="Sign out"
                >
                  <LogOut className="size-3.5" strokeWidth={1.5} />
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              className="w-full py-2 px-3 bg-ink hover:bg-ink-2 text-canvas text-xs font-mono font-medium transition-colors text-center cursor-pointer rounded-sm"
              title="Sign in to save audits"
            >
              Sign in
            </button>
          )}
        </div>
      </aside>
    </>
  )
}
