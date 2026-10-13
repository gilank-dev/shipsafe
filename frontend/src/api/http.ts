import { AUDIT_TIMEOUT_MS } from '../config/limits'
import type { AgentTarget } from '../domain/types'
import { getAccessToken } from '../lib/supabase'
import { ApiError } from './errors'
import { parseReport } from './parse-report'
import type { AuditOptions, AuditResult, ShipSafeApi } from './types'

interface ErrorBody {
  error?: { code?: string; message?: string; retryAfterSeconds?: number }
}

/** Maps an HTTP failure to an ApiError. Contract: spec 9.3 plus the error envelope in plan section 2. */
export function mapHttpError(status: number, body: unknown, retryAfterHeader?: string | null): ApiError {
  const detail = (body as ErrorBody | null)?.error
  const message = typeof detail?.message === 'string' ? detail.message : ''
  const retrySeconds =
    typeof detail?.retryAfterSeconds === 'number'
      ? detail.retryAfterSeconds
      : Number.parseInt(retryAfterHeader ?? '', 10)
  switch (status) {
    case 400:
      if (detail?.code === 'invalid_repo_url') {
        return new ApiError('invalid_repo_url', message || 'Format URL GitHub tidak valid. Gunakan owner/repo atau https://github.com/owner/repo.')
      }
      return new ApiError('bad_response', message || 'Permintaan tidak valid.')
    case 403:
      return new ApiError('captcha_failed', message || 'Verifikasi CAPTCHA Cloudflare gagal atau kedaluwarsa. Silakan coba lagi.')
    case 404:
      if (detail?.code === 'repo_not_found') {
        return new ApiError('repo_not_found', message || 'Repositori GitHub tidak ditemukan atau bersifat privat. Pastikan repositori bersifat publik.')
      }
      return new ApiError('bad_response', message || 'Sumber daya tidak ditemukan.')
    case 413:
      return new ApiError('too_large', message || 'The server rejected this ZIP as too large.')
    case 415:
      return new ApiError('not_zip', message || 'The server could not read this file as a ZIP.')
    case 422:
      return new ApiError('unsafe_archive', message || 'the archive failed the safety checks')
    case 429:
      if (detail?.code === 'queue_full') {
        return new ApiError('queue_full', message || 'Server antrean penuh. Maksimal 3 audit bersamaan.', 15000)
      }
      return new ApiError(
        'rate_limited',
        message || 'Too many requests.',
        (Number.isFinite(retrySeconds) ? retrySeconds : 30) * 1000,
      )
    case 504:
      return new ApiError('queue_timeout', message || 'Batas waktu antrean terlampaui. Server sedang memproses pengguna lain.')
    default:
      return status >= 500
        ? new ApiError('server', message || 'The audit service failed.')
        : new ApiError('bad_response', message || `Unexpected response (${status}).`)
  }
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown
  } catch {
    return null
  }
}

export function createHttpApi(base: string): ShipSafeApi {
  const cleanBase = base.replace(/\/+$/, '')
  return {
    async audit(req, opts: AuditOptions): Promise<AuditResult> {
      const token = await getAccessToken().catch(() => null)
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', `${cleanBase}/audit`)
        xhr.timeout = AUDIT_TIMEOUT_MS
        xhr.responseType = 'text'
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`)
        }

        let stageTimer: ReturnType<typeof setTimeout> | undefined
        const done = () => {
          if (stageTimer) clearTimeout(stageTimer)
          opts.signal.removeEventListener('abort', onAbort)
        }
        const onAbort = () => {
          xhr.abort()
        }
        if (opts.signal.aborted) {
          reject(new ApiError('aborted', 'Audit cancelled.'))
          return
        }
        opts.signal.addEventListener('abort', onAbort)

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) opts.onStage('upload', Math.round((e.loaded / e.total) * 100))
        }
        xhr.upload.onload = () => {
          opts.onStage('scanning')
          // The server does not stream stages yet; show "auditing" once the upload has been accepted for a moment.
          stageTimer = setTimeout(() => opts.onStage('auditing'), 1500)
        }
        xhr.onerror = () => {
          done()
          reject(new ApiError('network', 'Could not reach the ShipSafe server.'))
        }
        xhr.ontimeout = () => {
          done()
          reject(new ApiError('timeout', 'The audit timed out.'))
        }
        xhr.onabort = () => {
          done()
          reject(new ApiError('aborted', 'Audit cancelled.'))
        }
        xhr.onload = () => {
          done()
          const body = parseJson(xhr.responseText)
          if (xhr.status < 200 || xhr.status >= 300) {
            reject(mapHttpError(xhr.status, body, xhr.getResponseHeader('Retry-After')))
            return
          }
          try {
            const payload = body as { reportId?: unknown; report?: unknown } | null
            if (!payload || typeof payload.reportId !== 'string') {
              throw new ApiError('bad_response', 'The service returned an unusable report (missing reportId). Retry.')
            }
            opts.onStage('report')
            resolve({ reportId: payload.reportId, report: parseReport(payload.report) })
          } catch (err) {
            reject(err)
          }
        }

        const form = new FormData()
        form.append('file', req.file)
        form.append('context', JSON.stringify(req.context))
        form.append('agentTarget', req.agentTarget)
        if (req.turnstileToken) {
          form.append('turnstileToken', req.turnstileToken)
        }
        opts.onStage('upload', 0)
        xhr.send(form)
      })
    },

    async formatPrompts(reportId: string, target: AgentTarget, opts): Promise<Record<string, string>> {
      let res: Response
      const token = await getAccessToken().catch(() => null)
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      try {
        res = await fetch(`${cleanBase}/audit/${encodeURIComponent(reportId)}/prompts`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ agentTarget: target }),
          signal: opts.signal,
        })
      } catch (err) {
        if (opts.signal.aborted) throw new ApiError('aborted', 'Cancelled.')
        throw new ApiError('network', err instanceof Error ? err.message : 'Network error')
      }
      const body = parseJson(await res.text())
      if (!res.ok) throw mapHttpError(res.status, body, res.headers.get('Retry-After'))
      if (typeof body !== 'object' || body === null) throw new ApiError('bad_response', 'Unusable prompt response.')
      const entries = Object.entries(body as Record<string, unknown>)
      if (entries.some(([, v]) => typeof v !== 'string' || v.length === 0)) {
        throw new ApiError('bad_response', 'Unusable prompt response.')
      }
      return Object.fromEntries(entries) as Record<string, string>
    },

    async importRepo(repoUrl: string, opts?: { signal?: AbortSignal }): Promise<File> {
      let res: Response
      try {
        res = await fetch(`${cleanBase}/import-repo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repoUrl }),
          signal: opts?.signal,
        })
      } catch (err) {
        if (opts?.signal?.aborted) throw new ApiError('aborted', 'Cancelled.')
        throw new ApiError('network', err instanceof Error ? err.message : 'Network error')
      }

      if (!res.ok) {
        const body = parseJson(await res.text())
        throw mapHttpError(res.status, body)
      }

      const blob = await res.blob()
      const owner = res.headers.get('x-repo-owner') || 'github'
      const repo = res.headers.get('x-repo-name') || 'repo'
      const fileName = `${owner}-${repo}.zip`
      return new File([blob], fileName, { type: 'application/zip' })
    },
  }
}

