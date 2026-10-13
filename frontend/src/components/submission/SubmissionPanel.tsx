import { AgentSelector } from './AgentSelector'
import { ContextForm } from './ContextForm'
import { RunAuditButton } from './RunAuditButton'
import { UploadDropzone } from './UploadDropzone'

export function SubmissionPanel() {
  return (
    <>
      <UploadDropzone />
      <ContextForm />
      <AgentSelector />
      <RunAuditButton />
    </>
  )
}
