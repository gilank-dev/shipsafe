import type { ScorecardRow } from '../../domain/types'
import { StatusTag } from '../ui/StatusTag'

interface RiskScorecardProps {
  scorecard: ScorecardRow[]
}

export function RiskScorecard({ scorecard }: RiskScorecardProps) {
  return (
    <div className="border border-rule bg-raised" role="region" aria-labelledby="scorecard-heading">
      <div className="p-4 border-b border-rule">
        <h3 id="scorecard-heading" className="text-title font-bold">
          Risk Scorecard
        </h3>
        <p className="text-small text-ink-2 mt-0.5">
          Scores range from 0 to 10 (higher indicates better posture).
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-small border-collapse">
          <thead>
            <tr className="border-b border-rule bg-surface font-semibold text-ink-2">
              <th scope="col" className="p-3 pl-4">Area</th>
              <th scope="col" className="p-3">Score</th>
              <th scope="col" className="p-3">Status</th>
              <th scope="col" className="p-3 pr-4">Top concern</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule font-normal">
            {scorecard.map((row) => (
              <tr key={row.area} className="hover:bg-surface/50">
                <th scope="row" className="p-3 pl-4 font-semibold text-ink">
                  {row.area}
                </th>
                <td className="p-3 whitespace-nowrap">
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
                <td className="p-3 whitespace-nowrap">
                  <StatusTag status={row.status} />
                </td>
                <td className="p-3 pr-4 text-ink-2">
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
