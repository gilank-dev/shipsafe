import { CopyButton } from '../ui/CopyButton'

interface CodeBlockProps {
  code: string
  /** Language or kind, used in the Copy button label. */
  label?: string
}

/** Monospace block with a keyboard-focusable horizontal scroll area and its own Copy button. */
export function CodeBlock({ code, label = 'code' }: CodeBlockProps) {
  return (
    <div className="md-code">
      <div className="flex items-center justify-between gap-2 border-b border-rule px-2 py-1">
        <span className="text-caption text-ink-3">{label}</span>
        <CopyButton text={code} label={`Copy ${label}`} subject={label} variant="quiet" />
      </div>
      {/* tabindex makes the scroll area reachable by keyboard (WCAG 2.1.1). */}
      <pre tabIndex={0} aria-label={`${label} block`}>
        <code>{code}</code>
      </pre>
    </div>
  )
}
