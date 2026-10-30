import express, { Request, Response, NextFunction } from 'express';
import { corsMiddleware } from './security/cors-guard';
import helmet from 'helmet';
import multer from 'multer';
import dotenv from 'dotenv';
import { validateAndExtractZip, cleanupTempDir } from './security/zip-guard';
import { walkAndFilterDirectory } from './security/file-filter';
import { verifyTurnstileToken } from './security/turnstile';
import { runStaticSecurityAudit } from './engine/rules-scanner';
import { buildAuditReport } from './engine/report-builder';
import { generateRemediationPrompt } from './engine/prompts';
import { enrichReportWithAi, getAiConfig, callAiCompletion } from './engine/ai-client';
import { globalAuditQueue } from './engine/queue';
import { compareAuditReports } from './engine/diff-verifier';
import { clerkAuthGuard, requireClerkAuth, AuthRequest } from './security/auth-guard';
import { parseGitHubRepo, fetchGitHubRepoZip } from './security/repo-importer';
import { saveAuditToSupabase } from './security/audit-saver';
import { issueCliToken, isCliToken } from './security/cli-token';
import { globalLimiter, auditLimiter, authVoucherLimiter } from './security/rate-limiter';
import { consumeUserAuditQuota, refundUserAuditQuota } from './security/quota-guard';
import { buildAdminRouter, verifyJwtAuth } from './security/admin-routes';
import { getIntakeStatus } from './security/admin-controller';
import { createClient } from '@supabase/supabase-js';
import type { AuditReport, Finding, AgentTarget } from './types';

dotenv.config();

// Fail-fast: production MUST NOT boot with an incomplete or unsafe config.
import { enforceEnv } from './config/env-validation';
enforceEnv(process.env);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 23010;

// Security Middleware
app.use(helmet({ contentSecurityPolicy: false })); // API server
app.use(corsMiddleware);
app.use(globalLimiter); // 120 req/min per client IP (Cloudflare/Vercel-aware)

app.use(express.json({ limit: '2mb' }));

// Configure multer memory storage with 10MB limit (supporting both 'file' and 'zip' fields)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB cap
  }
});
const uploadAuditFile = upload.fields([
  { name: 'file', maxCount: 1 },
  { name: 'zip', maxCount: 1 }
]);

// Simple in-memory report cache for prompt reformatting
import { reportCache } from './engine/report-cache';

// 1. Healthcheck Endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'ShipSafe Backend API',
    version: '1.2.0',
    uptime: process.uptime(),
    queue: globalAuditQueue.stats,
    timestamp: new Date().toISOString()
  });
});

// 1.1 Queue Status Endpoint
app.get('/api/queue', (_req: Request, res: Response) => {
  res.json(globalAuditQueue.stats);
});

// 1.2 AI Gateway Healthcheck Endpoint
app.get('/api/ai/health', async (_req: Request, res: Response) => {
  const config = getAiConfig();
  const testResponse = await callAiCompletion([
    { role: 'user', content: 'Reply with PONG' }
  ], { max_tokens: 10, timeoutMs: 3000 });

  res.json({
    status: testResponse ? 'online' : 'offline',
    gateway: config.baseUrl,
    model: config.model,
    pingResponse: testResponse || 'timeout_or_error_fallback_ready',
    timestamp: new Date().toISOString()
  });
});

