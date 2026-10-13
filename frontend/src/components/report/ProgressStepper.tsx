import type { AuditStage } from '../../domain/types'
import { IconCheck } from '../ui/icons'

interface ProgressStepperProps {
  stage: AuditStage | null
  uploadPct: number
  onCancel?: () => void
}

const STAGES: Array<{ id: AuditStage; label: string; description: string }> = [
  { id: 'upload', label: '1. Upload', description: 'Sending ZIP archive to scanner' },
  { id: 'scanning', label: '2. Scanning', description: 'Checking archive safety and structure' },
  { id: 'auditing', label: '3. Auditing', description: 'Running security checks and heuristics' },
  { id: 'report', label: '4. Report', description: 'Synthesizing report and remediation prompts' },
]

const STAGE_ORDER: Record<AuditStage, number> = {
  upload: 0,
  scanning: 1,
  auditing: 2,
  report: 3,
}

export function ProgressStepper({ stage, uploadPct, onCancel }: ProgressStepperProps) {
  const currentIndex = stage ? STAGE_ORDER[stage] : 0

  return (
    <div className="border border-rule bg-raised p-6" role="region" aria-label="Audit progress">
      <div className="flex items-center justify-between pb-4 border-b border-rule">
        <div>
          <h3 className="text-title font-bold">Running audit</h3>
          <p className="text-small text-ink-2 mt-0.5">Please keep this window open while processing</p>
        </div>
        {onCancel && (
          <button type="button" className="btn text-small" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>

      <div className="indeterminate mt-4" aria-hidden="true" />

      <ol className="mt-6 space-y-4">
        {STAGES.map((s, idx) => {
          const isDone = idx < currentIndex
          const isCurrent = idx === currentIndex
          const isPending = idx > currentIndex

          return (
            <li key={s.id} className="flex items-start gap-3">
              <span
                className={`flex size-6 shrink-0 items-center justify-center border font-mono text-small font-bold ${
                  isDone
                    ? 'border-status-pass bg-status-pass text-canvas'
                    : isCurrent
                      ? 'border-ink bg-ink text-canvas'
                      : 'border-rule-strong bg-surface text-ink-3'
                }`}
                aria-hidden="true"
              >
                {isDone ? <IconCheck width={14} height={14} /> : idx + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-small font-semibold ${isCurrent ? 'text-ink' : isPending ? 'text-ink-3' : 'text-ink-2'}`}>
                    {s.label}
                  </span>
                  {isCurrent && s.id === 'upload' && uploadPct > 0 && uploadPct < 100 && (
                    <span className="font-mono text-small text-ink-2">({uploadPct}%)</span>
                  )}
                  {isCurrent && (
                    <span className="tag text-small border-ink bg-surface flex items-center gap-1.5">
                      <span className="relative flex size-2 shrink-0 items-center justify-center">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-ink opacity-75 pulse-active" />
                        <span className="relative inline-flex size-1.5 rounded-full bg-ink" />
                      </span>
                      <span>In progress</span>
                    </span>
                  )}
                </div>
                <p className="text-small text-ink-3 mt-0.5">{s.description}</p>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
