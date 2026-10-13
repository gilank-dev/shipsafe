// Tiny pub/sub that feeds the single polite live region (WCAG 4.1.3 status messages).
let message = ''
let toggle = false
const listeners = new Set<() => void>()

export function announce(text: string): void {
  // Alternate a trailing non-breaking space so a repeated message is still announced.
  toggle = !toggle
  message = toggle ? text : `${text}\u00a0`
  listeners.forEach((l) => l())
}

export function subscribeAnnouncements(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getAnnouncement(): string {
  return message
}
