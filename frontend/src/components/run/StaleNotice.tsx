import { useAuditRunner } from '../submission/useAuditRunner'
import { Button } from '../ui/Button'
import { IconAlert, IconRefresh } from '../ui/icons'

/** The old report stays readable; this only says it no longer matches the inputs. */
export function StaleNotice() {
  const { run, dialog } = useAuditRunner()
  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-2 border-partial bg-surface px-4 py-3">
      <p className="flex items-start gap-2 text-partial">
        <IconAlert className="mt-1 shrink-0" />
        <span>
          <span className="font-bold">Outdated:</span> the ZIP or project context changed after this report ran. Run the audit again.
        </span>
      </p>
      <Button onClick={run}>
        <IconRefresh />
        Run audit again
      </Button>
      {dialog}
    </div>
  )
}
