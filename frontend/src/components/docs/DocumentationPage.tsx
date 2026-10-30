import React, { useState, useEffect } from 'react'
import {
  Shield,
  Terminal,
  Cpu,
  FileCode,
  Layers,
  HelpCircle,
  AlertTriangle,
  Copy,
  Check,
  ChevronRight,
  BookOpen,
  Search,
  ExternalLink,
  CheckCircle2,
  Zap,
} from 'lucide-react'

// -----------------------------------------------------------------------------
// DATA DEFINITIONS & TECHNICAL SPECS
// -----------------------------------------------------------------------------

interface ThreatVectorDetail {
  id: string
  code: string
  cwe: string
  owasp: string
  title: string
  severity: 'Critical' | 'High' | 'Medium'
  description: string
  vulnerableCode: string
  fixedCode: string
  detectionRule: string
  verificationCmd: string
}

const THREAT_VECTORS_DATA: ThreatVectorDetail[] = [
  {
    id: 'v01-sqli',
    code: 'V01',
    cwe: 'CWE-89',
    owasp: 'A03:2021 Injection',
    title: 'SQL Injection (SQLi)',
    severity: 'Critical',
    description:
      'Occurs when user input is concatenated or interpolated directly into database queries via template literals without parameterized binding or verified ORM abstraction.',
    vulnerableCode: `// VULNERABLE: Raw template literal string concatenation
const { userId } = req.query;
const result = await db.query(
  \`SELECT * FROM users WHERE id = '\${userId}'\`
);`,
    fixedCode: `// SECURE: Parameterized query with placeholder bindings
const { userId } = req.query;
const result = await db.query(
  'SELECT * FROM users WHERE id = $1',
  [userId]
);`,
    detectionRule:
      'AST scanner inspects template literal queries interpolating request properties (req.query, req.body, req.params) without $1, ?, or verified ORM bindings.',
    verificationCmd: 'npm test -- --grep "sql-injection"',
  },
  {
    id: 'v02-xss',
    code: 'V02',
    cwe: 'CWE-79',
    owasp: 'A03:2021 Injection',
    title: 'Cross-Site Scripting (XSS)',
    severity: 'High',
    description:
      'Malicious script injection into user interfaces via unescaped DOM manipulation, enabling session cookie theft, credential harvesting, or XSS execution.',
    vulnerableCode: `// VULNERABLE: Rendering raw HTML without sanitization
export function CommentView({ comment }: { comment: string }) {
  return <div dangerouslySetInnerHTML={{ __html: comment }} />;
}`,
    fixedCode: `// SECURE: HTML sanitization via DOMPurify or React auto-escaping
import DOMPurify from 'dompurify';

export function CommentView({ comment }: { comment: string }) {
  const cleanHtml = DOMPurify.sanitize(comment);
  return <div dangerouslySetInnerHTML={{ __html: cleanHtml }} />;
}`,
    detectionRule:
      'Detects dangerouslySetInnerHTML, innerHTML, document.write, and v-html calls binding dynamic variables without explicit DOMPurify sanitization.',
    verificationCmd: 'npx eslint src/ --rule "react/no-danger: error"',
  },
  {
    id: 'v03-ddos-redos',
    code: 'V03',
    cwe: 'CWE-400 / CWE-1333',
    owasp: 'A05:2021 Security Misconfiguration',
    title: 'Denial of Service (DDoS & ReDoS)',
    severity: 'High',
    description:
      'Absence of rate limiting on public authentication routes and regular expressions vulnerable to catastrophic backtracking (ReDoS) freezing the event loop.',
    vulnerableCode: `// VULNERABLE: Authentication endpoint without rate limiting & vulnerable regex
const EMAIL_REGEX = /^([a-zA-Z0-9_.-])+@(([a-zA-Z0-9-])+.)+([a-zA-Z0-9]{2,4})+$/;

app.post('/api/auth/login', async (req, res) => {
  // Tanpa throttling / limiter
  return handleLogin(req, res);
});`,
    fixedCode: `// SECURE: Route-level rate limiting via express-rate-limit
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 5, // Maks 5 percobaan per IP
  message: { error: 'Too many requests. Please try again after 15 minutes.' }
});

app.post('/api/auth/login', loginLimiter, handleLogin);`,
    detectionRule:
      'Analyzes Express route trees to identify public POST/PUT/DELETE endpoints missing rateLimit() middleware and evaluates regex patterns for exponential complexity O(2^n).',
    verificationCmd: 'npx @lankdev/shipsafe-cli scan . --format=human',
  },
  {
    id: 'v04-bruteforce-timing',
    code: 'V04',
    cwe: 'CWE-307 / CWE-328 / CWE-208',
    owasp: 'A07:2021 Identification & Auth Failures',
    title: 'Brute Force & Timing Attack',
    severity: 'High',
    description:
      'Comparison of secrets/passwords using standard equality operators (===) that leak token length and character values through CPU timing differences.',
    vulnerableCode: `// VULNERABLE: Standard equality comparison vulnerable to timing attacks
function verifyApiKey(clientKey: string, secretKey: string): boolean {
  return clientKey === secretKey; // Waktu komparasi berbeda per karakter
}`,
    fixedCode: `// SECURE: Constant-time buffer comparison via crypto.timingSafeEqual
import crypto from 'node:crypto';

function verifyApiKey(clientKey: string, secretKey: string): boolean {
  const bufA = Buffer.from(clientKey);
  const bufB = Buffer.from(secretKey);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}`,
    detectionRule:
      'Detects token/secret key comparisons lacking crypto.timingSafeEqual and flags legacy hashing algorithms (MD5, SHA1) used for credentials.',
    verificationCmd: 'npm test -- --grep "auth-guard"',
  },
  {
    id: 'v05-webshell-upload',
    code: 'V05',
    cwe: 'CWE-434',
    owasp: 'A03:2021 Injection',
    title: 'Web Shell & Arbitrary File Upload',
    severity: 'Critical',
    description:
      'File upload handler lacking binary magic byte signature verification and extension allowlists, allowing attackers to upload executable scripts (.php, .js, .sh) to the host server.',
    vulnerableCode: `// VULNERABLE: Saving uploaded files directly with original user filename
const upload = multer({ dest: 'public/uploads/' });

app.post('/upload', upload.single('avatar'), (req, res) => {
  res.json({ url: \`/uploads/\${req.file.originalname}\` });
});`,
    fixedCode: `// SECURE: Validating MIME allowlist, binary magic bytes, and randomized storage keys
import crypto from 'node:crypto';
import path from 'node:path';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) cb(null, true);
    else cb(new Error('File type not allowed'));
  }
});`,
    detectionRule:
      'Detects multer/formidable configurations lacking limits.fileSize or strict fileFilter MIME validation.',
    verificationCmd: 'npm test -- --grep "zip-guard"',
  },
  {
    id: 'v06-mitm-tls',
    code: 'V06',
    cwe: 'CWE-319 / CWE-295',
    owasp: 'A02:2021 Cryptographic Failures',
    title: 'Man-in-the-Middle (MitM) & Insecure TLS',
    severity: 'High',
    description:
      'Disabling SSL/TLS certificate verification or issuing sensitive session cookies without Secure, HttpOnly, and SameSite protection flags.',
    vulnerableCode: `// VULNERABLE: Disabling SSL certificate validation
const agent = new https.Agent({
  rejectUnauthorized: false // Opens MitM vulnerabilities on public networks
});

res.cookie('token', jwtToken); // Missing Secure & HttpOnly flags`,
    fixedCode: `// SECURE: Validating trusted CA certificates & setting secure cookie flags
const agent = new https.Agent({
  rejectUnauthorized: true
});

res.cookie('token', jwtToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 3600 * 1000
});`,
    detectionRule:
      'Detects rejectUnauthorized: false expressions and res.cookie() calls lacking secure or httpOnly flags.',
    verificationCmd: 'npx @lankdev/shipsafe-cli scan .',
  },
  {
    id: 'v07-phishing-redirect',
    code: 'V07',
    cwe: 'CWE-601 / CWE-1021',
    owasp: 'A01:2021 Broken Access Control',
    title: 'Phishing, Open Redirect & Clickjacking',
    severity: 'Medium',
    description:
      'Query-parameter-based URL redirects without domain allowlists, and missing CSP/X-Frame-Options headers enabling Clickjacking iframe hijacking.',
    vulnerableCode: `// VULNERABLE: Open redirect to external unvalidated destination
app.get('/login-redirect', (req, res) => {
  const target = req.query.returnTo as string;
  res.redirect(target); // Attackers can route victims to phishing portals
});`,
    fixedCode: `// SECURE: Validating redirects to internal relative paths exclusively
app.get('/login-redirect', (req, res) => {
  const target = req.query.returnTo as string;
  const isSafeRelative = target?.startsWith('/') && !target.startsWith('//');
  res.redirect(isSafeRelative ? target : '/dashboard');
});`,
    detectionRule:
      'Detects res.redirect(req.query.*) calls lacking relative slash validation or domain allowlisting.',
    verificationCmd: 'npx @lankdev/shipsafe-cli scan .',
  },
  {
    id: 'v08-defacement-webroot',
    code: 'V08',
    cwe: 'CWE-73',
    owasp: 'A01:2021 Broken Access Control',
    title: 'Website Defacement & Insecure Webroot Write',
    severity: 'Critical',
    description:
      'Direct filesystem writes to public webroots enabling attackers to overwrite frontend assets (HTML, JS, CSS) and deface the application.',
    vulnerableCode: `// VULNERABLE: Writing user-supplied content directly into public static directory
const filePath = path.join(__dirname, 'public/assets', req.body.fileName);
fs.writeFileSync(filePath, req.body.content);`,
    fixedCode: `// SECURE: Use isolated cloud object storage (S3/R2) with presigned upload URLs
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const s3 = new S3Client({ region: 'auto' });
await s3.send(new PutObjectCommand({
  Bucket: 'my-private-bucket',
  Key: \`user-content/\${crypto.randomUUID()}.dat\`,
  Body: req.body.content
}));`,
    detectionRule:
      'Detects dynamic fs.writeFile calls targeting public, static, or dist subdirectories.',
    verificationCmd: 'npx @lankdev/shipsafe-cli scan .',
  },
  {
    id: 'v09-lfi-ssrf',
    code: 'V09',
    cwe: 'CWE-22 / CWE-918',
    owasp: 'A10:2021 Server-Side Request Forgery',
    title: 'LFI / RFI & Server-Side Request Forgery (SSRF)',
    severity: 'Critical',
    description:
      'Path traversal in filesystem reads (fs.readFile) and unconstrained fetch() calls to user-supplied URLs that can access cloud metadata services (169.254.169.254).',
    vulnerableCode: `// VULNERABLE: Server-side request to arbitrary URL & path traversal
app.get('/fetch-url', async (req, res) => {
  const response = await fetch(req.query.url as string); // SSRF
  res.send(await response.text());
});`,
    fixedCode: `// SECURE: URL allowlist validation and blocking private/internal IP ranges
import ipRangeCheck from 'ip-range-check';

const BLOCKED_RANGES = ['127.0.0.0/8', '10.0.0.0/8', '169.254.169.254/32'];

function isSafeUrl(rawUrl: string): boolean {
  const parsed = new URL(rawUrl);
  return parsed.protocol === 'https:' && !BLOCKED_RANGES.some(r => ipRangeCheck(parsed.hostname, r));
}`,
    detectionRule:
      'Detects dynamic fetch(), axios(), or http.get() calls lacking host validation or private IP filtering.',
    verificationCmd: 'npm test -- --grep "repo-importer"',
  },
  {
    id: 'v10-zeroday-prototype',
    code: 'V10',
    cwe: 'CWE-94 / CWE-1321',
    owasp: 'A03:2021 Injection',
    title: 'Zero-Day, Prototype Pollution & Unsafe Code',
    severity: 'Critical',
    description:
      'Dynamic code evaluation (eval, Function) and recursive object merges without proto/constructor property validation.',
    vulnerableCode: `// VULNERABLE: Dynamic eval() and unvalidated recursive object merge
function merge(target: any, source: any) {
  for (const key in source) {
    target[key] = source[key]; // Polusi Object.prototype via __proto__
  }
  return target;
}`,
    fixedCode: `// SECURE: Object.create(null) and filtering reserved prototype keys
function safeMerge(target: any, source: any) {
  for (const key of Object.keys(source)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }
    target[key] = source[key];
  }
  return target;
}`,
    detectionRule:
      'AST scanner flags eval(), new Function(), string-based setTimeout, and direct assignments to __proto__ properties.',
    verificationCmd: 'npx @lankdev/shipsafe-cli scan .',
  },
]

