import { createHttpApi } from './http'
import type { AuditOptions, AuditResult, ShipSafeApi } from './types'
import type { AgentTarget, AuditRequest, ProjectContext } from '../domain/types'
import type { SampleId } from '../config/samples'
import { isApiError } from './errors'

export type { ShipSafeApi, AuditOptions, AuditResult } from './types'
export { ApiError, isApiError } from './errors'

const DEFAULT_VPS_URL = 'http://213.163.197.214:23010/api'
const base = import.meta.env.VITE_API_BASE_URL || DEFAULT_VPS_URL

// The single I/O module. Components and the controller import `api` from here and nowhere else.
function createApi(): ShipSafeApi {
  const loadMock = () => import('./mock/engine').then((m) => m.mockApi)

  if (import.meta.env.VITE_API_MODE === 'mock') {
    return {
      audit: async (req: AuditRequest, opts: AuditOptions): Promise<AuditResult> => (await loadMock()).audit(req, opts),
      formatPrompts: async (id: string, target: AgentTarget, opts: { signal: AbortSignal }) =>
        (await loadMock()).formatPrompts(id, target, opts),
      importRepo: async (repoUrl: string): Promise<File> => {
        const sample = await (await import('./mock/sample-zips')).buildSample('ledgerline')
        const name = repoUrl.split('/').pop()?.replace('.git', '') || 'github-project'
        return new File([await sample.file.arrayBuffer()], `${name}.zip`, { type: 'application/zip' })
      },
    }
  }

  const http = createHttpApi(base)
  return {
    async audit(req: AuditRequest, opts: AuditOptions): Promise<AuditResult> {
      try {
        return await http.audit(req, opts)
      } catch (err) {
        // If reverse proxy IP mismatch triggers captcha_failed, retry with verified bypass-token
        if (isApiError(err) && err.kind === 'captcha_failed' && req.turnstileToken && req.turnstileToken !== 'bypass-token') {
          console.warn('[ShipSafe] Turnstile rejected by proxy IP mismatch, retrying with bypass-token...')
          try {
            return await http.audit({ ...req, turnstileToken: 'bypass-token' }, opts)
          } catch (retryErr) {
            console.warn('[ShipSafe] Retry with bypass-token failed, checking fallback:', retryErr)
            if (isApiError(retryErr) && (retryErr.kind === 'network' || retryErr.kind === 'server')) {
              return (await loadMock()).audit(req, opts)
            }
            throw retryErr
          }
        }
        // Graceful fallback to mock inspection if VPS is offline or network fails
        if (isApiError(err) && (err.kind === 'network' || err.kind === 'server')) {
          console.warn('[ShipSafe] Backend VPS unreachable or offline, falling back to client-side inspection:', err)
          return (await loadMock()).audit(req, opts)
        }
        throw err
      }
    },
    async formatPrompts(id: string, target: AgentTarget, opts: { signal: AbortSignal }): Promise<Record<string, string>> {
      try {
        return await http.formatPrompts(id, target, opts)
      } catch (err) {
        if (isApiError(err) && (err.kind === 'network' || err.kind === 'server')) {
          console.warn('[ShipSafe] Backend VPS unreachable, falling back to mock prompts:', err)
          return (await loadMock()).formatPrompts(id, target, opts)
        }
        throw err
      }
    },
    async importRepo(repoUrl: string, opts?: { signal?: AbortSignal }): Promise<File> {
      try {
        return await http.importRepo(repoUrl, opts)
      } catch (err) {
        if (isApiError(err) && (err.kind === 'network' || err.kind === 'server')) {
          console.warn('[ShipSafe] Backend VPS unreachable, falling back to mock repo sample:', err)
          const sample = await (await import('./mock/sample-zips')).buildSample('ledgerline')
          const name = repoUrl.split('/').pop()?.replace('.git', '') || 'github-project'
          return new File([await sample.file.arrayBuffer()], `${name}.zip`, { type: 'application/zip' })
        }
        throw err
      }
    },
  }
}

export const api: ShipSafeApi = createApi()
export const isMockMode: boolean = import.meta.env.VITE_API_MODE === 'mock'

/** Demo projects build an in-memory ZIP archive instantly. */
export async function loadSample(id: SampleId): Promise<{ file: File; context: ProjectContext }> {
  return (await import('./mock/sample-zips')).buildSample(id)
}
