import { describe, it, expect, vi } from 'vitest'
import {
  buildAuditEntry,
  buildAuditEntryFromRequest,
  createAdminAuditLogger,
  sanitizeAuditPayload,
} from './admin-audit-logger'
import type { Request } from 'express'
import type { SupabaseClient } from '@supabase/supabase-js'

const baseInput = {
  actorEmail: 'gilankdev@gmail.com',
  method: 'POST',
  path: '/admin/users/abc-123/tier',
  status: 200,
}

describe('sanitizeAuditPayload', () => {
  it('redacts secret-looking keys', () => {
    const out = sanitizeAuditPayload({ name: 'x', api_key: 'sk_live_verylongvalue', password: 'hunter2' })
    expect(out).toEqual({ name: 'x', api_key: '[REDACTED]', password: '[REDACTED]' })
  })

  it('is idempotent — sanitizing sanitized output changes nothing', () => {
    const once = sanitizeAuditPayload({ token: 'abc', tier: 'pro' })
    const twice = sanitizeAuditPayload(once)
    expect(twice).toEqual(once)
  })

  it('truncates oversized strings', () => {
    const out = sanitizeAuditPayload({ blob: 'a'.repeat(3000) })
    expect((out!.blob as string).length).toBeLessThan(3000)
    expect(out!.blob).toContain('[truncated]')
  })

  it('returns null for non-object input', () => {
    expect(sanitizeAuditPayload('text')).toBeNull()
    expect(sanitizeAuditPayload(null)).toBeNull()
  })
})

describe('buildAuditEntry', () => {
  it('formats action_type as METHOD path -> status', () => {
    const row = buildAuditEntry(baseInput)
    expect(row.action_type).toBe('POST /admin/users/abc-123/tier -> 200')
  })

  it('extracts target email from body when present', () => {
    const row = buildAuditEntry({ ...baseInput, body: { email: 'User@Example.com', tier: 'pro' } })
    expect(row.target_email).toBe('user@example.com')
  })

  it('normalizes missing actor to unknown', () => {
    const row = buildAuditEntry({ ...baseInput, actorEmail: '' })
    expect(row.actor_email).toBe('unknown')
  })

  it('sanitizes body inside diff', () => {
    const row = buildAuditEntry({ ...baseInput, body: { tier: 'pro', token: 'should-not-persist' } })
    expect((row.diff.body as Record<string, unknown>).token).toBe('[REDACTED]')
    expect((row.diff.body as Record<string, unknown>).tier).toBe('pro')
  })
})

describe('createAdminAuditLogger', () => {
  const fakeClient = (result: { error: unknown } | { throws: true }): SupabaseClient => {
    return {
      from: () => ({
        insert: () => {
          if ('throws' in result) return Promise.reject(new Error('network down'))
          return Promise.resolve(result)
        },
      }),
    } as unknown as SupabaseClient
  }

  it('inserts the row without throwing', async () => {
    const log = createAdminAuditLogger(fakeClient({ error: null }))
    expect(() => log({ actor_email: 'a@b.c', target_email: null, action_type: 'x', diff: {} })).not.toThrow()
    await new Promise((r) => setTimeout(r, 10))
  })

  it('reports insert errors without throwing', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const log = createAdminAuditLogger(fakeClient({ error: { message: 'rls denied' } }))
    log({ actor_email: 'a@b.c', target_email: null, action_type: 'x', diff: {} })
    await new Promise((r) => setTimeout(r, 10))
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('insert failed'), 'rls denied')
  })

  it('survives a client that throws synchronously', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const log = createAdminAuditLogger(fakeClient({ throws: true }))
    expect(() => log({ actor_email: 'a@b.c', target_email: null, action_type: 'x', diff: {} })).not.toThrow()
    await new Promise((r) => setTimeout(r, 10))
    expect(errorSpy).toHaveBeenCalled()
  })

  it('warns (not throws) when no client is available', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const log = createAdminAuditLogger(null)
    expect(() => log({ actor_email: 'a@b.c', target_email: null, action_type: 'x', diff: {} })).not.toThrow()
    expect(warnSpy).toHaveBeenCalled()
  })
})

describe('buildAuditEntryFromRequest', () => {
  it('maps an express request into a log row', () => {
    const req = {
      method: 'DELETE',
      path: '/admin/vouchers/SPRING2026',
      params: { code: 'SPRING2026' },
      query: {},
      body: {},
    } as unknown as Request
    const row = buildAuditEntryFromRequest('admin@shipsafe.dev', req, 200)
    expect(row.action_type).toBe('DELETE /admin/vouchers/SPRING2026 -> 200')
    expect(row.diff.params).toEqual({ code: 'SPRING2026' })
  })
})
