import { SEVERITIES } from '../../config/agents'
import { severityTallyText } from '../../domain/findings'
import type { AuditReport } from '../../domain/types'
import { MarkdownView } from '../markdown/MarkdownView'
import { SeverityTag } from '../ui/SeverityTag'

export function ExecutiveSummary({
  report,
  onNavigateToTab,
}: {
  report: AuditReport
  onNavigateToTab?: (tab: string) => void
}) {
  const notAssessedCount = report.notAssessed ? report.notAssessed.length : 0
  const secretsCount = report.secretsToRotate ? report.secretsToRotate.length : 0

  return (
    <div className="border border-rule bg-raised p-4 sm:p-5" role="region" aria-labelledby="exec-summary-title">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rule pb-3">
        <h3 id="exec-summary-title" className="text-title font-bold text-ink">
          Executive Summary
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          {secretsCount > 0 && (
            <button
              type="button"
              onClick={() => onNavigateToTab?.('secrets')}
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[var(--radius-chip)] border border-warn-edge bg-warn-bg text-warn-ink font-mono text-caption font-bold hover:brightness-95 transition-all"
            >
              <span className="size-1.5 rounded-full bg-status-fail animate-ping" />
              {secretsCount} {secretsCount === 1 ? 'Secret Exposed' : 'Secrets Exposed'}
            </button>
          )}
          {notAssessedCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--radius-chip)] border border-rule bg-surface text-ink-3 font-mono text-caption">
              {notAssessedCount} Unassessed
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 text-body text-ink leading-relaxed">
        <MarkdownView markdown={report.summary} />
      </div>

      {/* Severity Tally Grid */}
      <div className="mt-4 pt-3 border-t border-rule">
        <div className="flex items-center justify-between mb-2">
          <p className="text-caption font-bold text-ink-2 uppercase tracking-wider">
            Findings by Severity
          </p>
          <span className="text-caption font-mono text-ink-3">
            {severityTallyText(report.countsBySeverity)}
          </span>
        </div>

        <ul
          className="grid grid-cols-5 gap-2"
          aria-label={`Findings by severity: ${severityTallyText(report.countsBySeverity)}`}
        >
          {SEVERITIES.map((level) => {
            const count = report.countsBySeverity[level] ?? 0
            return (
              <li
                key={level}
                className="flex flex-col items-center justify-center p-2.5 rounded-[var(--radius-control)] border border-rule bg-surface text-center transition-colors hover:border-rule-strong"
              >
                <span
                  className={`font-mono text-title font-bold tabular-nums leading-none ${
                    count === 0 ? 'text-ink-3' : 'text-ink'
                  }`}
                >
                  {count}
                </span>
                <div className="mt-1.5">
                  <SeverityTag level={level} />
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
