import { useState } from 'react'
import type { Finding } from '../../domain/types'
import { CopyButton } from '../ui/CopyButton'
import { SeverityTag } from '../ui/SeverityTag'
import { IconChevron } from '../ui/icons'

interface FindingCardProps {
  finding: Finding
  isExpanded?: boolean
  onToggle?: () => void
  onViewPrompt: (finding: Finding) => void
}

export function FindingCard({ finding, isExpanded: controlledExpanded, onToggle, onViewPrompt }: FindingCardProps) {
  const [internalExpanded, setInternalExpanded] = useState(true)
  const expanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded

  const handleToggle = () => {
    if (onToggle) {
      onToggle()
    } else {
      setInternalExpanded(!internalExpanded)
    }
  }

  const locationText = finding.location
    ? `${finding.location.file}${finding.location.line ? `:${finding.location.line}` : ''}`
    : 'Location not determined'

  return (
    <article
      className="border border-rule bg-raised transition-all hover:border-rule-strong rounded-[var(--radius-control)] overflow-hidden"
      data-finding-id={finding.id}
    >
      <header className="p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-rule/70 bg-surface/40 hover:bg-surface/80 transition-colors">
        <div className="flex-1 min-w-0 cursor-pointer select-none" onClick={handleToggle}>
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <span className="font-mono text-small font-bold text-ink">{finding.id}</span>
            <SeverityTag level={finding.severity} />
            <span className="tag tag-outline text-ink-2 text-caption">{finding.area}</span>
            {finding.confidence && (
              <span className="tag tag-outline text-ink-3 text-caption hidden sm:inline-flex">
                {finding.confidence}
              </span>
            )}
            <span
              className="inline-flex items-center gap-1 font-mono text-caption text-ink-3 bg-canvas/60 px-1.5 py-0.5 rounded-[var(--radius-chip)] border border-rule/50 truncate max-w-[280px]"
              title={locationText}
            >
              {locationText}
            </span>
          </div>
          <h4 className="text-body font-bold text-ink leading-snug break-words">
            {finding.title}
          </h4>
        </div>

        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-rule/50">
          <div className="flex flex-wrap items-center gap-1.5">
            <CopyButton text={finding.remediationPrompt} label="Copy prompt" subject={`${finding.id} prompt`} />
            <button
              type="button"
              className="btn text-small py-1 px-2.5"
              onClick={() => onViewPrompt(finding)}
              title="View prompt for coding agent"
            >
              View prompt
            </button>
          </div>
          <button
            type="button"
            className="btn min-w-[44px] min-h-[44px] sm:min-w-8 sm:min-h-0 sm:py-1 px-2.5"
            aria-expanded={expanded}
            aria-label={expanded ? `Collapse finding ${finding.id}` : `Expand finding ${finding.id}`}
            onClick={handleToggle}
          >
            <span className={`inline-block transition-transform duration-150 ${expanded ? 'rotate-180' : ''}`}>
              <IconChevron />
            </span>
          </button>
        </div>
      </header>

      {expanded && (
        <div className="p-3.5 sm:p-4 space-y-3.5 bg-surface/70 text-small min-w-0 max-w-full animate-fadeIn">
          {finding.location?.snippet && (
            <div className="min-w-0 max-w-full border border-rule rounded-[var(--radius-control)] bg-canvas/60 overflow-hidden">
              <div className="px-3 py-1 bg-surface border-b border-rule flex items-center justify-between text-caption font-mono text-ink-3">
                <span>Code Reference ({locationText})</span>
              </div>
              <pre className="p-3 bg-raised font-mono text-small overflow-x-auto max-w-full whitespace-pre">
                <code>{finding.location.snippet}</code>
              </pre>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 rounded-[var(--radius-control)] border border-rule bg-raised">
              <p className="font-bold text-ink mb-1 text-caption uppercase tracking-wider text-ink-2">What happened</p>
              <p className="text-ink-2 leading-relaxed break-words">{finding.what}</p>
            </div>

            <div className="p-3 rounded-[var(--radius-control)] border border-rule bg-raised">
              <p className="font-bold text-ink mb-1 text-caption uppercase tracking-wider text-ink-2">Why it matters</p>
              <p className="text-ink-2 leading-relaxed break-words">{finding.why}</p>
            </div>
          </div>

          <div className="p-3.5 rounded-[var(--radius-control)] border border-status-pass-border bg-status-pass-bg/20">
            <p className="font-bold text-status-pass-fg mb-1 text-caption uppercase tracking-wider">Recommended Fix</p>
            <p className="text-ink leading-relaxed break-words">{finding.recommendedFix}</p>
          </div>

          {finding.verifyWith && (
            <div className="min-w-0 max-w-full">
              <p className="font-bold text-ink-2 mb-1 text-caption uppercase tracking-wider">Verify with</p>
              <pre className="p-2.5 bg-raised border border-rule font-mono text-small overflow-x-auto max-w-full whitespace-pre text-ink rounded-[var(--radius-control)]">
                <code>{finding.verifyWith}</code>
              </pre>
            </div>
          )}
        </div>
      )}
    </article>
  )
}
