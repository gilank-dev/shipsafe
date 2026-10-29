import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Configuration & Tier Constants
const TIER_SIZE_LIMITS: Record<string, number> = {
  free: 10 * 1024 * 1024,        // 10 MB
  pro: 100 * 1024 * 1024,       // 100 MB
  enterprise: 500 * 1024 * 1024 // 500 MB+
};

const NOISE_DIRECTORIES = [
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  'vendor'
];

interface QuotaResponse {
  allowed: boolean;
  tier: 'free' | 'pro' | 'enterprise';
  used: number;
  limit: number;
  remaining: number;
  reset_date: string;
}

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: { code: 'server_misconfigured', message: 'Database credentials missing.' } },
      { status: 500 }
    );
  }

  // Admin client for atomic RPC operations with service_role privilege
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });

  // 1. Verify Authenticated Session
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: { code: 'unauthorized', message: 'Authentication required. Please sign in via GitHub or Google.' } },
      { status: 401 }
    );
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json(
      { error: { code: 'unauthorized', message: 'Invalid or expired session token.' } },
      { status: 401 }
    );
  }

  const userId = user.id;

  // 2. Extract Multipart Payload and Pre-check Tier & Size Limits
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'bad_request', message: 'Invalid multipart form data payload.' } },
      { status: 400 }
    );
  }

  const file = formData.get('file') as File | null;
  if (!file) {
    return NextResponse.json(
      { error: { code: 'no_file', message: 'No ZIP archive uploaded.' } },
      { status: 400 }
    );
  }

  // Pre-fetch quota & tier status (without consuming yet) to validate payload size
  const { data: quotaStatus, error: statusError } = await supabaseAdmin.rpc('get_user_quota', {
    target_user_id: userId
  });

  const userTier: 'free' | 'pro' | 'enterprise' = (quotaStatus?.tier as any) || 'free';
  const maxAllowedBytes = TIER_SIZE_LIMITS[userTier] || TIER_SIZE_LIMITS.free;

  // Strict Payload & Upload Size Validation BEFORE Consuming Quota
  if (file.size > maxAllowedBytes) {
    const maxMb = Math.round(maxAllowedBytes / (1024 * 1024));
    const fileMb = (file.size / (1024 * 1024)).toFixed(1);
    return NextResponse.json(
      {
        error: {
          code: 'PAYLOAD_TOO_LARGE',
          message: `Ukuran berkas (${fileMb} MB) melebihi batas paket ${userTier.toUpperCase()} (${maxMb} MB). Silakan upgrade paket kamu untuk mengaudit arsip yang lebih besar.`,
          tier: userTier,
          maxAllowedMb: maxMb,
          upgradeUrl: '/pricing'
        }
      },
      { status: 413 }
    );
  }

  // 3. Atomic Quota Consumption (Row Lock + Lazy Monthly Reset)
  const { data: quotaData, error: quotaError } = await supabaseAdmin.rpc('consume_audit_quota', {
    target_user_id: userId
  });

  if (quotaError || !quotaData) {
    return NextResponse.json(
      { error: { code: 'quota_check_failed', message: 'Failed to verify audit quota.' } },
      { status: 500 }
    );
  }

  const quota = quotaData as QuotaResponse;

  // If quota limit exceeded, return HTTP 403 Forbidden with upgrade payload
  if (!quota.allowed) {
    return NextResponse.json(
      {
        error: {
          code: 'QUOTA_EXCEEDED',
          message: `Batas kuota audit bulanan untuk paket ${quota.tier.toUpperCase()} telah tercapai (${quota.used}/${quota.limit}).`,
          tier: quota.tier,
          used: quota.used,
          limit: quota.limit,
          resetDate: quota.reset_date,
          upgradeUrl: '/pricing'
        }
      },
      { status: 403 }
    );
  }

  // 4. Isolated Static Scan Execution inside try/catch with Automatic Refund Guard
  try {
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Execute internal sandbox scan & AI analysis (mocked or forwarded to engine)
    // Automatically ignores heavy noise directories during extraction: node_modules, .next, .git, dist, build, vendor
    const auditReport = await executeSandboxScan(fileBuffer, file.name, {
      ignoredDirectories: NOISE_DIRECTORIES,
      tier: quota.tier
    });

    // 5. Gate the Remediation (Solution), Not Detection on Free Tier
    // Free tier users receive full prompt on finding index 0 only.
    // Findings index 1..N have remediationPrompt set to null and isLocked = true.
    const sanitizedFindings = (auditReport.findings || []).map((finding: any, index: number) => {
      if (quota.tier === 'free' && index > 0) {
        return {
          ...finding,
          remediationPrompt: null,
          isLocked: true,
          lockReason: 'Upgrade ke Pro (Rp 79rb) untuk membuka semua prompt perbaikan instan'
        };
      }
      return {
        ...finding,
        isLocked: false
      };
    });

    return NextResponse.json({
      success: true,
      reportId: auditReport.id,
      report: {
        ...auditReport,
        findings: sanitizedFindings
      },
      findings: sanitizedFindings,
      quota: {
        tier: quota.tier,
        used: quota.used,
        limit: quota.limit,
        remaining: quota.remaining,
        resetDate: quota.reset_date
      }
    });

  } catch (scanError: any) {
    // Companion RPC: Refund quota on internal crash so users never lose credits due to system failure
    console.error('[ShipSafe API] Internal scan error encountered, executing atomic quota refund:', scanError);
    await supabaseAdmin.rpc('refund_audit_quota', { target_user_id: userId });

    return NextResponse.json(
      {
        error: {
          code: 'SCAN_FAILED_REFUNDED',
          message: 'Pemindaian gagal karena kendala sandbox internal. Kuota audit kamu telah dikembalikan secara otomatis.',
          detail: scanError?.message || 'Internal sandbox execution error'
        }
      },
      { status: 500 }
    );
  }
}

/**
 * Sandbox scan helper simulating engine execution
 */
async function executeSandboxScan(buffer: Buffer, filename: string, options: { ignoredDirectories: string[]; tier: string }) {
  // If ShipSafe internal backend is available, proxy request or run rule set
  return {
    id: `audit-${Date.now()}`,
    filename,
    summary: 'Security audit scan completed with noise filtering applied.',
    findings: [
      {
        id: 'F-001',
        title: 'Exposed Database Secret Key',
        severity: 'Critical',
        area: 'Secrets',
        location: { file: '.env.production', line: 12 },
        what: 'Database connection password committed directly to repository environment file.',
        why: 'Anyone with repository access can extract database credentials and dump customer records.',
        recommendedFix: 'Move credentials to a cloud secret manager (AWS Secrets Manager / Vault) and rotate immediately.',
        remediationPrompt: 'Rotate the exposed PostgreSQL password immediately and inject via environment variables.'
      },
      {
        id: 'F-002',
        title: 'Potential SQL Injection via Template Literal Concatenation',
        severity: 'High',
        area: 'Code',
        location: { file: 'src/api/users.ts', line: 45 },
        what: 'Raw user input interpolated directly into SQL query string without parameterized binding.',
        why: 'Attackers can bypass authentication and execute arbitrary SQL commands.',
        recommendedFix: 'Use parameterized queries ($1, $2) or an ORM prepared statement.',
        remediationPrompt: 'Refactor src/api/users.ts line 45 to use parameterized queries instead of template strings.'
      }
    ]
  };
}
