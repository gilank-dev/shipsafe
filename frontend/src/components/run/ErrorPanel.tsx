import { useEffect, useState } from 'react'
import type { AuditErrorView } from '../../state/store'
import { Button } from '../ui/Button'
import { IconRefresh } from '../ui/icons'

/** Plain-language cause plus the next step. No "Oops", "Sorry", "Please" or "Invalid". */
export function errorCopy(error: AuditErrorView, secondsLeft?: number): string {
  switch (error.kind) {
    case 'network':
      return 'Could not reach the ShipSafe server. Check your connection, then retry.'
    case 'timeout':
      return 'The audit took longer than 2 minutes and was stopped. Retry, or remove large folders from the ZIP.'
    case 'rate_limited':
      return `Too many requests. You can retry in ${secondsLeft ?? Math.ceil((error.retryAfterMs ?? 30_000) / 1000)} s.`
    case 'queue_full':
      return error.message
        ? `${error.message}${secondsLeft && secondsLeft > 0 ? ` Coba lagi dalam ${secondsLeft} detik.` : ' Coba lagi beberapa saat lagi.'}`
        : `Server queue is full (maximum concurrent audits reached). You can retry in ${secondsLeft ?? Math.ceil((error.retryAfterMs ?? 15_000) / 1000)} s.`
    case 'queue_timeout':
      return error.message || 'Batas waktu antrean terlampaui karena server sedang memproses pengguna lain. Silakan coba lagi.'
    case 'too_large':
      return 'The server rejected this ZIP as too large. The limit is 10 MB.'
    case 'not_zip':
      return error.message || 'The server could not read this file as a ZIP or the archive is corrupted. Create a new ZIP and try again.'
    case 'unsafe_archive':
      return `This archive was rejected: ${error.message}. ShipSafe does not extract archives with unsafe paths or extreme compression.`
    case 'captcha_failed':
      return error.message || 'Cloudflare CAPTCHA verification failed or expired. Complete the security check and retry.'
    case 'invalid_repo_url':
      return error.message || 'The GitHub repository URL is invalid. Use owner/repo or https://github.com/owner/repo.'
    case 'repo_not_found':
      return error.message || 'The GitHub repository was not found or is private. Make sure the repository is public and spelled correctly.'
    case 'server':
      return 'The audit service failed on its side. Retry in a moment.'
    case 'bad_response':
      return 'The service returned an unusable report. Retry.'
    default:
      return 'The audit stopped. Retry.'
  }
}

function useCountdown(ms: number | undefined): number {
  const [left, setLeft] = useState(() => (ms ? Math.ceil(ms / 1000) : 0))
  useEffect(() => {
    if (left <= 0) return
    const id = setTimeout(() => setLeft((n) => n - 1), 1000)
    return () => clearTimeout(id)
  }, [left])
  return left
}

export function ErrorPanel({ error, onRetry }: { error: AuditErrorView; onRetry: () => void }) {
  const isRateOrQueue = error.kind === 'rate_limited' || error.kind === 'queue_full'
  const secondsLeft = useCountdown(isRateOrQueue ? error.retryAfterMs : undefined)
  const blocked = isRateOrQueue && secondsLeft > 0

  return (
    <div role="alert" className="mt-6 border-2 border-fail p-4">
      <h3 className="text-title text-fail">The audit did not finish</h3>
      <p className="mt-2 max-w-[72ch]">{errorCopy(error, secondsLeft)}</p>
      <Button className="mt-4" disabled={blocked} onClick={onRetry}>
        <IconRefresh />
        {blocked ? `Retry (${secondsLeft}s)` : 'Retry'}
      </Button>
    </div>
  )
}
