import { useMemo, useState } from 'react'
import { AREAS, SEVERITIES } from '../../config/agents'
import { countByArea, countBySeverity, filterFindings, sortFindings } from '../../domain/findings'
import type { Area, Finding, Severity } from '../../domain/types'
import { IconClose, IconSearch } from '../ui/icons'
import { FindingCard } from './FindingCard'

interface FindingListProps {
  findings: Finding[]
  onViewPrompt: (finding: Finding) => void
}

export function FindingList({ findings, onViewPrompt }: FindingListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSeverities, setSelectedSeverities] = useState<Set<Severity>>(new Set())
  const [selectedAreas, setSelectedAreas] = useState<Set<Area>>(new Set())
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

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
    setSearchQuery('')
  }

  const sorted = useMemo(() => sortFindings(findings), [findings])
  const severityCounts = useMemo(() => countBySeverity(findings), [findings])
  const areaCounts = useMemo(() => countByArea(findings), [findings])

  const filtered = useMemo(() => {
    const baseFiltered = filterFindings(sorted, {
      severities: selectedSeverities,
      areas: selectedAreas,
    })

    if (!searchQuery.trim()) {
      return baseFiltered
    }

    const q = searchQuery.toLowerCase().trim()
    return baseFiltered.filter((f) => {
      return (
        f.id.toLowerCase().includes(q) ||
        f.title.toLowerCase().includes(q) ||
        f.what.toLowerCase().includes(q) ||
        f.why.toLowerCase().includes(q) ||
        f.recommendedFix.toLowerCase().includes(q) ||
        (f.location?.file && f.location.file.toLowerCase().includes(q)) ||
        (f.location?.snippet && f.location.snippet.toLowerCase().includes(q))
      )
    })
  }, [sorted, selectedSeverities, selectedAreas, searchQuery])

  const handleExpandAll = () => {
    setExpandedIds(new Set(filtered.map((f) => f.id)))
  }

  const handleCollapseAll = () => {
    setExpandedIds(new Set())
  }

  const toggleCard = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const hasFilters = selectedSeverities.size > 0 || selectedAreas.size > 0 || searchQuery.trim().length > 0

  return (
    <section className="space-y-3.5" aria-labelledby="findings-heading">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rule pb-3">
        <div>
          <h3 id="findings-heading" className="text-title font-bold text-ink">
            Findings ({filtered.length} of {findings.length})
          </h3>
          <p className="text-small text-ink-2 mt-0.5">
            Compact accordion view. Filter by severity and area, or search files and rules.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            className="btn text-small flex-1 sm:flex-initial"
            onClick={handleExpandAll}
            title="Expand all filtered finding cards"
          >
            Expand all
          </button>
          <button
            type="button"
            className="btn text-small flex-1 sm:flex-initial"
            onClick={handleCollapseAll}
            title="Collapse all finding cards"
          >
            Collapse all
          </button>
        </div>
      </div>

      {/* Filter and Search controls */}
      <div className="space-y-2.5 border border-rule bg-surface p-3 sm:p-3.5 rounded-[var(--radius-control)] text-small">
        {/* Search input */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-3">
            <IconSearch />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search findings by ID, title, file, snippet, or description..."
            className="control pl-9 pr-9 py-1.5 text-small"
            aria-label="Search findings"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-ink-3 hover:text-ink transition-colors"
              aria-label="Clear search query"
            >
              <IconClose />
            </button>
          )}
        </div>

        {/* Severity chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="font-semibold text-ink-2 text-caption mr-1 uppercase tracking-wider">Severity:</span>
          {SEVERITIES.map((s) => {
            const isChecked = selectedSeverities.has(s)
            const count = severityCounts[s] ?? 0
            return (
              <button
                key={s}
                type="button"
                className="filter-chip text-caption py-0.5 px-2"
                aria-pressed={isChecked}
                onClick={() => toggleSeverity(s)}
              >
                <span>{s}</span>
                <span className={`font-mono text-caption ml-0.5 ${isChecked ? 'opacity-90' : 'text-ink-3'}`}>
                  ({count})
                </span>
              </button>
            )
          })}
        </div>

        {/* Area chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-rule/50">
          <span className="font-semibold text-ink-2 text-caption mr-1 uppercase tracking-wider">Area:</span>
          {AREAS.map((a) => {
            const isChecked = selectedAreas.has(a.id)
            const count = areaCounts[a.id] ?? 0
            return (
              <button
                key={a.id}
                type="button"
                className="filter-chip text-caption py-0.5 px-2"
                aria-pressed={isChecked}
                onClick={() => toggleArea(a.id)}
              >
                <span>{a.label}</span>
                <span className={`font-mono text-caption ml-0.5 ${isChecked ? 'opacity-90' : 'text-ink-3'}`}>
                  ({count})
                </span>
              </button>
            )
          })}

          {hasFilters && (
            <button
              type="button"
              className="btn btn-quiet text-small ml-auto py-0.5"
              onClick={clearFilters}
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* Finding cards */}
      {filtered.length === 0 ? (
        <div className="border border-rule bg-raised p-8 text-center text-ink-2 rounded-[var(--radius-control)]">
          <p className="font-semibold text-body text-ink">No findings match the active filters or search.</p>
          <p className="text-small text-ink-3 mt-1">Try resetting severity, area filters, or search keywords.</p>
          <button type="button" className="btn text-small mt-3" onClick={clearFilters}>
            Clear search & filters
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((finding) => (
            <FindingCard
              key={finding.id}
              finding={finding}
              isExpanded={expandedIds.has(finding.id)}
              onToggle={() => toggleCard(finding.id)}
              onViewPrompt={onViewPrompt}
            />
          ))}
        </div>
      )}
    </section>
  )
}
