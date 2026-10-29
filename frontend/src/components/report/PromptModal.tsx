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
  const openPaywallModal = useStore((s) => s.openPaywallModal)
  if (!finding) return null

  return (
    <Dialog
      title={`${finding.id}: Prompt for ${agentLabel(agentTarget)}`}
      onClose={onClose}
      wide
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto">
          {finding.isLocked ? (
            <button
              type="button"
              className="btn text-small py-1.5 px-3 bg-ink hover:bg-ink-2 text-canvas font-mono font-medium rounded-none uppercase tracking-wider"
              onClick={() => {
                onClose()
                openPaywallModal('remediation')
              }}
            >
              Upgrade ke Pro
            </button>
          ) : (
            <CopyButton text={finding.remediationPrompt} label="Copy prompt" subject={`${finding.id} prompt`} />
          )}
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

        {finding.isLocked ? (
          <div className="rounded-none border border-rule bg-surface p-5 text-center space-y-3 font-mono">
            <div className="size-10 rounded-none border border-rule bg-raised text-ink mx-auto flex items-center justify-center">
              <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h4 className="text-body font-bold text-ink uppercase tracking-wider">Prompt Perbaikan AI Terkunci</h4>
              <p className="text-small text-ink-2 max-w-md mx-auto mt-1">
                Upgrade ke Pro (Rp 79rb/bulan) untuk membuka semua prompt perbaikan instan bagi seluruh temuan keamanan.
              </p>
            </div>
            <button
              type="button"
              className="px-4 py-2 rounded-none bg-ink hover:bg-ink-2 text-canvas font-mono font-medium text-xs transition-colors cursor-pointer uppercase tracking-wider"
              onClick={() => {
                onClose()
                openPaywallModal('remediation')
              }}
            >
              Upgrade ke Pro Sekarang
            </button>
          </div>
        ) : (
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
        )}
      </div>
    </Dialog>
  )
}
