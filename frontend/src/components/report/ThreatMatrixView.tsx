import React, { useState } from 'react'
import type { ThreatCheck, ThreatKey } from '../../domain/types'
import { IconChevron } from '../ui/icons'

interface ThreatMatrixViewProps {
  threats?: ThreatCheck[]
}

function IconSqli() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <ellipse cx="8" cy="4" rx="6" ry="2.5" />
      <path d="M2 4v8c0 1.38 2.69 2.5 6 2.5s6-1.12 6-2.5V4" />
      <path d="M2 8c0 1.38 2.69 2.5 6 2.5s6-1.12 6-2.5" />
    </svg>
  )
}

function IconXss() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="5 4 1 8 5 12" />
      <polyline points="11 4 15 8 11 12" />
      <line x1="10" y1="2" x2="6" y2="14" />
    </svg>
  )
}

function IconDdos() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 8h3m8 0h3M8 1v3m0 8v3" />
      <circle cx="8" cy="8" r="2.5" />
    </svg>
  )
}

function IconBruteForce() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="7" width="10" height="7" rx="1" />
      <path d="M5 7V4.5a3 3 0 0 1 6 0V7" />
      <circle cx="8" cy="10.5" r="0.75" />
    </svg>
  )
}

function IconShell() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1.5" y="2.5" width="13" height="11" rx="1" />
      <polyline points="4.5 6.5 7 9 4.5 11.5" />
      <line x1="8.5" y1="11.5" x2="11.5" y2="11.5" />
    </svg>
  )
}

function IconMitm() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="3" cy="8" r="2" />
      <circle cx="13" cy="8" r="2" />
      <path d="M5 8h2m2 0h2" />
      <path d="M8 5v6" />
    </svg>
  )
}

function IconPhishing() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 2a3 3 0 0 1 3 3v4a5 5 0 0 1-10 0" />
      <polyline points="6 10 3 13 1 11" />
    </svg>
  )
}

function IconDeface() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1.5" y="2.5" width="13" height="9" rx="1" />
      <line x1="5" y1="14.5" x2="11" y2="14.5" />
      <line x1="8" y1="11.5" x2="8" y2="14.5" />
      <path d="M7 6l2 2m0-2l-2 2" />
    </svg>
  )
}

function IconLfiRfi() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 3.5h4l1.5 2H14v8H2z" />
      <polyline points="9 8.5 11.5 11 9 13.5" />
    </svg>
  )
}

function IconZeroDay() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 2l2 4h4l-3 3 1.5 5L8 11.5 3.5 14 5 9 2 6h4z" />
    </svg>
  )
}

const THREAT_ICONS: Record<ThreatKey, React.ComponentType> = {
  sqli: IconSqli,
  xss: IconXss,
  ddos: IconDdos,
  brute_force: IconBruteForce,
  malware_shell: IconShell,
  mitm: IconMitm,
  phishing: IconPhishing,
  deface: IconDeface,
  lfi_rfi: IconLfiRfi,
  zero_day: IconZeroDay,
}

