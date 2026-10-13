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
        <>
          <button type="button" className="btn" data-autofocus onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className="btn btn-primary" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="text-body">{children}</div>
    </Dialog>
  )
}
