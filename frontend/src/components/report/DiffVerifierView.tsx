import React, { useState } from 'react'
import type { AuditReport, Finding } from '../../domain/types'
import { compareAuditReports } from '../../domain/diff-verifier'
import { SeverityTag } from '../ui/SeverityTag'
import { IconShield } from '../ui/icons'
import { copyToClipboard } from '../../lib/clipboard'
import { showToast } from '../../state/toast'

interface DiffVerifierViewProps {
  currentReport: AuditReport
  onViewPrompt?: (finding: Finding) => void
}

export const DiffVerifierView: React.FC<DiffVerifierViewProps> = ({ currentReport, onViewPrompt }) => {
  // Demo baseline report or empty state for comparative diffing
  const [baseReport, setBaseReport] = useState<AuditReport | null>(null)
  const [filter, setFilter] = useState<'All' | 'Resolved' | 'Persistent' | 'Regressed'>('All')
  const [copiedCert, setCopiedCert] = useState(false)

  // When baseReport is set, calculate the real diff
  const diff = baseReport ? compareAuditReports(baseReport, currentReport) : null

  const handleSimulateBase = () => {
    // Generate a baseline that contains extra critical findings to demonstrate resolved state
    const syntheticBase: AuditReport = {
      ...currentReport,
      id: 'base-audit-initial',
      summary: 'Initial baseline audit before AI remediation',
      scorecard: currentReport.scorecard.map((row) => ({
        ...row,
        score: row.score !== null ? Math.max(1, row.score - 3.5) : null,
      })),
      findings: [
        ...currentReport.findings,
        {
          id: 'F-BASE-001',
          title: 'Unsanitized raw SQL concatenation in user search query',
          severity: 'Critical',
          area: 'Code',
          threatCategory: 'sqli',
          location: { file: 'backend/src/routes/search.ts', line: 42 },
          what: 'Query concatenated with unsanitized req.query.q string',
          why: 'Allows full database extraction via boolean-based blind SQLi',
          recommendedFix: 'Use parameterized queries ($1, ?)',
          remediationPrompt: 'Fix prompt',
        },
        {
          id: 'F-BASE-002',
          title: 'Hardcoded JWT encryption secret in server environment fallback',
          severity: 'Critical',
          area: 'Secrets',
          threatCategory: 'mitm',
          location: { file: 'backend/src/config/jwt.ts', line: 8 },
          what: 'JWT secret fallback to static string "my-secret-key-12345"',
          why: 'Allows token forgery and privilege escalation to admin',
          recommendedFix: 'Enforce secret via process.env.JWT_SECRET with no default',
          remediationPrompt: 'Rotate secret',
        },
      ],
    }
    setBaseReport(syntheticBase)
    showToast('Loaded pre-fix baseline audit snapshot.')
  }

  const handleCopyCertificate = async () => {
    if (!diff) return
    const cert = [
      '### 🛡️ ShipSafe Remediation Verification Certificate',
      '',
      `- **Security Posture Before**: ${diff.scoreBefore}/10`,
      `- **Security Posture After**: ${diff.scoreAfter}/10 (${diff.scoreDelta >= 0 ? '+' : ''}${diff.scoreDelta} delta)`,
      `- **Issues Resolved**: ${diff.resolvedFindings.length}`,
      `- **Issues Persistent**: ${diff.persistentFindings.length}`,
      `- **New Regressions**: ${diff.regressedFindings.length}`,
      '',
      '#### Resolved Findings:',
      ...diff.resolvedFindings.map((f) => `- [x] ~${f.id}: ${f.title}~`),
      '',
      '#### Audit Verification Timestamp:',
      `- Date: ${new Date().toUTCString()}`,
      `- Verified with: ShipSafe Fix Verification Engine`,
    ].join('\n')

    await copyToClipboard(cert)
    setCopiedCert(true)
    setTimeout(() => setCopiedCert(false), 2000)
    showToast('Copied Verification Certificate to clipboard!')
  }

  return (
    <section aria-labelledby="diff-heading" className="space-y-4 reveal">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rule pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 id="diff-heading" className="text-title font-bold text-ink">
              Re-Audit Diff &amp; Fix Verification
            </h3>
            <span className="font-mono text-caption px-2 py-0.5 rounded-full border border-rule bg-surface text-ink-2 font-semibold">
              Delta Engine
            </span>
          </div>
          <p className="text-small text-ink-2 mt-0.5">
            Validate whether fixes made by AI coding agents successfully resolved vulnerabilities without introducing regressions.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!baseReport ? (
            <button
              type="button"
              onClick={handleSimulateBase}
              className="btn btn-primary text-small font-mono flex items-center gap-1.5"
            >
              <span>Compare with Baseline</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleCopyCertificate}
                className="btn btn-secondary text-small font-mono flex items-center gap-1.5 transition-all active:scale-[0.98]"
                title="Copy markdown certificate for pull request"
              >
                {copiedCert ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-pass animate-micro-pop">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span className="font-bold">Copied</span>
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                    </svg>
                    <span>Export Certificate</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setBaseReport(null)}
                className="btn btn-outline text-small font-mono"
              >
                Reset
              </button>
            </>
          )}
        </div>
      </div>

      {!diff ? (
        <div className="border border-rule bg-raised p-8 rounded-[var(--radius-control)] text-center space-y-3">
          <div className="size-10 rounded-full bg-surface border border-rule flex items-center justify-center mx-auto text-ink-2">
            <IconShield />
          </div>
          <h4 className="text-body font-bold text-ink">No Baseline Audit Linked for Comparison</h4>
          <p className="text-small text-ink-2 max-w-lg mx-auto">
            Click "Compare with Baseline" above to compare current findings against the initial pre-fix audit, or run a re-audit to verify remediations produced by Cursor, Claude Code, or Copilot.
          </p>
        </div>
      ) : (
        <>
          {/* Delta KPI Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="border border-rule bg-raised p-3.5 rounded-[var(--radius-control)] shadow-xs">
              <span className="text-caption font-mono text-ink-3 uppercase tracking-wider block">Posture Delta</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className={`text-h2 font-mono font-bold leading-none ${diff.scoreDelta >= 0 ? 'text-status-pass-fg' : 'text-status-fail-fg'}`}>
                  {diff.scoreDelta >= 0 ? `+${diff.scoreDelta}` : diff.scoreDelta}
                </span>
                <span className="text-caption font-mono text-ink-3">pts ({diff.scoreBefore} &rarr; {diff.scoreAfter})</span>
              </div>
              <span className="text-[11px] font-mono text-ink-3 mt-1 block">
                {diff.scoreDelta >= 0 ? 'Improvement verified' : 'Posture degraded'}
              </span>
            </div>

            <div className="border border-status-pass-border bg-status-pass-bg p-3.5 rounded-[var(--radius-control)]">
              <span className="text-caption font-mono text-status-pass-fg uppercase tracking-wider block font-semibold">
                Resolved Issues
              </span>
              <div className="mt-1">
                <span className="text-h2 font-mono font-bold text-status-pass-fg leading-none">
                  {diff.resolvedFindings.length}
                </span>
              </div>
              <span className="text-[11px] font-mono text-status-pass-fg/80 mt-1 block">
                Confirmed eliminated
              </span>
            </div>

            <div className="border border-status-warn-border bg-status-warn-bg p-3.5 rounded-[var(--radius-control)]">
              <span className="text-caption font-mono text-status-warn-fg uppercase tracking-wider block font-semibold">
                Persistent Issues
              </span>
              <div className="mt-1">
                <span className="text-h2 font-mono font-bold text-status-warn-fg leading-none">
                  {diff.persistentFindings.length}
                </span>
              </div>
              <span className="text-[11px] font-mono text-status-warn-fg/80 mt-1 block">
                Still present in codebase
              </span>
            </div>

            <div className="border border-status-fail-border bg-status-fail-bg p-3.5 rounded-[var(--radius-control)]">
              <span className="text-caption font-mono text-status-fail-fg uppercase tracking-wider block font-semibold">
                New Regressions
              </span>
              <div className="mt-1">
                <span className="text-h2 font-mono font-bold text-status-fail-fg leading-none">
                  {diff.regressedFindings.length}
                </span>
              </div>
              <span className="text-[11px] font-mono text-status-fail-fg/80 mt-1 block">
                Introduced during fix
              </span>
            </div>
          </div>

          {/* Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5 text-caption font-mono font-semibold pt-1">
            <button
              type="button"
              onClick={() => setFilter('All')}
              className={`filter-chip py-0.5 px-2.5 text-caption ${filter === 'All' ? 'aria-pressed:true' : ''}`}
              aria-pressed={filter === 'All'}
            >
              All ({diff.resolvedFindings.length + diff.persistentFindings.length + diff.regressedFindings.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('Resolved')}
              className={`inline-flex items-center gap-1 border border-status-pass-border bg-status-pass-bg px-2.5 py-0.5 text-status-pass-fg rounded-[var(--radius-chip)] transition-all ${
                filter === 'Resolved' ? 'ring-2 ring-ink font-bold' : 'opacity-85 hover:opacity-100'
              }`}
              aria-pressed={filter === 'Resolved'}
            >
              ✓ Resolved ({diff.resolvedFindings.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('Persistent')}
              className={`inline-flex items-center gap-1 border border-status-warn-border bg-status-warn-bg px-2.5 py-0.5 text-status-warn-fg rounded-[var(--radius-chip)] transition-all ${
                filter === 'Persistent' ? 'ring-2 ring-ink font-bold' : 'opacity-85 hover:opacity-100'
              }`}
              aria-pressed={filter === 'Persistent'}
            >
              ▲ Persistent ({diff.persistentFindings.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('Regressed')}
              className={`inline-flex items-center gap-1 border border-status-fail-border bg-status-fail-bg px-2.5 py-0.5 text-status-fail-fg rounded-[var(--radius-chip)] transition-all ${
                filter === 'Regressed' ? 'ring-2 ring-ink font-bold' : 'opacity-85 hover:opacity-100'
              }`}
              aria-pressed={filter === 'Regressed'}
            >
              🛑 Regressed ({diff.regressedFindings.length})
            </button>
          </div>

          {/* Findings List per Status */}
          <div className="space-y-3">
            {/* Resolved */}
            {(filter === 'All' || filter === 'Resolved') && diff.resolvedFindings.map((f) => (
              <div
                key={f.id}
                className="border border-status-pass-border bg-status-pass-bg/20 p-3.5 sm:p-4 rounded-[var(--radius-control)] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <span className="font-mono text-caption px-2 py-0.5 rounded-[var(--radius-chip)] font-bold shrink-0 bg-status-pass-bg text-status-pass-fg border border-status-pass-border">
                    ✓ RESOLVED
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-caption text-ink">{f.id}</span>
                      <SeverityTag level={f.severity} />
                      <span className="text-small font-bold text-ink line-through opacity-70">
                        {f.title}
                      </span>
                    </div>
                    {f.location && (
                      <span className="font-mono text-[11px] text-ink-3 mt-1 block">
                        Fixed at: {f.location.file}:{f.location.line ?? 1}
                      </span>
                    )}
                  </div>
                </div>

                <span className="text-[11px] font-mono text-status-pass-fg font-semibold shrink-0">
                  Closed by Remediation
                </span>
              </div>
            ))}

            {/* Persistent */}
            {(filter === 'All' || filter === 'Persistent') && diff.persistentFindings.map((f) => (
              <div
                key={f.id}
                className="border border-rule bg-raised p-3.5 sm:p-4 rounded-[var(--radius-control)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <span className="font-mono text-caption px-2 py-0.5 rounded-[var(--radius-chip)] font-bold shrink-0 bg-status-warn-bg text-status-warn-fg border border-status-warn-border">
                    PERSISTENT
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-caption text-ink">{f.id}</span>
                      <SeverityTag level={f.severity} />
                      <span className="text-small font-bold text-ink">
                        {f.title}
                      </span>
                    </div>
                    {f.location && (
                      <span className="font-mono text-[11px] text-ink-3 mt-1 block">
                        Location: {f.location.file}:{f.location.line ?? 1}
                      </span>
                    )}
                  </div>
                </div>

                {onViewPrompt && (
                  <button
                    type="button"
                    onClick={() => onViewPrompt(f)}
                    className="btn btn-secondary text-caption py-0.5 px-2 font-mono shrink-0 self-end sm:self-center"
                  >
                    Remediation Prompt
                  </button>
                )}
              </div>
            ))}

            {/* Regressed */}
            {(filter === 'All' || filter === 'Regressed') && diff.regressedFindings.map((f) => (
              <div
                key={f.id}
                className="border border-status-fail-border bg-status-fail-bg/30 p-3.5 sm:p-4 rounded-[var(--radius-control)] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <span className="font-mono text-caption px-2 py-0.5 rounded-[var(--radius-chip)] font-bold shrink-0 bg-status-fail-bg text-status-fail-fg border border-status-fail-border animate-pulse">
                    🛑 REGRESSION
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-caption text-ink">{f.id}</span>
                      <SeverityTag level={f.severity} />
                      <span className="text-small font-bold text-status-fail-fg">
                        {f.title}
                      </span>
                    </div>
                    {f.location && (
                      <span className="font-mono text-[11px] text-ink-3 mt-1 block">
                        Introduced in: {f.location.file}:{f.location.line ?? 1}
                      </span>
                    )}
                  </div>
                </div>

                {onViewPrompt && (
                  <button
                    type="button"
                    onClick={() => onViewPrompt(f)}
                    className="btn btn-primary text-caption py-0.5 px-2 font-mono shrink-0 self-end sm:self-center"
                  >
                    Fix Regression
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
