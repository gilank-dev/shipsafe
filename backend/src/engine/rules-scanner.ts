import { Finding, Severity, Area, AgentTarget, ThreatKey, ThreatCheck } from '../types';
import { FilteredProjectFiles } from '../security/file-filter';
import { scanContentForSecrets } from '../security/secret-scanner';
import { generateRemediationPrompt } from './prompts';

export interface AuditScanResult {
  findings: Finding[];
  secretsToRotate: string[];
  threatMatrix: ThreatCheck[];
}

export function runStaticSecurityAudit(
  files: FilteredProjectFiles,
  agentTarget: AgentTarget = 'Generic'
): AuditScanResult {
  const findings: Finding[] = [];
  const secretsToRotate = new Set<string>();
  let findingCounter = 1;

  function nextId(): string {
    const id = `F-${String(findingCounter).padStart(3, '0')}`;
    findingCounter++;
    return id;
  }

  // Tracking findings by threat category
  const threatCounts: Record<ThreatKey, number> = {
    sqli: 0,
    xss: 0,
    ddos: 0,
    brute_force: 0,
    malware_shell: 0,
    mitm: 0,
    phishing: 0,
    deface: 0,
    lfi_rfi: 0,
    zero_day: 0
  };

  function addThreatFinding(finding: Omit<Finding, 'id' | 'remediationPrompt'> & { threatCategory?: ThreatKey }) {
    const fullFinding: Finding = {
      ...finding,
      id: nextId(),
      remediationPrompt: ''
    };
    fullFinding.remediationPrompt = generateRemediationPrompt(fullFinding, agentTarget);
    findings.push(fullFinding);

    if (finding.threatCategory) {
      threatCounts[finding.threatCategory] = (threatCounts[finding.threatCategory] || 0) + 1;
    }
  }

  // ==========================================
  // AREA 1: SECRETS AUDIT
  // ==========================================
  for (const file of files.securityFiles) {
    const secretHits = scanContentForSecrets(file.content, file.relativePath);
    for (const hit of secretHits) {
      secretsToRotate.add(hit.masked);

      addThreatFinding({
        title: `Exposed ${hit.patternName}`,
        severity: 'Critical',
        area: 'Secrets',
        threatCategory: 'mitm',
        location: {
          file: hit.file || file.relativePath,
          line: hit.line,
          snippet: hit.snippet
        },
        what: `Hardcoded credential detected (${hit.masked}). Storing credentials in source code exposes infrastructure to unauthorized access.`,
        why: `Exposing secrets allows attackers to bypass authentication and directly compromise downstream cloud providers or databases.`,
        recommendedFix: `1. Move secret to an environment variable or secret manager.\n2. Add the file to .gitignore if it is an env file.\n3. ROTATE the credential immediately in the upstream provider.`,
        verifyWith: `git log -S "${hit.masked.substring(0, 4)}" to check historical exposure`,
        confidence: 'Confirmed'
      });
    }

    // Check lines in files
    const lines = file.content.split('\n');
    lines.forEach((line, idx) => {
      const lineNum = idx + 1;

      // 1.1 Public Client Environment Variables leaking secrets
      const publicSecretMatch = /(?:NEXT_PUBLIC_|VITE_|REACT_APP_|EXPO_PUBLIC_)[A-Z0-9_]*(?:SECRET|PRIVATE|SERVICE_ROLE|ADMIN_KEY|TOKEN)\s*=/i.exec(line);
      if (publicSecretMatch) {
        addThreatFinding({
          title: `Privileged Secret Exposed via Public Client Environment Prefix`,
          severity: 'Critical',
          area: 'Secrets',
          threatCategory: 'mitm',
          location: { file: file.relativePath, line: lineNum, snippet: line.trim() },
          what: `Variable matching public frontend prefix (${publicSecretMatch[0].trim()}) contains privileged secret naming convention.`,
          why: `Client-side users can extract these tokens from bundle inspect tools, bypassing all backend access control.`,
          recommendedFix: `Remove public prefix from backend-only secrets and access them only in server-side API routes.`,
          verifyWith: `curl or browser devtools inspecting client bundle`,
          confidence: 'Confirmed'
        });
      }

      // 1.2 Insecure logging of sensitive parameters
      if (/console\.(?:log|debug|info)\s*\([^)]*(?:password|token|secret|credit_card|card_number|authorization)[^)]*\)/i.test(line)) {
        addThreatFinding({
          title: `Sensitive Data Printed to Application Logs`,
          severity: 'Medium',
          area: 'Secrets',
          location: { file: file.relativePath, line: lineNum, snippet: line.trim() },
          what: `Console log statement outputs sensitive attributes (passwords/tokens/secrets).`,
          why: `Application logs stored in logging aggregators or terminal output may leak sensitive user or infrastructure data.`,
          recommendedFix: `Sanitize or remove sensitive fields before logging, or use a redaction logger.`,
          verifyWith: `grep -rn "console.log" ${file.relativePath}`,
          confidence: 'Confirmed'
        });
      }

      // ==========================================
      // THREAT 1: SQL INJECTION (SQLi)
      // ==========================================
      if (
        /(?:db|conn|client|sequelize|pool|knex|prisma)\.(?:query|execute|raw|\$queryRawUnsafe)\s*\(\s*['"`]\s*(?:SELECT|INSERT|UPDATE|DELETE)[^'`"]*\$\{[^}]+\}/i.test(line) ||
        /(?:db|conn|client|sequelize|pool)\.(?:query|execute)\s*\(\s*['"`]\s*(?:SELECT|INSERT|UPDATE|DELETE)[^'`"]*['"`]\s*\+\s*[a-zA-Z0-9_.]+/i.test(line) ||
        /(?:const|let|var)?\s*[a-zA-Z0-9_]*(?:query|sql|stmt)\s*=\s*['"`]\s*(?:SELECT|INSERT|UPDATE|DELETE)[^'`"]*['"`]\s*\+\s*[a-zA-Z0-9_.]+/i.test(line) ||
        /(?:const|let|var)?\s*[a-zA-Z0-9_]*(?:query|sql|stmt)\s*=\s*`\s*(?:SELECT|INSERT|UPDATE|DELETE)[^`]*\$\{[^}]+\}/i.test(line) ||
        /\$db->(?:query|exec)\s*\(\s*['"][^'"]*\$[a-zA-Z0-9_]+/i.test(line)
      ) {
        addThreatFinding({
          title: `SQL Injection (SQLi) via Dynamic Query Concatenation`,
          severity: 'Critical',
          area: 'Code',
          threatCategory: 'sqli',
          location: { file: file.relativePath, line: lineNum, snippet: line.trim() },
          what: `SQL query string is dynamically assembled via concatenation or template interpolation with user-controllable input.`,
          why: `Penyerang dapat memasukkan perintah SQL arbitrer untuk mencuri seluruh basis data, mem-bypass autentikasi (misal ' OR '1'='1), atau menghapus tabel.`,
          recommendedFix: `Gunakan parameterized queries ($1, ?, :param) atau ORM query builder berorientasi objek yang aman.`,
          verifyWith: `Uji endpoint dengan karakter kutip (') atau payload SQL injection untuk memvalidasi sanitasi query`,
          confidence: 'Confirmed'
        });
      }

      // ==========================================
      // THREAT 2: CROSS-SITE SCRIPTING (XSS)
      // ==========================================
      if (
        /dangerouslySetInnerHTML\s*=\s*\{\s*\{\s*__html\s*:\s*(?!sanitize|DOMPurify)[a-zA-Z0-9_.]+\s*\}\s*\}/.test(line) ||
        /\.innerHTML\s*=\s*(?!sanitize)[a-zA-Z0-9_.]*(?:req\.|params\.|searchParams|userInput)/i.test(line) ||
        /document\.write\s*\([^)]*(?:location|search|query|params)/i.test(line) ||
        /res\.(?:send|write)\s*\(\s*['"`]<[^>]+>[^'"`]*\$\{[^}]+\}/i.test(line)
      ) {
        addThreatFinding({
          title: `Cross-Site Scripting (XSS) via Unsanitized Markup Insertion`,
          severity: 'High',
          area: 'Code',
          threatCategory: 'xss',
          location: { file: file.relativePath, line: lineNum, snippet: line.trim() },
          what: `Data masukan pengguna disisipkan langsung ke dalam HTML tanpa sanitasi (dangerouslySetInnerHTML / innerHTML / res.send).`,
          why: `Penyerang dapat mengeksekusi JavaScript berbahaya pada browser korban untuk mencuri session cookies, token otorisasi, atau melakukan keylogging.`,
          recommendedFix: `Gunakan DOMPurify atau sanitize-html sebelum merender HTML, atau gunakan binding teks polos (textContent / JSX).`,
          verifyWith: `Kirim payload <script>alert(1)</script> atau <img src=x onerror=alert(1)> pada input terkait`,
          confidence: 'Confirmed'
        });
      }

      // ==========================================
      // THREAT 4: BRUTE FORCE VULNERABILITY
      // ==========================================
      if (
        /(?:password|passwd|pin|token)\s*===\s*(?:user\.password|dbPassword|storedPass|hash)/i.test(line) &&
        !/timingSafeEqual|compare|verify/i.test(line)
      ) {
        addThreatFinding({
          title: `Plaintext Password / Insecure Timing Comparison (Brute Force Risk)`,
          severity: 'High',
          area: 'Code',
          threatCategory: 'brute_force',
          location: { file: file.relativePath, line: lineNum, snippet: line.trim() },
          what: `Pengecekan kata sandi atau token menggunakan perbandingan string langsung (===) alih-alih fungsi hashing atau constant-time comparison.`,
          why: `Perbandingan string biasa rentan terhadap timing attack dan menandakan kata sandi kemungkinan disimpan dalam bentuk teks polos (plaintext).`,
          recommendedFix: `Gunakan bcrypt.compare() atau crypto.timingSafeEqual() dan pastikan kata sandi selalu di-hash (Argon2 / bcrypt).`,
          verifyWith: `Periksa penyimpanan tabel users untuk memastikan kolom password berisi hash kriptografis yang aman`,
          confidence: 'Confirmed'
        });
      }

      // ==========================================
      // THREAT 5: MALWARE & UPLOAD SHELL
      // ==========================================
      if (
        /(?:c99shell|r57shell|b374k|wso\s*shell|alfa\s*team\s*shell)/i.test(line) ||
        /eval\s*\(\s*base64_decode\s*\(\s*\$_(?:POST|GET|REQUEST)/i.test(line) ||
        /(?:system|passthru|shell_exec|exec)\s*\(\s*\$_(?:POST|GET|REQUEST)/i.test(line) ||
        /require\s*\(\s*['"]child_process['"]\s*\)\s*\.exec\s*\([^)]*req\.(?:query|body|params)/i.test(line)
      ) {
        addThreatFinding({
          title: `Malware / Web Shell Backdoor Pattern Detected`,
          severity: 'Critical',
          area: 'Code',
          threatCategory: 'malware_shell',
          location: { file: file.relativePath, line: lineNum, snippet: line.trim() },
          what: `Ditemukan pola web shell atau eksekusi perintah sistem langsung dari input pengguna (eval/passthru/child_process.exec).`,
          why: `Celah ini memberikan Remote Code Execution (RCE) penuh kepada penyerang untuk mengambil alih kendali server dan merusak sistem.`,
          recommendedFix: `Hapus segera script eksekusi dinamis ini dan lakukan audit forensik menyeluruh pada repository.`,
          verifyWith: `Periksa riwayat komit file ini dan pastikan tidak ada backdoor tersisa`,
          confidence: 'Confirmed'
        });
      }

      // Unsafe file upload handling (writing originalname directly)
      if (
        /destination\s*:\s*['"`].*(?:public|dist|static|uploads)['"`]/i.test(line) &&
        /filename\s*:[^}]+file\.originalname/i.test(file.content) &&
        !/(?:mime|extension|whitelist|extname)\b/i.test(file.content)
      ) {
        addThreatFinding({
          title: `Unrestricted File Upload to Public Webroot (Upload Shell Risk)`,
          severity: 'Critical',
          area: 'Code',
          threatCategory: 'malware_shell',
          location: { file: file.relativePath, line: lineNum, snippet: line.trim() },
          what: `Upload handler menyimpan file langsung ke folder publik dengan ekstensi asli file pengguna tanpa validasi tipe MIME.`,
          why: `Penyerang dapat mengunggah file berbahaya (.php, .jsp, .html, .exe) dan mengeksekusinya secara langsung melalui web server.`,
          recommendedFix: `1. Validasi ekstensi menggunakan whitelist ketat.\n2. Ganti nama file dengan UUID acak.\n3. Simpan file di luar webroot publik (misal S3 / private storage).`,
          verifyWith: `Coba upload file berekstensi .php atau .html ke formulir upload terkait`,
          confidence: 'Likely, verify'
        });
      }

      // ==========================================
      // THREAT 6: MAN-IN-THE-MIDDLE (MitM)
      // ==========================================
      if (/rejectUnauthorized\s*:\s*false|NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['"]?0/i.test(line)) {
        addThreatFinding({
          title: `TLS / SSL Certificate Verification Disabled (MitM Vulnerability)`,
          severity: 'Critical',
          area: 'Code',
          threatCategory: 'mitm',
          location: { file: file.relativePath, line: lineNum, snippet: line.trim() },
          what: `Verifikasi sertifikat TLS/SSL dimatikan secara eksplisit (rejectUnauthorized: false).`,
          why: `Memungkinkan penyerang di jaringan yang sama melakukan penyadapan Man-in-the-Middle (MitM) dan membaca seluruh data sensitif.`,
          recommendedFix: `Aktifkan verifikasi TLS standar dan pasang certificate authority (CA) yang valid.`,
          verifyWith: `Pastikan konfigurasi rejectUnauthorized bernilai true atau dihilangkan`,
          confidence: 'Confirmed'
        });
      }

      // Plaintext HTTP request for credentials
      if (/http:\/\/[a-zA-Z0-9.-]+\/(?:login|auth|token|credential|api\/v1)/i.test(line)) {
        addThreatFinding({
          title: `Insecure Plaintext HTTP Transmission for API / Authentication`,
          severity: 'High',
          area: 'Code',
          threatCategory: 'mitm',
          location: { file: file.relativePath, line: lineNum, snippet: line.trim() },
          what: `Endpoint autentikasi atau API dipanggil menggunakan protokol tidak terenkripsi (http://).`,
          why: `Data kredensial dan token otorisasi dapat disadap oleh penyerang pada jaringan perantara (Wi-Fi publik, ISP).`,
          recommendedFix: `Gunakan HTTPS secara mutlak untuk seluruh komunikasi API eksternal dan internal.`,
          verifyWith: `Periksa seluruh URL pemanggilan API agar menggunakan skema https://`,
          confidence: 'Confirmed'
        });
      }

      // Cookie without Secure or SameSite
      if (/res\.cookie\s*\(\s*['"][^'"]+['"],\s*[^,]+,\s*\{(?![^}]*secure)(?![^}]*sameSite)/i.test(line)) {
        addThreatFinding({
          title: `Insecure Cookie Configuration (Missing Secure & SameSite Attributes)`,
          severity: 'Medium',
          area: 'HTTP',
          threatCategory: 'mitm',
          location: { file: file.relativePath, line: lineNum, snippet: line.trim() },
          what: `Cookie dibuat tanpa atribut Secure, HttpOnly, atau SameSite.`,
          why: `Cookie rentan disadap saat transit HTTP biasa dan dapat dieksploitasi untuk Cross-Site Request Forgery (CSRF).`,
          recommendedFix: `Setel opsi cookie: { secure: true, httpOnly: true, sameSite: 'lax' | 'strict' }.`,
          verifyWith: `Periksa header Set-Cookie menggunakan curl -I`,
          confidence: 'Likely, verify'
        });
      }

      // ==========================================
      // THREAT 7: PHISHING & SOCIAL ENGINEERING (Open Redirect)
      // ==========================================
      if (
        /res\.redirect\s*\([^)]*req\.(?:query|params|body)\.(?:url|redirect|returnTo|next)/i.test(line) ||
        /window\.location(?:\.href)?\s*=\s*new\s*URLSearchParams\([^)]*\)\.get\(['"](?:redirect|url|returnTo)['"]\)/i.test(line)
      ) {
        addThreatFinding({
          title: `Open Redirect Vulnerability (Phishing & Social Engineering Vector)`,
          severity: 'High',
          area: 'Code',
          threatCategory: 'phishing',
          location: { file: file.relativePath, line: lineNum, snippet: line.trim() },
          what: `Aplikasi melakukan pengalihan (redirect) ke URL eksternal yang diambil langsung dari input pengguna tanpa validasi domain.`,
          why: `Penyerang dapat membuat link resmi website Anda untuk menjebak korban ke website tiruan (phishing) pencuri kredensial.`,
          recommendedFix: `Validasi URL pengalihan hanya mengarah ke relative path internal (dimulai dengan /) atau gunakan domain whitelist ketat.`,
          verifyWith: `Buka /login?redirect=https://evil-phishing-site.com dan periksa apakah browser diarahkan ke luar`,
          confidence: 'Confirmed'
        });
      }

      // ==========================================
      // THREAT 8: DEFACE WEBSITE RISKS
      // ==========================================
      if (
        /fs\.(?:writeFile|writeFileSync)\s*\(\s*['"`].*(?:public|views|templates|dist)\/index\.(?:html|ejs|pug|php)/i.test(line) &&
        !/auth|admin|permission/i.test(file.content)
      ) {
        addThreatFinding({
          title: `Unauthenticated Webroot / Template Modification (Website Defacement Risk)`,
          severity: 'High',
          area: 'Code',
          threatCategory: 'deface',
          location: { file: file.relativePath, line: lineNum, snippet: line.trim() },
          what: `Terdapat kode yang memodifikasi berkas template atau index halaman publik tanpa verifikasi sesi autentikasi yang jelas.`,
          why: `Celah ini memungkinkan penyerang mengubah tampilan utama website (deface) atau menyisipkan konten palsu.`,
          recommendedFix: `Kunci seluruh operasi penulisan file statis, lindungi dengan role-based access control (RBAC), dan gunakan immutable storage.`,
          verifyWith: `Uji endpoint yang menulis ke disk dengan request tanpa token otorisasi`,
          confidence: 'Likely, verify'
        });
      }

      // ==========================================
      // THREAT 9: LOCAL & REMOTE FILE INCLUSION (LFI / RFI)
      // ==========================================
      if (
        /fs\.(?:readFile|createReadStream|readFileSync)\s*\([^)]*req\.(?:query|params|body)\.[a-zA-Z0-9_]+/i.test(line) ||
        /(?:include|require)\s*\(\s*\$_(?:GET|POST|REQUEST)\[['"][a-zA-Z0-9_]+['"]\]/i.test(line)
      ) {
        addThreatFinding({
          title: `Local File Inclusion (LFI) / Path Traversal via User-Controlled Path`,
          severity: 'High',
          area: 'Code',
          threatCategory: 'lfi_rfi',
          location: { file: file.relativePath, line: lineNum, snippet: line.trim() },
          what: `Operasi pembacaan file lokal langsung menerima parameter input pengguna tanpa sanitasi batas direktori.`,
          why: `Penyerang dapat membaca berkas sensitif server seperti /etc/passwd, .env, konfigurasi database, atau source code rahasia.`,
          recommendedFix: `Gunakan path.basename() dan validasi bahwa path.resolve() tetap berada di dalam direktori penyimpanan yang aman.`,
          verifyWith: `Coba akses endpoint dengan parameter ../../../../etc/passwd atau ../../.env`,
          confidence: 'Confirmed'
        });
      }

      // SSRF / RFI: fetch or axios with arbitrary user URL
      if (
        /(?:fetch|axios\.(?:get|post)|http\.get)\s*\(\s*req\.(?:query|body|params)\.(?:url|target|feedUrl|webhook)/i.test(line) &&
        !/whitelist|isAllowedUrl|dns\.lookup/i.test(file.content)
      ) {
        addThreatFinding({
          title: `Server-Side Request Forgery (SSRF) / Remote File Inclusion (RFI) Risk`,
          severity: 'High',
          area: 'Code',
          threatCategory: 'lfi_rfi',
          location: { file: file.relativePath, line: lineNum, snippet: line.trim() },
          what: `Server melakukan HTTP request ke URL yang diberikan langsung oleh pengguna tanpa validasi host atau IP.`,
          why: `Penyerang dapat memaksa server menghubungi jaringan internal privat (127.0.0.1, metadata cloud 169.254.169.254) atau memuat payload RFI.`,
          recommendedFix: `Gunakan whitelist domain yang diizinkan dan blokir akses ke alamat IP privat/loopback.`,
          verifyWith: `Kirim permintaan dengan URL http://169.254.169.254/latest/meta-data/ atau http://localhost:8080`,
          confidence: 'Likely, verify'
        });
      }

      // ==========================================
      // THREAT 10: ZERO-DAY & DANGEROUS DYNAMIC CODE
      // ==========================================
      if (
        /\beval\s*\(\s*(?!['"`])[a-zA-Z0-9_.]+/i.test(line) ||
        /new\s+Function\s*\([^)]*(?:req\.|params\.|userInput)/i.test(line) ||
        /vm\.(?:runInThisContext|runInNewContext)\s*\([^)]*req\./i.test(line)
      ) {
        addThreatFinding({
          title: `Arbitrary Code Execution via eval() or new Function() (Zero-Day Vector)`,
          severity: 'Critical',
          area: 'Code',
          threatCategory: 'zero_day',
          location: { file: file.relativePath, line: lineNum, snippet: line.trim() },
          what: `Penggunaan fungsi eksekusi JavaScript dinamis (eval / new Function) pada input variabel runtime.`,
          why: `Fungsi dinamis ini membuka celah zero-day di mana penyerang dapat mengeksekusi sembarang kode JavaScript di server.`,
          recommendedFix: `Hindari penggunaan eval() atau new Function(). Gunakan parser aman seperti JSON.parse() atau pustaka math expression terisolasi.`,
          verifyWith: `Periksa seluruh penggunaan eval dalam kode dan ganti dengan pendekatan statis`,
          confidence: 'Confirmed'
        });
      }

      // Prototype Pollution
      if (
        /Object\.assign\s*\(\s*(?:\{\s*\}|[a-zA-Z0-9_]+)\s*,\s*req\.body\b/i.test(line) ||
        /\bmerge\s*\([^)]*req\.body\b/i.test(line)
      ) {
        addThreatFinding({
          title: `Potential Prototype Pollution via Unchecked Object Merging`,
          severity: 'Medium',
          area: 'Code',
          threatCategory: 'zero_day',
          location: { file: file.relativePath, line: lineNum, snippet: line.trim() },
          what: `Penggabungan objek dinamis langsung dari req.body tanpa memfilter atribut __proto__ atau constructor.`,
          why: `Dapat memanipulasi prototype objek global JavaScript dan memicu perilaku tak terduga atau bypass autentikasi.`,
          recommendedFix: `Gunakan skema validasi tipe data ketat (Zod, Joi) dan cegah merging kunci __proto__ atau prototype.`,
          verifyWith: `Kirim payload JSON berisi {"__proto__": {"polluted": true}}`,
          confidence: 'Likely, verify'
        });
      }

      // ReDoS pattern
      if (/\/(?:[a-zA-Z0-9_]+\+)\+\/|\/(?:[a-zA-Z0-9_]+\*)\*\/|\/(?:[a-zA-Z0-9_]+\|)+\+/.test(line)) {
        addThreatFinding({
          title: `Vulnerable Regular Expression (ReDoS / Resource Exhaustion Vector)`,
          severity: 'Medium',
          area: 'Code',
          threatCategory: 'ddos',
          location: { file: file.relativePath, line: lineNum, snippet: line.trim() },
          what: `Ditemukan ekspresi reguler dengan kuantifier bersarang (nested quantifiers) yang memicu bencana backtracking.`,
          why: `Penyerang dapat mengirimkan string khusus yang menyebabkan CPU server bekerja 100% (Denial of Service).`,
          recommendedFix: `Sederhanakan pola regex atau gunakan engine regex non-backtracking (seperti Google RE2).`,
          verifyWith: `Uji regex dengan input berulang 50+ karakter yang tidak cocok`,
          confidence: 'Confirmed'
        });
      }
    });
  }

  // ==========================================
  // THREAT 3: DISTRIBUTED DENIAL-OF-SERVICE (DDoS)
  // Check if project has rate limiting configured across API files
  // ==========================================
  const isBackendProject = files.securityFiles.some(f =>
    /server\.(?:ts|js)|app\.(?:ts|js)|routes\//.test(f.relativePath)
  );

  const hasRateLimiting = files.securityFiles.some(f =>
    /rateLimit|rate-limiter|express-rate-limit|upstash|limiter/i.test(f.content)
  );

  if (isBackendProject && !hasRateLimiting) {
    addThreatFinding({
      title: `Missing Global API Rate Limiting (DDoS & Brute Force Susceptibility)`,
      severity: 'Medium',
      area: 'HTTP',
      threatCategory: 'ddos',
      location: { file: files.securityFiles[0]?.relativePath || 'server.ts' },
      what: `Aplikasi backend tidak memiliki middleware pembatas laju request (Rate Limiting).`,
      why: `Tanpa rate limiting, server sangat mudah dilumpuhkan oleh serangan DDoS volume rendah atau brute force credential stuffing.`,
      recommendedFix: `Pasang middleware express-rate-limit atau pembatas laju pada level reverse proxy / cloud WAF.`,
      verifyWith: `Jalankan uji beban cepat dengan 50 concurrent requests: ab -n 100 -c 10 http://localhost:PORT/`,
      confidence: 'Likely, verify'
    });
    threatCounts.brute_force = (threatCounts.brute_force || 0) + 1;
  }

  // ==========================================
  // AREA 2: DEPENDENCIES AUDIT
  // ==========================================
  for (const manifest of files.manifests) {
    if (manifest.path.endsWith('package.json')) {
      const hasLockfile = files.securityFiles.some(f =>
        /package-lock\.json$|yarn\.lock$|pnpm-lock\.yaml$/.test(f.relativePath)
      );
      if (!hasLockfile) {
        addThreatFinding({
          title: `Missing Package Dependency Lockfile`,
          severity: 'Medium',
          area: 'Dependencies',
          threatCategory: 'zero_day',
          location: { file: manifest.path, line: 1 },
          what: `package.json is present but no lockfile (package-lock.json / yarn.lock / pnpm-lock.yaml) was found in the archive.`,
          why: `Without a lockfile, builds are non-deterministic and vulnerable to unexpected dependency drift or supply-chain compromises.`,
          recommendedFix: `Run npm install or pnpm install locally and commit the generated lockfile to version control.`,
          verifyWith: `npm install --package-lock-only`,
          confidence: 'Confirmed'
        });
      }

      try {
        const pkg = JSON.parse(manifest.content);
        const allDeps: Record<string, string> = {
          ...(pkg.dependencies || {}),
          ...(pkg.devDependencies || {})
        };

        if (allDeps['lodahs']) {
          addThreatFinding({
            title: `Suspicious Package Typosquatting Detected: "lodahs"`,
            severity: 'High',
            area: 'Dependencies',
            threatCategory: 'malware_shell',
            location: { file: manifest.path },
            what: `Dependency "lodahs" appears to be a typosquat of legitimate package "lodash".`,
            why: `Typosquatted packages commonly deliver malware or token extractors upon installation.`,
            recommendedFix: `Replace "lodahs" with official "lodash" package and review installation scripts.`,
            verifyWith: `npm ls lodahs`,
            confidence: 'Likely, verify'
          });
        }

        for (const [dep, ver] of Object.entries(allDeps)) {
          if (ver === '*' || ver === 'latest') {
            addThreatFinding({
              title: `Unpinned Dependency Range: "${dep}": "${ver}"`,
              severity: 'Low',
              area: 'Dependencies',
              threatCategory: 'zero_day',
              location: { file: manifest.path },
              what: `Dependency "${dep}" uses wildcard "${ver}" instead of a fixed semantic version.`,
              why: `Unpinned versions can silently introduce breaking changes or upstream compromised releases.`,
              recommendedFix: `Pin dependency version to a specific known-good release.`,
              verifyWith: `npm audit`,
              confidence: 'Confirmed'
            });
          }
        }
      } catch {
        // Ignore json parse error in manifest
      }
    }
  }

  // ==========================================
  // AREA 3: HTTP & SERVER HARDENING
  // ==========================================
  let hasCspConfigured = false;
  let hasFrameGuard = false;

  for (const config of files.configs) {
    if (/Content-Security-Policy/i.test(config.content)) {
      hasCspConfigured = true;
    }
    if (/X-Frame-Options|frame-ancestors/i.test(config.content)) {
      hasFrameGuard = true;
    }

    if (
      /origin\s*:\s*['"]\*['"]\s*,\s*credentials\s*:\s*true/i.test(config.content) ||
      /Access-Control-Allow-Origin['"]?\s*:\s*['"]\*['"][^;]*Access-Control-Allow-Credentials/i.test(config.content)
    ) {
      addThreatFinding({
        title: `Overly Permissive CORS Configuration with Credentials`,
        severity: 'High',
        area: 'HTTP',
        threatCategory: 'mitm',
        location: { file: config.path },
        what: `CORS configuration combines wildcard origin (*) with credentials: true.`,
        why: `Permits arbitrary malicious third-party websites to make authenticated requests on behalf of victims.`,
        recommendedFix: `Specify an explicit whitelist of trusted frontend domains instead of wildcard '*'.`,
        verifyWith: `curl -H "Origin: https://evil.com" -I <endpoint>`,
        confidence: 'Confirmed'
      });
    }
  }

  if (!hasCspConfigured && files.configs.length > 0) {
    const primaryConfig = files.configs[0]?.path || 'next.config.js';
    addThreatFinding({
      title: `Missing Content Security Policy (CSP) Header`,
      severity: 'Medium',
      area: 'HTTP',
      threatCategory: 'xss',
      location: { file: primaryConfig },
      what: `No Content-Security-Policy (CSP) headers found in server configurations or middleware.`,
      why: `Without CSP, browsers lack defense-in-depth against Cross-Site Scripting (XSS) and data exfiltration.`,
      recommendedFix: `Configure strict CSP headers restricting script-src, object-src, and frame-ancestors.`,
      verifyWith: `curl -I https://<your-domain> | grep -i content-security-policy`,
      confidence: 'Likely, verify'
    });
  }

  if (!hasFrameGuard && files.configs.length > 0) {
    const primaryConfig = files.configs[0]?.path || 'server.ts';
    addThreatFinding({
      title: `Missing X-Frame-Options / Clickjacking Protection Header`,
      severity: 'Low',
      area: 'HTTP',
      threatCategory: 'phishing',
      location: { file: primaryConfig },
      what: `Header X-Frame-Options atau CSP frame-ancestors tidak terdeteksi pada konfigurasi server.`,
      why: `Memungkinkan penyerang menyematkan website Anda ke dalam iframe transparan (Clickjacking) untuk menjebak klik pengguna.`,
      recommendedFix: `Gunakan helmet({ frameguard: { action: 'deny' } }) atau setel header X-Frame-Options: DENY.`,
      verifyWith: `curl -I https://<your-domain> | grep -i x-frame-options`,
      confidence: 'Likely, verify'
    });
  }

  // ==========================================
  // COMPUTE THE 10 THREAT CHECK MATRIX
  // ==========================================
  const threatDefinitions: Array<{
    key: ThreatKey;
    name: string;
    category: string;
    summarySafe: string;
    mitigationTip: string;
  }> = [
    {
      key: 'sqli',
      name: 'SQL Injection (SQLi)',
      category: 'Database & Data Integrity',
      summarySafe: 'Tidak ditemukan konkatenasi query SQL berbahaya; menggunakan query builder atau parameterized queries.',
      mitigationTip: 'Pertahankan penggunaan parameterized queries ($1, ?) atau ORM yang aman.'
    },
    {
      key: 'xss',
      name: 'Cross-Site Scripting (XSS)',
      category: 'Client & Browser Security',
      summarySafe: 'Tidak ditemukan penyisipan markup tidak tersanitasi; DOM dan template output terlindungi.',
      mitigationTip: 'Gunakan DOMPurify dan aktifkan Content-Security-Policy (CSP) ketat.'
    },
    {
      key: 'ddos',
      name: 'Distributed Denial-of-Service (DDoS)',
      category: 'Availability & Resource Limits',
      summarySafe: 'Proteksi resource limit dan pola regex aman dari kelebihan beban backtracking.',
      mitigationTip: 'Terapkan rate-limiting pada endpoint publik dan batasi ukuran payload request.'
    },
    {
      key: 'brute_force',
      name: 'Brute Force & Credential Stuffing',
      category: 'Authentication & Access',
      summarySafe: 'Verifikasi kata sandi kriptografis dan tidak ditemukan pola perbandingan string sederhana.',
      mitigationTip: 'Gunakan algoritma hash modern (bcrypt/Argon2) dan batasi percobaan login.'
    },
    {
      key: 'malware_shell',
      name: 'Malware & Upload Web Shell',
      category: 'Server Integrity & RCE',
      summarySafe: 'Arsip bersih dari signature backdoor web shell dan handler upload file yang rentan.',
      mitigationTip: 'Validasi ekstensi file dengan whitelist ketat dan simpan di luar webroot publik.'
    },
    {
      key: 'mitm',
      name: 'Man-in-the-Middle (MitM)',
      category: 'Transport & Encryption',
      summarySafe: 'Verifikasi sertifikat TLS aktif dan transmisi sensitif tidak menggunakan plaintext HTTP.',
      mitigationTip: 'Wajibkan HTTPS, aktifkan HSTS, dan setel flag Secure/HttpOnly pada cookies.'
    },
    {
      key: 'phishing',
      name: 'Phishing & Social Engineering',
      category: 'Redirects & Clickjacking',
      summarySafe: 'Tidak ditemukan endpoint open redirect atau risiko framing antarmuka tanpa batas.',
      mitigationTip: 'Batasi target pengalihan ke URL internal dan pasang header X-Frame-Options: DENY.'
    },
    {
      key: 'deface',
      name: 'Website Defacement Risk',
      category: 'Content & Asset Protection',
      summarySafe: 'Berkas template dan webroot terlindungi dari modifikasi runtime tidak terotorisasi.',
      mitigationTip: 'Terapkan izin file read-only pada direktori statis dan amankan rute CMS.'
    },
    {
      key: 'lfi_rfi',
      name: 'Local / Remote File Inclusion (LFI/RFI)',
      category: 'File System & SSRF',
      summarySafe: 'Akses sistem file terlindungi dari path traversal dan tidak ada SSRF terbuka.',
      mitigationTip: 'Sanitasi path dengan path.basename() dan batasi request server ke domain tepercaya.'
    },
    {
      key: 'zero_day',
      name: 'Zero-Day & Dynamic Code Execution',
      category: 'Runtime & Supply Chain',
      summarySafe: 'Tidak ada penggunaan fungsi eksekusi dinamis eval() atau prototype pollution.',
      mitigationTip: 'Gunakan dependensi versi terkunci (lockfile) dan hindari evaluasi kode runtime.'
    }
  ];

  const threatMatrix: ThreatCheck[] = threatDefinitions.map(def => {
    const count = threatCounts[def.key] || 0;
    let status: 'Secure' | 'Warning' | 'Vulnerable' = 'Secure';
    let summary = def.summarySafe;

    if (count > 0) {
      // Check if any finding is Critical or High
      const matchingFindings = findings.filter(f => f.threatCategory === def.key);
      const hasCritical = matchingFindings.some(f => f.severity === 'Critical');
      const hasHigh = matchingFindings.some(f => f.severity === 'High');

      if (hasCritical || hasHigh) {
        status = 'Vulnerable';
        summary = `Terdeteksi ${count} celah keamanan kritis/tinggi terkait ${def.name}.`;
      } else {
        status = 'Warning';
        summary = `Terdeteksi ${count} peringatan konfigurasi terkait ${def.name}.`;
      }
    }

    return {
      key: def.key,
      name: def.name,
      category: def.category,
      status,
      findingsCount: count,
      summary,
      mitigationTip: def.mitigationTip
    };
  });

  return {
    findings,
    secretsToRotate: Array.from(secretsToRotate),
    threatMatrix
  };
}
