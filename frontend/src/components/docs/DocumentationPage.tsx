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
      'Terjadi saat input pengguna dikonkatenasikan atau dimasukkan via template literal langsung ke query basis data tanpa parameterized binding atau ORM abstraction.',
    vulnerableCode: `// VULNERABLE: Konkatenasi template literal mentah
const { userId } = req.query;
const result = await db.query(
  \`SELECT * FROM users WHERE id = '\${userId}'\`
);`,
    fixedCode: `// SECURE: Parameterized Query dengan placeholder
const { userId } = req.query;
const result = await db.query(
  'SELECT * FROM users WHERE id = $1',
  [userId]
);`,
    detectionRule:
      'AST regex memeriksa query template literal yang memanggil properti request (req.query, req.body, req.params) tanpa placeholder $1, ?, atau sanitasi ORM.',
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
      'Injeksi kode berbahaya ke antarmuka pengguna melalui manipulasi DOM tanpa sanitasi HTML, memungkinkan pencurian session cookie atau token otentikasi.',
    vulnerableCode: `// VULNERABLE: Rendering raw HTML tanpa sanitasi
export function CommentView({ comment }: { comment: string }) {
  return <div dangerouslySetInnerHTML={{ __html: comment }} />;
}`,
    fixedCode: `// SECURE: Sanitasi HTML via DOMPurify atau default React escaping
import DOMPurify from 'dompurify';

export function CommentView({ comment }: { comment: string }) {
  const cleanHtml = DOMPurify.sanitize(comment);
  return <div dangerouslySetInnerHTML={{ __html: cleanHtml }} />;
}`,
    detectionRule:
      'Mendeteksi panggilan dangerouslySetInnerHTML, innerHTML, document.write, dan v-html yang mengikat data dinamis tanpa sanitasi eksplisit.',
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
      'Ketiadaan rate limiting pada endpoint autentikasi publik serta penggunaan pola Regular Expression rentan catastrophic backtracking yang dapat membekukan event loop Node.js.',
    vulnerableCode: `// VULNERABLE: Endpoint login tanpa rate limiter & regex rentan
const EMAIL_REGEX = /^([a-zA-Z0-9_.-])+@(([a-zA-Z0-9-])+.)+([a-zA-Z0-9]{2,4})+$/;

app.post('/api/auth/login', async (req, res) => {
  // Tanpa throttling / limiter
  return handleLogin(req, res);
});`,
    fixedCode: `// SECURE: Global & Route-level Rate Limiter via express-rate-limit
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 5, // Maks 5 percobaan per IP
  message: { error: 'Terlalu banyak percobaan. Silakan coba 15 menit lagi.' }
});

app.post('/api/auth/login', loginLimiter, handleLogin);`,
    detectionRule:
      'Menganalisis pohon rute Express untuk mendeteksi endpoint POST/PUT/DELETE publik tanpa middleware rateLimit(), serta memeriksa kompleksitas struktur regex berpangkat ganda (O(2^n)).',
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
      'Perbandingan string rahasia/password menggunakan operator kesetaraan standar (===) yang membocorkan panjang dan karakter melalui perbedaan waktu respon CPU (timing channel).',
    vulnerableCode: `// VULNERABLE: String comparison rentan timing attack
function verifyApiKey(clientKey: string, secretKey: string): boolean {
  return clientKey === secretKey; // Waktu komparasi berbeda per karakter
}`,
    fixedCode: `// SECURE: Timing-safe buffer comparison via crypto
import crypto from 'node:crypto';

function verifyApiKey(clientKey: string, secretKey: string): boolean {
  const bufA = Buffer.from(clientKey);
  const bufB = Buffer.from(secretKey);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}`,
    detectionRule:
      'Mendeteksi komparasi operator token/secret key tanpa crypto.timingSafeEqual, dan algoritma hash usang (MD5, SHA1) untuk kredensial.',
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
      'Handler upload berkas yang tidak memvalidasi signature magic bytes biner dan ekstensi, memungkinkan penyerang mengunggah skrip berbahaya (misal: .php, .js, .sh) ke server.',
    vulnerableCode: `// VULNERABLE: Menyimpan file upload langsung dengan nama aslinya
const upload = multer({ dest: 'public/uploads/' });

app.post('/upload', upload.single('avatar'), (req, res) => {
  res.json({ url: \`/uploads/\${req.file.originalname}\` });
});`,
    fixedCode: `// SECURE: Validasi MIME whitelist, Magic Bytes, dan nama acak
import crypto from 'node:crypto';
import path from 'node:path';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Tipe berkas tidak diizinkan'));
  }
});`,
    detectionRule:
      'Mendeteksi multer/formidable tanpa konfigurasi limits.fileSize atau fileFilter MIME whitelist.',
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
      'Penonaktifan verifikasi sertifikat SSL/TLS atau pengiriman cookie sensitif tanpa flag keamanan HttpOnly, Secure, dan SameSite.',
    vulnerableCode: `// VULNERABLE: Mematikan verifikasi sertifikat SSL
const agent = new https.Agent({
  rejectUnauthorized: false // Membuka celah MitM di jaringan publik
});

res.cookie('token', jwtToken); // Tanpa flag Secure & HttpOnly`,
    fixedCode: `// SECURE: Validasi sertifikat CA resmi & cookie flags aman
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
      'Mendeteksi ekspresi literal rejectUnauthorized: false dan konfigurasi res.cookie() tanpa opsi secure/httpOnly.',
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
      'Pengalihan URL berbasis parameter query tanpa validasi whitelist domain, serta ketiadaan header CSP dan X-Frame-Options yang membuka risiko iframe hijacking.',
    vulnerableCode: `// VULNERABLE: Open redirect ke URL luar tanpa whitelist
