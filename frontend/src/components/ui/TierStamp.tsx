import React from 'react'

export type TierType = 'free' | 'pro' | 'enterprise' | string

export interface TierStampProps {
  tier?: TierType
  isSuperAdmin?: boolean
  className?: string
  size?: 'xs' | 'sm' | 'md'
  onClick?: () => void
}

/**
 * Rectilinear IBM Plex Mono Uppercase Tier & Clearance Stamp.
 * Adheres strictly to the Frozen UI release-inspection form specification:
 * - Free: `[TIER: FREE]`
 * - Pro: `[TIER: PRO]`
 * - Enterprise: `[TIER: ENTERPRISE // ORG]`
 * - Owner / Super Admin: `[CLEARANCE: SUPER ADMIN]`
 */
export const TierStamp: React.FC<TierStampProps> = ({
  tier = 'free',
  isSuperAdmin = false,
  className = '',
  size = 'sm',
  onClick,
}) => {
  const sizeClasses =
    size === 'xs'
      ? 'text-[10px] px-1.5 py-0.5'
      : size === 'md'
        ? 'text-xs px-2.5 py-1'
        : 'text-[11px] px-2 py-0.5'

  if (isSuperAdmin) {
    return (
      <span
        data-testid="tier-stamp-super-admin"
        className={`inline-flex items-center font-mono font-bold uppercase tracking-wider border border-ink bg-ink text-canvas select-none rounded-none shadow-none ${sizeClasses} ${className}`}
        title="Owner Clearance: Super Admin"
      >
        [CLEARANCE: SUPER ADMIN]
      </span>
    )
  }

  const normalized = (tier || 'free').toLowerCase()

  if (normalized === 'enterprise') {
    return (
      <span
        data-testid="tier-stamp-enterprise"
        className={`inline-flex items-center font-mono font-semibold uppercase tracking-wider border border-ink bg-surface text-ink select-none rounded-none shadow-none ${sizeClasses} ${className}`}
        title="Tier: Enterprise Organization"
      >
        [TIER: ENTERPRISE // ORG]
      </span>
    )
  }

  if (normalized === 'pro') {
    return (
      <span
        data-testid="tier-stamp-pro"
        className={`inline-flex items-center font-mono font-semibold uppercase tracking-wider border border-ink bg-ink text-canvas select-none rounded-none shadow-none ${sizeClasses} ${className}`}
        title="Tier: Pro Developer"
      >
        [TIER: PRO]
      </span>
    )
  }

  // Free Tier
  const baseClasses = `inline-flex items-center font-mono font-medium uppercase tracking-wider border border-rule bg-surface text-ink-2 hover:text-ink hover:border-rule-strong transition-colors select-none rounded-none shadow-none ${sizeClasses} ${className}`

  if (onClick) {
    return (
      <button
        type="button"
        data-testid="tier-stamp-free"
        onClick={onClick}
        className={`${baseClasses} cursor-pointer active:scale-[0.98]`}
        title="Tier: Free (Click to view upgrade options)"
      >
        [TIER: FREE]
      </button>
    )
  }

  return (
    <span
      data-testid="tier-stamp-free"
      className={baseClasses}
      title="Tier: Free Sandbox"
    >
      [TIER: FREE]
    </span>
  )
}
