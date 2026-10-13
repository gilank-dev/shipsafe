import type { Severity } from '../../domain/types'

const FILLED: Record<Severity, number> = { Critical: 4, High: 3, Medium: 2, Low: 1, Info: 0 }

/** Severity chip. Color, a 4-segment bar and the word all carry the level. */
export function SeverityTag({ level }: { level: Severity }) {
  const filled = FILLED[level]
  return (
    <span className="tag sev" data-level={level}>
      <svg width="16" height="10" viewBox="0 0 16 10" aria-hidden="true" focusable="false">
        {[0, 1, 2, 3].map((i) => (
          <rect
            key={i}
            x={i * 4 + 0.5}
            y={i < filled ? 1 : 5}
            width="3"
            height={i < filled ? 8 : 4}
            fill={i < filled ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1"
          />
        ))}
      </svg>
      {level}
    </span>
  )
}