interface AgentSpec {
  id: string
  name: string
  configFile: string
  formatStyle: string
  description: string
  samplePrompt: string
}

const CODING_AGENTS_DATA: AgentSpec[] = [
  {
    id: 'cursor',
    name: 'Cursor',
    configFile: '.cursorrules / .cursor/rules',
    formatStyle: 'File-based directive with @file:line references and minimal diff',
    description:
      'Optimized for Cursor IDE with inline tags, precision line targeting, and step-by-step remediation instructions that preserve surrounding architecture.',
    samplePrompt: `@security-fix: Perbaiki celah SQL Injection di src/api/payment.ts baris 42.

Masalah:
- CWE-89: Parameter userId dikonkatenasikan langsung ke template literal query.

Instruksi:
1. Ganti query mentah menjadi parameterized query PostgreSQL ($1).
2. Add Zod schema validation to req.query.userId before the database query executes.
3. Ensure no unnecessary external dependencies are added.
4. Run npm test to verify functionality and regression safety.`,
  },
  {
    id: 'claude-code',
    name: 'Claude Code',
    configFile: 'CLAUDE.md',
    formatStyle: 'High-focus CLI task with 4-stage execution protocol',
    description:
      'Optimized for Claude Code CLI terminal sessions, including automated bash verification commands and strict scope boundaries.',
    samplePrompt: `SHIPSAFE SECURITY TASK: Fix CWE-79 (XSS) vulnerability in src/components/Comment.tsx

PROTOKOL PERBAIKAN:
1. [DISCOVER] Baca file src/components/Comment.tsx dan temukan penggunaan dangerouslySetInnerHTML.
2. [PATCH] Use installed 'dompurify' library to sanitize input before rendering.
3. [VERIFY] Run 'npm run lint' and 'npm test' to ensure zero TypeScript regressions.
4. [REPORT] Report the minimal targeted diff executed.`,
  },
  {
    id: 'windsurf',
    name: 'Windsurf (Cascade)',
    configFile: '.windsurfrules',
    formatStyle: 'Flow-aware step instructions with invariant context preservation',
    description:
      'Formatted for Windsurf Cascade reasoning, preserving dependency file context.',
    samplePrompt: `Cascade, perbaiki masalah CWE-307 di src/security/auth-guard.ts:28:
- Replace plain string password comparison (===) with crypto.timingSafeEqual.
- Check both buffer lengths before calling timingSafeEqual to avoid length mismatch exceptions.
- Pertahankan fungsi interface publik tanpa mengubah signature.`,
  },
  {
    id: 'copilot',
    name: 'GitHub Copilot',
    configFile: '.github/copilot-instructions.md',
    formatStyle: 'Comment-driven inline refactoring with function contracts',
    description:
      'Designed for Copilot Chat in VS Code, presenting instructional comments before the remediation code.',
    samplePrompt: `// FIX (CWE-434): Validate file upload in avatar handler
// 1. Tambahkan validasi MIME type whitelist: image/jpeg, image/png, image/webp
// 2. Restrict maximum file size to 5MB
// 3. Simpan file dengan nama acak crypto.randomUUID()
// Implementasikan perbaikan di src/routes/upload.ts baris 15:`,
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    configFile: 'opencode.json',
    formatStyle: 'Deterministic command-oriented patch prompt',
    description:
      'Patch-oriented instruction format for open-source OpenCode CLI.',
    samplePrompt: `opencode patch src/api/redirect.ts:18 --issue=CWE-601
Replace res.redirect(req.query.url) with sanitized local relative URL (starting with '/' and not '//'). Fallback to '/dashboard'.`,
  },
  {
    id: 'hermes',
    name: 'Hermes Agent',
    configFile: 'hermes.yaml',
    formatStyle: 'Autonomous security triage schema',
    description:
      'Structured remediation instructions for Hermes reasoning models in automation pipelines.',
    samplePrompt: `[HERMES_SECURITY_ACTION]
Target: src/utils/evaluator.ts:12
CWE: CWE-94 (Code Injection)
Action: Remove eval() usage and replace with isolated JSON parser or safe AST interpreter.`,
  },
  {
    id: 'aider',
    name: 'Aider',
    configFile: '.aider.conf.yml',
    formatStyle: 'Chat-based git-commit oriented prompt',
    description:
      'Optimized for Aider CLI to automatically create atomic git commits with clean fix messages.',
    samplePrompt: `/add src/security/cors.ts
Fix permissive CORS vulnerability (origin: '*') by replacing it with a domain whitelist defined in process.env.CORS_ORIGIN. Commit fix with message: "security: fix permissive CORS origin policy (CWE-942)".`,
  },
  {
    id: 'cline',
    name: 'Cline',
    configFile: '.clinerules',
    formatStyle: 'Autonomous tool-use execution prompt',
    description:
      'Tailored for Cline VS Code extension with sequential tool-call instructions.',
    samplePrompt: `Use file_read on src/routes/download.ts to inspect path traversal at line 34. Then use replace_in_file to add path.normalize and ensure the path resolves safely within ROOT_DIR.`,
  },
  {
    id: 'roo-code',
    name: 'Roo Code',
    configFile: '.roomodes',
    formatStyle: 'Mode-targeted code remediation prompt',
    description:
      'Formatted for Roo Code Architect/Code mode with strict blast-radius constraints.',
    samplePrompt: `MODE: Code
TASK: Remediate CWE-319 finding in src/server.ts:55.
Aktifkan konfigurasi cookie secure: true dan sameSite: 'lax'. Jangan modifikasi middleware sesi lain.`,
  },
  {
    id: 'continue',
    name: 'Continue.dev',
    configFile: '.continue/config.json',
    formatStyle: 'Inline snippet replacement pattern',
    description:
      'Designed for Continue VS Code/JetBrains extension with diff context highlighting.',
    samplePrompt: `Refactor blok kode di src/db/connection.ts baris 10-18:
Cegah hardcoded connection string database. Muat string koneksi secara eksklusif dari environment variable process.env.DATABASE_URL.`,
  },
]

