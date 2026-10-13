import { useEffect, useRef, useState } from 'react'
import { announce } from '../../state/announcer'
import { IconCheck, IconCopy } from './icons'

interface CopyButtonProps {
  text: string
  /** Button label, e.g. "Copy prompt". */
  label: string
  /** What was copied, used in the announcement: "Copied F-001 prompt". */
  subject?: string
  variant?: 'secondary' | 'quiet'
}

export function CopyButton({ text, label, subject, variant = 'secondary' }: CopyButtonProps) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  const copy = async () => {
    clearTimeout(timer.current)
    try {
      await navigator.clipboard.writeText(text)
      setState('copied')
      announce(`Copied ${subject || label}`)
    } catch {
      setState('failed')
    }
    timer.current = setTimeout(() => setState('idle'), 2000)
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button type="button" className={variant === 'quiet' ? 'btn btn-quiet' : 'btn'} onClick={copy}>
        {state === 'copied' ? <IconCheck /> : <IconCopy />}
        {state === 'copied' ? 'Copied' : label}
      </button>
      {state === 'failed' && (
        <span role="alert" className="text-small text-fail">
          Copy failed. Select the text and copy it manually.
        </span>
      )}
    </span>
  )
}
