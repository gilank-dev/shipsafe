import { useId } from 'react'
import { cancelAudit } from '../../state/audit-controller'
import { selectCanRun, selectIsCaptchaReady } from '../../state/selectors'
import { useStore } from '../../state/store'
import { Button } from '../ui/Button'
import { IconPlay, IconStop } from '../ui/icons'
import { useAuditRunner } from './useAuditRunner'

/** The only primary button on the page. */
export function RunAuditButton() {
  const running = useStore((s) => s.audit.status === 'running')
  const hasReport = useStore((s) => s.audit.report !== null)
  const canRun = useStore(selectCanRun)
  const fileReady = useStore((s) => s.submission.file !== null && s.submission.fileError === null)
  const captchaReady = useStore(selectIsCaptchaReady)
  const { run, dialog } = useAuditRunner()
  const reasonId = useId()

  const label = running ? 'Cancel' : hasReport ? 'Run audit again' : 'Run Audit'

  let helperText = ''
  if (!running && !canRun) {
    if (!fileReady) {
      helperText = 'Choose a ZIP file to run the audit.'
    } else if (!captchaReady) {
      helperText = 'Complete the security check (CAPTCHA) to proceed.'
    }
  }

  return (
    <div className="rule-top mt-8 pt-4">
      <Button
        variant="primary"
        className="w-full sm:w-auto"
        disabled={!running && !canRun}
        aria-describedby={!running && !canRun && helperText ? reasonId : undefined}
        onClick={running ? cancelAudit : run}
      >
        {running ? <IconStop /> : <IconPlay />}
        {label}
      </Button>
      {helperText && (
        <p id={reasonId} className="mt-2 text-small text-ink-2">
          {helperText}
        </p>
      )}
      {dialog}
    </div>
  )
}