// 1.25 Developer & Fallback Auth Login Endpoint
app.post('/api/auth/login', authVoucherLimiter, async (req: Request, res: Response) => {
  const { email, password, isDev } = req.body || {};
  const isProduction = process.env.NODE_ENV === 'production';

  // Legacy dev-mode bypass: ONLY for local development / non-production builds.
  // In production every login MUST be verified against the real auth service.
  if (!isProduction && (isDev || email === 'developer@example.com' || !email)) {
    const devUser = {
      id: 'usr-dev-auditor',
      email: 'developer@example.com',
      fullName: 'ShipSafe Lead Auditor',
      avatarUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" fill="%2318181b"/><path d="M16 6l8 3.5v7c0 5-3.5 8.5-8 9.5-4.5-1-8-4.5-8-9.5v-7L16 6z" stroke="%2322c55e" stroke-width="2"/><circle cx="16" cy="14" r="3" fill="%2322c55e"/><path d="M12 21c0-2.5 2-4 4-4s4 1.5 4 4" stroke="%2322c55e" stroke-width="2" stroke-linecap="round"/></svg>',
    };
    const devToken = 'dev-token-developer@example.com';
    res.json({
      success: true,
      token: devToken,
      user: devUser,
    });
    return;
  }

  if (!email || typeof email !== 'string' || !password) {
    res.status(400).json({
      success: false,
      error: { code: 'missing_credentials', message: 'Email dan password wajib diisi.' }
    });
    return;
  }

  // Attempt Supabase authentication
  const supabaseUrl = process.env.SUPABASE_URL;
  const apiKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (supabaseUrl && apiKey && !supabaseUrl.includes('your-project-ref')) {
    try {
      const url = `${supabaseUrl.replace(/\/+$/, '')}/auth/v1/token?grant_type=password`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': apiKey,
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = (await response.json()) as { access_token?: string; user?: any };
        if (data.access_token && data.user) {
          res.json({
            success: true,
            token: data.access_token,
            user: {
              id: data.user.id,
              email: data.user.email,
              fullName: data.user.user_metadata?.full_name || data.user.user_metadata?.name || '',
              avatarUrl: data.user.user_metadata?.avatar_url || '',
            },
          });
          return;
        }
      } else if (response.status === 400 || response.status === 401 || response.status === 403) {
        // Supabase explicitly rejected the credentials.
        res.status(401).json({
          success: false,
          error: { code: 'invalid_credentials', message: 'Email atau password salah.' }
        });
        return;
      }
      // Other non-OK statuses fall through to the fail-closed decision below.
    } catch (err) {
      console.warn('[ShipSafe Auth] Supabase direct login error:', err);
    }
  }

  const isSupabaseConfigured = Boolean(
    supabaseUrl && apiKey && !supabaseUrl.includes('your-project-ref')
  );

  // FAIL-CLOSED in production: no dev tokens may be minted by an HTTP route.
  if (isProduction || isSupabaseConfigured) {
    const statusCode = isSupabaseConfigured ? 401 : 503;
    res.status(statusCode).json({
      success: false,
      error: {
        code: isSupabaseConfigured ? 'invalid_credentials' : 'auth_service_unavailable',
        message: isSupabaseConfigured
          ? 'Email atau password salah.'
          : 'Layanan autentikasi sedang tidak tersedia. Silakan coba beberapa saat lagi.'
      }
    });
    return;
  }

  // Graceful fallback profile for development / demo mode so user is never locked out
  const sanitizedEmail = String(email).trim().toLowerCase();
  const token = `dev-token-${sanitizedEmail}`;
  const user = {
    id: `usr-dev-${Buffer.from(sanitizedEmail).toString('hex').slice(0, 8)}`,
    email: sanitizedEmail,
    fullName: sanitizedEmail.split('@')[0] || 'ShipSafe Auditor',
    avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(sanitizedEmail)}`,
  };

  res.json({
    success: true,
    token,
    user,
  });
});

// 1.3 CLI Token Issuance (for linking Terminal CLI to Web Console Session)
app.post('/api/cli/token', requireClerkAuth, (req: AuthRequest, res: Response) => {
  if (!req.user || !req.user.id) {
    res.status(401).json({ error: { code: 'unauthorized', message: 'Authentication required.' } });
    return;
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (isCliToken(token)) {
    res.status(403).json({
      error: {
        code: 'cli_token_not_allowed',
        message: 'Sign in on the web console to create a CLI token.',
      },
    });
    return;
  }

  try {
    const { token: cliToken, expiresAt } = issueCliToken({
      id: req.user.id,
      email: req.user.email,
    });
    res.status(201).json({
      token: cliToken,
      tokenType: 'cli',
      email: req.user.email || '',
      expiresAt,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'CLI token generation failed';
    res.status(503).json({ error: { code: 'cli_tokens_unavailable', message } });
  }
});

// 1.4 CLI Identity Verification
app.get('/api/cli/whoami', requireClerkAuth, (req: AuthRequest, res: Response) => {
  if (!req.user || !req.user.id) {
    res.status(401).json({ error: { code: 'unauthorized', message: 'Authentication required.' } });
    return;
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const isCli = isCliToken(token);

  res.json({
    id: req.user.id,
    email: req.user.email || 'developer@shipsafe.dev',
    authMethod: isCli ? 'cli_token' : 'session',
    ...(isCli ? { client: 'shipsafe-cli' } : {}),
  });
});

// 1.3 Import GitHub Repository Endpoint (Mandatory Auth)
app.post('/api/import-repo', requireClerkAuth, async (req: AuthRequest, res: Response) => {
  const repoUrl = req.body?.repoUrl;
  if (!repoUrl || typeof repoUrl !== 'string') {
    res.status(400).json({
      error: {
        code: 'invalid_repo_url',
        message: 'Mohon masukkan URL GitHub atau format owner/repo yang valid.'
      }
    });
    return;
  }

  const parsed = parseGitHubRepo(repoUrl);
  if (!parsed) {
    res.status(400).json({
      error: {
        code: 'invalid_repo_url',
        message: 'Format URL GitHub tidak valid. Contoh yang didukung: "owner/repo" atau "https://github.com/owner/repo".'
      }
    });
    return;
  }

  try {
    const fetched = await fetchGitHubRepoZip(parsed.owner, parsed.repo, { ref: parsed.ref });
    if (req.query.format === 'json') {
      res.json({
        success: true,
        fileName: fetched.fileName,
        owner: fetched.owner,
        repo: fetched.repo,
        size: fetched.size,
      });
      return;
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${fetched.fileName}"`);
    res.setHeader('X-File-Name', fetched.fileName);
    res.setHeader('X-Repo-Owner', fetched.owner);
    res.setHeader('X-Repo-Name', fetched.repo);
    res.setHeader('X-Repo-Size', fetched.size.toString());
    res.setHeader('Content-Length', fetched.buffer.length.toString());
    res.send(fetched.buffer);
  } catch (err: any) {
    res.status(err.statusCode || 500).json({
      error: {
        code: err.code || 'import_failed',
        message: err.message || 'Gagal mengimpor repositori GitHub.'
      }
    });
  }
});

