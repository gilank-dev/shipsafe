import React from 'react'
import { useStore } from '../../state/store'

interface QuotaIndicatorProps {
  className?: string
  showUpgradeBtn?: boolean
  onUpgrade?: () => void
}

export const QuotaIndicator: React.FC<QuotaIndicatorProps> = ({
  className = '',
  showUpgradeBtn = true,
  onUpgrade,
}) => {
  const quota = useStore((s) => s.quota)

  if (!quota) return null

  const tier = quota.tier || 'free'
  const used = quota.used ?? 0
  const limit = quota.limit ?? 3
  const isFree = tier === 'free'
  const isEnterprise = tier === 'enterprise'
  const isExceeded = isFree && used >= limit
  const pct = Math.min(100, Math.round((used / limit) * 100))

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade()
      return
    }
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname.toLowerCase()
      if (pathname.includes('/console')) {
        window.history.pushState({}, '', '/console?view=pricing')
        window.dispatchEvent(new PopStateEvent('popstate'))
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } else {
        window.history.pushState({}, '', '/#pricing')
        window.dispatchEvent(new PopStateEvent('popstate'))
        const el = document.getElementById('pricing')
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' })
        }
      }
    }
  }

  return (
    <div
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-none border border-rule bg-surface text-xs font-mono transition-colors ${className}`}
      role="status"
      aria-label={`Audit quota: ${used} of ${limit} used`}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-ink-2 font-medium truncate">
          {isEnterprise ? (
            <span>Enterprise: Active FUP</span>
          ) : (
            <span>
              Quota: <strong className="text-ink font-semibold tabular-nums">{used}</strong>/{limit}
            </span>
          )}
        </span>
      </div>

      {!isEnterprise && (
        <div
          className="hidden sm:block w-8 h-1 bg-canvas border border-rule/60 rounded-none overflow-hidden shrink-0"
          title={`${pct}% quota used`}
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
          onClick={handleUpgrade}
          className="text-[11px] font-mono font-semibold text-ink hover:underline transition-colors cursor-pointer shrink-0 ml-auto"
          title="View Pricing & Plans"
        >
          Upgrade
        </button>
      )}
    </div>
  )
}
