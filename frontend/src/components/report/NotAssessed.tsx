interface NotAssessedProps {
  notAssessed: string[]
  skippedFiles: string[]
}

export function NotAssessed({ notAssessed, skippedFiles }: NotAssessedProps) {
  if (notAssessed.length === 0 && skippedFiles.length === 0) return null

  return (
    <div className="border border-rule bg-surface p-5 text-small" role="region" aria-labelledby="not-assessed-title">
      <h3 id="not-assessed-title" className="text-title font-bold text-ink">
        Scope limitations and skipped areas
      </h3>
      <p className="text-ink-2 mt-1">
        Honest bounds: ShipSafe only inspects what is present in the archive. The following areas were not assessed.
      </p>

      {notAssessed.length > 0 && (
        <div className="mt-4">
          <h4 className="font-semibold text-ink mb-2">Not assessed</h4>
          <ul className="list-disc pl-5 space-y-1.5 text-ink-2">
            {notAssessed.map((item, idx) => (
              <li key={idx} className="leading-relaxed">
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {skippedFiles.length > 0 && (
        <div className="mt-4 pt-3 border-t border-rule/60">
          <h4 className="font-semibold text-ink mb-2">Skipped files ({skippedFiles.length})</h4>
          <p className="text-ink-3 mb-2">
            Non-code files, binaries, build directories, or files exceeding extraction size limits were skipped to prevent noise:
          </p>
          <div className="max-h-36 overflow-auto border border-rule bg-raised p-2.5 font-mono text-small text-ink-2">
            {skippedFiles.map((f, idx) => (
              <div key={idx} className="truncate">
                {f}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
