import { useState } from 'react'
import { SEVERITIES } from '../../config/agents'
import type { Finding } from '../../domain/types'
import { cancelAudit, requestAudit } from '../../state/audit-controller'
import { useOutdated } from '../../state/selectors'
import { useStore } from '../../state/store'
import { SeverityTag } from '../ui/SeverityTag'
import { IconAlert, IconRefresh } from '../ui/icons'
import { ExportBar } from './ExportBar'
import { FindingList } from './FindingList'
import { NotAssessed } from './NotAssessed'
import { ProgressStepper } from './ProgressStepper'
import { PromptModal } from './PromptModal'
import { RiskScorecard } from './RiskScorecard'
import { SecretsToRotate } from './SecretsToRotate'
import { ThreatMatrixView } from './ThreatMatrixView'

export function ReportView() {
  const status = useStore((s) => s.audit.status)
  const stage = useStore((s) => s.audit.stage)
  const uploadPct = useStore((s) => s.audit.uploadPct)
  const report = useStore((s) => s.audit.report)
  const error = useStore((s) => s.audit.error)
  const isOutdated = useOutdated()

  const [activePromptFinding, setActivePromptFinding] = useState<Finding | null>(null)

  if (status === 'running') {
    return (
      <div className="py-2">
        <ProgressStepper stage={stage} uploadPct={uploadPct} onCancel={cancelAudit} />
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="border border-status-fail bg-raised p-6" role="alert">
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
      <div className="border border-rule bg-raised p-10 text-center text-ink-2" role="region" aria-label="Empty audit report">
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

  return (
    <div className="space-y-8 reveal">
      {/* Outdated warning if inputs changed */}
      {isOutdated && (
        <aside
          role="status"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-warn-edge bg-warn-bg px-4 py-3 text-warn-ink text-small font-medium"
        >
          <div className="flex items-center gap-2">
            <IconAlert className="shrink-0" width={16} height={16} />
            <span>Project inputs or ZIP have changed since this report was generated.</span>
          </div>
          <button
            type="button"
            className="btn text-small bg-canvas shrink-0 self-start sm:self-center"
            onClick={() => void requestAudit()}
          >
            Re-run audit
          </button>
        </aside>
      )}

      {/* Executive Summary */}
      <section className="border border-rule bg-raised p-4 sm:p-6" aria-labelledby="exec-summary-title">
        <h3 id="exec-summary-title" className="text-title font-bold text-ink">
          Executive Summary
        </h3>
        <p className="mt-2 text-body text-ink leading-relaxed">
          {report.summary}
        </p>

        {/* Severity Tally Chips */}
        <div className="mt-6 pt-4 border-t border-rule">
          <p className="text-small font-semibold text-ink-2 mb-2">Findings by severity</p>
          <div className="flex flex-wrap items-center gap-2">
            {SEVERITIES.map((sev) => {
              const count = report.countsBySeverity[sev] ?? 0
              return (
                <div key={sev} className="flex items-center gap-1.5 border border-rule bg-surface px-2.5 py-1">
                  <SeverityTag level={sev} />
                  <span className="font-mono text-small font-bold text-ink">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Secrets to rotate */}
      {report.secretsToRotate && report.secretsToRotate.length > 0 && (
        <SecretsToRotate secrets={report.secretsToRotate} />
      )}

      {/* 10-Threat Security Vector Matrix */}
      {report.threatMatrix && report.threatMatrix.length > 0 && (
        <ThreatMatrixView threats={report.threatMatrix} />
      )}

      {/* Risk Scorecard */}
      <RiskScorecard scorecard={report.scorecard} />

      {/* Export Bar */}
      <ExportBar findings={report.findings} />

      {/* Finding List */}
      <FindingList
        findings={report.findings}
        onViewPrompt={(finding) => setActivePromptFinding(finding)}
      />

      {/* Gaps / Not Assessed */}
      <NotAssessed
        notAssessed={report.notAssessed || []}
        skippedFiles={report.skippedFiles || []}
      />

      {/* Prompt Modal */}
      <PromptModal
        finding={activePromptFinding}
        onClose={() => setActivePromptFinding(null)}
      />
    </div>
  )
}
