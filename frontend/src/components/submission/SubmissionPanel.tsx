import { AgentSelector } from './AgentSelector'
import { ContextForm } from './ContextForm'
import { RunAuditButton } from './RunAuditButton'
import { UploadDropzone } from './UploadDropzone'
import { TurnstileWidget } from '../ui/TurnstileWidget'

export function SubmissionPanel() {
  return (
    <>
      <UploadDropzone />
      <ContextForm />
      <AgentSelector />
      <TurnstileWidget className="mt-6" />
      <RunAuditButton />
    </>
  )
}
