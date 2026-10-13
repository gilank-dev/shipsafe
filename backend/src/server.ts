import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
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
import { supabaseAuthGuard, AuthRequest } from './security/auth-guard';
import { parseGitHubRepo, fetchGitHubRepoZip } from './security/repo-importer';
import { AgentTarget, AuditReport, Finding } from './types';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 23010;

// Security Middleware
app.use(helmet({ contentSecurityPolicy: false })); // API server

const rawCorsOrigin = process.env.CORS_ORIGIN;
const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000',
  'https://shipsafe-lankdev.vercel.app',
  'https://nusa-bench.vercel.app',
];
const allowedOrigins = rawCorsOrigin
  ? rawCorsOrigin.split(',').map((s) => s.trim())
  : defaultAllowedOrigins;

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests (e.g. server-side proxy, curl, automated testing)
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        /^https:\/\/.*\.vercel\.app$/.test(origin)
      ) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS whitelist.`));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Disposition', 'X-File-Name', 'X-Repo-Owner', 'X-Repo-Name', 'X-Repo-Size'],
  })
);

app.use(express.json({ limit: '2mb' }));

// Configure multer memory storage with 10MB limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB cap
  }
});

// Simple in-memory report cache for prompt reformatting
const reportCache = new Map<string, AuditReport>();

// 1. Healthcheck Endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'ShipSafe Backend API',
    version: '1.1.0',
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

// 1.3 Import GitHub Repository Endpoint
app.post('/api/import-repo', supabaseAuthGuard, async (req: AuthRequest, res: Response) => {
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

// 2. Audit Endpoint with Concurrency Limiter (Max 3 concurrent users + FIFO Queue)
app.post('/api/audit', supabaseAuthGuard, upload.single('file'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  const turnstileToken = req.body?.turnstileToken;
  const clientIp = (req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress) as string | undefined;

  const turnstileResult = await verifyTurnstileToken(turnstileToken, clientIp);
  if (!turnstileResult.success) {
    res.status(403).json({
      error: {
        code: 'captcha_failed',
        message: 'Verifikasi CAPTCHA Cloudflare gagal atau kedaluwarsa. Silakan coba lagi.'
      }
    });
    return;
  }

  let fileBuffer: Buffer;
  let fileName: string;

  if (req.file) {
    fileBuffer = req.file.buffer;
    fileName = req.file.originalname || 'archive.zip';
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

    res.json({
      reportId: result.id,
      report: result,
      queueStats: globalAuditQueue.stats
    });
  } catch (err: any) {
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

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[ShipSafe Server Error]', err);

  if (err.code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({
      error: {
        code: 'too_large',
        message: 'The uploaded file exceeds the 10 MB size limit.'
      }
    });
    return;
  }

  res.status(err.statusCode || 500).json({
    error: {
      code: err.code || 'server_error',
      message: err instanceof Error ? err.message : 'Internal Server Error'
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
