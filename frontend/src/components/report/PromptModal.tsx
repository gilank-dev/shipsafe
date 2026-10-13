import type { Finding } from '../../domain/types'
import { agentLabel } from '../../config/agents'
import { useStore } from '../../state/store'
import { Dialog } from '../dialogs/Dialog'
import { CopyButton } from '../ui/CopyButton'

interface PromptModalProps {
  finding: Finding | null
  onClose: () => void
}

export function PromptModal({ finding, onClose }: PromptModalProps) {
  const agentTarget = useStore((s) => s.submission.agentTarget)
  if (!finding) return null

  return (
    <Dialog
      title={`${finding.id}: Prompt for ${agentLabel(agentTarget)}`}
      onClose={onClose}
      wide
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto">
          <CopyButton text={finding.remediationPrompt} label="Copy prompt" subject={`${finding.id} prompt`} />
          <button type="button" className="btn min-h-[44px] min-w-[44px] sm:min-h-0" onClick={onClose}>
            Close
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="text-small font-semibold text-ink-2">Finding</p>
          <p className="text-body font-bold text-ink">{finding.title}</p>
        </div>

        <div className="border border-rule bg-surface p-3 text-small text-ink-2">
          Paste this prompt into your coding agent ({agentLabel(agentTarget)}). It contains the file location, exact problem, expected behavior, and verification steps. Real secrets are omitted.
        </div>

        <div>
          <label htmlFor="prompt-display" className="block text-small font-semibold mb-1">
            Remediation Prompt
          </label>
          <pre
            id="prompt-display"
            tabIndex={0}
            className="max-h-60 sm:max-h-96 overflow-y-auto overflow-x-auto border border-rule-strong bg-raised p-3 sm:p-4 font-mono text-small whitespace-pre-wrap break-words leading-relaxed select-all"
          >
            {finding.remediationPrompt}
          </pre>
        </div>
      </div>
    </Dialog>
  )
}
