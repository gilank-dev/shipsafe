import React from 'react'
import type { ThreatCheck } from '../../domain/types'

interface ThreatMatrixViewProps {
  threats?: ThreatCheck[]
}

export const ThreatMatrixView: React.FC<ThreatMatrixViewProps> = ({ threats }) => {
  if (!threats || threats.length === 0) {
    return null
  }

  const vulnerableCount = threats.filter((t) => t.status === 'Vulnerable').length
  const warningCount = threats.filter((t) => t.status === 'Warning').length
  const secureCount = threats.filter((t) => t.status === 'Secure').length

  return (
    <section aria-labelledby="threat-matrix-heading" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] pb-2">
        <div>
          <h3 id="threat-matrix-heading" className="text-base font-semibold tracking-tight text-[var(--color-fg-primary)]">
            10-Threat Security Vector Matrix
          </h3>
          <p className="text-xs text-[var(--color-fg-muted)]">
            Audit mendalam terhadap 10 vektor ancaman web: SQLi, XSS, DDoS, Brute Force, Shell, MitM, Phishing, Deface, LFI/RFI, Zero-Day.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="inline-flex items-center gap-1 rounded bg-[var(--color-status-success-bg)] px-2 py-0.5 text-[var(--color-status-success-fg)] border border-[var(--color-status-success-border)]">
            ● {secureCount} Secure
          </span>
          {warningCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded bg-[var(--color-status-warn-bg)] px-2 py-0.5 text-[var(--color-status-warn-fg)] border border-[var(--color-status-warn-border)]">
              ▲ {warningCount} Warning
            </span>
          )}
          {vulnerableCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded bg-[var(--color-status-danger-bg)] px-2 py-0.5 text-[var(--color-status-danger-fg)] border border-[var(--color-status-danger-border)]">
              ✖ {vulnerableCount} Vulnerable
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {threats.map((threat) => {
          const isVulnerable = threat.status === 'Vulnerable'
          const isWarning = threat.status === 'Warning'

          const badgeClass = isVulnerable
            ? 'bg-[var(--color-status-danger-bg)] text-[var(--color-status-danger-fg)] border-[var(--color-status-danger-border)]'
            : isWarning
              ? 'bg-[var(--color-status-warn-bg)] text-[var(--color-status-warn-fg)] border-[var(--color-status-warn-border)]'
              : 'bg-[var(--color-status-success-bg)] text-[var(--color-status-success-fg)] border-[var(--color-status-success-border)]'

          const cardBorder = isVulnerable
            ? 'border-l-4 border-l-[var(--color-status-danger-fg)]'
            : isWarning
              ? 'border-l-4 border-l-[var(--color-status-warn-fg)]'
              : 'border-l-4 border-l-[var(--color-status-success-fg)]'

          return (
            <div
              key={threat.key}
              className={`rounded border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-3 space-y-2 text-xs ${cardBorder}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium text-[var(--color-fg-primary)] flex items-center gap-1.5">
                    <span>{threat.name}</span>
                  </div>
                  <div className="text-[10px] text-[var(--color-fg-muted)] font-mono">
                    {threat.category}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {threat.findingsCount > 0 && (
                    <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-[var(--color-bg-code)] text-[var(--color-fg-muted)]">
                      {threat.findingsCount} temuan
                    </span>
                  )}
                  <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-semibold font-mono ${badgeClass}`}>
                    {threat.status}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-[var(--color-fg-secondary)] leading-relaxed">
                {threat.summary}
              </p>

              {threat.mitigationTip && (
                <div className="text-[10px] font-mono text-[var(--color-fg-muted)] bg-[var(--color-bg-page)] p-1.5 rounded border border-[var(--color-border-subtle)]">
                  <span className="font-semibold text-[var(--color-fg-primary)]">Rekomendasi:</span> {threat.mitigationTip}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
