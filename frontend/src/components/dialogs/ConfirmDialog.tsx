import type { ReactNode } from 'react'
import { Dialog } from './Dialog'

interface ConfirmDialogProps {
  title: string
  children: ReactNode
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
}

/** The safe action (cancel) has initial focus. */
export function ConfirmDialog({ title, children, confirmLabel, cancelLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <Dialog
      title={title}
      onClose={onCancel}
      hideCloseButton
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto">
          <button type="button" className="btn min-h-[44px] sm:min-h-0 flex-1 sm:flex-initial" data-autofocus onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className="btn btn-primary min-h-[44px] sm:min-h-0 flex-1 sm:flex-initial" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      }
    >
      <div className="text-body">{children}</div>
    </Dialog>
  )
}