interface ErrorGuide {
  code: string
  httpStatus: number
  cause: string
  solution: string
  impact: string
}

const ERROR_GUIDES_DATA: ErrorGuide[] = [
  {
    code: 'too_large / LIMIT_FILE_SIZE',
    httpStatus: 413,
    cause:
      'Uploaded ZIP archive exceeds the active tier limit (Free: 10 MB, Pro: 100 MB, Enterprise: Custom up to 500 MB+).',
    solution:
      'Ensure dependency and build directories (node_modules/, .git/, dist/, .next/, build/) are excluded prior to creating the ZIP archive. Run: zip -r project.zip . -x "node_modules/*" ".git/*".',
    impact: 'Rejected immediately at memory buffer layer before extraction; does not consume monthly audit quota.',
  },
  {
    code: 'quota_exceeded',
    httpStatus: 403,
    cause:
      'Monthly audit quota for your account has been exhausted (Free tier: 3 audits per calendar month).',
    solution:
      'Quota automatically resets on the 1st of the next calendar month. Alternatively, upgrade to Pro (50 audits/mo for Rp 79,000) via Pricing in the console.',
    impact: 'New audit submissions are blocked until the next quota cycle or upon active Pro upgrade.',
  },
  {
    code: 'unsafe_archive / zip_slip',
    httpStatus: 422,
    cause:
      'ZIP archive suspected of containing path traversal attack (Zip-Slip) with path names containing "../", absolute root "/", or Windows drive "C:\\".',
    solution:
      'Compress project from within root directory using clean relative paths without symbolic links outside the project repository.',
    impact: 'Ekstraksi dibatalkan seketika dan folder sandbox temporary /tmp/shipsafe-* langsung dihapus permanen.',
  },
  {
    code: 'unsafe_archive / zip_bomb',
    httpStatus: 422,
    cause:
      'Rasio dekompresi melebihi batas toleransi 100:1 atau total ukuran hasil ekstraksi melebihi 100 MB.',
    solution:
      'Check for oversized log files (*.log), SQLite database dumps (data.db), or recursive directories before compressing.',
    impact: 'Ekstraksi segera dihentikan demi menjaga integritas RAM dan kestabilan server VPS.',
  },
  {
    code: 'not_zip / magic_bytes_mismatch',
    httpStatus: 400,
    cause:
      'Uploaded file is not a valid ZIP archive (magic bytes mismatch, expected PK\\x03\\x04 / 50 4B 03 04) or archive was corrupted during network transmission.',
    solution:
      'Ensure you compress files using a standard OS zip utility, rather than manually renaming .tar.gz or .rar to .zip.',
    impact: 'File is rejected immediately at preliminary validation before worker sandbox allocation.',
  },
  {
    code: 'captcha_failed',
    httpStatus: 403,
    cause:
      'Token verifikasi Cloudflare Turnstile kedaluwarsa (> 300 detik), tidak valid, atau domain challenges.cloudflare.com terblokir ekstensi peramban.',
    solution:
      'Muat ulang halaman audit di browser atau selesaikan interaksi Turnstile. Di lingkungan development lokal, klik tombol Verifikasi Mandiri & Jalankan Ulang.',
    impact: 'Permintaan audit dihentikan demi mencegah serangan automated bot dan brute force antrean.',
  },
  {
    code: 'queue_full',
    httpStatus: 429,
    cause:
      'Antrean pemrosesan FIFO di VPS CentOS 9 sedang penuh (mencapai batas maksimal 25 antrean serentak terisi).',
    solution:
      'System will automatically retry in 15-30 seconds with countdown timer. Pro and Enterprise accounts receive immediate priority dispatch.',
    impact: 'Request temporarily deferred with Retry-After header until engine sandbox workers complete active tasks.',
  },
  {
    code: 'queue_timeout',
    httpStatus: 504,
    cause:
      'AST scan and AI evaluation exceeded the maximum system execution timeout (120 seconds per ZIP).',
    solution:
      'Exclude large binary assets, videos, minified bundles (*.min.js), and database binaries so scanning targets application source code exclusively.',
    impact: 'Worker invokes cleanupTempDir() to wipe sandbox directories and terminate the job safely.',
  },
  {
    code: 'invalid_repo_url',
    httpStatus: 400,
    cause:
      'Invalid GitHub repository URL. Supported formats are "owner/repo" or "https://github.com/owner/repo".',
    solution:
      'Verify the public GitHub repository URL, ensuring it contains no whitespace or sensitive credentials.',
    impact: 'Request is rejected prior to invoking the GitHub REST API.',
  },
  {
    code: 'repo_not_found',
    httpStatus: 404,
    cause:
      'GitHub repository was not found or is set to Private without authentication.',
    solution:
      'Ensure the repository is Public and the organization and repository names are spelled correctly.',
    impact: 'Zipball download was rejected by the GitHub API.',
  },
  {
    code: 'cors_not_allowed',
    httpStatus: 403,
    cause:
      'Request origin is not listed on the official ShipSafe API CORS whitelist.',
    solution:
      'Use the official web client at https://shipsafe.lankdev.my.id or localhost:5173 for local development.',
    impact: 'Request is blocked immediately by the CORS security guard middleware.',
  },
]

// -----------------------------------------------------------------------------
// MAIN COMPONENT: INTERACTIVE & PAGINATED DOCUMENTATION
// -----------------------------------------------------------------------------

