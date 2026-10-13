import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { ErrorPanel, errorCopy } from './ErrorPanel'
import type { AuditErrorView } from '../../state/store'

describe('ErrorPanel and errorCopy', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('errorCopy', () => {
    it('formats queue_full error with custom message and seconds left', () => {
      const err: AuditErrorView = {
        kind: 'queue_full',
        message: 'Server antrean penuh. Maksimal 3 audit bersamaan.',
        retryAfterMs: 15000,
      }
      const copy = errorCopy(err, 15)
      expect(copy).toContain('Server antrean penuh')
      expect(copy).toContain('15 detik')
    })

    it('formats queue_full default copy when message is empty', () => {
      const err: AuditErrorView = {
        kind: 'queue_full',
        message: '',
        retryAfterMs: 15000,
      }
      const copy = errorCopy(err, 15)
      expect(copy).toContain('Server queue is full')
      expect(copy).toContain('15 s')
    })

    it('formats queue_timeout error', () => {
      const err: AuditErrorView = {
        kind: 'queue_timeout',
        message: 'Batas waktu antrean terlampaui. Server sedang memproses pengguna lain.',
      }
      expect(errorCopy(err)).toBe('Batas waktu antrean terlampaui. Server sedang memproses pengguna lain.')
    })

    it('formats captcha_failed error', () => {
      const err: AuditErrorView = {
        kind: 'captcha_failed',
        message: 'Verifikasi CAPTCHA Cloudflare gagal atau kedaluwarsa.',
      }
      expect(errorCopy(err)).toBe('Verifikasi CAPTCHA Cloudflare gagal atau kedaluwarsa.')
    })

    it('formats not_zip corrupted file error', () => {
      const err: AuditErrorView = {
        kind: 'not_zip',
        message: 'File ZIP rusak atau bukan arsip ZIP yang valid.',
      }
      expect(errorCopy(err)).toBe('File ZIP rusak atau bukan arsip ZIP yang valid.')
    })

    it('formats unsafe_archive error with specific reason', () => {
      const err: AuditErrorView = {
        kind: 'unsafe_archive',
        message: 'zip slip detected at ../evil.txt',
      }
      expect(errorCopy(err)).toContain('zip slip detected at ../evil.txt')
      expect(errorCopy(err)).toContain('ShipSafe does not extract archives')
    })

    it('formats too_large error', () => {
      const err: AuditErrorView = {
        kind: 'too_large',
        message: 'The server rejected this ZIP as too large.',
      }
      expect(errorCopy(err)).toContain('The server rejected this ZIP as too large')
    })

    it('formats rate_limited error with countdown', () => {
      const err: AuditErrorView = {
        kind: 'rate_limited',
        message: 'Too many requests.',
        retryAfterMs: 30000,
      }
      expect(errorCopy(err, 25)).toContain('25 s.')
    })

    it('formats network error', () => {
      const err: AuditErrorView = {
        kind: 'network',
        message: 'Network error',
      }
      expect(errorCopy(err)).toBe('Could not reach the ShipSafe server. Check your connection, then retry.')
    })

    it('formats timeout error', () => {
      const err: AuditErrorView = {
        kind: 'timeout',
        message: 'Timed out',
      }
      expect(errorCopy(err)).toContain('The audit took longer than 2 minutes')
    })
  })

  describe('ErrorPanel component', () => {
    it('renders error alert and handles retry button click', () => {
      const onRetry = vi.fn()
      const err: AuditErrorView = {
        kind: 'server',
        message: 'Internal server error',
      }

      render(<ErrorPanel error={err} onRetry={onRetry} />)

      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText('The audit did not finish')).toBeInTheDocument()
      expect(screen.getByText('The audit service failed on its side. Retry in a moment.')).toBeInTheDocument()

      const retryBtn = screen.getByRole('button', { name: /Retry/i })
      expect(retryBtn).not.toHaveAttribute('aria-disabled')

      fireEvent.click(retryBtn)
      expect(onRetry).toHaveBeenCalledTimes(1)
    })

    it('disables retry button during queue_full countdown and enables it after countdown ends', () => {
      const onRetry = vi.fn()
      const err: AuditErrorView = {
        kind: 'queue_full',
        message: 'Server antrean penuh.',
        retryAfterMs: 5000,
      }

      render(<ErrorPanel error={err} onRetry={onRetry} />)

      const retryBtn = screen.getByRole('button')
      expect(retryBtn).toHaveAttribute('aria-disabled', 'true')
      expect(retryBtn).toHaveTextContent(/Retry \(5s\)/i)

      // Clicking while disabled should not trigger onRetry
      fireEvent.click(retryBtn)
      expect(onRetry).not.toHaveBeenCalled()

      // Advance countdown timers second by second
      for (let i = 0; i < 5; i++) {
        act(() => {
          vi.advanceTimersByTime(1000)
        })
      }

      expect(retryBtn).not.toHaveAttribute('aria-disabled')
      expect(retryBtn).toHaveTextContent(/^Retry$/i)

      fireEvent.click(retryBtn)
      expect(onRetry).toHaveBeenCalledTimes(1)
    })
  })
})
