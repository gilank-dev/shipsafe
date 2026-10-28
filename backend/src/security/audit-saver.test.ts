import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { saveAuditToSupabase } from './audit-saver';
import { AuditReport } from '../types';

describe('saveAuditToSupabase', () => {
  const mockReport: AuditReport = {
    summary: 'Mock Security Assessment Summary',
    countsBySeverity: { Critical: 1, High: 0, Medium: 0, Low: 0, Info: 0 },
    scorecard: [
      { area: 'Secrets', score: 0, status: 'Quarantined', topConcern: 'Exposed API Key' },
      { area: 'Dependencies', score: 10, status: 'Pass', topConcern: 'None' },
      { area: 'HTTP', score: 10, status: 'Pass', topConcern: 'None' },
      { area: 'Code', score: 10, status: 'Pass', topConcern: 'None' }
    ],
    threatMatrix: [],
    findings: [
      {
        id: 'F-001',
        title: 'Hardcoded Stripe Key',
        severity: 'Critical',
        area: 'Secrets',
        what: 'Live stripe key found in code',
        why: 'Allows unauthorized charges',
        recommendedFix: 'Move to env var',
        remediationPrompt: 'Fix stripe key',
        location: { file: 'src/checkout.ts', line: 12 }
      }
    ],
    secretsToRotate: ['sk_l****'],
    notAssessed: [],
    skippedFiles: []
  };

  const validUserId = '11111111-2222-4333-8444-555555555555';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('gracefully returns error when Supabase URL or key is not provided', async () => {
    const res = await saveAuditToSupabase({
      report: mockReport,
      projectName: 'test.zip',
      userId: validUserId,
      supabaseUrl: '',
      serviceRoleKey: ''
    });

    expect(res.saved).toBe(false);
    expect(res.error).toContain('not configured');
  });

  it('rejects non-UUID user IDs without making network requests', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const res = await saveAuditToSupabase({
      report: mockReport,
      projectName: 'test.zip',
      userId: 'user_clerk_12345',
      supabaseUrl: 'https://test.supabase.co',
      serviceRoleKey: 'secret_key'
    });

    expect(res.saved).toBe(false);
    expect(res.error).toContain('not a valid UUID');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('successfully persists audit and findings to Supabase PostgREST endpoints', async () => {
    const mockAuditId = '99999999-8888-4777-8666-555555555555';

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
      const urlStr = String(url);
      if (urlStr.endsWith('/rest/v1/audits')) {
        return {
          ok: true,
          status: 201,
          json: async () => [{ id: mockAuditId }]
        } as any;
      }
      if (urlStr.endsWith('/rest/v1/findings')) {
        return {
          ok: true,
          status: 201,
          json: async () => []
        } as any;
      }
      return { ok: false, status: 404, text: async () => 'Not found' } as any;
    });

    const res = await saveAuditToSupabase({
      report: mockReport,
      projectName: 'my-project.zip',
      userId: validUserId,
      supabaseUrl: 'https://test.supabase.co',
      serviceRoleKey: 'secret_key'
    });

    expect(res.saved).toBe(true);
    expect(res.auditId).toBe(mockAuditId);
  });

  it('handles Supabase REST API error responses gracefully', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => 'violates foreign key constraint'
    } as any);

    const res = await saveAuditToSupabase({
      report: mockReport,
      projectName: 'my-project.zip',
      userId: validUserId,
      supabaseUrl: 'https://test.supabase.co',
      serviceRoleKey: 'secret_key'
    });

    expect(res.saved).toBe(false);
    expect(res.error).toContain('violates foreign key constraint');
  });
});
