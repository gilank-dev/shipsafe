import React from 'react'
import { useStore } from '../../state/store'

export type SubscriptionTier = 'free' | 'pro' | 'enterprise'

interface TierBadgeProps {
  tier?: SubscriptionTier | string
  isSuperAdmin?: boolean
  size?: 'xs' | 'sm' | 'md'
  showIcon?: boolean
  className?: string
  onClick?: () => void
}

export const TierBadge: React.FC<TierBadgeProps> = ({
  tier = 'free',
  isSuperAdmin = false,
  size = 'sm',
  className = '',
  onClick,
}) => {
  const openPaywallModal = useStore((s) => s.openPaywallModal)

  if (isSuperAdmin) {
    const sizeClasses =
      size === 'xs'
        ? 'px-2 py-0.5 text-[10px]'
        : size === 'md'
          ? 'px-2.5 py-1 text-xs'
          : 'px-2 py-0.5 text-[10px]'

    return (
      <span
        data-testid="tier-badge-super-admin"
        className={`inline-flex items-center justify-center font-mono font-semibold rounded-sm bg-ink text-canvas border border-ink uppercase tracking-wider select-none ${sizeClasses} ${className}`}
        title="ShipSafe Super Admin"
      >
        Admin
      </span>
    )
  }

  const normalized = (tier || 'free').toLowerCase() as SubscriptionTier

  if (normalized === 'free') {
    const sizeClasses =
      size === 'xs'
        ? 'px-2 py-0.5 text-[10px]'
        : size === 'md'
          ? 'px-2.5 py-1 text-xs'
          : 'px-2 py-0.5 text-[10px]'

    return (
      <button
        type="button"
        data-testid="tier-badge-free"
        onClick={onClick ?? (() => openPaywallModal('quota'))}
        className={`inline-flex items-center justify-center font-mono font-medium rounded-sm border border-rule bg-surface hover:bg-raised text-ink-2 hover:text-ink transition-colors cursor-pointer select-none active:scale-[0.98] ${sizeClasses} ${className}`}
        title="Paket Free - Klik untuk melihat opsi upgrade"
      >
        Free
      </button>
    )
  }

  let colorClasses = 'border-rule bg-surface text-ink-2'
  let label = 'Pro'

  if (normalized === 'enterprise') {
    colorClasses = 'border-ink bg-surface text-ink font-semibold'
    label = 'Enterprise'
  } else if (normalized === 'pro') {
    colorClasses = 'border-ink bg-ink text-canvas font-semibold'
    label = 'Pro'
  }

  const sizeClasses =
    size === 'xs'
      ? 'px-2 py-0.5 text-[10px]'
      : size === 'md'
        ? 'px-2.5 py-1 text-xs'
        : 'px-2 py-0.5 text-[10px]'

  return (
    <span
      data-testid={`tier-badge-${label.toLowerCase()}`}
      className={`inline-flex items-center justify-center font-mono font-medium rounded-sm border transition-colors select-none ${colorClasses} ${sizeClasses} ${className}`}
      title={`Paket: ${label}`}
    >
      {label}
    </span>
  )
}
