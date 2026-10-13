import { announce } from './announcer'

export type ToastType = 'success' | 'info' | 'error' | 'warning'

export interface ToastItem {
  id: string
  message: string
  type: ToastType
  duration: number
  isExiting?: boolean
}

let toasts: ToastItem[] = []
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((l) => l())
}

export function subscribeToasts(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getToasts(): ToastItem[] {
  return toasts
}

export function removeToast(id: string): void {
  toasts = toasts.filter((t) => t.id !== id)
  notify()
}

export function markToastExiting(id: string): void {
  toasts = toasts.map((t) => (t.id === id ? { ...t, isExiting: true } : t))
  notify()
  setTimeout(() => {
    removeToast(id)
  }, 160)
}

export function showToast(message: string, type: ToastType = 'success', duration = 3200): void {
  const id = Math.random().toString(36).slice(2, 9)
  const item: ToastItem = { id, message, type, duration }
  toasts = [...toasts, item]
  notify()

  // Screen reader announcement for WCAG 4.1.3 status messages
  announce(message)

  if (duration > 0) {
    setTimeout(() => {
      markToastExiting(id)
    }, duration)
  }
}

export const toast = {
  success: (msg: string, duration = 3200) => showToast(msg, 'success', duration),
  info: (msg: string, duration = 3200) => showToast(msg, 'info', duration),
  error: (msg: string, duration = 4500) => showToast(msg, 'error', duration),
  warning: (msg: string, duration = 4000) => showToast(msg, 'warning', duration),
}
