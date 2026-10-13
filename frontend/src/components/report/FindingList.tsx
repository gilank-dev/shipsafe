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
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState<number | 'all'>(6)
  const [viewMode, setViewMode] = useState<'detailed' | 'compact'>('detailed')

  const toggleSeverity = (sev: Severity) => {
    setCurrentPage(1)
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
    setCurrentPage(1)
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
    setCurrentPage(1)
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

  // Pagination calculations
  const totalItems = filtered.length
  const effectivePageSize = pageSize === 'all' ? totalItems || 1 : pageSize
  const totalPages = Math.max(1, Math.ceil(totalItems / effectivePageSize))
  const safeCurrentPage = Math.min(currentPage, totalPages)

  const pagedFindings = useMemo(() => {
    if (pageSize === 'all') return filtered
    const start = (safeCurrentPage - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, safeCurrentPage, pageSize])

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    const heading = document.getElementById('findings-heading')
    if (heading && typeof heading.scrollIntoView === 'function') {
      heading.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }

  const handleExpandAll = () => {
    setExpandedIds(new Set(pagedFindings.map((f) => f.id)))
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
    <section className="space-y-3" aria-labelledby="findings-heading">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rule pb-2.5">
        <div>
          <h3 id="findings-heading" className="text-title font-bold text-ink">
            Findings ({filtered.length} of {findings.length})
          </h3>
          <p className="text-small text-ink-2 mt-0.5">
            Paginated & compact view to avoid vertical scrolling. Search by file, ID, or vulnerability title.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Density mode toggle */}
          <div className="inline-flex items-center border border-rule rounded-[var(--radius-control)] bg-surface p-0.5 text-caption font-semibold">
            <button
              type="button"
              className={`px-2 py-1 rounded-[var(--radius-chip)] transition-all ${
                viewMode === 'detailed' ? 'bg-canvas text-ink font-bold shadow-xs' : 'text-ink-2 hover:text-ink'
              }`}
              onClick={() => setViewMode('detailed')}
              title="Full detailed view with code preview"
            >
              Detailed
            </button>
            <button
              type="button"
              className={`px-2 py-1 rounded-[var(--radius-chip)] transition-all ${
                viewMode === 'compact' ? 'bg-canvas text-ink font-bold shadow-xs' : 'text-ink-2 hover:text-ink'
              }`}
              onClick={() => setViewMode('compact')}
              title="Ultra-compact dense view"
            >
              Dense
            </button>
          </div>

          <button
            type="button"
            className="btn text-small py-1 px-2.5"
            onClick={handleExpandAll}
            title="Expand visible finding cards"
          >
            Expand all
          </button>
          <button
            type="button"
            className="btn text-small py-1 px-2.5"
            onClick={handleCollapseAll}
            title="Collapse all finding cards"
          >
            Collapse all
          </button>
        </div>
      </div>

      {/* Filter and Search controls */}
      <div className="space-y-2 border border-rule bg-surface p-3 rounded-[var(--radius-control)] text-small">
        {/* Search input */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-3">
            <IconSearch />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setCurrentPage(1)
            }}
            placeholder="Search findings by ID, title, file, snippet, or description..."
            className="control pl-9 pr-9 py-1.5 text-small"
            aria-label="Search findings"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('')
                setCurrentPage(1)
              }}
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
        <>
          <div className="space-y-2">
            {pagedFindings.map((finding) => (
              <FindingCard
                key={finding.id}
                finding={finding}
                viewMode={viewMode}
                isExpanded={expandedIds.has(finding.id)}
                onToggle={() => toggleCard(finding.id)}
                onViewPrompt={onViewPrompt}
              />
            ))}
          </div>

          {/* Smart Pagination Bar */}
          {totalItems > 6 && (
            <div
              className="flex flex-col sm:flex-row items-center justify-between gap-3 border border-rule bg-surface p-2.5 sm:px-4 rounded-[var(--radius-control)] text-small mt-3"
              aria-label="Findings pagination"
            >
              <div className="flex items-center gap-2 text-caption text-ink-2">
                <span>
                  Showing{' '}
                  <strong className="text-ink font-mono">
                    {pageSize === 'all'
                      ? `1-${totalItems}`
                      : `${(safeCurrentPage - 1) * pageSize + 1}-${Math.min(
                          safeCurrentPage * pageSize,
                          totalItems
                        )}`}
                  </strong>{' '}
                  of <strong className="text-ink font-mono">{totalItems}</strong> findings
                </span>

                <div className="hidden sm:inline-flex items-center gap-1 ml-3 border-l border-rule pl-3">
                  <span className="text-ink-3">Per page:</span>
                  {(['6', '12', 'all'] as const).map((size) => (
                    <button
                      key={size}
                      type="button"
                      className={`px-1.5 py-0.5 text-caption font-mono rounded ${
                        (size === 'all' && pageSize === 'all') || pageSize === Number(size)
                          ? 'bg-ink text-canvas font-bold'
                          : 'text-ink-2 hover:bg-canvas'
                      }`}
                      onClick={() => {
                        setPageSize(size === 'all' ? 'all' : Number(size))
                        setCurrentPage(1)
                      }}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {pageSize !== 'all' && totalPages > 1 && (
                <div className="flex items-center gap-1 font-mono">
                  <button
                    type="button"
                    disabled={safeCurrentPage <= 1}
                    onClick={() => handlePageChange(safeCurrentPage - 1)}
                    className="btn text-caption py-1 px-2.5 disabled:opacity-40"
                    aria-label="Previous findings page"
                  >
                    Prev
                  </button>

                  {Array.from({ length: totalPages }).map((_, idx) => {
                    const p = idx + 1
                    if (
                      totalPages > 6 &&
                      p !== 1 &&
                      p !== totalPages &&
                      Math.abs(p - safeCurrentPage) > 1
                    ) {
                      if (p === 2 || p === totalPages - 1) {
                        return <span key={p} className="px-1 text-ink-3 select-none">…</span>
                      }
                      return null
                    }
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handlePageChange(p)}
                        className={`min-w-7 h-7 text-caption font-bold rounded flex items-center justify-center transition-colors ${
                          p === safeCurrentPage
                            ? 'bg-ink text-canvas'
                            : 'border border-rule bg-raised text-ink-2 hover:bg-surface'
                        }`}
                        aria-current={p === safeCurrentPage ? 'page' : undefined}
                      >
                        {p}
                      </button>
                    )
                  })}

                  <button
                    type="button"
                    disabled={safeCurrentPage >= totalPages}
                    onClick={() => handlePageChange(safeCurrentPage + 1)}
                    className="btn text-caption py-1 px-2.5 disabled:opacity-40"
                    aria-label="Next findings page"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  )
}
