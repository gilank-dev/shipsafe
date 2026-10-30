import '@testing-library/jest-dom/vitest'
import { afterEach, expect, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as axeMatchers from 'vitest-axe/matchers'

expect.extend(axeMatchers)

if (!import.meta.env.VITE_SUPABASE_URL) {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://mock.supabase.co')
}
if (!import.meta.env.VITE_SUPABASE_ANON_KEY) {
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'mock-supabase-anon-key')
}

// jsdom has no <dialog> showModal/close; provide the minimum behaviour the app relies on.
if (typeof HTMLDialogElement !== 'undefined') {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    if (!this.hasAttribute('open')) return
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
}

if (typeof window.ResizeObserver === 'undefined') {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

afterEach(() => cleanup())
