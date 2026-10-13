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
      <div className="flex items-center justify-between gap-3 border-b border-rule px-4 sm:px-5 py-3.5 sticky top-0 bg-raised z-10">
        <h2 id={titleId} className="text-title font-bold text-ink truncate pr-2">
          {title}
        </h2>
        {!hideCloseButton && (
          <button
            type="button"
            className="btn min-w-[44px] min-h-[44px] sm:min-w-9 sm:min-h-0 px-2.5 flex items-center justify-center shrink-0"
            aria-label={`Close ${title}`}
            onClick={onClose}
          >
            <IconClose />
          </button>
        )}
      </div>
      <div className="px-4 sm:px-5 py-4 overflow-y-auto max-h-[calc(90dvh-8rem)]">{children}</div>
      {footer && (
        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3 border-t border-rule px-4 sm:px-5 py-3 bg-raised sticky bottom-0 z-10 pb-safe">
          {footer}
        </div>
      )}
    </dialog>
  )
}