// 2. Audit Endpoint with Mandatory Auth, Rate Limit, Intake Gate & Quota Enforcement
app.post('/api/audit', auditLimiter, requireClerkAuth, uploadAuditFile, async (req: AuthRequest, res: Response, next: NextFunction) => {
  // Product intake control: Super Admin can pause new scan intake globally.
  if (!getIntakeStatus()) {
    res.status(503).json({
      error: {
        code: 'intake_paused',
        message: 'ShipSafe scan intake is temporarily paused for platform maintenance. Please retry later.'
      }
    });
    return;
  }

  const turnstileToken =
    req.body?.['cf-turnstile-response'] ||
    req.body?.turnstileToken ||
    (typeof req.headers['cf-turnstile-response'] === 'string' ? req.headers['cf-turnstile-response'] : undefined);
  const clientIp = (req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress) as string | undefined;

  // Bypass Turnstile for CLI runners, dev tokens, and authenticated API keys
  const isCliOrApiKey =
    req.user?.id === 'usr-cli-runner' ||
    req.user?.id === 'usr-dev-auditor' ||
    req.headers['x-shipsafe-client'] === 'cli' ||
    req.headers.authorization?.includes('sk_') ||
    req.headers.authorization?.includes('dev-token-');

  if (!isCliOrApiKey) {
    const turnstileResult = await verifyTurnstileToken(turnstileToken, {
      clientIp,
      expectedAction: 'audit'
    });
    if (!turnstileResult.success) {
      console.error(`[Turnstile] Verification failed for client ${clientIp || 'unknown'}: ${turnstileResult.error || 'verification_failed'}`);
      res.status(403).json({
        error: {
          code: 'captcha_failed',
          message: 'Verifikasi CAPTCHA Cloudflare gagal atau kedaluwarsa. Silakan coba lagi.'
        }
      });
      return;
    }
  }

  let fileBuffer: Buffer;
  let fileName: string;

  const filesMap = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
  const auditFile = req.file || filesMap?.file?.[0] || filesMap?.zip?.[0];

  if (auditFile) {
    fileBuffer = auditFile.buffer;
    fileName = auditFile.originalname || 'archive.zip';
  } else if (req.body?.repoUrl && typeof req.body.repoUrl === 'string') {
    const parsed = parseGitHubRepo(req.body.repoUrl);
    if (!parsed) {
      res.status(400).json({
        error: {
          code: 'invalid_repo_url',
          message: 'Format URL GitHub tidak valid. Contoh yang didukung: "owner/repo" atau "https://github.com/owner/repo".'
        }
      });
      return;
    }

    try {
      const fetched = await fetchGitHubRepoZip(parsed.owner, parsed.repo, { ref: parsed.ref });
      fileBuffer = fetched.buffer;
      fileName = fetched.fileName;
    } catch (err: any) {
      res.status(err.statusCode || 500).json({
        error: {
          code: err.code || 'import_failed',
          message: err.message || 'Gagal mengunduh repositori GitHub untuk diaudit.'
        }
      });
      return;
    }
  } else {
    res.status(400).json({
      error: {
        code: 'no_file',
        message: 'No ZIP archive uploaded or GitHub repository URL provided. Please provide a file or repoUrl.'
      }
    });
    return;
  }

  const agentTarget: AgentTarget = (req.body.agentTarget as AgentTarget) || 'Generic';
  const rawContext = req.body.context;
  let contextObj = {};
  if (typeof rawContext === 'string') {
    try {
      contextObj = JSON.parse(rawContext);
    } catch {
      // ignore parse error
    }
  } else if (rawContext && typeof rawContext === 'object') {
    contextObj = rawContext;
  }

  try {
    // Enforce monthly audit quota (Supabase RPC with FOR UPDATE row locking).
    // Non-UUID identities (CLI runner / local dev) receive an internal fallback.
    const quotaUserId = req.user?.id;
    if (quotaUserId) {
      try {
        const quota = await consumeUserAuditQuota(quotaUserId);
        if (!quota.allowed) {
          res.status(402).json({
            error: {
              code: 'quota_exceeded',
              message: 'Batas kuota audit bulanan Anda telah tercapai. Silakan upgrade ke Pro.',
              quota: {
                tier: quota.tier,
                used: quota.used,
                limit: quota.limit,
                remaining: 0,
                resetDate: quota.reset_date
              }
            }
          });
          return;
        }
      } catch {
        // Quota guard failures must never block an audit; continue.
      }
    }

    // Acquire slot in queue (Max 3 workers concurrently)
    const result = await globalAuditQueue.run(async () => {
      let tempDir: string | undefined;

      try {
        // Phase 1: Validate & Extract to Sandbox Temp Directory
        const extractResult = validateAndExtractZip(fileBuffer);
        if (!extractResult.valid || !extractResult.tempDir) {
          const err: any = new Error(extractResult.error || 'Failed to safely validate and unpack archive.');
          err.statusCode = 422;
          err.code = 'unsafe_archive';
          throw err;
        }

        tempDir = extractResult.tempDir;

        // Phase 2: Walk & Filter files
        const filteredFiles = walkAndFilterDirectory(tempDir);

        // Phase 3: Run 10-Threat Security Audit Rules
        const auditResult = runStaticSecurityAudit(filteredFiles, agentTarget);

        // Phase 4: Build Audit Report with ThreatMatrix
        let report = buildAuditReport(
          auditResult.findings,
          auditResult.secretsToRotate,
          auditResult.threatMatrix,
          filteredFiles,
          fileName
        );

        // Phase 5: AI-Powered Enrichment (Graceful Fallback to static report if AI is unavailable)
        report = await enrichReportWithAi(report, agentTarget, contextObj);

        // Store in cache for subsequent prompt reformats
        if (report.id) {
          reportCache.set(report.id, report);
          if (reportCache.size > 100) {
            const oldestKey = reportCache.keys().next().value;
            if (oldestKey) reportCache.delete(oldestKey);
          }
        }

        return report;
      } finally {
        // ALWAYS clean up temp files immediately: zero raw ZIP files persisted!
        if (tempDir) {
          cleanupTempDir(tempDir);
        }
      }
    });

    let savedToHistory = false;
    if (req.user?.id) {
      try {
        const saveRes = await saveAuditToSupabase({
          report: result,
          projectName: fileName || 'codebase.zip',
          userId: req.user.id,
        });
        savedToHistory = saveRes.saved;
        if (!saveRes.saved) {
          console.warn('[ShipSafe] Audit persistence notice:', saveRes.error);
        }
      } catch (saveErr) {
        console.warn('[ShipSafe] Audit persistence error:', saveErr);
      }
    }

    res.json({
      reportId: result.id,
      report: result,
      findings: result.findings,
      scannedFiles: result.findings.length,
      savedToHistory,
      queueStats: globalAuditQueue.stats
    });
  } catch (err: any) {
    // Refund the consumed quota unit when the audit fails (scanner crash,
    // queue saturation, unsafe archive) so users aren't billed for broken runs.
    void refundUserAuditQuota(req.user?.id as string).catch(() => undefined);

    if (err.code === 'QUEUE_FULL') {
      res.status(429).json({
        error: {
          code: 'queue_full',
          message: err.message,
          stats: globalAuditQueue.stats
        }
      });
      return;
    }
    if (err.code === 'QUEUE_TIMEOUT') {
      res.status(504).json({
        error: {
          code: 'queue_timeout',
          message: err.message,
          stats: globalAuditQueue.stats
        }
      });
      return;
    }
    if (err.statusCode === 422) {
      res.status(422).json({
        error: {
          code: err.code || 'unsafe_archive',
          message: err.message
        }
      });
      return;
    }
    next(err);
  }
});

