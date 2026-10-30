// ==============================================================================
// ShipSafe Admin Audit Trail
// Every mutating /admin action is durably recorded in the admin_audit_logs
// table. Fire-and-forget by design: a logging failure must never break the
// admin request path — it is reported, not propagated.
// ==============================================================================

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Request } from 'express'

export interface AdminAuditLogRow {
  actor_email: string
  target_email: string | null
  action_type: string
  diff: Record<string, unknown>
}

export type AdminAuditLogger = (row: AdminAuditLogRow) => void

// Same null-safe service client pattern as admin-controller.ts
const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabaseAdmin: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && !SUPABASE_URL.includes('your-project-ref')
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null

// Keys whose values must never reach the audit table.
const SECRET_KEY_PATTERN = /secret|token|password|passphrase|credential|api[_-]?key|authorization/i
const MAX_JSON_DEPTH = 4
const MAX_STRING_LENGTH = 2000

/**
 * Recursively strips secret-looking keys and oversized values from a payload
 * before it is persisted. Idempotent: sanitizing sanitized data is a no-op.
 */
export function sanitizeAuditPayload(
  value: unknown,
  depth = 0
): Record<string, unknown> | null {
  if (value === null || typeof value !== 'object' || depth > MAX_JSON_DEPTH) {
    return null
  }
  if (Array.isArray(value)) {
    return { items: value.slice(0, 20).map((item) => sanitizeAuditPayload(item, depth + 1) ?? item) }
  }

  const out: Record<string, unknown> = {}
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (SECRET_KEY_PATTERN.test(key)) {
      out[key] = '[REDACTED]'
      continue
    }
    if (typeof raw === 'string' && raw.length > MAX_STRING_LENGTH) {
      out[key] = `${raw.slice(0, MAX_STRING_LENGTH)}...[truncated]`
      continue
    }
    if (raw !== null && typeof raw === 'object') {
      const nested = sanitizeAuditPayload(raw, depth + 1)
      out[key] = nested ?? '[object]'
      continue
    }
    out[key] = raw
  }
  return out
}

export interface AuditContextInput {
  actorEmail: string
  method: string
  path: string
  status: number
  params?: Record<string, string>
  query?: Record<string, unknown>
  body?: unknown
}

/** Pure builder: shapes a log row from request facts. Testable in isolation. */
export function buildAuditEntry(input: AuditContextInput): AdminAuditLogRow {
  const body =
    input.body && typeof input.body === 'object' ? (input.body as Record<string, unknown>) : null

  const targetEmail =
    typeof body?.email === 'string'
      ? body.email
      : typeof body?.targetEmail === 'string'
        ? body.targetEmail
        : null

  return {
    actor_email: input.actorEmail || 'unknown',
    target_email: targetEmail ? targetEmail.toLowerCase().trim() : null,
    action_type: `${input.method} ${input.path} -> ${input.status}`,
    diff: {
      params: input.params ?? {},
      query: input.query ?? {},
      body: sanitizeAuditPayload(body) ?? {},
      status: input.status,
    },
  }
}

/**
 * Creates the logger. The returned function is fire-and-forget: it never
 * throws and never blocks the response path.
 */
export function createAdminAuditLogger(client: SupabaseClient | null): AdminAuditLogger {
  return (row: AdminAuditLogRow): void => {
    if (!client) {
      // Degrade loudly but safely — same posture as quota-guard.
      console.warn('[ShipSafe Admin Audit] Supabase unavailable; admin action not persisted:', row.action_type)
      return
    }
    void (async () => {
      try {
        const { error } = await client.from('admin_audit_logs').insert(row)
        if (error) {
          console.error('[ShipSafe Admin Audit] insert failed:', error.message)
        }
      } catch (err) {
        console.error('[ShipSafe Admin Audit] unexpected insert error:', err)
      }
    })()
  }
}

/** Module default used by the router wiring. */
export const logAdminAction: AdminAuditLogger = createAdminAuditLogger(supabaseAdmin)

/** Express adapter: attaches the response-finish hook. Never throws. */
export function buildAuditEntryFromRequest(
  actorEmail: string,
  req: Request,
  status: number
): AdminAuditLogRow {
  return buildAuditEntry({
    actorEmail,
    method: req.method,
    path: req.path,
    status,
    params: (req.params ?? {}) as Record<string, string>,
    query: (req.query ?? {}) as Record<string, unknown>,
    body: req.body,
  })
}
