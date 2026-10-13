import { useState } from 'react'
import { agentLabel } from '../../config/agents'
import { buildPromptsMarkdown, downloadFile, promptFilename } from '../../domain/export'
import type { Finding } from '../../domain/types'
import { announce } from '../../state/announcer'
import { useStore } from '../../state/store'
import { CopyButton } from '../ui/CopyButton'
import { IconDownload } from '../ui/icons'

interface ExportBarProps {
  findings: Finding[]
}

export function ExportBar({ findings }: ExportBarProps) {
  const agentTarget = useStore((s) => s.submission.agentTarget)
  const promptsStatus = useStore((s) => s.audit.promptsStatus)
  const promptsError = useStore((s) => s.audit.promptsError)
  const [downloaded, setDownloaded] = useState(false)

  const allPromptsMarkdown = buildPromptsMarkdown(findings, agentTarget)
  const filename = promptFilename(agentTarget)

  const handleDownload = () => {
    downloadFile(allPromptsMarkdown, filename)
    setDownloaded(true)
    announce(`Downloaded ${filename}`)
    setTimeout(() => setDownloaded(false), 2000)
  }

  return (
    <div className="border border-rule bg-raised p-4" role="region" aria-label="Export remediation prompts">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-body font-bold text-ink">Remediation Prompts</h4>
            <span className="tag text-small font-semibold">
              Format: {agentLabel(agentTarget)}
            </span>
          </div>
          <p className="text-small text-ink-2 mt-0.5">
            {findings.length} tailored {findings.length === 1 ? 'prompt' : 'prompts'} ready to paste into your AI assistant
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <CopyButton text={allPromptsMarkdown} label="Copy all prompts" />
          <button
            type="button"
            className="btn"
            onClick={handleDownload}
            title={`Download ${filename}`}
          >
            <IconDownload />
            {downloaded ? 'Downloaded' : 'Download .md'}
          </button>
        </div>
      </div>

      {promptsStatus === 'updating' && (
        <div className="mt-3 text-small text-ink-2 italic" role="status">
          Reformatting prompts for {agentLabel(agentTarget)}...
        </div>
      )}

      {promptsError && (
        <div className="mt-3 text-small text-status-fail font-medium" role="alert">
          {promptsError}
        </div>
      )}
    </div>
  )
}
