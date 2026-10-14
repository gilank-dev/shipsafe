import { useState } from 'react'
import type { Finding } from '../../domain/types'
import { CopyButton } from '../ui/CopyButton'
import { SeverityTag } from '../ui/SeverityTag'
import { IconChevron, IconFile, IconTerminal, IconShield } from '../ui/icons'

interface FindingCardProps {
  finding: Finding
  isExpanded?: boolean
  viewMode?: 'compact' | 'detailed'
  onToggle?: () => void
  onViewPrompt: (finding: Finding) => void
}

export function FindingCard({
  finding,
  isExpanded: controlledExpanded,
  viewMode = 'detailed',
  onToggle,
  onViewPrompt,
}: FindingCardProps) {
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

  const severityAccentBorder =
    finding.severity === 'Critical'
      ? 'border-l-4 border-l-status-fail'
      : finding.severity === 'High'
        ? 'border-l-4 border-l-status-fail'
        : finding.severity === 'Medium'
          ? 'border-l-4 border-l-status-partial'
          : 'border-l-4 border-l-status-pass'

  return (
    <article
      className={`border border-rule bg-raised transition-all hover:border-rule-strong rounded-[var(--radius-control)] overflow-hidden shadow-xs ${severityAccentBorder}`}
      data-finding-id={finding.id}
    >
      <header
        className={`${
          viewMode === 'compact' ? 'p-2.5 sm:p-3' : 'p-3.5 sm:p-4'
        } flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rule/60 bg-surface/30 hover:bg-surface/70 transition-colors cursor-pointer select-none`}
        onClick={handleToggle}
      >
        <div className="flex-1 min-w-0">
          {/* Metadata Badges Row */}
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            <span className="font-mono text-caption font-bold px-1.5 py-0.5 rounded-[var(--radius-chip)] bg-canvas border border-rule text-ink shadow-2xs">
              {finding.id}
            </span>
            <SeverityTag level={finding.severity} />
            <span className="tag text-caption font-mono font-medium px-2 py-0.5 rounded-[var(--radius-chip)] bg-surface border border-rule text-ink-2">
              {finding.area}
            </span>
            {finding.confidence && (
              <span className="tag text-caption font-mono text-ink-3 hidden sm:inline-flex px-1.5 py-0.5 rounded-[var(--radius-chip)] border border-rule/60 bg-surface">
                {finding.confidence}
              </span>
            )}
            <span
              className="inline-flex items-center gap-1 font-mono text-caption text-ink-3 bg-canvas/80 px-2 py-0.5 rounded-[var(--radius-chip)] border border-rule/60 truncate max-w-[280px]"
              title={locationText}
            >
              <IconFile width={12} height={12} className="shrink-0 text-ink-3" />
              <span className="truncate">{locationText}</span>
            </span>
          </div>

          {/* Title Row */}
          <h4
            className={`${
              viewMode === 'compact' ? 'text-small' : 'text-body'
            } font-bold text-ink leading-snug break-words`}
          >
            {finding.title}
          </h4>
        </div>

        {/* Action Controls */}
        <div
          className="flex items-center gap-2 shrink-0 self-end sm:self-center"
          onClick={(e) => e.stopPropagation()}
        >
          <CopyButton
            text={finding.remediationPrompt}
            label="Copy prompt"
            subject={`${finding.id} prompt`}
          />
          <button
            type="button"
            className="btn text-small py-1 px-2.5"
            onClick={() => onViewPrompt(finding)}
            title="View prompt for coding agent"
          >
            View prompt
          </button>
          <button
            type="button"
            className="btn min-w-[36px] min-h-[36px] sm:min-w-8 sm:min-h-0 sm:py-1 px-2"
            aria-expanded={expanded}
            aria-label={expanded ? `Collapse finding ${finding.id}` : `Expand finding ${finding.id}`}
            onClick={handleToggle}
          >
            <span
              className={`inline-block transition-transform duration-200 ${
                expanded ? 'rotate-180' : ''
              }`}
            >
              <IconChevron />
            </span>
          </button>
        </div>
      </header>

      {expanded && (
        <div className="p-4 sm:p-5 space-y-4 bg-surface/50 text-small min-w-0 max-w-full animate-fadeIn border-t border-rule/30">
          {/* Code Reference Snippet */}
          {finding.location?.snippet && (
            <div className="min-w-0 max-w-full border border-rule rounded-[var(--radius-control)] bg-canvas overflow-hidden shadow-2xs">
              <div className="px-3.5 py-1.5 bg-surface border-b border-rule flex items-center justify-between text-caption font-mono text-ink-2">
                <span className="flex items-center gap-1.5">
                  <IconFile width={13} height={13} className="text-ink-3" />
                  <span className="font-semibold text-ink">Code Reference</span>
                  <span className="text-ink-3">({locationText})</span>
                </span>
                <CopyButton
                  text={finding.location.snippet}
                  label="Copy code"
                  subject={`${finding.id} code snippet`}
                  variant="quiet"
                />
              </div>
              <pre className="p-3.5 bg-raised/80 font-mono text-small overflow-x-auto max-w-full whitespace-pre text-ink leading-relaxed">
                <code>{finding.location.snippet}</code>
              </pre>
            </div>
          )}

          {/* Diagnostic Panels */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="p-3.5 rounded-[var(--radius-control)] border border-rule bg-raised/90 shadow-2xs">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="size-2 rounded-full bg-ink-2" />
                <p className="font-bold text-caption uppercase tracking-wider text-ink-2">
                  What happened
                </p>
              </div>
              <p className="text-ink text-small leading-relaxed break-words">{finding.what}</p>
            </div>

            <div className="p-3.5 rounded-[var(--radius-control)] border border-rule bg-raised/90 shadow-2xs">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="size-2 rounded-full bg-status-fail" />
                <p className="font-bold text-caption uppercase tracking-wider text-ink-2">
                  Why it matters
                </p>
              </div>
              <p className="text-ink text-small leading-relaxed break-words">{finding.why}</p>
            </div>
          </div>

          {/* Recommended Fix */}
          <div className="p-4 rounded-[var(--radius-control)] border border-rule-strong bg-raised shadow-xs">
            <div className="flex items-center gap-2 mb-1.5 text-ink">
              <IconShield width={16} height={16} className="text-ink shrink-0" />
              <p className="font-bold text-body text-ink">Recommended Remediation</p>
            </div>
            <p className="text-ink-2 text-small leading-relaxed break-words pl-6">
              {finding.recommendedFix}
            </p>
          </div>

          {/* Verification Command */}
          {finding.verifyWith && (
            <div className="min-w-0 max-w-full border border-rule rounded-[var(--radius-control)] bg-canvas/60 overflow-hidden shadow-2xs">
              <div className="px-3.5 py-1.5 bg-surface border-b border-rule flex items-center justify-between text-caption font-mono text-ink-2">
                <span className="flex items-center gap-1.5">
                  <IconTerminal width={13} height={13} className="text-ink-3" />
                  <span className="font-semibold text-ink">Verify with</span>
                </span>
                <CopyButton
                  text={finding.verifyWith}
                  label="Copy command"
                  subject={`${finding.id} verification command`}
                  variant="quiet"
                />
              </div>
              <pre className="p-3 bg-raised/90 font-mono text-small overflow-x-auto max-w-full whitespace-pre text-ink">
                <code>{finding.verifyWith}</code>
              </pre>
            </div>
          )}
        </div>
      )}
    </article>
  )
}
