import React from 'react'
import { TierBadge } from './TierBadge'
import type { UserProfile, QuotaState } from '../../state/store'
import { Building2, AlertTriangle } from 'lucide-react'

interface UserIdentityHeaderProps {
  user: UserProfile | null
  quota?: QuotaState | null
  className?: string
  showQuota?: boolean
}

export const UserIdentityHeader: React.FC<UserIdentityHeaderProps> = ({
  user,
  quota,
  className = '',
  showQuota = true,
}) => {
  if (!user) return null

  const effectiveTier = user.organizationId ? 'enterprise' : (user.tier || quota?.tier || 'free')
  const initial = ((user.fullName || user.email || 'U')[0] || 'U').toUpperCase()
  const isSuspended = user.accountStatus === 'suspended'

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Avatar */}
      <div className="relative shrink-0">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.fullName || user.email || 'User avatar'}
            className="size-8 rounded-none border border-white/10 object-cover"
          />
        ) : (
          <div className="size-8 rounded-none border border-white/10 bg-zinc-800 flex items-center justify-center font-mono text-xs font-semibold text-white">
            {initial}
          </div>
        )}
        {isSuspended && (
          <span
            className="absolute -bottom-1 -right-1 size-3.5 rounded-none bg-red-500 border border-black flex items-center justify-center text-[8px] text-white font-mono"
            title="Akun Disuspensi"
          >
            !
          </span>
        )}
      </div>

      {/* User Info & Badges */}
      <div className="min-w-0 flex flex-col justify-center">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-white truncate max-w-[180px] sm:max-w-[240px]">
            {user.fullName || (user.email ? user.email.split('@')[0] : 'User')}
          </span>

          {/* Tier Badge */}
          <TierBadge tier={effectiveTier} isSuperAdmin={user.isSuperAdmin} size="xs" />

          {/* Organization Badge if applicable */}
          {(user.organizationName || effectiveTier === 'enterprise') && (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-none text-[9px] font-mono text-amber-300 bg-amber-500/10 border border-amber-500/30"
              title={`Organisasi: ${user.organizationName || 'ShipSafe Core Security'} (${(user.orgRole || 'OWNER').toUpperCase()})`}
            >
              <Building2 className="size-2.5 shrink-0" strokeWidth={1.5} />
              <span className="truncate max-w-[120px]">
                {user.organizationName || 'ShipSafe Core Security'} : {(user.orgRole || 'OWNER').toUpperCase()}
              </span>
            </span>
          )}

          {/* Suspension Alert if applicable */}
          {isSuspended && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-none text-[9px] font-mono text-red-400 bg-red-500/10 border border-red-500/30">
              <AlertTriangle className="size-2.5 shrink-0" strokeWidth={1.5} />
              <span>SUSPENDED</span>
            </span>
          )}
        </div>

        {/* Subtitle / Email / Quota info */}
        <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-mono mt-0.5">
          {user.email && <span className="truncate max-w-[180px]">{user.email}</span>}
          {showQuota && quota && (
            <>
              <span className="text-zinc-600">•</span>
              <span className="text-zinc-300">
                Audit: {quota.used} / {quota.limit >= 999999 ? '∞' : quota.limit}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
