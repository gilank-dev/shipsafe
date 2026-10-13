import { useMemo, useState } from 'react'
import { SEVERITIES } from '../../config/agents'
import type { Finding } from '../../domain/types'
import { cancelAudit, requestAudit } from '../../state/audit-controller'
import { useOutdated } from '../../state/selectors'
import { useStore } from '../../state/store'
import { SeverityTag } from '../ui/SeverityTag'
import { IconAlert, IconFile, IconKey, IconRefresh, IconShield } from '../ui/icons'
import { ExecutiveSummary } from './ExecutiveSummary'
import { ExportBar } from './ExportBar'
import { FindingList } from './FindingList'
import { NotAssessed } from './NotAssessed'
import { ProgressStepper } from './ProgressStepper'
import { PromptModal } from './PromptModal'
import { RiskScorecard } from './RiskScorecard'
import { SecretsToRotate } from './SecretsToRotate'
import { ThreatMatrixView } from './ThreatMatrixView'

type ReportTab = 'overview' | 'findings' | 'threats' | 'secrets'

export function ReportView() {
  const status = useStore((s) => s.audit.status)
  const stage = useStore((s) => s.audit.stage)
  const uploadPct = useStore((s) => s.audit.uploadPct)
  const report = useStore((s) => s.audit.report)
  const error = useStore((s) => s.audit.error)
  const isOutdated = useOutdated()

  const [activeTab, setActiveTab] = useState<ReportTab>('overview')
  const [activePromptFinding, setActivePromptFinding] = useState<Finding | null>(null)

  // Calculations for quick posture KPI bar
  const calculatedPosture = useMemo(() => {
    if (!report) return null
    const assessed = report.scorecard.filter((r) => r.score !== null)
    const avgScore = assessed.length > 0
      ? (assessed.reduce((sum, r) => sum + (r.score ?? 0), 0) / assessed.length).toFixed(1)
      : null

    const criticalCount = report.countsBySeverity['Critical'] ?? 0
    const highCount = report.countsBySeverity['High'] ?? 0

    const threats = report.threatMatrix || []
    const vulnerableThreats = threats.filter((t) => t.status === 'Vulnerable').length
    const warningThreats = threats.filter((t) => t.status === 'Warning').length
    const secureThreats = threats.filter((t) => t.status === 'Secure').length

    const secretsCount = report.secretsToRotate?.length ?? 0

    return {
      avgScore,
      criticalCount,
      highCount,
      vulnerableThreats,
      warningThreats,
      secureThreats,
      secretsCount,
    }
  }, [report])

  if (status === 'running') {
    return (
      <div className="py-2">
        <ProgressStepper stage={stage} uploadPct={uploadPct} onCancel={cancelAudit} />
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="border border-status-fail bg-raised p-6 rounded-[var(--radius-control)]" role="alert">
        <div className="flex items-start gap-3">
          <IconAlert className="mt-1 shrink-0 text-status-fail" width={22} height={22} />
          <div className="min-w-0 flex-1">
            <h3 className="text-title font-bold text-status-fail">Audit could not be completed</h3>
            <p className="mt-1 text-body text-ink leading-relaxed">
              {error?.message || 'An unexpected error occurred during the audit process.'}
            </p>
            {error?.retryAfterMs && (
              <p className="mt-2 text-small text-ink-2">
                Rate limited. Please wait approximately {Math.ceil(error.retryAfterMs / 1000)} seconds before trying again.
              </p>
            )}
            <div className="mt-4">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void requestAudit()}
              >
                <IconRefresh />
                Retry audit
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="border border-rule bg-raised p-10 text-center text-ink-2 rounded-[var(--radius-control)]" role="region" aria-label="Empty audit report">
        <div className="mx-auto max-w-md space-y-3">
          <span className="block mx-auto size-4 bg-ink/30" aria-hidden="true" />
          <h3 className="text-title font-bold text-ink">No audit report generated yet</h3>
          <p className="text-small text-ink-2 leading-relaxed">
            Select a project ZIP archive and specify your context in the form on the left. Click "Run audit" to start scanning secrets, dependencies, headers, and code security.
          </p>
        </div>
      </div>
    )
  }

  const secretsCount = report.secretsToRotate?.length ?? 0
  const findingsCount = report.findings.length

  return (
    <div className="space-y-4 reveal">
      {/* Outdated warning if inputs changed */}
      {isOutdated && (
        <aside
          role="status"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-warn-edge bg-warn-bg px-4 py-2.5 text-warn-ink text-small font-medium rounded-[var(--radius-control)]"
        >
          <div className="flex items-center gap-2">
            <IconAlert className="shrink-0" width={16} height={16} />
            <span>Project inputs or ZIP have changed since this report was generated.</span>
          </div>
          <button
            type="button"
            className="btn text-small bg-canvas shrink-0 self-start sm:self-center py-1 px-3"
            onClick={() => void requestAudit()}
          >
            Re-run audit
          </button>
        </aside>
      )}

      {/* High-Density Posture KPI Bar */}
      <section
        className="border border-rule bg-raised p-3.5 sm:p-4 rounded-[var(--radius-control)] shadow-xs"
        aria-label="Audit summary metrics"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Posture Score & State */}
          <div className="flex items-center gap-3">
            {calculatedPosture?.avgScore && (
              <div className="flex items-baseline gap-1 bg-surface border border-rule px-3 py-1.5 rounded-[var(--radius-control)]">
                <span className="text-h3 font-mono font-bold text-ink leading-none">
                  {calculatedPosture.avgScore}
                </span>
                <span className="text-caption font-mono text-ink-3">/10</span>
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-body font-bold text-ink">
                  Security Posture
                </h3>
                {calculatedPosture && calculatedPosture.criticalCount > 0 ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-caption font-bold bg-status-fail-bg text-status-fail-fg border border-status-fail-border rounded-[var(--radius-chip)]">
                    ● Action Required
                  </span>
                ) : calculatedPosture && calculatedPosture.highCount > 0 ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-caption font-bold bg-status-warn-bg text-status-warn-fg border border-status-warn-border rounded-[var(--radius-chip)]">
                    ▲ Warning
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-caption font-bold bg-status-pass-bg text-status-pass-fg border border-status-pass-border rounded-[var(--radius-chip)]">
                    ● Good Posture
                  </span>
                )}
              </div>
              <p className="text-caption text-ink-3 mt-0.5 font-mono">
                {findingsCount} total findings • {report.threatMatrix ? `${report.threatMatrix.length} threat vectors inspected` : 'Standard inspection'}
              </p>
            </div>
          </div>

          {/* Quick Stats Badges */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Clickable Secrets Alert Badge if any secrets exist */}
            {secretsCount > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('secrets')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-chip)] border border-warn-edge bg-warn-bg text-warn-ink text-caption font-bold font-mono hover:brightness-95 transition-all"
                title="Click to view secrets needing immediate rotation"
              >
                <span className="size-1.5 rounded-full bg-status-fail animate-ping" />
                <span>{secretsCount} {secretsCount === 1 ? 'Secret Exposed' : 'Secrets Exposed'}</span>
              </button>
            )}

            {/* Severity Breakdown Mini Chips */}
            <div className="flex items-center gap-1 border border-rule/60 bg-surface px-2 py-1 rounded-[var(--radius-chip)]">
              {SEVERITIES.map((sev) => {
                const count = report.countsBySeverity[sev] ?? 0
                if (count === 0 && sev !== 'Critical') return null
                return (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => setActiveTab('findings')}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 hover:bg-canvas rounded transition-colors text-caption font-mono"
                    title={`View ${count} ${sev} findings`}
                  >
                    <SeverityTag level={sev} />
                    <span className="font-bold text-ink">{count}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Segmented Dashboard Navigation Tabs */}
      <nav
        role="tablist"
        aria-label="Report sections"
        className="flex items-center gap-1.5 border-b border-rule pb-1 overflow-x-auto select-none sticky top-[calc(var(--rail-h))] z-20 bg-canvas/95 backdrop-blur-xs pt-1"
      >
        <button
          role="tab"
          id="tab-overview"
          aria-selected={activeTab === 'overview'}
          aria-controls="panel-overview"
          tabIndex={activeTab === 'overview' ? 0 : -1}
          onClick={() => setActiveTab('overview')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 text-small font-semibold rounded-t-[var(--radius-control)] border-b-2 transition-all shrink-0 ${
            activeTab === 'overview'
              ? 'border-ink text-ink bg-surface/70 font-bold'
              : 'border-transparent text-ink-2 hover:text-ink hover:bg-surface/40'
          }`}
        >
          <IconFile />
          <span>Overview</span>
        </button>

        <button
          role="tab"
          id="tab-findings"
          aria-selected={activeTab === 'findings'}
          aria-controls="panel-findings"
          tabIndex={activeTab === 'findings' ? 0 : -1}
          onClick={() => setActiveTab('findings')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 text-small font-semibold rounded-t-[var(--radius-control)] border-b-2 transition-all shrink-0 ${
            activeTab === 'findings'
              ? 'border-ink text-ink bg-surface/70 font-bold'
              : 'border-transparent text-ink-2 hover:text-ink hover:bg-surface/40'
          }`}
        >
          <IconAlert width={15} height={15} />
          <span>Findings</span>
          <span
            className={`font-mono text-caption px-1.5 py-0.2 rounded-full border ${
              activeTab === 'findings'
                ? 'bg-ink text-canvas border-ink'
                : 'bg-surface text-ink-2 border-rule'
            }`}
          >
            {findingsCount}
          </span>
        </button>

        {report.threatMatrix && report.threatMatrix.length > 0 && (
          <button
            role="tab"
            id="tab-threats"
            aria-selected={activeTab === 'threats'}
            aria-controls="panel-threats"
            tabIndex={activeTab === 'threats' ? 0 : -1}
            onClick={() => setActiveTab('threats')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-small font-semibold rounded-t-[var(--radius-control)] border-b-2 transition-all shrink-0 ${
              activeTab === 'threats'
                ? 'border-ink text-ink bg-surface/70 font-bold'
                : 'border-transparent text-ink-2 hover:text-ink hover:bg-surface/40'
            }`}
          >
            <IconShield />
            <span>Threat Matrix</span>
            <span
              className={`font-mono text-caption px-1.5 py-0.2 rounded-full border ${
                calculatedPosture && calculatedPosture.vulnerableThreats > 0
                  ? 'bg-status-fail-bg text-status-fail-fg border-status-fail-border'
                  : 'bg-surface text-ink-2 border-rule'
              }`}
            >
              10
            </span>
          </button>
        )}

        <button
          role="tab"
          id="tab-secrets"
          aria-selected={activeTab === 'secrets'}
          aria-controls="panel-secrets"
          tabIndex={activeTab === 'secrets' ? 0 : -1}
          onClick={() => setActiveTab('secrets')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 text-small font-semibold rounded-t-[var(--radius-control)] border-b-2 transition-all shrink-0 ${
            activeTab === 'secrets'
              ? 'border-ink text-ink bg-surface/70 font-bold'
              : 'border-transparent text-ink-2 hover:text-ink hover:bg-surface/40'
          }`}
        >
          <IconKey />
          <span>Secrets & Scope</span>
          {secretsCount > 0 && (
            <span className="font-mono text-caption px-1.5 py-0.2 rounded-full border bg-warn-bg text-warn-ink border-warn-edge font-bold animate-pulse">
              ! {secretsCount}
            </span>
          )}
        </button>
      </nav>

      {/* Tab Panels */}
      {/* 1. OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div id="panel-overview" role="tabpanel" aria-labelledby="tab-overview" className="space-y-4 animate-fadeIn">
          <ExecutiveSummary
            report={report}
            onNavigateToTab={(tab) => setActiveTab(tab as ReportTab)}
          />

          <RiskScorecard scorecard={report.scorecard} />

          <ExportBar findings={report.findings} />
        </div>
      )}

      {/* 2. FINDINGS TAB */}
      {activeTab === 'findings' && (
        <div id="panel-findings" role="tabpanel" aria-labelledby="tab-findings" className="space-y-4 animate-fadeIn">
          <ExportBar findings={report.findings} />

          <FindingList
            findings={report.findings}
            onViewPrompt={(finding) => setActivePromptFinding(finding)}
          />
        </div>
      )}

      {/* 3. THREAT MATRIX TAB */}
      {activeTab === 'threats' && report.threatMatrix && (
        <div id="panel-threats" role="tabpanel" aria-labelledby="tab-threats" className="space-y-4 animate-fadeIn">
          <ThreatMatrixView threats={report.threatMatrix} />
        </div>
      )}

      {/* 4. SECRETS & SCOPE TAB */}
      {activeTab === 'secrets' && (
        <div id="panel-secrets" role="tabpanel" aria-labelledby="tab-secrets" className="space-y-4 animate-fadeIn">
          {report.secretsToRotate && report.secretsToRotate.length > 0 ? (
            <SecretsToRotate secrets={report.secretsToRotate} />
          ) : (
            <div className="border border-status-pass-border bg-status-pass-bg p-5 text-status-pass-fg rounded-[var(--radius-control)] text-small">
              <p className="font-bold">No credentials or hardcoded secrets detected in scanned files.</p>
              <p className="text-ink-2 mt-1">All scanned API tokens, private keys, and environment variables conform to basic safety bounds.</p>
            </div>
          )}

          <NotAssessed
            notAssessed={report.notAssessed || []}
            skippedFiles={report.skippedFiles || []}
          />
        </div>
      )}

      {/* Prompt Modal */}
      <PromptModal
        finding={activePromptFinding}
        onClose={() => setActivePromptFinding(null)}
      />
    </div>
  )
}