app.get('/login-redirect', (req, res) => {
  const target = req.query.returnTo as string;
  res.redirect(target); // Penyerang dapat mengarahkan ke domain phishing
});`,
    fixedCode: `// SECURE: Validasi URL terhadap domain internal saja
app.get('/login-redirect', (req, res) => {
  const target = req.query.returnTo as string;
  const isSafeRelative = target?.startsWith('/') && !target.startsWith('//');
  res.redirect(isSafeRelative ? target : '/dashboard');
});`,
    detectionRule:
      'Mendeteksi pemanggilan res.redirect(req.query.*) tanpa sanitasi awalan slash atau domain whitelist.',
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
      'Penulisan berkas langsung ke direktori publik atau webroot yang memungkinkan modifikasi aset frontend (HTML, JS, CSS) oleh penyerang.',
    vulnerableCode: `// VULNERABLE: Menulis berkas ke folder publik statis
const filePath = path.join(__dirname, 'public/assets', req.body.fileName);
fs.writeFileSync(filePath, req.body.content);`,
    fixedCode: `// SECURE: Gunakan isolated cloud object storage (S3/R2) dengan presigned URL
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const s3 = new S3Client({ region: 'auto' });
await s3.send(new PutObjectCommand({
  Bucket: 'my-private-bucket',
  Key: \`user-content/\${crypto.randomUUID()}.dat\`,
  Body: req.body.content
}));`,
    detectionRule:
      'Mendeteksi pemanggilan fs.writeFile ke subdirektori publik, static, atau dist berbasis input dinamis.',
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
      'Path traversal pada fungsi baca berkas (fs.readFile) serta pemanggilan fetch() ke alamat URL pengguna yang dapat menembus metadata cloud internal (169.254.169.254).',
    vulnerableCode: `// VULNERABLE: SSRF ke IP internal & Path Traversal
app.get('/fetch-url', async (req, res) => {
  const response = await fetch(req.query.url as string); // SSRF
  res.send(await response.text());
});`,
    fixedCode: `// SECURE: Validasi URL whitelist dan blokir rentang IP privat
import ipRangeCheck from 'ip-range-check';

const BLOCKED_RANGES = ['127.0.0.0/8', '10.0.0.0/8', '169.254.169.254/32'];

function isSafeUrl(rawUrl: string): boolean {
  const parsed = new URL(rawUrl);
  return parsed.protocol === 'https:' && !BLOCKED_RANGES.some(r => ipRangeCheck(parsed.hostname, r));
}`,
    detectionRule:
      'Mendeteksi pemanggilan fetch(), axios(), atau http.get() dengan parameter dinamis tanpa validasi host atau IP filter.',
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
      'Penggunaan fungsi eksekusi kode dinamis (eval, new Function) dan penggabungan objek rekursif tanpa validasi kunci __proto__ atau constructor.',
    vulnerableCode: `// VULNERABLE: eval() dinamis & recursive merge rentan prototype pollution
function merge(target: any, source: any) {
  for (const key in source) {
    target[key] = source[key]; // Polusi Object.prototype via __proto__
  }
  return target;
}`,
    fixedCode: `// SECURE: Map murni Object.create(null) dan tolak reserved prototype keys
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
      'AST scanner menandai keberadaan eval(), new Function(), setTimeout dengan string, dan assign ke key __proto__.',
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
    formatStyle: 'File-based directive dengan referensi @file:line dan diff minimal',
    description:
      'Format teroptimasi untuk Cursor IDE dengan tag inline, target baris presisi, dan instruksi perbaikan bertahap tanpa mengubah arsitektur sekitarnya.',
    samplePrompt: `@security-fix: Perbaiki celah SQL Injection di src/api/payment.ts baris 42.

Masalah:
- CWE-89: Parameter userId dikonkatenasikan langsung ke template literal query.

Instruksi:
1. Ganti query mentah menjadi parameterized query PostgreSQL ($1).
2. Tambahkan validasi Zod schema pada req.query.userId sebelum query dijalankan.
3. Pastikan tidak ada dependensi eksternal baru yang ditambahkan.
4. Jalankan npm test untuk memverifikasi fungsionalitas.`,
  },
  {
    id: 'claude-code',
    name: 'Claude Code',
    configFile: 'CLAUDE.md',
    formatStyle: 'Tugas CLI berkonsentrasi tinggi dengan protokol eksekusi 4-tahap',
    description:
      'Dioptimalkan untuk Claude Code CLI di terminal, menyertakan panduan verifikasi bash otomatis dan batasan scope yang tegas.',
    samplePrompt: `TUGAS KEAMANAN SHIPSAFE: Perbaiki celah CWE-79 (XSS) di src/components/Comment.tsx

PROTOKOL PERBAIKAN:
1. [DISCOVER] Baca file src/components/Comment.tsx dan temukan penggunaan dangerouslySetInnerHTML.
2. [PATCH] Gunakan pustaka 'dompurify' yang sudah terpasang untuk membersihkan input sebelum di-render.
3. [VERIFY] Jalankan 'npm run lint' dan 'npm test' untuk memastikan tidak ada regresi tipe TypeScript.
4. [REPORT] Laporkan diff minimal yang dilakukan.`,
  },
  {
    id: 'windsurf',
    name: 'Windsurf (Cascade)',
    configFile: '.windsurfrules',
    formatStyle: 'Flow-aware step instructions dengan invariant context preservation',
    description:
      'Diformat untuk mesin penalaran Cascade di Windsurf, menjaga alur konteks file dependencies.',
    samplePrompt: `Cascade, perbaiki masalah CWE-307 di src/security/auth-guard.ts:28:
- Ganti perbandingan token password string biasa (===) dengan crypto.timingSafeEqual.
- Periksa panjang kedua buffer sebelum memanggil timingSafeEqual untuk menghindari exception length mismatch.
- Pertahankan fungsi interface publik tanpa mengubah signature.`,
  },
  {
    id: 'copilot',
    name: 'GitHub Copilot',
    configFile: '.github/copilot-instructions.md',
    formatStyle: 'Comment-driven inline refactoring dengan function contract',
    description:
      'Didesain untuk Copilot Chat di VS Code, menyajikan komentar instruksional sebelum blok kode perbaikan.',
    samplePrompt: `// FIX (CWE-434): Validasi upload file pada handler avatar
// 1. Tambahkan validasi MIME type whitelist: image/jpeg, image/png, image/webp
// 2. Batasi ukuran maksimal berkas ke 5MB
// 3. Simpan file dengan nama acak crypto.randomUUID()
// Implementasikan perbaikan di src/routes/upload.ts baris 15:`,
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    configFile: 'opencode.json',
    formatStyle: 'Deterministic command-oriented patch prompt',
    description:
      'Format instruksi berorientasi patch untuk OpenCode CLI open-source.',
    samplePrompt: `opencode patch src/api/redirect.ts:18 --issue=CWE-601
Ganti pemanggilan res.redirect(req.query.url) dengan sanitasi URL lokal (hanya URL yang diawali '/' dan bukan '//'). Kembalikan default ke '/dashboard'.`,
  },
  {
    id: 'hermes',
    name: 'Hermes Agent',
    configFile: 'hermes.yaml',
    formatStyle: 'Autonomous security triage schema',
    description:
      'Instruksi perbaikan terstruktur untuk model reasoning Hermes di pipeline otomatisasi.',
    samplePrompt: `[HERMES_SECURITY_ACTION]
Target: src/utils/evaluator.ts:12
CWE: CWE-94 (Code Injection)
Action: Hapus penggunaan eval() dan ganti dengan parser JSON terisolasi atau AST interpreter aman.`,
  },
  {
    id: 'aider',
    name: 'Aider',
    configFile: '.aider.conf.yml',
    formatStyle: 'Chat-based git-commit oriented prompt',
    description:
      'Diformat khusus untuk Aider CLI agar otomatis membuat commit git atomic dengan pesan perbaikan yang rapi.',
    samplePrompt: `/add src/security/cors.ts
Perbaiki celah CORS permissive (origin: '*') dengan menggantinya menjadi whitelist domain terdefinisi di process.env.CORS_ORIGIN. Komit perbaikan dengan pesan: "security: fix permissive CORS origin policy (CWE-942)".`,
  },
  {
    id: 'cline',
    name: 'Cline',
    configFile: '.clinerules',
    formatStyle: 'Autonomous tool-use execution prompt',
    description:
      'Disesuaikan untuk extension Cline di VS Code dengan instruksi tool-call bertahap.',
    samplePrompt: `Gunakan file_read pada src/routes/download.ts untuk memeriksa path traversal di baris 34. Kemudian gunakan replace_in_file untuk menambahkan path.normalize dan memastikan path berada di bawah direktori ROOT_DIR yang aman.`,
  },
  {
    id: 'roo-code',
    name: 'Roo Code',
    configFile: '.roomodes',
    formatStyle: 'Mode-targeted code remediation prompt',
    description:
      'Diformat untuk Roo Code Architect/Code mode dengan batasan blast-radius yang ketat.',
    samplePrompt: `MODE: Code
TUGAS: Remediasi temuan CWE-319 di src/server.ts:55.
Aktifkan konfigurasi cookie secure: true dan sameSite: 'lax'. Jangan modifikasi middleware sesi lain.`,
  },
  {
    id: 'continue',
    name: 'Continue.dev',
    configFile: '.continue/config.json',
    formatStyle: 'Inline snippet replacement pattern',
    description:
      'Didesain untuk Continue VS Code/JetBrains extension dengan highlight konteks diff.',
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
      'Ukuran berkas ZIP yang diunggah melebihi batas kuota paket aktif (Free: 10 MB, Pro: 100 MB, Enterprise: Kustom hingga 500 MB+).',
    solution:
      'Pastikan folder dependensi dan build (node_modules/, .git/, dist/, .next/, build/) telah dikeluarkan sebelum men-zip proyek. Gunakan perintah: zip -r project.zip . -x "node_modules/*" ".git/*".',
    impact: 'Upload ditolak seketika pada layer memory storage sebelum dekompresi, tidak memotong kuota audit bulanan.',
  },
  {
    code: 'quota_exceeded',
    httpStatus: 403,
    cause:
      'Kuota pemindaian bulanan akun Anda telah habis (Paket Free: 3x per bulan kalender).',
    solution:
      'Kuota akan otomatis direset pada tanggal 1 bulan kalender berikutnya. Atau, upgrade ke paket Pro (50x/bulan seharga Rp 79.000) melalui menu Pricing di sidebar console.',
    impact: 'Permintaan scan baru diblokir sampai siklus baru atau upgrade aktif.',
  },
  {
    code: 'unsafe_archive / zip_slip',
    httpStatus: 422,
    cause:
      'Arsip ZIP dicurigai mengandung serangan direktori traversal (Zip-Slip) dengan nama path berisi "../", root absolut "/", atau drive Windows "C:\\".',
    solution:
      'Kompres proyek dari dalam root folder menggunakan path relatif bersih, tanpa symbolic link ke berkas di luar repositori proyek.',
    impact: 'Ekstraksi dibatalkan seketika dan folder sandbox temporary /tmp/shipsafe-* langsung dihapus permanen.',
  },
  {
    code: 'unsafe_archive / zip_bomb',
    httpStatus: 422,
    cause:
      'Rasio dekompresi melebihi batas toleransi 100:1 atau total ukuran hasil ekstraksi melebihi 100 MB.',
    solution:
      'Periksa apakah ada berkas log gigabyte (*.log), dump database SQLite (data.db), atau berkas rekursif sebelum kompresi.',
    impact: 'Ekstraksi segera dihentikan demi menjaga integritas RAM dan kestabilan server VPS.',
  },
  {
    code: 'not_zip / magic_bytes_mismatch',
    httpStatus: 400,
    cause:
      'Berkas yang diunggah bukan format ZIP valid (magic bytes bukan PK\\x03\\x04 / 50 4B 03 04) atau arsip terkorupsi saat transmisi jaringan.',
    solution:
      'Pastikan Anda mengompres berkas menggunakan utilitas zip standar OS, bukan sekadar mengubah ekstensi .tar.gz atau .rar menjadi .zip secara manual.',
    impact: 'Berkas langsung ditolak di validasi awal sebelum dialokasikan ke antrean worker sandbox.',
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
      'Sistem akan otomatis me-retry dalam 15-30 detik dengan timer countdown. Akun Pro dan Enterprise otomatis mendapatkan prioritas dispatch lebih awal.',
    impact: 'Permintaan ditunda sementara dengan header Retry-After hingga worker sandbox menyelesaikan tugas sebelumnya.',
  },
  {
    code: 'queue_timeout',
    httpStatus: 504,
    cause:
      'Waktu pemindaian AST dan evaluasi AI melebihi batas toleransi maksimal sistem (120 detik per ZIP).',
    solution:
      'Kecualikan aset biner besar, video, file suara, minified library bundle (*.min.js), atau dataset SQLite agar pemindaian fokus pada kode sumber aplikasi.',
    impact: 'Worker memanggil cleanupTempDir() untuk menghapus direktori sandbox dan membatalkan pekerjaan.',
  },
  {
    code: 'invalid_repo_url',
    httpStatus: 400,
    cause:
      'Format URL repositori GitHub tidak valid. Format yang didukung adalah "owner/repo" atau "https://github.com/owner/repo".',
    solution:
      'Periksa kembali URL repositori GitHub publik yang Anda masukkan, pastikan tidak mengandung karakter spasi atau token rahasia.',
    impact: 'Permintaan dibatalkan sebelum memanggil GitHub REST API.',
  },
  {
    code: 'repo_not_found',
    httpStatus: 404,
    cause:
      'Repositori GitHub tidak ditemukan atau berstatus Private tanpa otentikasi token personal.',
    solution:
      'Pastikan repositori berstatus Public dan nama repositori maupun organisasi dieja dengan benar tanpa kesalahan ketik.',
    impact: 'Pengunduhan zipball dibatalkan oleh GitHub API.',
  },
  {
    code: 'cors_not_allowed',
    httpStatus: 403,
    cause:
      'Origin pengirim HTTP request tidak terdaftar dalam whitelist domain resmi ShipSafe API.',
    solution:
      'Gunakan aplikasi web resmi di https://shipsafe.lankdev.my.id atau localhost:5173 untuk development lokal.',
    impact: 'Request ditolak seketika oleh middleware CORS security guard.',
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
    { id: 'overview', title: '1. Overview & Arsitektur', icon: Shield },
    { id: 'threat-vectors', title: '2. 10 Threat Vectors', icon: AlertTriangle },
    { id: 'usage', title: '3. Cara Penggunaan', icon: FileCode },
    { id: 'prompts', title: '4. 10 Coding Agents & Prompts', icon: Layers },
    { id: 'mcp', title: '5. Integrasi MCP Server', icon: Cpu },
    { id: 'cli', title: '6. Terminal CLI', icon: Terminal },
    { id: 'troubleshoot', title: '7. Panduan Troubleshooting', icon: HelpCircle },
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
  const currentSection = sections[safeIndex] || { id: 'overview', title: '1. Overview & Arsitektur', icon: Shield }
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
              Dokumentasi Resmi
            </span>
            <span className="text-ink-3 text-xs">/</span>
            <h1 className="text-xs sm:text-sm font-semibold tracking-tight text-ink font-sans truncate">
              ShipSafe Developer &amp; Security Engineering Manual
            </h1>
          </div>
          <p className="text-[11px] text-ink-3 font-sans truncate max-w-xl hidden lg:block">
            Spesifikasi zero-persistence, 10 vektor ancaman CWE/OWASP, simulator prompt agents, MCP &amp; CLI.
          </p>
        </div>
      </div>

      <div className="max-w-[105rem] mx-auto px-4 sm:px-6 md:px-8 xl:px-12 py-5 sm:py-6 flex flex-col lg:flex-row gap-6 xl:gap-8 items-start">
        {/* On-Page Sticky Table of Contents (Pages List) */}
        <aside className="w-full lg:w-72 xl:w-80 shrink-0 lg:sticky lg:top-[calc(var(--rail-h,3.5rem)+1.5rem)] max-h-[calc(100dvh-var(--rail-h,3.5rem)-3rem)] overflow-y-auto custom-scrollbar border border-rule bg-surface/50 p-4 rounded-none font-mono">
          <div className="flex items-center justify-between mb-3 border-b border-rule pb-2">
            <p className="text-xs uppercase tracking-wider font-bold text-ink-3">
              Daftar Isi
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
              <span>Dokumentasi</span>
              <span>/</span>
              <span className="text-ink font-semibold">{currentSection.title}</span>
            </div>
            <span>{safeIndex + 1} dari {sections.length}</span>
          </div>

          {/* ========================================================================= */}
          {/* CHAPTER 1: OVERVIEW & ZERO-PERSISTENCE ARCHITECTURE */}
          {/* ========================================================================= */}
          {activeSection === 'overview' && (
            <section className="space-y-6">
              <div className="border-b border-rule pb-3">
                <h2 className="text-2xl font-bold text-ink flex items-center gap-2.5">
                  <Shield className="size-6 text-ink shrink-0" strokeWidth={1.5} />
                  <span>1. Overview &amp; Arsitektur Zero-Persistence</span>
                </h2>
                <p className="text-xs text-ink-3 font-mono mt-1">
                  Arsitektur audit statis, jaminan pemusnahan memori sementara, dan integritas isolasi kode sumber.
                </p>
              </div>

              <p>
                <strong>ShipSafe</strong> adalah <em>pre-deployment security auditor</em> untuk aplikasi web modern dan proyek vibe-coding. Dibangun khusus untuk memutus rantai kerentanan sebelum kode di-deploy ke production atau di-push ke repositori publik.
              </p>

              {/* Interactive Lifecycle Simulator */}
              <div className="border border-rule bg-surface p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-rule pb-2">
                  <h3 className="font-bold text-ink text-xs uppercase font-mono tracking-wider flex items-center gap-2">
                    <Zap className="size-4" />
                    <span>Siklus Eksekusi Audit (Zero-Persistence Lifecycle)</span>
                  </h3>
                  <span className="text-[10px] font-mono text-ink-3">Tahap 1 s/d 5</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5 font-mono text-xs">
                  <div className="border border-rule bg-canvas p-3 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-ink-3 block">01. INGESTION</span>
                      <strong className="text-ink block mt-1">Magic Bytes Check</strong>
                    </div>
                    <p className="text-[11px] text-ink-2 font-sans mt-2">
                      Header berkas biner divalidasi harus <code>PK\x03\x04</code>. File biner palsu langsung ditolak.
                    </p>
                  </div>

                  <div className="border border-rule bg-canvas p-3 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-ink-3 block">02. EXTRACTION</span>
                      <strong className="text-ink block mt-1">Isolated Sandbox</strong>
                    </div>
                    <p className="text-[11px] text-ink-2 font-sans mt-2">
                      ZIP diekstrak ke <code>/tmp/shipsafe-[uuid]</code> dengan Zip-Slip &amp; Zip-Bomb guard.
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
                      Sistem memetakan temuan ke standar kepatuhan industri (CWE dan OWASP Top 10 2021). Engine mengurai secara objektif apa penyebabnya (<em>What</em>), mengapa berbahaya (<em>Why</em>), dan tingkat keparahan risiko (Critical, High, Medium) dengan bukti konkret tanpa asumsi halusinasi.
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
                      Merumuskan langkah remediasi yang aman beserta perintah uji mandiri (<em>Verification Command</em>). Menghasilkan 1-Click Remediation Prompt yang di-format khusus sesuai agent yang dipakai (Cursor, Claude Code, Copilot, Windsurf) serta ekspor laporan multi-format (PDF, Markdown, SARIF, JSON).
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
                        <td className="p-3 font-mono font-semibold text-ink">Rasio Kompresi Maksimal</td>
                        <td className="p-3">Maksimal rasio 100:1 (menangkal bom arsip rekursif)</td>
                        <td className="p-3 font-mono text-[11px]">MAX_COMPRESSION_RATIO = 100</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono font-semibold text-ink">Zip-Slip Traversal Guard</td>
                        <td className="p-3">Menolak berkas dengan <code>..</code>, root absolut <code>/</code>, atau drive <code>C:\</code></td>
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
                  <span>2. Matriks 10 Threat Vectors Yang Diaudit</span>
                </h2>
                <p className="text-xs text-ink-3 font-mono mt-1">
                  Pilih salah satu vektor di bawah untuk memeriksa contoh kode rentan, kode aman yang diremediasi, dan logika deteksi AST.
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
                      Perintah Verifikasi Mandiri:
                    </span>
                    <div className="relative">
                      <pre className="bg-canvas p-2.5 border border-rule text-ink overflow-x-auto">
                        {currentVectorDetail.verificationCmd}
                      </pre>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(currentVectorDetail.verificationCmd, 'verify-cmd')}
                        className="absolute top-1.5 right-1.5 p-1 border border-rule bg-surface text-xs text-ink cursor-pointer hover:bg-canvas"
                      >
                        {copiedSnippet === 'verify-cmd' ? <Check className="size-3" /> : <Copy className="size-3" />}
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
                  <span>3. Cara Penggunaan (Input Codebase)</span>
                </h2>
                <p className="text-xs text-ink-3 font-mono mt-1">
                  Panduan lengkap tiga metode input proyek: Unggah Berkas ZIP, Ingestion Repositori GitHub, dan Preset Contoh.
                </p>
              </div>

              {/* 3 Methods Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border border-rule bg-surface p-5 space-y-3">
                  <span className="font-mono text-xs font-bold text-ink px-2 py-0.5 border border-rule bg-canvas inline-block">
                    METODE 1
                  </span>
                  <h3 className="font-bold text-ink text-base">Unggah Berkas ZIP</h3>
                  <p className="text-xs text-ink-2 leading-relaxed">
                    Kompres folder proyek lokal ke dalam berkas <code>.zip</code>. Seret dan lepas ke area dropzone pada tab <strong>Submission</strong>.
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
                    Pilih tab <strong>GitHub Repo</strong> pada panel submission. Masukkan URL repositori GitHub publik (misal: <code>owner/repo</code>).
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
                    Uji kapabilitas audit secara instan tanpa mengunggah berkas sendiri melalui dropdown <strong>Load sample</strong> di toolbar.
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
                    <span>Pastikan berkas berekstensi <code>.zip</code> murni, bukan hasil rename berkas <code>.tar.gz</code> atau <code>.rar</code>.</span>
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
                  <span>4. 1-Click AI Remediation Prompt untuk 10 Coding Agents</span>
                </h2>
                <p className="text-xs text-ink-3 font-mono mt-1">
                  Pilih coding agent di bawah untuk melihat karakteristik sintaks, file konfigurasi rekomendasi, dan contoh prompt perbaikan instan.
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
                      Contoh Remediation Prompt Siap Tempel ({currentAgentDetail.name}):
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(currentAgentDetail.samplePrompt, `agent-${currentAgentDetail.id}`)}
                      className="px-2.5 py-1 border border-rule bg-canvas hover:bg-surface text-xs font-mono text-ink flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedSnippet === `agent-${currentAgentDetail.id}` ? (
                        <>
                          <Check className="size-3" />
                          <span>Tersalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-3" />
                          <span>Salin Prompt</span>
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
                  Model Context Protocol berbasis stdio JSON-RPC 2.0 untuk audit mandiri langsung di dalam Cursor, Claude Desktop, dan Windsurf.
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
                      ? 'Tambahkan konfigurasi berikut ke berkas claude_desktop_config.json (%APPDATA%\\Claude di Windows atau ~/Library/Application Support/Claude di macOS):'
                      : selectedMcpClient === 'cursor'
                        ? 'Simpan konfigurasi berikut di file .cursor/mcp.json pada root proyek Cursor Anda:'
                        : 'Tambahkan ke file ~/.codeium/windsurf/mcp_config.json pada instalasi Windsurf Anda:'}
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
                      <span>{copiedSnippet === 'mcp-cfg' ? 'Tersalin' : 'Salin JSON'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Interactive MCP Tools Inspector */}
              <div className="space-y-3 font-mono">
                <h3 className="font-bold text-ink text-xs uppercase tracking-wider">
                  4 Tools Yang Disediakan MCP Server
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'audit_codebase', name: 'audit_codebase', desc: 'Scan folder lokal' },
                    { id: 'get_threat_matrix', name: 'get_threat_matrix', desc: 'Status 10 Vektor' },
                    { id: 'get_remediation_prompt', name: 'get_remediation_prompt', desc: 'Ambil prompt AI' },
                    { id: 'verify_fix', name: 'verify_fix', desc: 'Verifikasi commit' },
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
                        Memindai direktori proyek lokal terhadap 10 vektor ancaman dan mengembalikan daftar temuan terstruktur.
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
                        Mengembalikan skor posture dan status kepatuhan (Secure, Warning, Vulnerable) untuk ke-10 Vektor Ancaman.
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
                        Menghasilkan prompt perbaikan spesifik dan mandiri untuk ID temuan tertentu.
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
                        Memvalidasi berkas yang diedit dan memastikan celah keamanan tertutup tanpa memicu regresi.
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
                  Pindai proyek dari terminal dengan satu perintah. Tanpa login, tanpa token, tanpa setup.
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
                    Jalankan perintah ini di root direktori proyek Anda:
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
                      className="absolute top-2.5 right-2.5 p-1 border border-rule bg-surface hover:bg-canvas text-xs text-ink cursor-pointer"
                    >
                      {copiedSnippet === 'cli-cmd' ? <Check className="size-3" /> : <Copy className="size-3" />}
                    </button>
                  </div>
                </div>

                {/* Additional Command Options */}
                <div className="pt-2 border-t border-rule grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="border border-rule bg-canvas p-3 space-y-1">
                    <span className="text-[10px] text-ink-3 uppercase block">Ambang Batas Gagal CI</span>
                    <code className="text-ink text-[11px] block">shipsafe scan . --fail-on=high</code>
                    <p className="text-[11px] text-ink-2 font-sans">
                      Mengembalikan exit code 1 jika ada temuan HIGH atau CRITICAL (default: high).
                    </p>
                  </div>
                </div>
              </div>

              {/* 3. Diff Verification Card */}
              <div className="border border-rule bg-surface p-6 space-y-3 font-mono">
                <h3 className="font-bold text-ink text-xs uppercase tracking-wider">
                  Verifikasi Perbaikan Diff (Before vs After)
                </h3>
                <p className="text-xs text-ink-2 font-sans leading-relaxed">
                  Bandingkan dua versi folder proyek secara lokal untuk memvalidasi apakah remediasi berhasil menutup celah tanpa menimbulkan regresi baru:
                </p>
                <div className="relative">
                  <pre className="p-3 bg-canvas border border-rule text-xs text-ink">
shipsafe diff ./before-fix ./after-fix
                  </pre>
                  <button
                    type="button"
                    onClick={() => copyToClipboard('shipsafe diff ./before-fix ./after-fix', 'cli-diff')}
                    className="absolute top-2 right-2 p-1 border border-rule bg-surface text-xs text-ink cursor-pointer"
                  >
                    {copiedSnippet === 'cli-diff' ? <Check className="size-3" /> : <Copy className="size-3" />}
                  </button>
                </div>
              </div>

              {/* 6. CLI Exit Codes Specification */}
              <div className="border border-rule bg-surface p-6 space-y-3 font-mono">
                <h3 className="font-bold text-ink text-xs uppercase tracking-wider">
                  Arti Exit Code
                </h3>
                <div className="overflow-x-auto border border-rule">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-canvas border-b border-rule text-ink">
                      <tr>
                        <th className="p-2.5">Exit Code</th>
                        <th className="p-2.5">Status</th>
                        <th className="p-2.5">Arti</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rule font-sans">
                      <tr>
                        <td className="p-2.5 font-mono font-bold text-ink">0</td>
                        <td className="p-2.5 font-mono text-ink">APPROVED_FOR_SHIP</td>
                        <td className="p-2.5 text-ink-2">Tidak ditemukan kerentanan di atas ambang batas.</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-mono font-bold text-ink">1</td>
                        <td className="p-2.5 font-mono text-ink">REJECTED</td>
                        <td className="p-2.5 text-ink-2">Ditemukan kerentanan setara atau di atas ambang batas (--fail-on).</td>
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
                  <span>7. Panduan Troubleshooting &amp; Error Resolution</span>
                </h2>
                <p className="text-xs text-ink-3 font-mono mt-1">
                  Kamus kode error HTTP, limit payload, dan panduan resolusi mandiri cepat.
                </p>
              </div>

              {/* Problem Fixing Protocol: Ketemu Masalah -> Analisa -> Solusi Terverifikasi */}
              <div className="border border-rule bg-surface p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-rule pb-2">
                  <h3 className="font-bold text-ink text-xs uppercase font-mono tracking-wider flex items-center gap-2">
                    <HelpCircle className="size-4" />
                    <span>Metodologi Problem Fixing: Ketemu Masalah &rarr; Analisa &rarr; Solusi Terverifikasi</span>
                  </h3>
                  <span className="text-[10px] font-mono text-ink-3">Panduan Penanganan Kegagalan</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
                  <div className="border border-rule bg-canvas p-3 space-y-1.5">
                    <span className="text-[10px] text-ink-3 font-bold block uppercase">01. Ketemu Masalah</span>
                    <strong className="text-ink font-sans block text-sm">Identifikasi Gejala &amp; Status</strong>
                    <p className="text-ink-2 font-sans text-xs leading-relaxed">
                      Catat kode status HTTP dan pesan error pada ErrorPanel (misal: <code>HTTP 413 too_large</code>, <code>HTTP 422 unsafe_archive</code>, atau <code>HTTP 403 quota_exceeded</code>).
                    </p>
                  </div>

                  <div className="border border-rule bg-canvas p-3 space-y-1.5">
                    <span className="text-[10px] text-ink-3 font-bold block uppercase">02. Analisa Akar Masalah</span>
                    <strong className="text-ink font-sans block text-sm">Bedah Penyebab Teknis</strong>
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
                  placeholder="Cari kode error (misal: 413, quota_exceeded, captcha, zip_bomb)..."
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-surface border border-rule text-ink placeholder:text-ink-3 focus:border-ink focus:outline-none"
                />
              </div>

              {/* Expandable Error Code Accordion */}
              <div className="space-y-3 font-mono text-xs">
                {filteredErrors.length === 0 ? (
                  <div className="p-6 border border-rule bg-surface text-center text-ink-3">
                    Tidak ditemukan kode error yang cocok dengan "{errorSearchQuery}".
                  </div>
                ) : (
                  filteredErrors.map((err) => {
                    const isExpanded = expandedError === err.code
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
                          <div className="px-4 pb-4 pt-1 border-t border-rule space-y-3 font-sans text-xs">
                            <div>
                              <strong className="text-ink font-mono text-[11px] block uppercase tracking-wide">
                                Penyebab:
                              </strong>
                              <p className="text-ink-2 mt-0.5 leading-relaxed">{err.cause}</p>
                            </div>
                            <div>
                              <strong className="text-ink font-mono text-[11px] block uppercase tracking-wide">
                                Langkah Solusi:
                              </strong>
                              <p className="text-ink mt-0.5 leading-relaxed">{err.solution}</p>
                            </div>
                            <div>
                              <strong className="text-ink font-mono text-[11px] block uppercase tracking-wide">
                                Dampak Sistem:
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
                  Dukungan Teknis Darurat (Emergency Support)
                </h3>
                <p className="text-ink-2 font-sans leading-relaxed">
                  Jika mengalami kegagalan berulang pada pipeline produksi atau membutuhkan konsultasi arsitektur custom rules:
                </p>
                <div className="flex flex-wrap gap-3 pt-1">
                  <a
                    href="https://wa.me/6282124153732?text=Halo%20Admin%20ShipSafe%2C%20saya%20butuh%20bantuan%20troubleshooting"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 bg-ink text-canvas font-semibold text-xs transition-colors hover:bg-ink-2"
                  >
                    <span>Hubungi Engineer via WhatsApp</span>
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
                  &larr; Sebelumnya
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
                  Selanjutnya &rarr;
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
