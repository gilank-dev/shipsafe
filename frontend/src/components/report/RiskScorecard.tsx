import type { ScorecardRow } from '../../domain/types'
import { StatusTag } from '../ui/StatusTag'

interface RiskScorecardProps {
  scorecard: ScorecardRow[]
}

export function RiskScorecard({ scorecard }: RiskScorecardProps) {
  // Compute average score from assessed areas
  const assessedRows = scorecard.filter((r) => r.score !== null)
  const averageScore = assessedRows.length > 0
    ? (assessedRows.reduce((acc, r) => acc + (r.score ?? 0), 0) / assessedRows.length).toFixed(1)
    : null

  return (
    <div className="border border-rule bg-raised" role="region" aria-labelledby="scorecard-heading">
      <div className="p-3.5 sm:p-4 border-b border-rule flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 id="scorecard-heading" className="text-title font-bold text-ink">
            Risk Scorecard
          </h3>
          <p className="text-small text-ink-2 mt-0.5">
            Scores range from 0 to 10 (higher indicates stronger posture).
          </p>
        </div>
        {averageScore !== null && (
          <div className="flex items-center gap-2 self-start sm:self-center bg-surface border border-rule px-3 py-1 rounded-[var(--radius-chip)]">
            <span className="text-caption font-semibold text-ink-2 uppercase tracking-wide">Avg Score:</span>
            <span className="font-mono font-bold text-ink text-body">{averageScore}/10</span>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-small border-collapse">
          <thead>
            <tr className="border-b border-rule bg-surface font-semibold text-ink-2">
              <th scope="col" className="p-2.5 sm:p-3 pl-4">Area</th>
              <th scope="col" className="p-2.5 sm:p-3">Score</th>
              <th scope="col" className="p-2.5 sm:p-3">Status</th>
              <th scope="col" className="p-2.5 sm:p-3 pr-4">Top concern</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule font-normal">
            {scorecard.map((row) => (
              <tr key={row.area} className="hover:bg-surface/60 transition-colors">
                <th scope="row" className="p-2.5 sm:p-3 pl-4 font-semibold text-ink">
                  {row.area}
                </th>
                <td className="p-2.5 sm:p-3 whitespace-nowrap">
                  {row.score !== null ? (
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-ink">{row.score.toFixed(1)}/10</span>
                      <div className="meter" aria-hidden="true">
                        {Array.from({ length: 10 }).map((_, i) => (
                          <span key={i} data-on={i < Math.round(row.score ?? 0)} />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <span className="text-ink-3">Not assessed</span>
                  )}
                </td>
                <td className="p-2.5 sm:p-3 whitespace-nowrap">
                  <StatusTag status={row.status} />
                </td>
                <td className="p-2.5 sm:p-3 pr-4 text-ink-2 text-small leading-relaxed">
                  {row.topConcern || 'No issues detected'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
