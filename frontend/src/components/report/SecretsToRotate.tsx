import { IconAlert } from '../ui/icons'

interface SecretsToRotateProps {
  secrets: string[]
}

export function SecretsToRotate({ secrets }: SecretsToRotateProps) {
  if (secrets.length === 0) return null

  return (
    <div
      className="border-2 border-warn-edge bg-warn-bg text-warn-ink p-5"
      role="region"
      aria-labelledby="secrets-rotate-title"
    >
      <div className="flex items-start gap-3">
        <IconAlert className="mt-1 shrink-0" width={20} height={20} />
        <div className="min-w-0 flex-1">
          <h3 id="secrets-rotate-title" className="text-title font-bold">
            Secrets to rotate immediately ({secrets.length})
          </h3>
          <p className="text-small mt-1 leading-relaxed">
            The following credentials or keys were detected in the uploaded archive. Because they may have been committed or logged, treat them as compromised and roll them in your provider dashboard now.
          </p>

          <ul className="mt-4 space-y-2.5">
            {secrets.map((sec, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 text-small bg-canvas/30 p-2.5 border border-warn-edge/40 font-mono leading-relaxed break-words"
              >
                <span className="font-bold shrink-0">{idx + 1}.</span>
                <span className="flex-1">{sec}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
