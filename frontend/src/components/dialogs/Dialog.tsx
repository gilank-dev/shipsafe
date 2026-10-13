import { useEffect, useId, useRef, type ReactNode, type SyntheticEvent } from 'react'
import { IconClose } from '../ui/icons'

interface DialogProps {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
  /** Hide the corner close button when the footer already carries every way out. */
  hideCloseButton?: boolean
}

/**
 * Native modal <dialog>. Mount it only while it is open.
 * Focus moves in on open (to [data-autofocus] if present), stays trapped by the browser, and returns to the trigger on unmount.
 * Escape calls onClose.
 */
export function Dialog({ title, onClose, children, footer, wide = false, hideCloseButton = false }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
    el.showModal()
    el.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    return () => {
      if (el.open) el.close()
      if (trigger && document.contains(trigger)) trigger.focus()
    }
  }, [])

  const handleCancel = (e: SyntheticEvent) => {
    e.preventDefault()
    onClose()
  }

  return (
    <dialog
      ref={ref}
      className={wide ? 'sheet sheet-wide' : 'sheet'}
      aria-labelledby={titleId}
      onCancel={handleCancel}
    >
      <div className="flex items-start justify-between gap-4 border-b border-rule px-5 pt-4 pb-3">
        <h2 id={titleId} className="text-title">
          {title}
        </h2>
        {!hideCloseButton && (
          <button type="button" className="btn min-w-9 px-2" aria-label={`Close ${title}`} onClick={onClose}>
            <IconClose />
          </button>
        )}
      </div>
      <div className="px-5 py-4">{children}</div>
      {footer && <div className="flex flex-wrap justify-end gap-3 border-t border-rule px-5 py-3">{footer}</div>}
    </dialog>
  )
}
