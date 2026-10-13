import { useSyncExternalStore } from 'react'
import { getToasts, markToastExiting, subscribeToasts, type ToastItem, toast } from '../../state/toast'
import { IconAlert, IconCheck, IconClose, IconCross } from './icons'

export { toast }

export function ToastContainer() {
  const items = useSyncExternalStore(subscribeToasts, getToasts, () => [])

  if (items.length === 0) return null

  return (
    <div
      className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2.5 pointer-events-none max-w-sm w-full px-4 sm:px-0"
      aria-label="Notifications"
    >
      {items.map((item) => (
        <ToastCard key={item.id} item={item} onDismiss={() => markToastExiting(item.id)} />
      ))}
    </div>
  )
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const isError = item.type === 'error'
  const isWarn = item.type === 'warning'
  const isSuccess = item.type === 'success'

  const borderClass = isError
    ? 'border-l-4 border-l-status-fail border-rule-strong'
    : isWarn
      ? 'border-l-4 border-l-status-partial border-rule-strong'
      : isSuccess
        ? 'border-l-4 border-l-status-pass border-rule-strong'
        : 'border-l-4 border-l-ink border-rule-strong'

  const Glyph = isSuccess ? IconCheck : isError ? IconCross : isWarn ? IconAlert : IconCheck

  return (
    <div
      role={isError ? 'alert' : 'status'}
      className={`pointer-events-auto flex items-center justify-between gap-3 p-3 bg-raised text-ink border shadow-md rounded-[var(--radius-control)] min-w-[280px] max-w-full ${borderClass} ${
        item.isExiting ? 'toast-exit' : 'toast-enter'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span
          className={`flex size-5 shrink-0 items-center justify-center font-bold ${
            isSuccess
              ? 'text-status-pass'
              : isError
                ? 'text-status-fail'
                : isWarn
                  ? 'text-status-partial'
                  : 'text-ink-2'
          }`}
          aria-hidden="true"
        >
          <Glyph />
        </span>
        <span className="text-small font-medium leading-snug break-words">{item.message}</span>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 p-1 text-ink-3 hover:text-ink focus-visible:outline-2 focus-visible:outline-ink transition-colors"
        aria-label="Dismiss notification"
      >
        <IconClose width={12} height={12} />
      </button>
    </div>
  )
}
