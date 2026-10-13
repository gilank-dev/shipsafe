import { createClient, type SupabaseClient, type Session, type User } from '@supabase/supabase-js'
import type { AuditHistoryItem, AuditReport } from '../domain/types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('your-project-ref') &&
    !supabaseAnonKey.includes('your-supabase-anon-key'),
)

// Graceful fallback dummy client if environment variables are not yet provided
export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (createClient('https://placeholder.supabase.co', 'placeholder-anon-key', {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }))

export async function signInWithEmail(email: string, password: string): Promise<{ user: User | null; session: Session | null; error: Error | null }> {
  if (!isSupabaseConfigured) {
    return { user: null, session: null, error: new Error('Supabase credentials are not configured in .env.') }
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return { user: data.user, session: data.session, error: error ? new Error(error.message) : null }
}

export async function signUpWithEmail(email: string, password: string): Promise<{ user: User | null; session: Session | null; error: Error | null }> {
  if (!isSupabaseConfigured) {
    return { user: null, session: null, error: new Error('Supabase credentials are not configured in .env.') }
  }
  const { data, error } = await supabase.auth.signUp({ email, password })
  return { user: data.user, session: data.session, error: error ? new Error(error.message) : null }
}

export async function signInWithOtp(email: string): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured) {
    return { error: new Error('Supabase credentials are not configured in environment.') }
  }
  const emailRedirectTo = typeof window !== 'undefined' ? window.location.origin : undefined
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo,
    },
  })
  return { error: error ? new Error(error.message) : null }
}

export async function signInWithOAuth(provider: 'google' | 'github'): Promise<{ data: { provider: string; url: string | null } | null; error: Error | null }> {
  if (!isSupabaseConfigured) {
    return { data: null, error: new Error('Supabase credentials are not configured in environment.') }
  }
  const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
    },
  })
  return { data, error: error ? new Error(error.message) : null }
}

export async function signOut(): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured) {
    return { error: null }
  }
  const { error } = await supabase.auth.signOut()
  return { error: error ? new Error(error.message) : null }
}

export async function getSession(): Promise<Session | null> {
  if (!isSupabaseConfigured) return null
  const { data } = await supabase.auth.getSession()
  return data.session
}

export async function getAccessToken(): Promise<string | null> {
  if (!isSupabaseConfigured) return null
  const session = await getSession()
  return session?.access_token ?? null
}

export function onAuthStateChange(callback: (session: Session | null, user: User | null) => void): () => void {
  if (!isSupabaseConfigured) {
    return () => {}
  }
  void getSession().then((session) => {
    if (session) {
      callback(session, session.user)
    }
  }).catch(() => {})

  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session, session?.user ?? null)
  })
  return () => {
    subscription.unsubscribe()
  }
}

export async function saveAuditToSupabase(
  report: AuditReport,
  projectName: string,
): Promise<{ id: string | null; error: Error | null }> {
  if (!isSupabaseConfigured) {
    return { id: null, error: new Error('Supabase is not configured.') }
  }
  const session = await getSession()
  if (!session?.user) {
    return { id: null, error: new Error('User is not authenticated.') }
  }

  const { data: auditData, error: auditError } = await supabase
    .from('audits')
    .insert({
      user_id: session.user.id,
      project_name: projectName,
      summary: report.summary,
      counts_by_severity: report.countsBySeverity,
      scorecard: report.scorecard,
      secrets_to_rotate: report.secretsToRotate || [],
      not_assessed: report.notAssessed || [],
    })
    .select('id')
    .single()

  if (auditError || !auditData?.id) {
    return { id: null, error: new Error(auditError?.message || 'Failed to save audit metadata.') }
  }

  const auditId = auditData.id as string

  if (report.findings && report.findings.length > 0) {
    const findingRows = report.findings.map((f) => ({
      audit_id: auditId,
      finding_code: f.id,
      title: f.title,
      severity: f.severity,
      area: f.area,
      location: f.location ?? null,
      what: f.what,
      why: f.why,
      recommended_fix: f.recommendedFix,
      verify_with: f.verifyWith ?? null,
      remediation_prompt: f.remediationPrompt,
      confidence: f.confidence ?? null,
    }))

    const { error: findingsError } = await supabase.from('findings').insert(findingRows)
    if (findingsError) {
      console.error('[ShipSafe] Failed to save findings to Supabase:', findingsError)
    }
  }

  return { id: auditId, error: null }
}

