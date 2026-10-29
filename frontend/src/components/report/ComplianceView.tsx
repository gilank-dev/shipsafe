import React, { useState } from 'react'
import type { Finding } from '../../domain/types'
import { calculateOwaspCompliance } from '../../domain/owasp-map'
import { SeverityTag } from '../ui/SeverityTag'
import { IconChevron } from '../ui/icons'

interface ComplianceViewProps {
  findings: Finding[]
  onViewPrompt?: (finding: Finding) => void
}

export const ComplianceView: React.FC<ComplianceViewProps> = ({ findings, onViewPrompt }) => {
  const compliance = calculateOwaspCompliance(findings)
  const [filter, setFilter] = useState<'All' | 'Fail' | 'Warning' | 'Pass'>('All')
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({})

  const toggleExpand = (id: string) => {
    setExpandedCats((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const filteredCategories = compliance.categories.filter((c) => {
    if (filter === 'All') return true
    return c.status === filter
  })

  const handlePrint = () => {
    window.print()
  }

  return (
    <section aria-labelledby="compliance-heading" className="space-y-4 reveal">
      {/* Header with Title and Print Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rule pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 id="compliance-heading" className="text-title font-bold text-ink">
              OWASP Top 10 (2021) Compliance Posture
            </h3>
            <span className="font-mono text-caption px-2 py-0.5 rounded-full border border-rule bg-surface text-ink-2 font-semibold">
              ASVS Level 2
            </span>
          </div>
          <p className="text-small text-ink-2 mt-0.5">
            Systematic vulnerability mapping against OWASP Top 10 web standards and Common Weakness Enumeration (CWE).
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handlePrint}
            className="btn btn-secondary text-small font-mono flex items-center gap-1.5"
            title="Open print-ready view or save as PDF"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {/* Compliance Overview Scorecard */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="border border-rule bg-raised p-3.5 rounded-[var(--radius-control)] shadow-xs">
          <span className="text-caption font-mono text-ink-3 uppercase tracking-wider block">Compliance Score</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-h2 font-mono font-bold text-ink leading-none">
              {compliance.complianceScore}%
            </span>
            <span className="text-caption font-mono text-ink-3">/ 100%</span>
          </div>
          <span className="text-[11px] font-mono text-ink-3 mt-1 block">
            {compliance.passCount} of 10 controls passed
          </span>
        </div>

        <div className="border border-status-pass-border bg-status-pass-bg p-3.5 rounded-[var(--radius-control)]">
          <span className="text-caption font-mono text-status-pass-fg uppercase tracking-wider block font-semibold">
            Passed Controls
          </span>
          <div className="mt-1">
            <span className="text-h2 font-mono font-bold text-status-pass-fg leading-none">
              {compliance.passCount}
            </span>
          </div>
          <span className="text-[11px] font-mono text-status-pass-fg/80 mt-1 block">
            Zero detected violations
          </span>
        </div>

        <div className="border border-status-warn-border bg-status-warn-bg p-3.5 rounded-[var(--radius-control)]">
          <span className="text-caption font-mono text-status-warn-fg uppercase tracking-wider block font-semibold">
            Warning Controls
          </span>
          <div className="mt-1">
            <span className="text-h2 font-mono font-bold text-status-warn-fg leading-none">
              {compliance.warnCount}
            </span>
          </div>
          <span className="text-[11px] font-mono text-status-warn-fg/80 mt-1 block">
            Low or Medium severity issues
          </span>
        </div>

        <div className="border border-status-fail-border bg-status-fail-bg p-3.5 rounded-[var(--radius-control)]">
          <span className="text-caption font-mono text-status-fail-fg uppercase tracking-wider block font-semibold">
            Violated Controls
          </span>
          <div className="mt-1">
            <span className="text-h2 font-mono font-bold text-status-fail-fg leading-none">
              {compliance.failCount}
            </span>
          </div>
          <span className="text-[11px] font-mono text-status-fail-fg/80 mt-1 block">
            Critical or High severity findings
          </span>
        </div>
      </div>

      {/* Status Filter Chips */}
      <div className="flex flex-wrap items-center gap-1.5 text-caption font-mono font-semibold pt-1">
        <button
          type="button"
          onClick={() => setFilter('All')}
          className={`filter-chip py-0.5 px-2.5 text-caption ${filter === 'All' ? 'aria-pressed:true' : ''}`}
          aria-pressed={filter === 'All'}
        >
          All (10)
        </button>
        <button
          type="button"
          onClick={() => setFilter('Fail')}
          className={`inline-flex items-center gap-1 border border-status-fail-border bg-status-fail-bg px-2.5 py-0.5 text-status-fail-fg rounded-[var(--radius-chip)] transition-all ${
            filter === 'Fail' ? 'ring-2 ring-ink font-bold' : 'opacity-85 hover:opacity-100'
          }`}
          aria-pressed={filter === 'Fail'}
        >
          ✖ Violated ({compliance.failCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter('Warning')}
          className={`inline-flex items-center gap-1 border border-status-warn-border bg-status-warn-bg px-2.5 py-0.5 text-status-warn-fg rounded-[var(--radius-chip)] transition-all ${
            filter === 'Warning' ? 'ring-2 ring-ink font-bold' : 'opacity-85 hover:opacity-100'
          }`}
          aria-pressed={filter === 'Warning'}
        >
          ▲ Warning ({compliance.warnCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter('Pass')}
          className={`inline-flex items-center gap-1 border border-status-pass-border bg-status-pass-bg px-2.5 py-0.5 text-status-pass-fg rounded-[var(--radius-chip)] transition-all ${
            filter === 'Pass' ? 'ring-2 ring-ink font-bold' : 'opacity-85 hover:opacity-100'
          }`}
          aria-pressed={filter === 'Pass'}
        >
          ● Passed ({compliance.passCount})
        </button>
      </div>

      {/* Category List */}
      <div className="space-y-3">
        {filteredCategories.map(({ mapping, findings: catFindings, status }) => {
          const isExpanded = !!expandedCats[mapping.owaspId]

          return (
            <div
              key={mapping.owaspId}
              className="border border-rule bg-raised rounded-[var(--radius-control)] overflow-hidden shadow-xs"
            >
              <div
                className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-surface/50 transition-colors"
                onClick={() => toggleExpand(mapping.owaspId)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    toggleExpand(mapping.owaspId)
                  }
                }}
                aria-expanded={isExpanded}
              >
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <span
                    className={`font-mono text-caption px-2 py-0.5 rounded-[var(--radius-chip)] font-bold shrink-0 border ${
                      status === 'Fail'
                        ? 'bg-status-fail-bg text-status-fail-fg border-status-fail-border'
                        : status === 'Warning'
                        ? 'bg-status-warn-bg text-status-warn-fg border-status-warn-border'
                        : 'bg-status-pass-bg text-status-pass-fg border-status-pass-border'
                    }`}
                  >
                    {mapping.owaspId}
                  </span>

                  <div>
                    <h4 className="text-body font-bold text-ink leading-snug">
                      {mapping.owaspName}
                    </h4>
                    <p className="text-caption text-ink-3 mt-0.5 line-clamp-1 sm:line-clamp-none">
                      {mapping.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {/* Status Indicator */}
                  <span
                    className={`text-caption font-mono font-bold px-2 py-0.5 rounded-[var(--radius-chip)] border ${
                      status === 'Fail'
                        ? 'bg-status-fail-bg text-status-fail-fg border-status-fail-border'
                        : status === 'Warning'
                        ? 'bg-status-warn-bg text-status-warn-fg border-status-warn-border'
                        : 'bg-status-pass-bg text-status-pass-fg border-status-pass-border'
                    }`}
                  >
                    {status === 'Fail' ? '✖ Non-Compliant' : status === 'Warning' ? '▲ Warning' : '● Compliant'}
                  </span>

                  {catFindings.length > 0 && (
                    <span className="font-mono text-caption text-ink-2 bg-surface px-1.5 py-0.5 rounded border border-rule">
                      {catFindings.length} {catFindings.length === 1 ? 'finding' : 'findings'}
                    </span>
                  )}

                  <span className={`text-ink-3 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                    <IconChevron />
                  </span>
                </div>
              </div>

              {/* Expanded Details: CWE Mappings + Findings List */}
              {isExpanded && (
                <div className="border-t border-rule bg-canvas/40 p-3.5 sm:p-4 space-y-3">
                  {/* CWE Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 text-caption font-mono">
                    <span className="text-ink-3 font-semibold">Associated CWEs:</span>
                    {mapping.cweIds.map((cwe) => (
                      <span
                        key={cwe}
                        className="bg-surface text-ink px-1.5 py-0.5 rounded border border-rule/80 text-[11px]"
                      >
                        {cwe}
                      </span>
                    ))}
                  </div>

                  {/* Findings Breakdown */}
                  {catFindings.length > 0 ? (
                    <div className="space-y-2 mt-2">
                      <h5 className="text-caption font-mono font-bold text-ink uppercase tracking-wider">
                        Mapped Issues ({catFindings.length}):
                      </h5>
                      {catFindings.map((finding) => (
                        <div
                          key={finding.id}
                          className="border border-rule bg-raised p-2.5 sm:p-3 rounded-[var(--radius-control)] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div className="flex items-start gap-2 min-w-0">
                            <span className="font-mono font-bold text-caption text-ink shrink-0">
                              {finding.id}
                            </span>
                            <SeverityTag level={finding.severity} />
                            <span className="text-small font-medium text-ink truncate">
                              {finding.title}
                            </span>
                            {finding.location && (
                              <span className="font-mono text-[11px] text-ink-3 bg-surface px-1 py-0.2 rounded border border-rule shrink-0 hidden md:inline">
                                {finding.location.file}:{finding.location.line ?? 1}
                              </span>
                            )}
                          </div>

                          {onViewPrompt && (
                            <button
                              type="button"
                              onClick={() => onViewPrompt(finding)}
                              className="btn btn-secondary text-caption py-0.5 px-2 font-mono shrink-0 self-end sm:self-center"
                            >
                              Remediation
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-caption font-mono text-status-pass-fg bg-status-pass-bg border border-status-pass-border p-2.5 rounded-[var(--radius-control)]">
                      ✓ Zero vulnerabilities detected in this category. Codebase meets OWASP criteria for {mapping.owaspId}.
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
