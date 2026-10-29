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
function isTestOrDocFile(relativePath: string): boolean {
  return /(?:^|\/)(?:__tests__|__mocks__|tests?|specs?|fixtures?|examples?|samples?)\/|\.(?:test|spec)\.[a-zA-Z0-9]+$|\.(?:md|mdx|txt)$/i.test(relativePath);
}

  // ==========================================
  // AREA 1: SECRETS AUDIT
  // ==========================================
  for (const file of files.securityFiles) {
    const isTestFile = isTestOrDocFile(file.relativePath);
    const secretHits = scanContentForSecrets(file.content, file.relativePath);
    for (const hit of secretHits) {
      secretsToRotate.add(hit.masked);

      addThreatFinding({
        title: `Exposed ${hit.patternName}`,
        severity: isTestFile ? 'Low' : 'Critical',
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
        confidence: isTestFile ? 'Likely, verify' : 'Confirmed'
      });
    }

    // Skip AST / code logic vulnerability heuristics on test and doc files to prevent false alarms
    if (isTestFile) {
      continue;
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

      // 1.2 Insecure logging of sensitive parameters (only when logging actual variables, not static strings)
      if (
        /console\.(?:log|debug|info)\s*\([^)]*(?:,\s*|\{\s*|\$\{\s*)(?:[a-zA-Z0-9_.]*(?:password|token|secret|credit_card|card_number|authorization)|req\.body\.[a-zA-Z0-9_]+)/i.test(line) &&
        !/console\.(?:log|debug|info)\s*\(\s*['"`][^'"`$]*(?:success|received|sent|started|finished|verified)['"`]\s*\)/i.test(line)
      ) {
        addThreatFinding({
          title: `Sensitive Data Printed to Application Logs`,
          severity: 'Medium',
          area: 'Secrets',
          location: { file: file.relativePath, line: lineNum, snippet: line.trim() },
          what: `Console log statement outputs sensitive variable or property (passwords/tokens/secrets).`,
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
        /(?:db|conn|client|sequelize|pool)\.(?:query|execute)\s*\(\s*['"`]\s*(?:SELECT|INSERT|UPDATE|DELETE)[^'`"]*['"`]\s*\+\s*(?!['"`])[a-zA-Z0-9_.]+/i.test(line) ||
        /(?:const|let|var)?\s*[a-zA-Z0-9_]*(?:query|sql|stmt)\s*=\s*['"`]\s*(?:SELECT|INSERT|UPDATE|DELETE)[^'`"]*['"`]\s*\+\s*(?!['"`])[a-zA-Z0-9_.]+/i.test(line) ||
        /(?:const|let|var)?\s*[a-zA-Z0-9_]*(?:query|sql|stmt)\s*=\s*`\s*(?:SELECT|INSERT|UPDATE|DELETE)[^`]*\$\{[^}]+\}/i.test(line) ||
        /\$db->(?:query|exec)\s*\(\s*['"][^'"]*\$[a-zA-Z0-9_]+/i.test(line) ||
        /(?:cursor|connection|conn)\.execute\s*\(\s*f['"][^'"]*\{[^}]+\}/i.test(line) ||
        /(?:text|\.raw)\s*\(\s*f['"][^'"]*\{[^}]+\}\s*\)/i.test(line) ||
        /(?:cursor|connection|conn)\.execute\s*\(\s*['"][^'"]*%s['"]\s*%\s*(?!['"])[a-zA-Z0-9_.]+/i.test(line)
      ) {
        addThreatFinding({
          title: `SQL Injection (SQLi) via Dynamic Query Concatenation`,
          severity: 'Critical',
          area: 'Code',
          threatCategory: 'sqli',
          location: { file: file.relativePath, line: lineNum, snippet: line.trim() },
          what: `SQL query string is dynamically assembled via concatenation or template interpolation with user-controllable input.`,
          why: `Attackers can inject arbitrary SQL commands to extract database contents, bypass authentication (e.g. ' OR '1'='1), or alter database structure.`,
          recommendedFix: `Use parameterized queries ($1, ?, :param) or an object-relational mapping (ORM) query builder.`,
          verifyWith: `Test endpoints with single quotes (') or SQL injection payloads to verify query sanitization.`,
          confidence: 'Confirmed'
        });
      }

      // ==========================================
      // THREAT 2: CROSS-SITE SCRIPTING (XSS)
      // ==========================================
      if (
        (/dangerouslySetInnerHTML\s*=\s*\{\s*\{\s*__html\s*:\s*(?!sanitize|DOMPurify)[a-zA-Z0-9_.]+\s*\}\s*\}/.test(line) ||
         /\.innerHTML\s*=\s*(?!sanitize|DOMPurify)[a-zA-Z0-9_.]*(?:req\.|params\.|searchParams|userInput)/i.test(line) ||
         /document\.write\s*\([^)]*(?:location|search|query|params)/i.test(line) ||
         /res\.(?:send|write)\s*\(\s*['"`]<[^>]+>[^'"`]*\$\{[^}]+\}/i.test(line)) &&
        !/DOMPurify\.sanitize|sanitizeHtml|validator\.escape/i.test(line)
      ) {
        addThreatFinding({
          title: `Cross-Site Scripting (XSS) via Unsanitized Markup Insertion`,
          severity: 'High',
          area: 'Code',
          threatCategory: 'xss',
          location: { file: file.relativePath, line: lineNum, snippet: line.trim() },
          what: `User input is inserted directly into the DOM/HTML response without proper escaping or sanitization (dangerouslySetInnerHTML / innerHTML / res.send).`,
          why: `Attackers can execute malicious JavaScript in the victim's browser to hijack session cookies, steal authorization tokens, or perform keylogging.`,
          recommendedFix: `Sanitize untrusted HTML using DOMPurify or sanitize-html before rendering, or rely on text-only binding (textContent / JSX).`,
          verifyWith: `Send payloads like <script>alert(1)</script> or <img src=x onerror=alert(1)> to test input handling.`,
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
          what: `Password or secret verification uses direct string equality (===) instead of a timing-safe hash comparison function.`,
          why: `Plain string comparison is vulnerable to side-channel timing attacks and indicates passwords may be stored in plaintext.`,
          recommendedFix: `Use bcrypt.compare() or crypto.timingSafeEqual() and verify passwords are hashed using Argon2 or bcrypt.`,
          verifyWith: `Inspect database tables to confirm password credentials are securely hashed before storage.`,
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
        /require\s*\(\s*['"]child_process['"]\s*\)\s*\.exec\s*\([^)]*req\.(?:query|body|params)/i.test(line) ||
        /\bos\.system\s*\([^)]*(?:request\.|params\.|sys\.argv|input\()/i.test(line) ||
        /\bsubprocess\.(?:call|Popen|run)\s*\([^)]*shell\s*=\s*True/i.test(line)
      ) {
        addThreatFinding({
          title: `Malware / Web Shell Backdoor Pattern Detected`,
          severity: 'Critical',
          area: 'Code',
          threatCategory: 'malware_shell',
          location: { file: file.relativePath, line: lineNum, snippet: line.trim() },
          what: `Detected web shell signature or direct system command execution from user inputs (eval/passthru/child_process.exec).`,
          why: `Provides full Remote Code Execution (RCE) capabilities allowing adversaries to compromise the host server.`,
          recommendedFix: `Immediately remove dynamic shell execution scripts and perform a full repository forensic audit.`,
          verifyWith: `Review commit history for this file and confirm no web shell or backdoor persistence remains.`,
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
          what: `Upload handler saves uploaded files directly into a public webroot directory using original user filenames without MIME type validation.`,
          why: `Adversaries can upload executable scripts (.php, .jsp, .exe, .html) and trigger them via direct web requests.`,
          recommendedFix: `1. Enforce strict extension allowlists.\n2. Rename uploaded files using random UUIDs.\n3. Store uploaded assets outside the public webroot (e.g. S3 or isolated storage).`,
          verifyWith: `Attempt uploading test files with executable extensions (.php, .html) to verify upload constraints.`,
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
          what: `TLS/SSL certificate validation is explicitly disabled (rejectUnauthorized: false or NODE_TLS_REJECT_UNAUTHORIZED=0).`,
          why: `Allows attackers positioned on the network path to perform Man-in-the-Middle (MitM) inspection and credential interception.`,
          recommendedFix: `Enable standard TLS certificate verification and install valid Certificate Authority (CA) certificates.`,
          verifyWith: `Ensure rejectUnauthorized is set to true or omitted in network transport configurations.`,
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
          what: `Authentication or API endpoints are invoked over unencrypted HTTP (http://).`,
          why: `Credentials and access tokens can be sniffed in transit across public or intermediate networks.`,
          recommendedFix: `Enforce HTTPS for all internal and external service communications.`,
          verifyWith: `Verify that all endpoint URLs specify the https:// scheme.`,
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
          what: `Cookies are issued without Secure, HttpOnly, or SameSite attributes.`,
          why: `Insecure cookies can be intercepted over unencrypted HTTP and exploited in Cross-Site Request Forgery (CSRF) attacks.`,
          recommendedFix: `Configure cookie attributes: { secure: true, httpOnly: true, sameSite: 'lax' | 'strict' }.`,
          verifyWith: `Inspect Set-Cookie headers using curl -I or browser developer tools.`,
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
          what: `Application redirects users to an external URL obtained directly from user input without hostname validation.`,
          why: `Adversaries can craft legitimate-looking links that redirect users to credential-harvesting phishing pages.`,
          recommendedFix: `Restrict redirect destinations to relative paths (starting with /) or enforce a strict domain allowlist.`,
          verifyWith: `Test /login?redirect=https://evil-phishing-site.com to ensure external redirects are rejected.`,
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
          what: `Code modifies public template or webroot files without explicit session or role authentication checks.`,
          why: `Allows unauthenticated users to overwrite public site assets or inject unauthorized content (website defacement).`,
          recommendedFix: `Restrict webroot file modification behind role-based access control (RBAC) and use immutable storage.`,
          verifyWith: `Send unauthenticated HTTP requests to file-writing endpoints to verify access controls.`,
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
          what: `File read operations accept user input directly into file paths without path traversal sanitization.`,
          why: `Adversaries can traverse directories to read sensitive files such as /etc/passwd, .env, or database configs.`,
          recommendedFix: `Use path.basename() and verify path.resolve() remains constrained within intended root directories.`,
          verifyWith: `Test endpoints with path traversal payloads like ../../../../etc/passwd or ../../.env.`,
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
          what: `Server makes outbound HTTP requests to user-supplied URLs without host or IP validation.`,
          why: `Adversaries can force the server to query internal networks (127.0.0.1, cloud metadata 169.254.169.254) or fetch remote payloads.`,
          recommendedFix: `Implement host allowlists and block requests targeting private/loopback IP address ranges.`,
          verifyWith: `Test requests using targets like http://169.254.169.254/latest/meta-data/ or http://localhost:8080.`,
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
          what: `Dynamic JavaScript code execution (eval / new Function) is invoked on runtime inputs.`,
          why: `Dynamic code evaluation allows arbitrary code execution in the application context.`,
          recommendedFix: `Avoid eval() or new Function(). Use safe parsers such as JSON.parse() or dedicated expression engines.`,
          verifyWith: `Review all dynamic evaluation calls and refactor to static or schema-validated parsing.`,
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
          what: `Unchecked object merging directly accepts request payload bodies without sanitizing prototype attributes.`,
          why: `Adversaries can tamper with global Object prototypes to alter application behavior or bypass security checks.`,
          recommendedFix: `Use schema validation (e.g. Zod or Joi) and strip keys like __proto__ or constructor during merge operations.`,
          verifyWith: `Send JSON payloads containing {"__proto__": {"polluted": true}} to test object sanitization.`,
          confidence: 'Likely, verify'
        });
      }

      // Python Insecure Deserialization (pickle / unsafe yaml)
      if (
        /\bpickle\.(?:loads|load)\s*\(/i.test(line) ||
        /\b_pickle\.(?:loads|load)\s*\(/i.test(line) ||
        /\byaml\.(?:load|unsafe_load)\s*\([^)]*(?:Loader\s*=\s*(?:yaml\.)?(?:UnsafeLoader|CLoader|Loader)|\bLoader\b(?!\s*=\s*(?:yaml\.)?SafeLoader))/i.test(line)
      ) {
        addThreatFinding({
          title: `Insecure Deserialization via Python pickle / unsafe yaml.load (Remote Code Execution)`,
          severity: 'Critical',
          area: 'Code',
          threatCategory: 'zero_day',
          location: { file: file.relativePath, line: lineNum, snippet: line.trim() },
          what: `Untrusted object deserialization using pickle or yaml.load without SafeLoader.`,
          why: `Unsafe pickle and PyYAML loaders allow arbitrary object instantiation that can lead to Remote Code Execution (RCE).`,
          recommendedFix: `Use safe serialization formats like JSON or yaml.safe_load(). Never deserialize untrusted pickle data.`,
          verifyWith: `Audit pickle.loads() calls and replace them with json.loads() where possible.`,
          confidence: 'Confirmed'
        });
      }

      // Dockerfile hardcoded secrets
      if (/(?:^|\/)Dockerfile(?:\..*)?$/i.test(file.relativePath)) {
        if (/^\s*ENV\s+[A-Za-z0-9_]*(?:PASSWORD|SECRET|KEY|TOKEN|AUTH)\s*=\s*['"]?[^\s"']{6,}/i.test(line)) {
          addThreatFinding({
            title: `Hardcoded Secret in Dockerfile Image Layer`,
            severity: 'Critical',
            area: 'Secrets',
            threatCategory: 'mitm',
            location: { file: file.relativePath, line: lineNum, snippet: line.trim() },
            what: `Sensitive credentials or tokens are statically defined in Dockerfile ENV instructions.`,
            why: `ENV variables are stored permanently in Docker image layer metadata and can be extracted via image inspection.`,
            recommendedFix: `Use Docker BuildKit secrets (--secret id=mysecret) or inject credentials at container runtime via environment variables.`,
            verifyWith: `Run docker history <image-name> to inspect layers for exposed environment variables.`,
            confidence: 'Confirmed'
          });
        }
      }

      // Python Security Heuristics
      if (file.relativePath.endsWith('.py')) {
        // SQL Injection: string concatenation in raw queries
        if (/cursor\.execute\s*\(\s*['"][^'"]*\$\{[^}]+\}/i.test(line) ||
            /text\(f["']\s*\$\{/.test(line) ||
            /(?:cursor|connection|conn)\.execute\s*\(\s*['"][^'"]*\{[^}]+\}/i.test(line)
        ) {
          addThreatFinding({
            title: `SQL Injection (SQLi) via Python Dynamic Query`,
            severity: 'Critical',
            area: 'Code',
            threatCategory: 'sqli',
            location: { file: file.relativePath, line: lineNum, snippet: line.trim() },
            what: `Python query built via string interpolation or f-strings with user input, allows arbitrary SQL execution.`,
            why: `String formatting in SQL queries directly exposes the database to injection attacks.`,
            recommendedFix: `Use parameterized queries ($1, ?) or an object-relational mapping (ORM) query builder.`,
            verifyWith: `Confirm queries avoid f"SELECT ... {var}" or cursor.execute("..." + var) patterns.`,
            confidence: 'Confirmed'
          });
        }

        // Dynamic Execution / Deserialization
        if (
          /\bpickle\.(?:loads|load)\s*\(/i.test(line) ||
          /\b_pickle\.(?:loads|load)\s*\(/i.test(line) ||
          /eval\s*\(/i.test(line) ||
          /exec\s*\(/i.test(line) ||
          /yaml\.(?:load|unsafe_load)\s*\([^)]*(?:Loader\s*=\s*(?:yaml\.)?(?:UnsafeLoader|CLoader|Loader)|\bLoader\b(?!\s*=\s*(?:yaml\.)?SafeLoader))/i.test(line)
        ) {
          addThreatFinding({
            title: `Insecure Deserialization via Python pickle / eval / exec (RCE)`,
            severity: 'Critical',
            area: 'Code',
            threatCategory: 'zero_day',
            location: { file: file.relativePath, line: lineNum, snippet: line.trim() },
            what: `Untrusted object deserialization or dynamic code execution can trigger Remote Code Execution (RCE).`,
            why: `Pickle deserialization and eval/exec allow arbitrary object/code execution under process privileges.`,
            recommendedFix: `Use JSON or yaml.safe_load(). Never deserialize pickle payloads from external sources.`,
            verifyWith: `Replace pickle.loads() and eval() calls with safe parsers.`,
            confidence: 'Confirmed'
          });
        }

        // SSRF: requests.get(user_url) / httpx.get(user_url)
        if (/requests\.get\s*\(|httpx\.get\s*\(/i.test(line) ||
            /fetch\s*\(\s*req\.(?:query|body)\.(?:url|target)/i.test(line)
        ) {
          addThreatFinding({
            title: `SSRF via requests / httpx tanpa validasi hostname`,
            severity: 'High',
            area: 'Code',
            threatCategory: 'mitm',
            location: { file: file.relativePath, line: lineNum, snippet: line.trim() },
            what: `Direct invocations of requests.get() or httpx.get() using user-supplied URLs without host/IP validation.`,
            why: `Server-Side Request Forgery allows attackers to force the server to issue requests to internal networks or private IP ranges.`,
            recommendedFix: `Validate hostnames against an allowlist and restrict access to private/loopback IP ranges.`,
            verifyWith: `Ensure requests target trusted hosts only and enforce hostname allowlists.`,
            confidence: 'Likely, verify'
          });
        }

        // Insecure CORS in FastAPI
        if (/fastapi.*Helmet|allow_origins\s*=\s*\["\*"/i.test(file.content)) {
          addThreatFinding({
            title: `Insecure CORS Configuration FastAPI`,
            severity: 'High',
            area: 'Code',
            threatCategory: 'mitm',
            location: { file: file.relativePath, line: lineNum, snippet: line.trim() },
            what: `FastAPI CORS configuration uses allow_origins=["*"] alongside credentials.`,
            why: `Overly permissive CORS settings expose endpoints to unauthorized cross-origin requests.`,
            recommendedFix: `Specify explicit allowed origins and disable allow_credentials unless explicitly required.`,
            verifyWith: `Verify FastAPI CORS middleware does not use wildcard origins.`,
            confidence: 'Likely, verify'
          });
        }
      }

      // ==========================================
      // DOCKER & IaC HARDENING
      // ==========================================
      if (file.relativePath.endsWith('.dockerfile') || file.relativePath.endsWith('Dockerfile')) {
        // Root user execution
        if (/^USER\s+root/i.test(line) && !/^USER\s+\w+|^USER\s+\d{3,}/i.test(line)) {
          addThreatFinding({
            title: `Dockerfile Running as Root User`,
            severity: 'High',
            area: 'Code',
            threatCategory: 'ddos',
            location: { file: file.relativePath, line: lineNum, snippet: line.trim() },
            what: `Dockerfile uses USER root as the primary runtime user.`,
            why: `Running containers as root grants root privileges inside the container and increases host exposure during container escapes.`,
            recommendedFix: `Create and switch to a non-root user before application entrypoint instructions.`,
            verifyWith: `Inspect Dockerfile to confirm non-root USER directive precedes CMD/ENTRYPOINT.`,
            confidence: 'Confirmed'
          });
        }

        // EOL base images
        if (/FROM\s+\w+:\s*\d+\.\d[^)]*$/i.test(line) && !/^FROM\s+\w+:\s*(?:latest|stable)/i.test(line)) {
          // Check if tag is not latest/stable - already covered by regex above
        }

        // Missing .dockerignore
        const fileContent = file.content;
        if (/^ADD\s+|^COPY\s+/i.test(line) && !/\\.dockerignore/i.test(fileContent)) {
          addThreatFinding({
            title: `Missing .dockerignore File`,
            severity: 'Medium',
            area: 'Code',
            threatCategory: 'ddos',
            location: { file: file.relativePath, line: lineNum, snippet: line.trim() },
            what: `Dockerfile ADD/COPY directives used without a .dockerignore file.`,
            why: `Without .dockerignore, sensitive local files (.env, documentation, build artifacts) may be copied into the final image.`,
            recommendedFix: `Add a .dockerignore file to exclude unnecessary and sensitive assets from docker context builds.`,
            verifyWith: `Check that a .dockerignore file exists in the repository root directory.`,
            confidence: 'Likely, verify'
          });
        }

        // Exposed debug ports
        if (/^EXPOSE\s+\d+/.test(line) && /(22|23|5900|6073|6074|6080|6081|6082|6083|6084|6085|6086|6087|6088|6089|6090)/i.test(line)) {
          addThreatFinding({
            title: `Dockerfile Exposed Debug Ports`,
            severity: 'High',
            area: 'Code',
            threatCategory: 'ddos',
            location: { file: file.relativePath, line: lineNum, snippet: line.trim() },
            what: `Debug or management ports (e.g. SSH, VNC) are exposed in Dockerfile directives without restriction.`,
            why: `Exposing management or debug ports increases container attack surface and risk of unauthorized remote access.`,
            recommendedFix: `Remove EXPOSE directives for management ports and restrict container network exposure.`,
            verifyWith: `Verify that EXPOSE directives include only necessary application service ports.`,
            confidence: 'Confirmed'
          });
        }
      }

      // ReDoS pattern
      if (/\/(?:[a-zA-Z0-9_]+\+)\+\/|\/(?:[a-zA-Z0-9_]+\*)\*\/|\/(?:[a-zA-Z0-9_]+\|)+\+/.test(line)) {
        addThreatFinding({
          title: `Vulnerable Regular Expression (ReDoS / Resource Exhaustion Vector)`,
          severity: 'Medium',
          area: 'Code',
          threatCategory: 'ddos',
          location: { file: file.relativePath, line: lineNum, snippet: line.trim() },
            what: `Regular expression contains nested quantifiers susceptible to catastrophic backtracking.`,
            why: `Attackers can supply crafted input strings that cause 100% CPU utilization and Denial of Service (ReDoS).`,
            recommendedFix: `Simplify regex patterns or use non-backtracking regular expression engines (e.g. RE2).`,
            verifyWith: `Test regular expressions against repeated non-matching string patterns to verify execution performance.`,
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

  const allSourceContent = files.securityFiles.map((f) => f.content).join('\n');
  const usesHelmet = /helmet\s*\(|koa-helmet|fastify-helmet|@fastify\/helmet/i.test(allSourceContent);
  if (usesHelmet) {
    hasFrameGuard = true;
    hasCspConfigured = true;
  }

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

  if (!hasCspConfigured && (files.configs.length > 0 || isBackendProject)) {
    const primaryConfig = files.configs[0]?.path || files.securityFiles[0]?.relativePath || 'next.config.js';
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

  if (!hasFrameGuard && (files.configs.length > 0 || isBackendProject)) {
    const primaryConfig = files.configs[0]?.path || files.securityFiles[0]?.relativePath || 'server.ts';
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