// 3. Reformat Prompts Endpoint
app.post('/api/audit/:id/prompts', (req: Request, res: Response) => {
  const { id } = req.params;
  const target: AgentTarget = req.body.agentTarget || 'Generic';
  const providedFindings: Finding[] | undefined = req.body.findings;

  let findingsToFormat: Finding[] = [];

  if (providedFindings && Array.isArray(providedFindings)) {
    findingsToFormat = providedFindings;
  } else {
    const cached = reportCache.get(id);
    if (cached) {
      findingsToFormat = cached.findings;
    }
  }

  const promptMap: Record<string, string> = {};
  for (const f of findingsToFormat) {
    promptMap[f.id] = generateRemediationPrompt(f, target);
  }

  res.json({
    reportId: id,
    agentTarget: target,
    prompts: promptMap
  });
});

//
// 4. Re-Audit Diff & Fix Verification Endpoint
// NOTE: verification always requires a verified session; identity comes from
// the Supabase audit ledger, not from client-supplied payloads alone.
//
app.post('/api/audit/verify-diff', requireClerkAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { baseReport, targetReport, baseAuditId, targetAuditId } = req.body;

    let resolvedBase: AuditReport | undefined = baseReport;
    let resolvedTarget: AuditReport | undefined = targetReport;

    if (!resolvedBase && baseAuditId) {
      resolvedBase = reportCache.get(baseAuditId);
    }
    if (!resolvedTarget && targetAuditId) {
      resolvedTarget = reportCache.get(targetAuditId);
    }

    if (!resolvedBase || !resolvedTarget) {
      return res.status(400).json({
        error: {
          code: 'missing_audit_reports',
          message: 'Both baseReport and targetReport (or valid cached baseAuditId and targetAuditId) must be provided for diff verification.'
        }
      });
    }

    const diffResult = compareAuditReports(resolvedBase, resolvedTarget);

    // Persist diff result to Supabase audit_diffs table
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && serviceKey && !supabaseUrl.includes('your-project-ref')) {
      const supabase = createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });

      // Get user ID from Clerk auth
      const userId = req.user?.id;

      if (userId) {
        const { resolvedFindings, persistentFindings, regressedFindings } = diffResult;

        const { error } = await supabase
          .from('audit_diffs')
          .insert({
            user_id: userId,
            base_audit_id: baseAuditId,
            target_audit_id: targetAuditId,
            score_before: diffResult.scoreBefore,
            score_after: diffResult.scoreAfter,
            score_delta: diffResult.scoreDelta,
            resolved_findings: resolvedFindings.map((f: any) => ({
              finding_code: f.id,
              title: f.title,
              severity: f.severity,
              area: f.area,
              threat_category: f.threatCategory,
              location: f.location,
              what: f.what,
              why: f.why,
              recommended_fix: f.recommendedFix,
              verify_with: f.verifyWith,
              confidence: f.confidence
            })),
            persistent_findings: persistentFindings.map((f: any) => ({
              finding_code: f.id,
              title: f.title,
              severity: f.severity,
              area: f.area,
              threat_category: f.threatCategory,
              location: f.location,
              what: f.what,
              why: f.why,
              recommended_fix: f.recommendedFix,
              verify_with: f.verifyWith,
              confidence: f.confidence
            })),
            regressed_findings: regressedFindings.map((f: any) => ({
              finding_code: f.id,
              title: f.title,
              severity: f.severity,
              area: f.area,
              threat_category: f.threatCategory,
              location: f.location,
              what: f.what,
              why: f.why,
              recommended_fix: f.recommendedFix,
              verify_with: f.verifyWith,
              confidence: f.confidence
            }))
          });

        if (error) {
          console.error('Supabase audit_diffs insert error:', error);
        }
      }
    }

    res.json({
      ...diffResult,
      saved: supabaseUrl && serviceKey && !supabaseUrl.includes('your-project-ref') && req.user?.id ? true : false
    });
  } catch (error) {
    console.error('verify-diff endpoint error:', error);
    res.status(500).json({
      error: {
        code: 'internal_error',
        message: 'Internal server error during diff verification.'
      }
    });
  }
});
// ---------------------------------------------------------------------------
// 5. Super Admin Console API + verified user helpers (mounted under /api)
// ---------------------------------------------------------------------------
app.use('/api', buildAdminRouter(verifyJwtAuth, { authMode: 'production' }));

// Global Error Handler
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[ShipSafe Server Error]', err);

  if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string' && err.message.startsWith('CORS_NOT_ALLOWED')) {
    return res.status(403).json({
      error: {
        code: 'cors_not_allowed',
        message: 'Origin not allowed by CORS security whitelist.',
      },
    });
  }

  if (err && typeof err === 'object' && 'code' in err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: {
        code: 'too_large',
        message: 'The uploaded file exceeds the 10 MB size limit.'
      }
    });
  }

  const statusCode = err && typeof err === 'object' && 'statusCode' in err && typeof err.statusCode === 'number' ? err.statusCode : 500;
  const code = err && typeof err === 'object' && 'code' in err && typeof err.code === 'string' ? err.code : 'server_error';
  const message = err instanceof Error ? err.message : 'Internal Server Error';

  res.status(statusCode).json({
    error: {
      code,
      message
    }
  });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`ShipSafe API server listening on http://0.0.0.0:${PORT} (Max Concurrency: 3)`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