export async function fetchAuditHistory(): Promise<{ audits: AuditHistoryItem[]; error: Error | null }> {
  if (!isSupabaseConfigured) {
    return { audits: [], error: new Error('Supabase is not configured.') }
  }
  const session = await getSession()
  if (!session?.user) {
    return { audits: [], error: new Error('User is not authenticated.') }
  }

  const { data, error } = await supabase
    .from('audits')
    .select('id, project_name, summary, counts_by_severity, scorecard, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    return { audits: [], error: new Error(error.message) }
  }

  const items: AuditHistoryItem[] = (data || []).map((row: Record<string, unknown>) => ({
    id: String(row.id),
    projectName: String(row.project_name || 'archive.zip'),
    summary: String(row.summary || ''),
    countsBySeverity: (row.counts_by_severity as AuditHistoryItem['countsBySeverity']) || {
      Critical: 0,
      High: 0,
      Medium: 0,
      Low: 0,
      Info: 0,
    },
    scorecard: (row.scorecard as AuditHistoryItem['scorecard']) || [],
    createdAt: String(row.created_at || ''),
  }))

  return { audits: items, error: null }
}

export async function fetchAuditReportById(
  auditId: string,
): Promise<{ report: AuditReport | null; projectName: string | null; error: Error | null }> {
  if (!isSupabaseConfigured) {
    return { report: null, projectName: null, error: new Error('Supabase is not configured.') }
  }

  const { data: audit, error: auditErr } = await supabase
    .from('audits')
    .select('*')
    .eq('id', auditId)
    .single()

  if (auditErr || !audit) {
    return { report: null, projectName: null, error: new Error(auditErr?.message || 'Audit report not found.') }
  }

  const { data: findings, error: findingsErr } = await supabase
    .from('findings')
    .select('*')
    .eq('audit_id', auditId)
    .order('created_at', { ascending: true })

  if (findingsErr) {
    console.warn('[ShipSafe] Could not load findings for audit:', findingsErr)
  }

  const report: AuditReport = {
    id: String(audit.id),
    summary: String(audit.summary || ''),
    countsBySeverity: audit.counts_by_severity || { Critical: 0, High: 0, Medium: 0, Low: 0, Info: 0 },
    scorecard: audit.scorecard || [],
    secretsToRotate: audit.secrets_to_rotate || [],
    notAssessed: audit.not_assessed || [],
    skippedFiles: [],
    createdAt: String(audit.created_at || ''),
    findings: (findings || []).map((row: Record<string, unknown>) => ({
      id: String(row.finding_code || 'F-000'),
      title: String(row.title || 'Untitled finding'),
      severity: row.severity as AuditReport['findings'][number]['severity'],
      area: row.area as AuditReport['findings'][number]['area'],
      location: (row.location as AuditReport['findings'][number]['location']) ?? undefined,
      what: String(row.what || ''),
      why: String(row.why || ''),
      recommendedFix: String(row.recommended_fix || ''),
      verifyWith: row.verify_with ? String(row.verify_with) : undefined,
      remediationPrompt: String(row.remediation_prompt || ''),
      confidence: (row.confidence as AuditReport['findings'][number]['confidence']) ?? undefined,
    })),
  }

  return { report, projectName: String(audit.project_name || 'archive.zip'), error: null }
}

export async function deleteAuditFromSupabase(auditId: string): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured) {
    return { error: new Error('Supabase is not configured.') }
  }

  const { error } = await supabase.from('audits').delete().eq('id', auditId)
  return { error: error ? new Error(error.message) : null }
}
