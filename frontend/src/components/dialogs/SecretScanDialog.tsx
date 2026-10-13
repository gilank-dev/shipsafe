import type { SecretHit } from '../../domain/secrets'
import { Dialog } from './Dialog'

interface SecretScanDialogProps {
  hits: readonly SecretHit[]
  onGoBack: () => void
  onSendAnyway: () => void
}

/** Shown when the project context looks like it contains real credentials. Never shows more than 4 leading characters. */
export function SecretScanDialog({ hits, onGoBack, onSendAnyway }: SecretScanDialogProps) {
  return (
    <Dialog
      title="Possible real secrets found"
      onClose={onGoBack}
      hideCloseButton
      footer={
        <>
          <button type="button" className="btn btn-primary" data-autofocus onClick={onGoBack}>
            Go back and redact
          </button>
          <button type="button" className="btn" onClick={onSendAnyway}>
            Send anyway
          </button>
        </>
      }
    >
      <p>ShipSafe sends this text to a model service. Replace real credentials with placeholders first.</p>
      <ul className="mt-3 divide-y divide-rule border border-rule-strong">
        {hits.map((hit, i) => (
          <li key={`${hit.line}-${hit.pattern}-${i}`} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-3 py-2 text-small">
            <span className="font-semibold">{hit.pattern}</span>
            <span className="text-ink-2">
              Project context, line {hit.line}
            </span>
            <code className="font-mono">{hit.masked}</code>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-small text-ink-2">Use a placeholder such as {hits[0]?.placeholder ?? 'REDACTED'} instead.</p>
    </Dialog>
  )
}
