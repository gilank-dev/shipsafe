import { AuditReport } from '../types';

export interface SaveAuditParams {
  report: AuditReport;
  projectName: string;
  userId: string;
  supabaseUrl?: string;
  serviceRoleKey?: string;
}

export interface SaveAuditResult {
  saved: boolean;
  auditId?: string;
  error?: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Saves audit report and findings directly to Supabase via PostgREST REST API.
 * Uses SUPABASE_SERVICE_ROLE_KEY to bypass client RLS for reliable server-side persistence.
 */
export async function saveAuditToSupabase(params: SaveAuditParams): Promise<SaveAuditResult> {
  const { report, projectName, userId } = params;
  const supabaseUrl = params.supabaseUrl || process.env.SUPABASE_URL;
  const serviceRoleKey = params.serviceRoleKey || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey || supabaseUrl.includes('your-project-ref')) {
    return {
      saved: false,
      error: 'Supabase URL or service role key is not configured.'
    };
  }

  // If userId is not a valid UUID (e.g. dev token or Clerk prefix), skip database insert gracefully
  if (!UUID_REGEX.test(userId)) {
    return {
      saved: false,
      error: `User ID "${userId}" is not a valid UUID for Supabase auth.users constraint.`
    };
  }

  try {
    const baseUrl = supabaseUrl.replace(/\/+$/, '');
    const headers = {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };

    // 1. Insert audit row
    const auditPayload = {
      user_id: userId,
      project_name: projectName || 'codebase.zip',
      summary: report.summary,
      counts_by_severity: report.countsBySeverity,
      scorecard: report.scorecard,
      secrets_to_rotate: report.secretsToRotate || [],
      not_assessed: report.notAssessed || []
    };

    const auditRes = await fetch(`${baseUrl}/rest/v1/audits`, {
      method: 'POST',
      headers,
      body: JSON.stringify(auditPayload),
      signal: AbortSignal.timeout(8000)
    });

    if (!auditRes.ok) {
      const errText = await auditRes.text();
      return {
        saved: false,
        error: `Supabase audit insert failed [${auditRes.status}]: ${errText}`
      };
    }

    const insertedAudits = (await auditRes.json()) as Array<{ id: string }>;
    const auditId = insertedAudits?.[0]?.id;

    if (!auditId) {
      return {
        saved: false,
        error: 'Failed to retrieve inserted audit ID from Supabase.'
      };
    }

    // 2. Insert findings if any
    if (report.findings && report.findings.length > 0) {
      const findingsPayload = report.findings.map((f) => ({
        audit_id: auditId,
        finding_code: f.id,
        title: f.title,
        severity: f.severity,
        area: f.area,
        location: f.location || null,
        what: f.what,
        why: f.why,
        recommended_fix: f.recommendedFix,
        verify_with: f.verifyWith || null,
        remediation_prompt: f.remediationPrompt,
        confidence: f.confidence || null
      }));

      const findingsRes = await fetch(`${baseUrl}/rest/v1/findings`, {
        method: 'POST',
        headers,
        body: JSON.stringify(findingsPayload),
        signal: AbortSignal.timeout(8000)
      });

      if (!findingsRes.ok) {
        console.warn(`[ShipSafe AuditSaver] Findings insert warning [${findingsRes.status}]`);
      }
    }

    return {
      saved: true,
      auditId
    };
  } catch (err: any) {
    return {
      saved: false,
      error: err instanceof Error ? err.message : 'Unknown error during Supabase audit persistence.'
    };
  }
}