export const DocumentationPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '')
      if (['overview', 'threat-vectors', 'usage', 'prompts', 'mcp', 'cli', 'troubleshoot'].includes(hash)) {
        return hash
      }
    }
    return 'overview'
  })

  // State for interactive features
  const [selectedVector, setSelectedVector] = useState<string>('v01-sqli')
  const [selectedAgent, setSelectedAgent] = useState<string>('cursor')
  const [selectedMcpClient, setSelectedMcpClient] = useState<'claude' | 'cursor' | 'windsurf'>('claude')
  const [selectedMcpTool, setSelectedMcpTool] = useState<string>('audit_codebase')
  const [cliFormat, setCliFormat] = useState<'text' | 'json' | 'sarif'>('text')
  const [errorSearchQuery, setErrorSearchQuery] = useState<string>('')
  const [expandedError, setExpandedError] = useState<string | null>('too_large / LIMIT_FILE_SIZE')
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null)

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedSnippet(id)
      setTimeout(() => setCopiedSnippet(null), 2000)
    })
  }

  const sections = [
    { id: 'overview', title: '1. Overview & Architecture', icon: Shield },
    { id: 'threat-vectors', title: '2. 10 Threat Vectors Matrix', icon: AlertTriangle },
    { id: 'usage', title: '3. Ingestion & Usage', icon: FileCode },
    { id: 'prompts', title: '4. Coding Agents & Prompts', icon: Layers },
    { id: 'mcp', title: '5. ShipSafe MCP Server', icon: Cpu },
    { id: 'cli', title: '6. Terminal CLI Gatekeeper', icon: Terminal },
    { id: 'troubleshoot', title: '7. Troubleshooting Guide', icon: HelpCircle },
  ]

  // Listen to hash changes in URL
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '')
      if (['overview', 'threat-vectors', 'usage', 'prompts', 'mcp', 'cli', 'troubleshoot'].includes(hash)) {
        setActiveSection(hash)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const handleSelectPage = (id: string) => {
    setActiveSection(id)
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', `#${id}`)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const currentIndex = sections.findIndex((s) => s.id === activeSection)
  const safeIndex = currentIndex >= 0 ? currentIndex : 0
  const currentSection = sections[safeIndex] || { id: 'overview', title: '1. Overview & Architecture', icon: Shield }
  const prevSection = safeIndex > 0 ? sections[safeIndex - 1] : null
  const nextSection = safeIndex < sections.length - 1 ? sections[safeIndex + 1] : null

  // Active threat vector object
  const currentVectorDetail =
    THREAT_VECTORS_DATA.find((v) => v.id === selectedVector) || THREAT_VECTORS_DATA[0]!

  // Active coding agent object
  const currentAgentDetail =
    CODING_AGENTS_DATA.find((a) => a.id === selectedAgent) || CODING_AGENTS_DATA[0]!

  // Filtered error list
  const filteredErrors = ERROR_GUIDES_DATA.filter(
    (e) =>
      e.code.toLowerCase().includes(errorSearchQuery.toLowerCase()) ||
      e.cause.toLowerCase().includes(errorSearchQuery.toLowerCase()) ||
      e.solution.toLowerCase().includes(errorSearchQuery.toLowerCase())
  )

  return (
    <div className="w-full bg-canvas text-ink min-h-screen">
      {/* Compact Top Header Banner */}
      <div className="border-b border-rule bg-surface/30 px-4 sm:px-6 md:px-8 xl:px-12 py-2 sm:py-2.5">
        <div className="max-w-[105rem] mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <BookOpen className="size-3.5 text-ink-2 shrink-0" strokeWidth={1.5} />
            <span className="text-[11px] font-mono text-ink-3 uppercase tracking-wider shrink-0">
              Official Documentation
            </span>
            <span className="text-ink-3 text-xs">/</span>
            <h1 className="text-xs sm:text-sm font-semibold tracking-tight text-ink font-sans truncate">
              ShipSafe Developer &amp; Security Engineering Manual
            </h1>
          </div>
          <p className="text-[11px] text-ink-3 font-sans truncate max-w-xl hidden lg:block">
            Zero-persistence specification, 10 CWE/OWASP threat vectors, agent prompt simulator, MCP &amp; CLI.
          </p>
        </div>
      </div>

      <div className="max-w-[105rem] mx-auto px-4 sm:px-6 md:px-8 xl:px-12 py-5 sm:py-6 flex flex-col lg:flex-row gap-6 xl:gap-8 items-start">
        {/* On-Page Sticky Table of Contents (Pages List) */}
        <aside className="w-full lg:w-80 xl:w-84 shrink-0 lg:sticky lg:top-[calc(var(--rail-h,3.5rem)+1.5rem)] max-h-[calc(100dvh-var(--rail-h,3.5rem)-3rem)] overflow-y-auto custom-scrollbar border border-rule bg-surface/50 p-4 rounded-none font-mono">
          <div className="flex items-center justify-between mb-3 border-b border-rule pb-2">
            <p className="text-xs uppercase tracking-wider font-bold text-ink-3">
              Table of Contents
            </p>
            <span className="text-[10px] text-ink-3">
              {safeIndex + 1} / {sections.length}
            </span>
          </div>
          <nav className="flex flex-col space-y-1">
            {sections.map((sec, idx) => {
              const Icon = sec.icon
              const isActive = activeSection === sec.id
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => handleSelectPage(sec.id)}
                  className={`flex items-center justify-between px-2.5 py-2 text-xs font-medium rounded-none text-left transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-ink text-canvas font-semibold shadow-xs'
                      : 'text-ink-2 hover:text-ink hover:bg-surface'
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <Icon className="size-3.5 shrink-0" strokeWidth={1.5} />
                    <span className="truncate">{sec.title}</span>
                  </span>
                  {isActive ? (
                    <ChevronRight className="size-3 shrink-0 ml-1" />
                  ) : (
                    <span className="text-[10px] text-ink-3 shrink-0">{idx + 1}</span>
                  )}
                </button>
              )
            })}
          </nav>
        </aside>

        {/* Paginated Content Area: Renders Current Section with High Interactivity */}
        <div className="flex-1 min-w-0 space-y-8 pb-20 text-sm leading-relaxed text-ink-2 font-sans animate-fade-in">
          {/* Breadcrumb Top Bar */}
          <div className="flex items-center justify-between border-b border-rule pb-3 font-mono text-xs text-ink-3">
            <div className="flex items-center gap-2">
              <span>Documentation</span>
              <span>/</span>
              <span className="text-ink font-semibold">{currentSection.title}</span>
            </div>
            <span>{safeIndex + 1} of {sections.length}</span>
          </div>

          {/* ========================================================================= */}
          {/* CHAPTER 1: OVERVIEW & ZERO-PERSISTENCE ARCHITECTURE */}
          {/* ========================================================================= */}
          {activeSection === 'overview' && (
            <section className="space-y-6">
              <div className="border-b border-rule pb-3">
                <h2 className="text-2xl font-bold text-ink flex items-center gap-2.5">
                  <Shield className="size-6 text-ink shrink-0" strokeWidth={1.5} />
                  <span>1. Overview &amp; Zero-Persistence Architecture</span>
                </h2>
                <p className="text-xs text-ink-3 font-mono mt-1">
                  Static security audit architecture, ephemeral memory wipe guarantee, and zero-persistence codebase isolation.
                </p>
              </div>

              <p>
                <strong>ShipSafe</strong> is an automated <em>pre-deployment security auditor</em> for modern web applications and vibe-coded projects. Built specifically to eliminate vulnerabilities before shipping to production or pushing to public repositories.
              </p>

              {/* Interactive Lifecycle Simulator */}
              <div className="border border-rule bg-surface p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-rule pb-2">
                  <h3 className="font-bold text-ink text-xs uppercase font-mono tracking-wider flex items-center gap-2">
                    <Zap className="size-4" />
                    <span>Audit Execution Lifecycle (Zero-Persistence)</span>
                  </h3>
                  <span className="text-[10px] font-mono text-ink-3">Phases 1 to 5</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5 font-mono text-xs">
                  <div className="border border-rule bg-canvas p-3 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-ink-3 block">01. INGESTION</span>
                      <strong className="text-ink block mt-1">Magic Bytes Check</strong>
                    </div>
                    <p className="text-[11px] text-ink-2 font-sans mt-2">
                      Binary header validated against <code>PK\x03\x04</code> magic bytes. Malformed files rejected immediately.
                    </p>
                  </div>

                  <div className="border border-rule bg-canvas p-3 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-ink-3 block">02. EXTRACTION</span>
                      <strong className="text-ink block mt-1">Isolated Sandbox</strong>
                    </div>
                    <p className="text-[11px] text-ink-2 font-sans mt-2">
                      ZIP extracted to <code>/tmp/shipsafe-[uuid]</code> with Zip-Slip &amp; Zip-Bomb guards.
                    </p>
                  </div>

                  <div className="border border-rule bg-canvas p-3 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-ink-3 block">03. SAST SCAN</span>
                      <strong className="text-ink block mt-1">AST Analysis</strong>
                    </div>
                    <p className="text-[11px] text-ink-2 font-sans mt-2">
                      Parsing statis murni tanpa pernah menjalankan <code>npm install</code> atau mengeksekusi kode.
                    </p>
                  </div>

                  <div className="border border-rule bg-canvas p-3 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-ink-3 block">04. REDACTION</span>
                      <strong className="text-ink block mt-1">Secret Masking</strong>
                    </div>
                    <p className="text-[11px] text-ink-2 font-sans mt-2">
                      Kredensial otomatis disensor permanen (<code>prefix 4 karakter + ****</code>).
                    </p>
                  </div>

                  <div className="border border-ink bg-canvas p-3 flex flex-col justify-between ring-1 ring-ink">
                    <div>
                      <span className="text-[10px] text-ink block font-bold">05. WIPE OUT</span>
                      <strong className="text-ink block mt-1">Immediate Delete</strong>
                    </div>
                    <p className="text-[11px] text-ink-2 font-sans mt-2">
                      Folder temp dimusnahkan seketika dalam blok <code>finally &#123; cleanupTempDir() &#125;</code>.
                    </p>
                  </div>
                </div>
              </div>

              {/* Core Workflow: Ketemu Masalah -> Analisa -> Prompt & Laporan Sesuai */}
              <div className="border border-rule bg-surface p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-rule pb-2">
                  <h3 className="font-bold text-ink text-xs uppercase font-mono tracking-wider flex items-center gap-2">
                    <Shield className="size-4" />
                    <span>Alur Kerja Inti: Ketemu Masalah &rarr; Analisa &rarr; Berikan Prompt &amp; Laporan Sesuai</span>
                  </h3>
                  <span className="text-[10px] font-mono text-ink-3">Zero-Hallucination Pipeline</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
                  <div className="border border-rule bg-canvas p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-ink-3 uppercase font-bold tracking-wider">Tahap 1</span>
                      <span className="text-[10px] px-1.5 py-0.5 border border-rule bg-surface text-ink">DETEKSI</span>
                    </div>
                    <strong className="text-ink text-sm font-sans block">Ketemu Masalah</strong>
                    <p className="text-ink-2 font-sans text-xs leading-relaxed">
                      Scanner AST dan regex rules memindai kode dalam sandbox isolasi. Begitu pola rentan ditemukan (misal: query template literal tanpa parameter atau unescaped markup), sistem langsung mengisolasi koordinat presisi: nama file, nomor baris, dan cuplikan kode mentah.
                    </p>
                    <div className="text-[11px] text-ink-3 pt-1 border-t border-rule font-mono">
                      Output: <code>location: &#123; file, line, snippet &#125;</code>
                    </div>
                  </div>

                  <div className="border border-rule bg-canvas p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-ink-3 uppercase font-bold tracking-wider">Tahap 2</span>
                      <span className="text-[10px] px-1.5 py-0.5 border border-rule bg-surface text-ink">ANALISIS</span>
                    </div>
                    <strong className="text-ink text-sm font-sans block">Analisa Mendalam</strong>
                    <p className="text-ink-2 font-sans text-xs leading-relaxed">
                      The system maps findings to industry compliance standards (CWE and OWASP Top 10). The engine objectively details the root cause (<em>What</em>), why it is dangerous (<em>Why</em>), and severity levels (Critical, High, Medium) with concrete evidence and zero hallucinations.
                    </p>
                    <div className="text-[11px] text-ink-3 pt-1 border-t border-rule font-mono">
                      Output: <code>cwe, owasp, severity, what, why</code>
                    </div>
                  </div>

                  <div className="border border-rule bg-canvas p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-ink-3 uppercase font-bold tracking-wider">Tahap 3</span>
                      <span className="text-[10px] px-1.5 py-0.5 border border-rule bg-surface text-ink">REMEDIASI</span>
                    </div>
                    <strong className="text-ink text-sm font-sans block">Prompt &amp; Laporan Sesuai</strong>
                    <p className="text-ink-2 font-sans text-xs leading-relaxed">
                      Formulates safe remediation steps with local self-verification commands (<em>Verification Command</em>). Generates 1-Click Remediation Prompts tailored to your chosen AI coding agent (Cursor, Claude Code, Copilot, Windsurf) alongside multi-format exports (PDF, Markdown, SARIF, JSON).
                    </p>
                    <div className="text-[11px] text-ink-3 pt-1 border-t border-rule font-mono">
                      Output: <code>recommendedFix, verifyWith, prompt, report</code>
                    </div>
                  </div>
                </div>
              </div>

              {/* Technical Limits Matrix */}
              <div className="space-y-3">
                <h3 className="font-bold text-ink text-sm font-mono uppercase tracking-wider">
                  Parameter Proteksi &amp; Batasan Teknis
                </h3>
                <div className="overflow-x-auto border border-rule">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-surface border-b border-rule text-ink">
                      <tr>
                        <th className="p-3">Parameter Proteksi</th>
                        <th className="p-3">Batas Teknis</th>
                        <th className="p-3">Fungsi Validasi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rule font-sans">
                      <tr>
                        <td className="p-3 font-mono font-semibold text-ink">Magic Bytes Validation</td>
                        <td className="p-3">Header biner wajib <code>50 4B 03 04</code> (PK\x03\x04)</td>
                        <td className="p-3 font-mono text-[11px]">checkZipMagicBytes(buffer)</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono font-semibold text-ink">Batas Ukuran Upload ZIP</td>
                        <td className="p-3">Free: 10 MB / Pro: 100 MB / Enterprise: Kustom (500 MB+)</td>
                        <td className="p-3 font-mono text-[11px]">MAX_ZIP_BYTES</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono font-semibold text-ink">Batas Dekompresi (Zip-Bomb)</td>
                        <td className="p-3">Maksimal 100 MB hasil ekstraksi disk</td>
                        <td className="p-3 font-mono text-[11px]">MAX_DECOMPRESSED_BYTES</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono font-semibold text-ink">Maximum Compression Ratio</td>
                        <td className="p-3">Maksimal rasio 100:1 (menangkal bom arsip rekursif)</td>
                        <td className="p-3 font-mono text-[11px]">MAX_COMPRESSION_RATIO = 100</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono font-semibold text-ink">Zip-Slip Traversal Guard</td>
                        <td className="p-3">Rejects files containing <code>..</code>, absolute root <code>/</code>, or Windows drive prefixes <code>C:\</code></td>
                        <td className="p-3 font-mono text-[11px]">validateAndExtractZip()</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* ========================================================================= */}
          {/* CHAPTER 2: 10 THREAT VECTORS (INTERACTIVE ANALYZER) */}
          {/* ========================================================================= */}
          {activeSection === 'threat-vectors' && (
            <section className="space-y-6">
              <div className="border-b border-rule pb-3">
                <h2 className="text-2xl font-bold text-ink flex items-center gap-2.5">
                  <AlertTriangle className="size-6 text-ink shrink-0" strokeWidth={1.5} />
                  <span>2. 10 Audited Threat Vectors Matrix</span>
                </h2>
                <p className="text-xs text-ink-3 font-mono mt-1">
                  Select a threat vector below to inspect vulnerable code examples, remediated secure code, and AST detection logic.
                </p>
              </div>

              {/* Interactive Vector Selector Chips */}
              <div className="flex flex-wrap gap-1.5 font-mono text-xs">
                {THREAT_VECTORS_DATA.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelectedVector(v.id)}
                    className={`px-3 py-1.5 border transition-colors cursor-pointer ${
                      selectedVector === v.id
                        ? 'border-ink bg-ink text-canvas font-bold'
                        : 'border-rule bg-surface text-ink-2 hover:text-ink hover:bg-raised'
                    }`}
                  >
                    <span>{v.code}: {v.title.split('(')[0]?.trim()}</span>
                  </button>
                ))}
              </div>

              {/* Vector Detail Card */}
              <div className="border border-rule bg-surface p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rule pb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-ink px-2 py-0.5 border border-rule bg-canvas">
                        {currentVectorDetail.code}
                      </span>
                      <span className="font-mono text-xs text-ink-3">
                        {currentVectorDetail.cwe} / {currentVectorDetail.owasp}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-ink">
                      {currentVectorDetail.title}
                    </h3>
                  </div>

                  <span
                    className={`font-mono text-xs px-2.5 py-1 border font-bold uppercase tracking-wider self-start sm:self-auto ${
                      currentVectorDetail.severity === 'Critical'
                        ? 'border-ink bg-ink text-canvas'
                        : 'border-rule bg-canvas text-ink'
                    }`}
                  >
                    Tingkat Risiko: {currentVectorDetail.severity}
                  </span>
                </div>

                <p className="text-xs text-ink-2 leading-relaxed">
                  {currentVectorDetail.description}
                </p>

                {/* Code Comparison (Before vs After) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 font-mono text-xs">
                  {/* Vulnerable Code */}
                  <div className="border border-rule bg-canvas p-4 space-y-2">
                    <div className="flex items-center justify-between text-ink border-b border-rule pb-2">
                      <span className="text-red-500 font-bold flex items-center gap-1.5">
                        <span className="size-2 rounded-none bg-red-500 inline-block" />
                        Kode Rentan (Terdeteksi Scanner)
                      </span>
                      <span className="text-[10px] text-ink-3">Vulnerable</span>
                    </div>
                    <pre className="text-ink overflow-x-auto py-2 leading-relaxed whitespace-pre-wrap">
                      {currentVectorDetail.vulnerableCode}
                    </pre>
                  </div>

                  {/* Fixed Code */}
                  <div className="border border-ink bg-canvas p-4 space-y-2">
                    <div className="flex items-center justify-between text-ink border-b border-rule pb-2">
                      <span className="font-bold flex items-center gap-1.5">
                        <Check className="size-3.5" strokeWidth={3} />
                        Kode Aman (Rekomendasi Perbaikan)
                      </span>
                      <span className="text-[10px] text-ink-3">Remediated</span>
                    </div>
                    <pre className="text-ink overflow-x-auto py-2 leading-relaxed whitespace-pre-wrap">
                      {currentVectorDetail.fixedCode}
                    </pre>
                  </div>
                </div>

                {/* Detection Logic & Verification Command */}
                <div className="border-t border-rule pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
                  <div>
                    <span className="text-[10px] text-ink-3 uppercase tracking-wider block font-semibold mb-1">
                      Logika Deteksi AST Engine:
                    </span>
                    <p className="text-xs text-ink-2 font-sans leading-relaxed">
                      {currentVectorDetail.detectionRule}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-ink-3 uppercase tracking-wider block font-semibold mb-1">
                      Self-Verification Command:
                    </span>
                    <div className="relative">
                      <pre className="bg-canvas p-2.5 border border-rule text-ink overflow-x-auto">
                        {currentVectorDetail.verificationCmd}
                      </pre>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(currentVectorDetail.verificationCmd, 'verify-cmd')}
                        className="absolute top-1.5 right-1.5 px-2 py-0.5 border border-rule bg-surface text-xs font-mono text-ink cursor-pointer hover:bg-canvas inline-flex items-center gap-1 active:scale-95 transition-all"
                      >
                        {copiedSnippet === 'verify-cmd' ? (
                          <>
                            <Check className="size-3 text-pass animate-micro-pop" />
                            <span className="font-bold">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="size-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ========================================================================= */}
          {/* CHAPTER 3: USAGE MODES & PRE-FLIGHT CHECKLIST */}
          {/* ========================================================================= */}
          {activeSection === 'usage' && (
            <section className="space-y-6">
              <div className="border-b border-rule pb-3">
                <h2 className="text-2xl font-bold text-ink flex items-center gap-2.5">
                  <FileCode className="size-6 text-ink shrink-0" strokeWidth={1.5} />
                  <span>3. Ingestion &amp; Codebase Input</span>
                </h2>
                <p className="text-xs text-ink-3 font-mono mt-1">
                  Comprehensive guide to all three submission methods: ZIP Archive Upload, GitHub Repository Import, and Demo Sample Presets.
                </p>
              </div>

              {/* 3 Methods Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border border-rule bg-surface p-5 space-y-3">
                  <span className="font-mono text-xs font-bold text-ink px-2 py-0.5 border border-rule bg-canvas inline-block">
                    METODE 1
                  </span>
                  <h3 className="font-bold text-ink text-base">Upload ZIP Archive</h3>
                  <p className="text-xs text-ink-2 leading-relaxed">
                    Compress your local project into a <code>.zip</code> archive. Drag and drop into the dropzone area on the <strong>Submission</strong> tab.
                  </p>
                  <ul className="text-xs space-y-1 font-mono text-ink-3 border-t border-rule pt-2">
                    <li>Free: Maksimal 10 MB</li>
                    <li>Pro: Maksimal 100 MB</li>
                    <li>Enterprise: Kustom hingga 500 MB+</li>
                  </ul>
                </div>

                <div className="border border-rule bg-surface p-5 space-y-3">
                  <span className="font-mono text-xs font-bold text-ink px-2 py-0.5 border border-rule bg-canvas inline-block">
                    METODE 2
                  </span>
                  <h3 className="font-bold text-ink text-base">GitHub Repo Ingestion</h3>
                  <p className="text-xs text-ink-2 leading-relaxed">
                    Select the <strong>GitHub Repo</strong> tab in the submission panel. Enter your public GitHub repository URL (e.g., <code>owner/repo</code>).
                  </p>
                  <p className="text-xs text-ink-3 font-mono border-t border-rule pt-2">
                    Backend ShipSafe mengunduh zipball resmi GitHub API dan memvalidasi integritas biner secara otomatis.
                  </p>
                </div>

                <div className="border border-rule bg-surface p-5 space-y-3">
                  <span className="font-mono text-xs font-bold text-ink px-2 py-0.5 border border-rule bg-canvas inline-block">
                    METODE 3
                  </span>
                  <h3 className="font-bold text-ink text-base">Preset Proyek Demo</h3>
                  <p className="text-xs text-ink-2 leading-relaxed">
                    Test audit capabilities instantly without uploading files using the <strong>Load sample</strong> dropdown in the toolbar.
                  </p>
                  <ul className="text-xs space-y-1 font-mono text-ink-3 border-t border-rule pt-2">
                    <li><strong>Ledgerline</strong>: Celah SQLi &amp; Secrets</li>
                    <li><strong>Waybill</strong>: CORS &amp; Rate Limit</li>
                    <li><strong>Harborlog</strong>: Astro Static Clean</li>
                  </ul>
                </div>
              </div>

              {/* Pre-flight Checklist Widget */}
              <div className="border border-rule bg-surface p-5 space-y-3">
                <h3 className="font-bold text-ink text-xs uppercase font-mono tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="size-4" />
                  <span>Checklist Sebelum Men-zip Proyek Lokal</span>
                </h3>
                <div className="space-y-2 text-xs font-mono text-ink-2">
                  <div className="flex items-start gap-2.5 p-2 bg-canvas border border-rule">
                    <Check className="size-3.5 text-ink shrink-0 mt-0.5" strokeWidth={2.5} />
                    <span>Hapus atau kecualikan folder <code>node_modules/</code>, <code>.git/</code>, dan <code>dist/</code> agar ukuran ZIP ringkas.</span>
                  </div>
                  <div className="flex items-start gap-2.5 p-2 bg-canvas border border-rule">
                    <Check className="size-3.5 text-ink shrink-0 mt-0.5" strokeWidth={2.5} />
                    <span>Ensure the archive is a genuine <code>.zip</code> file, not a renamed <code>.tar.gz</code> or <code>.rar</code> archive.</span>
                  </div>
                  <div className="flex items-start gap-2.5 p-2 bg-canvas border border-rule">
                    <Check className="size-3.5 text-ink shrink-0 mt-0.5" strokeWidth={2.5} />
                    <span>Jangan khawatir tentang file <code>.env</code> lokal: ShipSafe secara otomatis menyensor rahasia sebelum analisis.</span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ========================================================================= */}
          {/* CHAPTER 4: 10 CODING AGENTS & PROMPTS (INTERACTIVE SIMULATOR) */}
          {/* ========================================================================= */}
          {activeSection === 'prompts' && (
            <section className="space-y-6">
              <div className="border-b border-rule pb-3">
                <h2 className="text-2xl font-bold text-ink flex items-center gap-2.5">
                  <Layers className="size-6 text-ink shrink-0" strokeWidth={1.5} />
                  <span>4. 1-Click AI Remediation Prompts for 10 Coding Agents</span>
                </h2>
                <p className="text-xs text-ink-3 font-mono mt-1">
                  Select a coding agent below to view syntax characteristics, recommended configuration files, and instant remediation prompts.
                </p>
              </div>

              {/* Interactive Agent Selector Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono text-xs">
                {CODING_AGENTS_DATA.map((agent) => (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => setSelectedAgent(agent.id)}
                    className={`p-2.5 border transition-colors cursor-pointer text-center ${
                      selectedAgent === agent.id
                        ? 'border-ink bg-ink text-canvas font-bold shadow-xs'
                        : 'border-rule bg-surface text-ink-2 hover:text-ink hover:bg-raised'
                    }`}
                  >
                    <span>{agent.name}</span>
                  </button>
                ))}
              </div>

              {/* Agent Detail & Live Prompt Box */}
              <div className="border border-rule bg-surface p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rule pb-4">
                  <div>
                    <h3 className="text-xl font-bold text-ink">
                      Format Prompt: {currentAgentDetail.name}
                    </h3>
                    <p className="text-xs text-ink-2 mt-1">
                      {currentAgentDetail.description}
                    </p>
                  </div>
                  <div className="font-mono text-xs border border-rule bg-canvas px-3 py-1.5 shrink-0">
                    <span className="text-ink-3 block text-[10px] uppercase">File Konfigurasi:</span>
                    <strong className="text-ink">{currentAgentDetail.configFile}</strong>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase tracking-wider text-ink-3 font-semibold">
                      Ready-to-Paste Remediation Prompt ({currentAgentDetail.name}):
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(currentAgentDetail.samplePrompt, `agent-${currentAgentDetail.id}`)}
                      className="px-2.5 py-1 border border-rule bg-canvas hover:bg-surface text-xs font-mono text-ink flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedSnippet === `agent-${currentAgentDetail.id}` ? (
                        <>
                          <Check className="size-3" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-3" />
                          <span>Copy Prompt</span>
                        </>
                      )}
                    </button>
                  </div>

                  <pre className="p-4 bg-canvas border border-rule font-mono text-xs text-ink whitespace-pre-wrap leading-relaxed overflow-x-auto">
                    {currentAgentDetail.samplePrompt}
                  </pre>
                </div>
              </div>
            </section>
          )}

          {/* ========================================================================= */}
          {/* CHAPTER 5: MCP SERVER INTEGRATION (@lankdev/shipsafe-mcp) */}
          {/* ========================================================================= */}
          {activeSection === 'mcp' && (
            <section className="space-y-6">
              <div className="border-b border-rule pb-3">
                <h2 className="text-2xl font-bold text-ink flex items-center gap-2.5">
                  <Cpu className="size-6 text-ink shrink-0" strokeWidth={1.5} />
                  <span>5. Integrasi ShipSafe MCP Server (@lankdev/shipsafe-mcp)</span>
                </h2>
                <p className="text-xs text-ink-3 font-mono mt-1">
                  Model Context Protocol over stdio JSON-RPC 2.0 for automated security audits directly inside Cursor, Claude Desktop, and Windsurf.
                </p>
              </div>

              {/* Client Configuration Selector */}
              <div className="border border-rule bg-surface p-6 space-y-4 font-mono">
                <div className="flex items-center justify-between border-b border-rule pb-3">
                  <h3 className="font-bold text-ink text-xs uppercase tracking-wider">
                    Generator Konfigurasi Klien MCP
                  </h3>
                  <div className="flex items-center gap-1 text-xs">
                    {(['claude', 'cursor', 'windsurf'] as const).map((client) => (
                      <button
                        key={client}
                        type="button"
                        onClick={() => setSelectedMcpClient(client)}
                        className={`px-2.5 py-1 border transition-colors cursor-pointer capitalize ${
                          selectedMcpClient === client
                            ? 'border-ink bg-ink text-canvas font-semibold'
                            : 'border-rule bg-canvas text-ink-2 hover:text-ink'
                        }`}
                      >
                        {client}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-ink-2 font-sans">
                    {selectedMcpClient === 'claude'
                      ? 'Add the following configuration to claude_desktop_config.json (%APPDATA%\\Claude on Windows or ~/Library/Application Support/Claude on macOS):'
                      : selectedMcpClient === 'cursor'
                        ? 'Save the following configuration to .cursor/mcp.json at your project root:'
                        : 'Add to ~/.codeium/windsurf/mcp_config.json in your Windsurf installation:'}
                  </p>

                  <div className="relative">
                    <pre className="p-4 bg-canvas border border-rule text-xs text-ink overflow-x-auto leading-relaxed">
{selectedMcpClient === 'claude'
  ? `{
  "mcpServers": {
    "shipsafe": {
      "command": "npx",
      "args": ["-y", "@lankdev/shipsafe-mcp"]
    }
  }
}`
  : selectedMcpClient === 'cursor'
    ? `{
  "mcpServers": {
    "shipsafe": {
      "command": "npx",
      "args": ["-y", "@lankdev/shipsafe-mcp"]
    }
  }
}`
    : `{
  "mcpServers": {
    "shipsafe": {
      "command": "npx",
      "args": ["-y", "@lankdev/shipsafe-mcp"]
    }
  }
}`}
                    </pre>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          JSON.stringify(
                            {
                              mcpServers: {
                                shipsafe: { command: 'npx', args: ['-y', '@lankdev/shipsafe-mcp'] },
                              },
                            },
                            null,
                            2
                          ),
                          'mcp-cfg'
                        )
                      }
                      className="absolute top-3 right-3 p-1.5 border border-rule bg-surface hover:bg-canvas text-xs text-ink flex items-center gap-1 cursor-pointer"
                    >
                      {copiedSnippet === 'mcp-cfg' ? <Check className="size-3" /> : <Copy className="size-3" />}
                      <span>{copiedSnippet === 'mcp-cfg' ? 'Copied' : 'Copy JSON'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Interactive MCP Tools Inspector */}
              <div className="space-y-3 font-mono">
                <h3 className="font-bold text-ink text-xs uppercase tracking-wider">
                  4 Core Tools Provided by the MCP Server
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'audit_codebase', name: 'audit_codebase', desc: 'Scan local folder AST' },
                    { id: 'get_threat_matrix', name: 'get_threat_matrix', desc: '10 Vectors Status' },
                    { id: 'get_remediation_prompt', name: 'get_remediation_prompt', desc: 'Fetch AI Prompts' },
                    { id: 'verify_fix', name: 'verify_fix', desc: 'Verify git commit fixes' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedMcpTool(t.id)}
                      className={`p-3 border text-left transition-colors cursor-pointer ${
                        selectedMcpTool === t.id
                          ? 'border-ink bg-surface font-semibold ring-1 ring-ink'
                          : 'border-rule bg-canvas hover:bg-surface text-ink-2'
                      }`}
                    >
                      <strong className="text-xs text-ink block">{t.name}</strong>
                      <span className="text-[10px] text-ink-3 block mt-0.5">{t.desc}</span>
                    </button>
                  ))}
                </div>

                <div className="border border-rule bg-surface p-4 text-xs font-mono">
                  {selectedMcpTool === 'audit_codebase' && (
                    <div className="space-y-2">
                      <p className="text-ink font-bold">Tool: audit_codebase</p>
                      <p className="text-ink-2 font-sans text-xs">
                        Scans the local project directory against 10 critical threat vectors and returns structured findings.
                      </p>
                      <pre className="bg-canvas p-3 border border-rule text-ink overflow-x-auto text-[11px]">
{`// Schema Input:
{
  "path": "./src",              // Opsional (default: cwd)
  "targetAgent": "Cursor"      // Opsional (Generic | Cursor | ClaudeCode | Windsurf)
}`}
                      </pre>
                    </div>
                  )}

                  {selectedMcpTool === 'get_threat_matrix' && (
                    <div className="space-y-2">
                      <p className="text-ink font-bold">Tool: get_threat_matrix</p>
                      <p className="text-ink-2 font-sans text-xs">
                        Returns posture scores and compliance status (Secure, Warning, Vulnerable) across all 10 Threat Vectors.
                      </p>
                      <pre className="bg-canvas p-3 border border-rule text-ink overflow-x-auto text-[11px]">
{`// Schema Input:
{
  "path": "."                   // Direktori target audit
}`}
                      </pre>
                    </div>
                  )}

                  {selectedMcpTool === 'get_remediation_prompt' && (
                    <div className="space-y-2">
                      <p className="text-ink font-bold">Tool: get_remediation_prompt</p>
                      <p className="text-ink-2 font-sans text-xs">
                        Generates targeted, standalone AI remediation prompts for a specific finding ID.
                      </p>
                      <pre className="bg-canvas p-3 border border-rule text-ink overflow-x-auto text-[11px]">
{`// Schema Input:
{
  "findingId": "F-SEC-001-1",   // Wajib
  "targetAgent": "Cursor"       // Opsional
}`}
                      </pre>
                    </div>
                  )}

                  {selectedMcpTool === 'verify_fix' && (
                    <div className="space-y-2">
                      <p className="text-ink font-bold">Tool: verify_fix</p>
                      <p className="text-ink-2 font-sans text-xs">
                        Validates modified files and verifies vulnerabilities are resolved without introducing regressions.
                      </p>
                      <pre className="bg-canvas p-3 border border-rule text-ink overflow-x-auto text-[11px]">
{`// Schema Input:
{
  "filePath": "src/api/pay.ts", // Wajib
  "findingType": "SQL_INJECTION"// Wajib
}`}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* ========================================================================= */}
          {/* CHAPTER 6: TERMINAL CLI (@lankdev/shipsafe-cli) */}
          {/* ========================================================================= */}
          {activeSection === 'cli' && (
            <section className="space-y-6">
              <div className="border-b border-rule pb-3">
                <h2 className="text-2xl font-bold text-ink flex items-center gap-2.5">
                  <Terminal className="size-6 text-ink shrink-0" strokeWidth={1.5} />
                  <span>6. Terminal CLI (@lankdev/shipsafe-cli)</span>
                </h2>
                <p className="text-xs text-ink-3 font-mono mt-1">
                  Scan projects from terminal with a single command. Zero login, zero token, zero setup required.
                </p>
              </div>

              {/* 2. Audit Directory & Output Formats Card */}
              <div className="border border-rule bg-surface p-6 space-y-5 font-mono">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rule pb-3">
                  <div>
                    <h3 className="font-bold text-ink text-xs uppercase tracking-wider">
                      Audit Directory (Pemindaian Direktori)
                    </h3>
                    <p className="text-[11px] text-ink-3 font-sans mt-0.5">
                      Parses .gitignore automatically and outputs formatted Security Docket ASCII scorecard.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-ink-3 text-[11px]">Format:</span>
                    {(['text', 'json', 'sarif'] as const).map((fmt) => (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => setCliFormat(fmt)}
                        className={`px-2 py-0.5 border uppercase cursor-pointer ${
                          cliFormat === fmt
                            ? 'border-ink bg-ink text-canvas font-bold'
                            : 'border-rule bg-canvas text-ink-2 hover:text-ink'
                        }`}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-ink-2 font-sans">
                    Run this command at the root of your project directory:
                  </p>
                  <div className="relative">
                    <pre className="p-3.5 bg-canvas border border-rule text-xs text-ink overflow-x-auto">
{cliFormat === 'text'
  ? 'npx @lankdev/shipsafe-cli scan .'
  : cliFormat === 'json'
    ? 'npx @lankdev/shipsafe-cli scan . --format=json > shipsafe-report.json'
    : 'npx @lankdev/shipsafe-cli scan . --format=sarif > results.sarif'}
                    </pre>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          cliFormat === 'text'
                            ? 'npx @lankdev/shipsafe-cli scan .'
                            : cliFormat === 'json'
                              ? 'npx @lankdev/shipsafe-cli scan . --format=json > shipsafe-report.json'
                              : 'npx @lankdev/shipsafe-cli scan . --format=sarif > results.sarif',
                          'cli-cmd'
                        )
                      }
                      className="absolute top-2.5 right-2.5 px-2 py-0.5 border border-rule bg-surface hover:bg-canvas text-xs font-mono text-ink cursor-pointer inline-flex items-center gap-1 active:scale-95 transition-all"
                    >
                      {copiedSnippet === 'cli-cmd' ? (
                        <>
                          <Check className="size-3 text-pass animate-micro-pop" />
                          <span className="font-bold">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Additional Command Options */}
                <div className="pt-2 border-t border-rule grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="border border-rule bg-canvas p-3 space-y-1">
                    <span className="text-[10px] text-ink-3 uppercase block">CI Failure Threshold</span>
                    <code className="text-ink text-[11px] block">shipsafe scan . --fail-on=high</code>
                    <p className="text-[11px] text-ink-2 font-sans">
                      Returns exit code 1 if HIGH or CRITICAL vulnerabilities are found (default: high).
                    </p>
                  </div>
                </div>
              </div>

              {/* 3. Diff Verification Card */}
              <div className="border border-rule bg-surface p-6 space-y-3 font-mono">
                <h3 className="font-bold text-ink text-xs uppercase tracking-wider">
                  Diff Fix Verification (Before vs After)
                </h3>
                <p className="text-xs text-ink-2 font-sans leading-relaxed">
                  Compare two local project folder versions to validate whether remediations cleanly closed vulnerabilities without introducing regressions:
                </p>
                <div className="relative">
                  <pre className="p-3 bg-canvas border border-rule text-xs text-ink">
shipsafe diff ./before-fix ./after-fix
                  </pre>
                  <button
                    type="button"
                    onClick={() => copyToClipboard('shipsafe diff ./before-fix ./after-fix', 'cli-diff')}
                    className="absolute top-2 right-2 px-2 py-0.5 border border-rule bg-surface text-xs font-mono text-ink cursor-pointer hover:bg-canvas inline-flex items-center gap-1 active:scale-95 transition-all"
                  >
                    {copiedSnippet === 'cli-diff' ? (
                      <>
                        <Check className="size-3 text-pass animate-micro-pop" />
                        <span className="font-bold">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 6. CLI Exit Codes Specification */}
              <div className="border border-rule bg-surface p-6 space-y-3 font-mono">
                <h3 className="font-bold text-ink text-xs uppercase tracking-wider">
                  Exit Code Definitions
                </h3>
                <div className="overflow-x-auto border border-rule">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-canvas border-b border-rule text-ink">
                      <tr>
                        <th className="p-2.5">Exit Code</th>
                        <th className="p-2.5">Status</th>
                        <th className="p-2.5">Definition</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rule font-sans">
                      <tr>
                        <td className="p-2.5 font-mono font-bold text-ink">0</td>
                        <td className="p-2.5 font-mono text-ink">APPROVED_FOR_SHIP</td>
                        <td className="p-2.5 text-ink-2">No vulnerabilities detected above threshold (Release clean).</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-mono font-bold text-ink">1</td>
                        <td className="p-2.5 font-mono text-ink">REJECTED</td>
                        <td className="p-2.5 text-ink-2">Vulnerabilities detected at or above threshold (--fail-on). CI pipeline blocked.</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-mono font-bold text-ink">2</td>
                        <td className="p-2.5 font-mono text-ink">RUNTIME_ERROR</td>
                        <td className="p-2.5 text-ink-2">Kesalahan eksekusi (direktori target tidak ditemukan atau opsi tidak valid).</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* ========================================================================= */}
          {/* CHAPTER 7: TROUBLESHOOTING & ERROR RESOLUTION DICTIONARY */}
          {/* ========================================================================= */}
          {activeSection === 'troubleshoot' && (
            <section className="space-y-6">
              <div className="border-b border-rule pb-3">
                <h2 className="text-2xl font-bold text-ink flex items-center gap-2.5">
                  <HelpCircle className="size-6 text-ink shrink-0" strokeWidth={1.5} />
                  <span>7. Troubleshooting &amp; Error Resolution</span>
                </h2>
                <p className="text-xs text-ink-3 font-mono mt-1">
                  HTTP error dictionary, payload limits, and rapid resolution runbooks.
                </p>
              </div>

              {/* Problem Fixing Protocol: Ketemu Masalah -> Analisa -> Solusi Terverifikasi */}
              <div className="border border-rule bg-surface p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-rule pb-2">
                  <h3 className="font-bold text-ink text-xs uppercase font-mono tracking-wider flex items-center gap-2">
                    <HelpCircle className="size-4" />
                    <span>Metodologi Problem Fixing: Ketemu Masalah &rarr; Analisa &rarr; Solusi Terverifikasi</span>
                  </h3>
                  <span className="text-[10px] font-mono text-ink-3">Failure Diagnostics & Recovery</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
                  <div className="border border-rule bg-canvas p-3 space-y-1.5">
                    <span className="text-[10px] text-ink-3 font-bold block uppercase">01. Ketemu Masalah</span>
                    <strong className="text-ink font-sans block text-sm">Identifikasi Gejala &amp; Status</strong>
                    <p className="text-ink-2 font-sans text-xs leading-relaxed">
                      Inspect HTTP status codes and error messages in the ErrorPanel (e.g., <code>HTTP 413 too_large</code>, <code>HTTP 422 unsafe_archive</code>, or <code>HTTP 403 quota_exceeded</code>).
                    </p>
                  </div>

                  <div className="border border-rule bg-canvas p-3 space-y-1.5">
                    <span className="text-[10px] text-ink-3 font-bold block uppercase">02. Analisa Akar Masalah</span>
                    <strong className="text-ink font-sans block text-sm">Technical Root Cause</strong>
                    <p className="text-ink-2 font-sans text-xs leading-relaxed">
                      Rujuk kamus di bawah: apakah masalah berasal dari batas payload ZIP (folder build terbawa), batasan kuota akun, token Turnstile kedaluwarsa, atau antrean FIFO server sedang jenuh.
                    </p>
                  </div>

                  <div className="border border-rule bg-canvas p-3 space-y-1.5">
                    <span className="text-[10px] text-ink-3 font-bold block uppercase">03. Solusi Terverifikasi</span>
                    <strong className="text-ink font-sans block text-sm">Eksekusi Tindakan Mandiri</strong>
                    <p className="text-ink-2 font-sans text-xs leading-relaxed">
                      Jalankan perintah perbaikan di terminal lokal (misal mengecualikan <code>node_modules/</code>), lakukan bypass Turnstile di lingkungan dev, atau lakukan upgrade paket dari console jika kuota habis.
                    </p>
                  </div>
                </div>
              </div>

              {/* Interactive Search Bar for Error Codes */}
              <div className="relative font-mono">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-ink-3" />
                <input
                  type="text"
                  value={errorSearchQuery}
                  onChange={(e) => setErrorSearchQuery(e.target.value)}
                  placeholder="Search error codes (e.g. 413, quota_exceeded, captcha, zip_bomb)..."
                  aria-label="Search error codes and solutions"
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-surface border border-rule text-ink placeholder:text-ink-3 focus:border-ink focus:outline-none"
                />
              </div>

              {/* Expandable Error Code Accordion */}
              <div className="space-y-3 font-mono text-xs">
                {filteredErrors.length === 0 ? (
                  <div className="p-6 border border-rule bg-surface text-center text-ink-3">
                    No error codes matched "{errorSearchQuery}".
                  </div>
                ) : (
                  filteredErrors.map((err) => {
                    const isExpanded = expandedError === err.code
                    const detailId = `error-detail-${err.code.replace(/[^a-zA-Z0-9]/g, '-')}`
                    return (
                      <div
                        key={err.code}
                        className={`border transition-all ${
                          isExpanded ? 'border-ink bg-surface shadow-xs' : 'border-rule bg-canvas hover:border-ink-2'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setExpandedError(isExpanded ? null : err.code)}
                          aria-expanded={isExpanded}
                          aria-controls={detailId}
                          className="w-full p-4 flex items-center justify-between text-left cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="font-bold text-ink px-2 py-0.5 border border-rule bg-canvas text-[11px]">
                              HTTP {err.httpStatus}
                            </span>
                            <span className="font-bold text-ink">{err.code}</span>
                          </div>
                          <ChevronRight
                            className={`size-4 text-ink-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                          />
                        </button>

                        {isExpanded && (
                          <div id={detailId} className="px-4 pb-4 pt-1 border-t border-rule space-y-3 font-sans text-xs">
                            <div>
                              <strong className="text-ink font-mono text-[11px] block uppercase tracking-wide">
                                Cause:
                              </strong>
                              <p className="text-ink-2 mt-0.5 leading-relaxed">{err.cause}</p>
                            </div>
                            <div>
                              <strong className="text-ink font-mono text-[11px] block uppercase tracking-wide">
                                Recommended Solution:
                              </strong>
                              <p className="text-ink mt-0.5 leading-relaxed">{err.solution}</p>
                            </div>
                            <div>
                              <strong className="text-ink font-mono text-[11px] block uppercase tracking-wide">
                                System Impact:
                              </strong>
                              <p className="text-ink-3 mt-0.5 font-mono text-[11px]">{err.impact}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>

              {/* Emergency Contact Card */}
              <div className="border border-rule bg-surface p-6 font-mono text-xs space-y-3">
                <h3 className="font-bold text-ink text-sm font-sans">
                  Emergency Technical Support
                </h3>
                <p className="text-ink-2 font-sans leading-relaxed">
                  If you experience persistent pipeline failures or require custom architectural rules consultation:
                </p>
                <div className="flex flex-wrap gap-3 pt-1">
                  <a
                    href="https://wa.me/6282124153732?text=Halo%20Admin%20ShipSafe%2C%20saya%20butuh%20bantuan%20troubleshooting"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 bg-ink text-canvas font-semibold text-xs transition-colors hover:bg-ink-2"
                  >
                    <span>Contact Engineer via WhatsApp</span>
                    <ExternalLink className="size-3.5" />
                  </a>
                  <a
                    href="https://t.me/gilank_ramadhan"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 border border-rule bg-canvas text-ink font-semibold text-xs transition-colors hover:bg-surface"
                  >
                    <span>Telegram Gateway Support</span>
                    <ExternalLink className="size-3.5" />
                  </a>
                </div>
              </div>
            </section>
          )}

          {/* ========================================================================= */}
          {/* BOTTOM PAGINATION: PREVIOUS & NEXT NAVIGATION CARDS */}
          {/* ========================================================================= */}
          <div className="pt-8 border-t border-rule flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 font-mono">
            {prevSection ? (
              <button
                type="button"
                onClick={() => handleSelectPage(prevSection.id)}
                className="flex flex-col items-start p-4 border border-rule bg-surface hover:bg-raised text-left transition-colors cursor-pointer group rounded-none"
              >
                <span className="text-[10px] text-ink-3 uppercase tracking-wider flex items-center gap-1">
                  &larr; Previous Chapter
                </span>
                <span className="text-xs font-bold text-ink group-hover:underline mt-0.5">
                  {prevSection.title}
                </span>
              </button>
            ) : (
              <div />
            )}

            {nextSection ? (
              <button
                type="button"
                onClick={() => handleSelectPage(nextSection.id)}
                className="flex flex-col items-end p-4 border border-rule bg-surface hover:bg-raised text-right transition-colors cursor-pointer group rounded-none ml-auto"
              >
                <span className="text-[10px] text-ink-3 uppercase tracking-wider flex items-center gap-1">
                  Next Chapter &rarr;
                </span>
                <span className="text-xs font-bold text-ink group-hover:underline mt-0.5">
                  {nextSection.title}
                </span>
              </button>
            ) : (
              <div />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
