import { useSyncExternalStore } from 'react'
import { getAnnouncement, subscribeAnnouncements } from '../../state/announcer'

/** One polite live region for status messages (run progress, copy success, prompt updates). */
export function LiveAnnouncer() {
  const message = useSyncExternalStore(subscribeAnnouncements, getAnnouncement, () => '')
  return (
    <div className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
      {message}
    </div>
  )
}
