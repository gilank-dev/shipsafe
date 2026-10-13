import { useEffect, useState } from 'react'
import type { AuditStage } from '../../domain/types'
import { cancelAudit } from '../../state/audit-controller'
import { useStore } from '../../state/store'
import { IconCheck, IconStop } from '../ui/icons'

const STEPS: readonly { id: AuditStage; label: string }[] = [
  { id: 'upload', label: 'Upload' },
  { id: 'scanning', label: 'Scanning' },
  { id: 'auditing', label: 'Auditing' },
  { id: 'report', label: 'Report' },
]

function useElapsedSeconds(startedAt: number | null): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  return startedAt ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0
}

export function ProgressStepper() {
  const stage = useStore((s) => s.audit.stage)
  const uploadPct = useStore((s) => s.audit.uploadPct)
  const startedAt = useStore((s) => s.audit.startedAt)
  const elapsed = useElapsedSeconds(startedAt)
  const activeIndex = Math.max(0, STEPS.findIndex((s) => s.id === stage))

  return (
    <div className="mt-6 border-2 border-ink">
      <div className="indeterminate" aria-hidden="true" />
      <div className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-title">Audit in progress</h3>
          <button type="button" className="btn" onClick={cancelAudit}>
            <IconStop />
            Cancel
          </button>
        </div>
        <ol className="mt-4 grid gap-3 sm:grid-cols-4">
          {STEPS.map((step, i) => {
            const state = i < activeIndex ? 'done' : i === activeIndex ? 'active' : 'waiting'
            return (
              <li
                key={step.id}
                data-state={state}
                aria-current={state === 'active' ? 'step' : undefined}
                className={`border-t-2 pt-2 ${state === 'waiting' ? 'border-rule text-ink-3' : 'border-ink'}`}
              >
                <span className="flex items-center gap-1.5 font-semibold">
                  {state === 'done' && <IconCheck />}
                  {step.label}
                </span>
                <span className="block text-small text-ink-2">
                  {state === 'done' ? 'Done' : state === 'active' ? (step.id === 'upload' ? `${uploadPct}%` : 'In progress') : 'Waiting'}
                </span>
              </li>
            )
          })}
        </ol>
        <p className="mt-4 text-small text-ink-2" aria-hidden="true">
          Running, {elapsed} s
        </p>
      </div>
    </div>
  )
}
