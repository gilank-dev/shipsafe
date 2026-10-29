import React from 'react'
import { useStore } from '../../state/store'

interface QuotaIndicatorProps {
  className?: string
  showUpgradeBtn?: boolean
}

export const QuotaIndicator: React.FC<QuotaIndicatorProps> = ({
  className = '',
  showUpgradeBtn = true,
}) => {
  const quota = useStore((s) => s.quota)
  const openPaywallModal = useStore((s) => s.openPaywallModal)

  if (!quota) return null

  const tier = quota.tier || 'free'
  const used = quota.used ?? 0
  const limit = quota.limit ?? 3
  const isFree = tier === 'free'
  const isEnterprise = tier === 'enterprise'
  const isExceeded = isFree && used >= limit
  const pct = Math.min(100, Math.round((used / limit) * 100))

  return (
    <div
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-sm border border-rule bg-surface text-xs font-mono transition-colors ${className}`}
      role="status"
      aria-label={`Kuota audit: ${used} dari ${limit} digunakan`}
    >
      <div className="flex items-center gap-1.5">
        <span className="text-ink-2 font-medium">
          {isEnterprise ? (
            <span>Enterprise: FUP Aktif</span>
          ) : (
            <span>
              Kuota: <strong className="text-ink font-semibold">{used}</strong>/{limit}
            </span>
          )}
        </span>
      </div>

      {!isEnterprise && (
        <div
          className="hidden sm:block w-10 h-1 bg-canvas border border-rule/60 rounded-none overflow-hidden shrink-0"
          title={`${pct}% kuota terpakai`}
        >
          <div
            className={`h-full rounded-none transition-all duration-300 ${
              isExceeded ? 'bg-red-500' : 'bg-ink'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {showUpgradeBtn && isFree && (
        <button
          type="button"
          onClick={() => openPaywallModal('quota')}
          className="text-[11px] font-sans font-medium text-ink hover:text-ink-2 underline underline-offset-2 transition-colors cursor-pointer shrink-0 ml-0.5"
        >
          Upgrade
        </button>
      )}
    </div>
  )
}
