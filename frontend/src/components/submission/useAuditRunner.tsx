import { useState, type ReactNode } from 'react'
import type { SecretHit } from '../../domain/secrets'
import { acknowledgeHits, requestAudit } from '../../state/audit-controller'
import { SecretScanDialog } from '../dialogs/SecretScanDialog'
import { DESCRIPTION_ID } from './ContextForm'

/**
 * Starts an audit through the guarded entry point and owns the secret-scan dialog.
 * Every caller (Run Audit, Retry, Outdated notice) uses it, so none can skip the secret check.
 */
export function useAuditRunner(): { run: () => Promise<void>; dialog: ReactNode } {
  const [hits, setHits] = useState<SecretHit[] | null>(null)

  const run = async () => {
    const result = await requestAudit()
    if (!result.started && result.reason === 'needs_confirmation') setHits(result.hits)
  }

  const dialog = hits ? (
    <SecretScanDialog
      hits={hits}
      onGoBack={() => {
        setHits(null)
        // The dialog restores focus to its trigger on unmount; then move focus to the text that needs redacting.
        requestAnimationFrame(() => document.getElementById(DESCRIPTION_ID)?.focus())
      }}
      onSendAnyway={() => {
        acknowledgeHits(hits)
        setHits(null)
        void run()
      }}
    />
  ) : null

  return { run, dialog }
}