export const ThreatMatrixView: React.FC<ThreatMatrixViewProps> = ({ threats }) => {
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({})
  const [statusFilter, setStatusFilter] = useState<'All' | 'Vulnerable' | 'Warning' | 'Secure'>('All')

  if (!threats || threats.length === 0) {
    return null
  }

  const vulnerableCount = threats.filter((t) => t.status === 'Vulnerable').length
  const warningCount = threats.filter((t) => t.status === 'Warning').length
  const secureCount = threats.filter((t) => t.status === 'Secure').length

  const filteredThreats = threats.filter((t) => {
    if (statusFilter === 'All') return true
    return t.status === statusFilter
  })

  const toggleMitigation = (key: string) => {
    setExpandedKeys((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <section aria-labelledby="threat-matrix-heading" className="space-y-3.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rule pb-3">
        <div>
          <h3 id="threat-matrix-heading" className="text-title font-bold text-ink">
            10-Threat Security Vector Matrix
          </h3>
          <p className="text-small text-ink-2 mt-0.5">
            Systematic inspection across ten web threat vectors. Click status chips to filter.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-caption font-mono font-semibold">
          <button
            type="button"
            onClick={() => setStatusFilter('All')}
            className={`filter-chip py-0.5 px-2 text-caption ${statusFilter === 'All' ? 'aria-pressed:true' : ''}`}
            aria-pressed={statusFilter === 'All'}
          >
            All ({threats.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('Secure')}
            className={`inline-flex items-center gap-1 border border-status-pass-border bg-status-pass-bg px-2 py-0.5 text-status-pass-fg rounded-[var(--radius-chip)] transition-all ${
              statusFilter === 'Secure' ? 'ring-2 ring-ink' : 'opacity-85 hover:opacity-100'
            }`}
            aria-pressed={statusFilter === 'Secure'}
          >
            ● {secureCount} Secure
          </button>
          {warningCount > 0 && (
            <button
              type="button"
              onClick={() => setStatusFilter('Warning')}
              className={`inline-flex items-center gap-1 border border-status-warn-border bg-status-warn-bg px-2 py-0.5 text-status-warn-fg rounded-[var(--radius-chip)] transition-all ${
                statusFilter === 'Warning' ? 'ring-2 ring-ink' : 'opacity-85 hover:opacity-100'
              }`}
              aria-pressed={statusFilter === 'Warning'}
            >
              ▲ {warningCount} Warning
            </button>
          )}
          {vulnerableCount > 0 && (
            <button
              type="button"
              onClick={() => setStatusFilter('Vulnerable')}
              className={`inline-flex items-center gap-1 border border-status-fail-border bg-status-fail-bg px-2 py-0.5 text-status-fail-fg rounded-[var(--radius-chip)] transition-all ${
                statusFilter === 'Vulnerable' ? 'ring-2 ring-ink' : 'opacity-85 hover:opacity-100'
              }`}
              aria-pressed={statusFilter === 'Vulnerable'}
            >
              ✖ {vulnerableCount} Vulnerable
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {filteredThreats.map((threat) => {
          const isVulnerable = threat.status === 'Vulnerable'
          const isWarning = threat.status === 'Warning'
          const isExpanded = Boolean(expandedKeys[threat.key])

          const statusBadgeClass = isVulnerable
            ? 'bg-status-fail-bg text-status-fail-fg border-status-fail-border'
            : isWarning
              ? 'bg-status-warn-bg text-status-warn-fg border-status-warn-border'
              : 'bg-status-pass-bg text-status-pass-fg border-status-pass-border'

          const cardAccentBorder = isVulnerable
            ? 'border-l-4 border-l-status-fail'
            : isWarning
              ? 'border-l-4 border-l-status-partial'
              : 'border-l-4 border-l-status-pass'

          const IconComponent = THREAT_ICONS[threat.key] || IconZeroDay

          return (
            <div
              key={threat.key}
              className={`rounded-[var(--radius-control)] border border-rule bg-raised p-3.5 space-y-2.5 text-small ${cardAccentBorder} hover:border-rule-strong hover:bg-surface/60 transition-colors flex flex-col justify-between`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <span
                      className={`flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-chip)] border mt-0.5 ${
                        isVulnerable
                          ? 'border-status-fail-border text-status-fail-fg bg-status-fail-bg'
                          : isWarning
                            ? 'border-status-warn-border text-status-warn-fg bg-status-warn-bg'
                            : 'border-status-pass-border text-status-pass-fg bg-status-pass-bg'
                      }`}
                      aria-hidden="true"
                    >
                      <IconComponent />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-ink leading-tight flex items-center gap-1.5 break-words">
                        {threat.name}
                      </h4>
                      <p className="text-caption text-ink-3 font-mono mt-0.5 truncate">
                        {threat.category}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    {threat.findingsCount > 0 && (
                      <span className="font-mono text-caption px-1.5 py-0.5 rounded-[var(--radius-chip)] border border-rule bg-surface text-ink-2">
                        {threat.findingsCount} {threat.findingsCount === 1 ? 'finding' : 'findings'}
                      </span>
                    )}
                    <span className={`inline-flex items-center rounded-[var(--radius-chip)] border px-2 py-0.5 text-caption font-bold font-mono ${statusBadgeClass}`}>
                      {threat.status}
                    </span>
                  </div>
                </div>

              <p className="text-small text-ink-2 leading-relaxed">
                {threat.summary}
              </p>

              {threat.mitigationTip && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => toggleMitigation(threat.key)}
                    aria-expanded={isExpanded}
                    aria-controls={`mitigation-${threat.key}`}
                    className="inline-flex items-center gap-1 text-caption font-semibold text-ink-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-ink transition-colors"
                  >
                    <span className={`transition-transform duration-150 ${isExpanded ? 'rotate-180' : ''}`}>
                      <IconChevron width={12} height={12} />
                    </span>
                    <span>{isExpanded ? 'Hide mitigation note' : 'View mitigation note'}</span>
                  </button>

                  {isExpanded && (
                    <div
                      id={`mitigation-${threat.key}`}
                      className="mt-2 text-caption font-mono text-ink-2 bg-surface p-2.5 rounded-[var(--radius-chip)] border border-rule space-y-1 animate-fadeIn"
                    >
                      <span className="font-bold text-ink block">Recommended Mitigation:</span>
                      <p className="leading-relaxed whitespace-pre-wrap">{threat.mitigationTip}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
