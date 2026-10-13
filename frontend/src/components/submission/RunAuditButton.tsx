import { useId } from 'react'
import { cancelAudit } from '../../state/audit-controller'
import { selectCanRun, selectIsCaptchaReady } from '../../state/selectors'
import { useStore } from '../../state/store'
import { Button } from '../ui/Button'
import { IconPlay, IconStop, IconLock } from '../ui/icons'
import { useAuditRunner } from './useAuditRunner'

/** The only primary button on the page. */
export function RunAuditButton() {
  const user = useStore((s) => s.auth.user)
  const setAuthModalOpen = useStore((s) => s.setAuthModalOpen)
  const running = useStore((s) => s.audit.status === 'running')
  const hasReport = useStore((s) => s.audit.report !== null)
  const canRun = useStore(selectCanRun)
  const fileReady = useStore((s) => s.submission.file !== null && s.submission.fileError === null)
  const captchaReady = useStore(selectIsCaptchaReady)
  const { run, dialog } = useAuditRunner()
  const reasonId = useId()

  if (!user) {
    return (
      <div className="rule-top mt-8 pt-4">
        <Button
          variant="primary"
          className="w-full sm:w-auto"
          onClick={() => setAuthModalOpen(true)}
        >
          <IconLock />
          Sign in to Run Audit
        </Button>
        <p className="mt-2 text-small text-ink-2">
          Sign in with GitHub or Google is required to run code audits.
        </p>
        {dialog}
      </div>
    )
  }

  const label = running ? 'Cancel' : hasReport ? 'Run audit again' : 'Run Audit'

  let helperText = ''
  if (!running && !canRun) {
    if (!fileReady) {
      helperText = 'Choose a ZIP file or import a GitHub repository to run the audit.'
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
