import { selectOutdated } from '../../state/selectors'
import { useStore } from '../../state/store'
import { ReportView } from '../report/ReportView'
import { useAuditRunner } from '../submission/useAuditRunner'
import { EmptyState } from './EmptyState'
import { ErrorPanel } from './ErrorPanel'
import { ProgressStepper } from './ProgressStepper'
import { StaleNotice } from './StaleNotice'

/** Switches the report area among empty, running, error and done. A running audit keeps the previous report out of view. */
export function ReportArea() {
  const status = useStore((s) => s.audit.status)
  const error = useStore((s) => s.audit.error)
  const hasReport = useStore((s) => s.audit.report !== null)
  const outdated = useStore(selectOutdated)
  const { run, dialog } = useAuditRunner()

  if (status === 'running') return <ProgressStepper />
  if (status === 'error' && error) {
    return (
      <>
        <ErrorPanel error={error} onRetry={run} />
        {dialog}
      </>
    )
  }
  if (!hasReport) return <EmptyState />
  return (
    <>
      {outdated && <StaleNotice />}
      <ReportView />
    </>
  )
}
