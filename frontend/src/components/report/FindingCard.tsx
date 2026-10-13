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
      className="border border-rule bg-raised transition-colors"
      data-finding-id={finding.id}
    >
      <header className="p-4 flex flex-wrap items-start justify-between gap-3 border-b border-rule">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="font-mono text-small font-bold text-ink">{finding.id}</span>
            <SeverityTag level={finding.severity} />
            <span className="tag tag-outline text-ink-2">{finding.area}</span>
            {finding.confidence && (
              <span className="tag tag-outline text-ink-3 text-small">
                {finding.confidence}
              </span>
            )}
          </div>
          <h4 className="text-body font-bold text-ink leading-snug">
            {finding.title}
          </h4>
          <p className="mt-1 font-mono text-small text-ink-2 truncate">
            {locationText}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <CopyButton text={finding.remediationPrompt} label="Copy prompt" />
          <button
            type="button"
            className="btn text-small"
            onClick={() => onViewPrompt(finding)}
            title="View prompt for coding agent"
          >
            View prompt
          </button>
          <button
            type="button"
            className="btn min-w-9 px-2"
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
        <div className="p-4 space-y-4 bg-surface text-small">
          {finding.location?.snippet && (
            <div>
              <p className="font-semibold text-ink-2 mb-1">Snippet</p>
              <pre className="p-2.5 bg-raised border border-rule font-mono text-small overflow-x-auto">
                <code>{finding.location.snippet}</code>
              </pre>
            </div>
          )}

          <div>
            <p className="font-semibold text-ink mb-1">What</p>
            <p className="text-ink-2 leading-relaxed">{finding.what}</p>
          </div>

          <div>
            <p className="font-semibold text-ink mb-1">Why it matters</p>
            <p className="text-ink-2 leading-relaxed">{finding.why}</p>
          </div>

          <div>
            <p className="font-semibold text-ink mb-1">Recommended fix</p>
            <p className="text-ink-2 leading-relaxed">{finding.recommendedFix}</p>
          </div>

          {finding.verifyWith && (
            <div>
              <p className="font-semibold text-ink mb-1">Verify with</p>
              <pre className="p-2.5 bg-raised border border-rule font-mono text-small overflow-x-auto text-ink">
                <code>{finding.verifyWith}</code>
              </pre>
            </div>
          )}
        </div>
      )}
    </article>
  )
}
