import { areaLabel } from '../../config/agents'
import type { ScorecardRow } from '../../domain/types'
import { StatusTag } from '../ui/StatusTag'

export function Scorecard({ rows }: { rows: readonly ScorecardRow[] }) {
  return (
    <div className="md mt-3">
      <div className="md-scroll" role="region" tabIndex={0} aria-label="Risk scorecard table, scrollable">
        <table>
          <thead>
            <tr>
              <th scope="col">Area</th>
              <th scope="col">Score</th>
              <th scope="col">Status</th>
              <th scope="col">Top concern</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.area}>
                <th scope="row">{areaLabel(row.area)}</th>
                <td>
                  {row.score === null ? (
                    <span className="text-ink-3">Not assessed</span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <span className="font-semibold tabular-nums">{row.score}/10</span>
                      <span className="meter" aria-hidden="true">
                        {Array.from({ length: 10 }, (_, i) => (
                          <span key={i} data-on={i < (row.score as number)} />
                        ))}
                      </span>
                    </span>
                  )}
                </td>
                <td>
                  <StatusTag status={row.status} />
                </td>
                <td className="min-w-[14rem]">{row.topConcern}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
