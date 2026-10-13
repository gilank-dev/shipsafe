import { SEVERITIES } from '../../config/agents'
import { severityTallyText } from '../../domain/findings'
import type { AuditReport } from '../../domain/types'
import { MarkdownView } from '../markdown/MarkdownView'
import { SeverityTag } from '../ui/SeverityTag'

export function ExecutiveSummary({ report }: { report: AuditReport }) {
  const notAssessedCount = report.notAssessed.length
  return (
    <div className="mt-3">
      <div className="max-w-[72ch]">
        <MarkdownView markdown={report.summary} />
      </div>
      <ul
        className="reveal mt-4 grid grid-cols-5 border border-rule-strong"
        aria-label={`Findings by severity: ${severityTallyText(report.countsBySeverity)}`}
      >
        {SEVERITIES.map((level) => {
          const n = report.countsBySeverity[level]
          return (
            <li key={level} className="flex flex-col items-start gap-1 border-r border-rule p-2 last:border-r-0 sm:p-3">
              <span className={`text-h3 leading-none font-bold tabular-nums ${n === 0 ? 'text-ink-3' : ''}`}>{n}</span>
              {n > 0 ? <SeverityTag level={level} /> : <span className="text-small text-ink-3">{level}</span>}
            </li>
          )
        })}
      </ul>
      {notAssessedCount > 0 && (
        <p className="mt-3 text-small text-ink-2">
          {notAssessedCount} {notAssessedCount === 1 ? 'area' : 'areas'} could not be assessed.{' '}
          <a href="#not-assessed" className="underline underline-offset-2">
            See what is missing
          </a>
        </p>
      )}
    </div>
  )
}
