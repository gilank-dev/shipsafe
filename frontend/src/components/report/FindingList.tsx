import { useMemo, useState } from 'react'
import { AREAS, SEVERITIES } from '../../config/agents'
import { filterFindings, sortFindings } from '../../domain/findings'
import type { Area, Finding, Severity } from '../../domain/types'
import { FindingCard } from './FindingCard'

interface FindingListProps {
  findings: Finding[]
  onViewPrompt: (finding: Finding) => void
}

export function FindingList({ findings, onViewPrompt }: FindingListProps) {
  const [selectedSeverities, setSelectedSeverities] = useState<Set<Severity>>(new Set())
  const [selectedAreas, setSelectedAreas] = useState<Set<Area>>(new Set())
  const [allExpanded, setAllExpanded] = useState<boolean | undefined>(undefined)

  const toggleSeverity = (sev: Severity) => {
    setSelectedSeverities((prev) => {
      const next = new Set(prev)
      if (next.has(sev)) {
        next.delete(sev)
      } else {
        next.add(sev)
      }
      return next
    })
  }

  const toggleArea = (area: Area) => {
    setSelectedAreas((prev) => {
      const next = new Set(prev)
      if (next.has(area)) {
        next.delete(area)
      } else {
        next.add(area)
      }
      return next
    })
  }

  const clearFilters = () => {
    setSelectedSeverities(new Set())
    setSelectedAreas(new Set())
  }

  const sorted = useMemo(() => sortFindings(findings), [findings])

  const filtered = useMemo(() => {
    return filterFindings(sorted, {
      severities: selectedSeverities,
      areas: selectedAreas,
    })
  }, [sorted, selectedSeverities, selectedAreas])

  const hasFilters = selectedSeverities.size > 0 || selectedAreas.size > 0

  return (
    <section className="space-y-4" aria-labelledby="findings-heading">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-rule pb-3">
        <div>
          <h3 id="findings-heading" className="text-title font-bold">
            Findings ({filtered.length} of {findings.length})
          </h3>
          <p className="text-small text-ink-2 mt-0.5">
            Filter by severity and area, or expand to view remediation details
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn text-small"
            onClick={() => setAllExpanded(true)}
          >
            Expand all
          </button>
          <button
            type="button"
            className="btn text-small"
            onClick={() => setAllExpanded(false)}
          >
            Collapse all
          </button>
        </div>
      </div>

      {/* Filter controls */}
      <div className="space-y-2 border border-rule bg-surface p-3 text-small">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-ink-2 text-small mr-1">Severity:</span>
          {SEVERITIES.map((s) => {
            const isChecked = selectedSeverities.has(s)
            return (
              <button
                key={s}
                type="button"
                className="filter-chip"
                aria-pressed={isChecked}
                onClick={() => toggleSeverity(s)}
              >
                {s}
              </button>
            )
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-rule/50">
          <span className="font-semibold text-ink-2 text-small mr-1">Area:</span>
          {AREAS.map((a) => {
            const isChecked = selectedAreas.has(a.id)
            return (
              <button
                key={a.id}
                type="button"
                className="filter-chip"
                aria-pressed={isChecked}
                onClick={() => toggleArea(a.id)}
              >
                {a.label}
              </button>
            )
          })}

          {hasFilters && (
            <button
              type="button"
              className="btn btn-quiet text-small ml-auto"
              onClick={clearFilters}
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* Finding cards */}
      {filtered.length === 0 ? (
        <div className="border border-rule bg-raised p-8 text-center text-ink-2">
          <p className="font-semibold">No findings match the active filters.</p>
          <p className="text-small text-ink-3 mt-1">Try resetting severity or area filters.</p>
          <button type="button" className="btn text-small mt-3" onClick={clearFilters}>
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((finding) => (
            <FindingCard
              key={finding.id}
              finding={finding}
              isExpanded={allExpanded}
              onToggle={() => setAllExpanded(undefined)}
              onViewPrompt={onViewPrompt}
            />
          ))}
        </div>
      )}
    </section>
  )
}
