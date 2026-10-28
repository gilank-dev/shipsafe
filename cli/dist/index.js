#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCli = runCli;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const util_1 = require("util");
const adm_zip_1 = __importDefault(require("adm-zip"));
// ============================================================================
// ANSI Color Codes & Terminal Styling
// ============================================================================
// Colors are applied via classes; terminals without color support will
// see raw codes but the layout remains intact. Never paint backgrounds
// — the canvas is the reader's theme.
const COLORS = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
    bgBlue: '\x1b[44m',
    bgMagenta: '\x1b[45m',
    bgCyan: '\x1b[46m',
    bgBlack: '\x1b[40m',
};
const SEVERITY_COLORS = {
    CRITICAL: COLORS.bgRed + COLORS.white,
    HIGH: COLORS.bgRed + COLORS.black,
    MEDIUM: COLORS.bgYellow + COLORS.black,
    LOW: COLORS.bgBlue + COLORS.white,
};
const style = {
    reset: () => COLORS.reset,
    bold: (s) => COLORS.bold + s + COLORS.reset,
    red: (s) => COLORS.red + s + COLORS.reset,
    green: (s) => COLORS.green + s + COLORS.reset,
    yellow: (s) => COLORS.yellow + s + COLORS.reset,
    cyan: (s) => COLORS.cyan + s + COLORS.reset,
    bgRed: (s) => COLORS.bgRed + s + COLORS.reset,
    bgGreen: (s) => COLORS.bgGreen + s + COLORS.reset,
    bgYellow: (s) => COLORS.bgYellow + s + COLORS.reset,
    bgBlue: (s) => COLORS.bgBlue + s + COLORS.reset,
    critical: (s) => COLORS.bgRed + COLORS.white + s + COLORS.reset,
    high: (s) => COLORS.bgRed + COLORS.black + s + COLORS.reset,
    medium: (s) => COLORS.bgYellow + COLORS.black + s + COLORS.reset,
    low: (s) => COLORS.bgBlue + COLORS.white + s + COLORS.reset,
    info: (s) => COLORS.dim + s + COLORS.reset,
    dim: (s) => COLORS.dim + s + COLORS.reset,
};
// ============================================================================
// Severity Weight Map (for threshold gating)
// ============================================================================
const SEVERITY_WEIGHT = {
    CRITICAL: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
};
const RULES = [
    {
        id: 'SEC-SQLI-01',
        title: 'SQL Injection via Template String Interpolation',
        severity: 'CRITICAL',
        category: 'SQL Injection',
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.mjs'],
        regex: /(?:query|execute|raw|\$queryRawUnsafe)\s*\(\s*`[^`]*\$\{[^}]+\}[^`]*`\s*\)|(?:const|let|var)?\s*[a-zA-Z0-9_]*(?:query|sql|stmt)\s*=\s*`\s*(?:SELECT|INSERT|UPDATE|DELETE)[^`]*\$\{[^}]+\}/i,
        description: 'Raw SQL query constructed via template string interpolation allowing arbitrary SQL injection.',
        remediation: 'Use parameterized queries ($1, ? or Prisma/Drizzle type-safe query builders).',
    },
    {
        id: 'SEC-XSS-01',
        title: 'Cross-Site Scripting via dangerouslySetInnerHTML',
        severity: 'HIGH',
        category: 'XSS',
        extensions: ['.jsx', '.tsx'],
        regex: /dangerouslySetInnerHTML\s*=\s*\{\s*\{\s*__html\s*:/,
        description: 'Direct injection of unescaped HTML content bypassing React XSS protections.',
        remediation: 'Sanitize with DOMPurify or render pure text/safe React elements.',
    },
    {
        id: 'SEC-SECRET-01',
        title: 'Hardcoded High-Entropy Secret or Private Key',
        severity: 'CRITICAL',
        category: 'Secret Exposure',
        extensions: ['.js', '.ts', '.json', '.env', '.py'],
        regex: /(?:AKIA[0-9A-Z]{16}|sk_live_[0-9a-zA-Z]{24,}|ghp_[0-9a-zA-Z]{36}|-----BEGIN (?:RSA )?PRIVATE KEY-----)/,
        description: 'Exposed live API key or private certificate directly in source files.',
        remediation: 'Rotate credential immediately and store in environment variables (.env / secrets vault).',
    },
    {
        id: 'SEC-EVAL-01',
        title: 'Arbitrary Code Execution via eval() or Function constructor',
        severity: 'CRITICAL',
        category: 'Zero-Day / Code Execution',
        extensions: ['.js', '.ts', '.mjs'],
        regex: /(?:eval\s*\((?!\s*\))|new\s+Function\s*\()/,
        description: 'Dynamic execution of unvalidated code strings.',
        remediation: 'Replace dynamic evaluation with static parser or structured data mapping.',
    },
    {
        id: 'SEC-PATH-01',
        title: 'Potential Path Traversal in File Operations',
        severity: 'HIGH',
        category: 'LFI / Path Traversal',
        extensions: ['.js', '.ts'],
        regex: /(?:readFile|writeFile|createReadStream)\s*\(\s*(?:req\.|params\.|query\.)/,
        description: 'User-controlled input passed directly to filesystem I/O without path normalization.',
        remediation: 'Validate input against an allowlist and verify path.resolve stays within target directory.',
    },
];
// ============================================================================
// .gitignore Parsing (no external deps)
// ============================================================================
function parseGitIgnore(gitignorePath) {
    const rules = [];
    try {
        const content = fs.readFileSync(gitignorePath, 'utf-8');
        for (const rawLine of content.split('\n')) {
            const line = rawLine.trim();
            if (!line || line.startsWith('#'))
                continue;
            let negate = false;
            let pattern = line;
            if (line.startsWith('!')) {
                negate = true;
                pattern = line.slice(1);
            }
            const directoryOnly = pattern.endsWith('/');
            if (directoryOnly)
                pattern = pattern.slice(0, -1);
            const anchored = pattern.includes('/') && !pattern.startsWith('*');
            rules.push({
                pattern: pattern.replace(/([.+?^${}()|[\]\\])/g, '\\$1').replace(/\*/g, '.*'),
                negate,
                directoryOnly,
                anchored,
            });
        }
    }
    catch {
        // File doesn't exist or unreadable — graceful degradation
    }
    return rules;
}
function loadGitIgnoreRules(rootDir) {
    const rules = [];
    let currentDir = rootDir;
    while (true) {
        const gitignorePath = path.join(currentDir, '.gitignore');
        rules.push(...parseGitIgnore(gitignorePath));
        const parentDir = path.dirname(currentDir);
        if (parentDir === currentDir)
            break;
        currentDir = parentDir;
    }
    return rules;
}
function shouldIgnore(relPath, isDirectory, gitIgnoreRules) {
    let ignored = false;
    for (const rule of gitIgnoreRules) {
        if (rule.directoryOnly && !isDirectory)
            continue;
        const testPath = rule.anchored ? relPath : path.basename(relPath);
        const regex = new RegExp(`^${rule.pattern}$`);
        if (regex.test(testPath)) {
            ignored = !rule.negate;
        }
    }
    return ignored;
}
function generateSarif(result, toolVersion) {
    const ruleMap = new Map();
    const sarifRules = [];
    const results = [];
    let ruleIndex = 0;
    for (const finding of result.findings) {
        if (!ruleMap.has(finding.id)) {
            ruleMap.set(finding.id, ruleIndex);
            sarifRules.push({
                id: finding.id,
                name: finding.title,
                shortDescription: { text: finding.title },
                fullDescription: {
                    text: finding.description,
                    markdown: `**Remediation:** ${finding.remediation}`,
                },
                help: {
                    text: finding.remediation,
                    markdown: `**Remediation:** ${finding.remediation}`,
                },
                helpUri: `https://github.com/shipsafe/rules/${finding.id.toLowerCase()}`,
                defaultConfiguration: {
                    level: finding.severity === 'CRITICAL' || finding.severity === 'HIGH' ? 'error' : 'warning',
                },
            });
            ruleIndex++;
        }
        const sarifRuleIndex = ruleMap.get(finding.id);
        const level = finding.severity === 'CRITICAL' || finding.severity === 'HIGH' ? 'error' : 'warning';
        const lineHash = crypto
            .createHash('sha256')
            .update(`${finding.file}:${finding.line || 1}`)
            .digest('hex')
            .slice(0, 16);
        results.push({
            ruleId: finding.id,
            ruleIndex: sarifRuleIndex,
            level,
            message: { text: `${finding.title}: ${finding.description}` },
            locations: [
                {
                    physicalLocation: {
                        artifactLocation: {
                            uri: finding.file,
                            uriBaseId: '%SRCROOT%',
                        },
                        region: {
                            startLine: finding.line || 1,
                            startColumn: 1,
                        },
                    },
                },
            ],
            partialFingerprints: { primaryLocationLineHash: lineHash },
        });
    }
    return {
        version: '2.1.0',
        $schema: 'https://schemastore.org/schemas/json/sarif-2.1.0.json',
        runs: [
            {
                tool: {
                    driver: {
                        name: 'ShipSafe',
                        version: toolVersion,
                        informationUri: 'https://github.com/shipsafe/shipsafe',
                        rules: sarifRules,
                    },
                },
                results,
                columnKind: 'utf16CodeUnits',
            },
        ],
    };
}
// ============================================================================
// Directory Scanner with .gitignore Support
// ============================================================================
const DEFAULT_IGNORED_DIRS = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage'];
function scanDirectory(rootDir, options = {}) {
    const { ignoredDirs = DEFAULT_IGNORED_DIRS, gitIgnoreRules = [], respectGitIgnore = true } = options;
    let scannedFiles = 0;
    const findings = [];
    function walk(currentDir, relBase = '') {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });
        for (const entry of entries) {
            const relPath = relBase ? path.join(relBase, entry.name) : entry.name;
            const normalizedRelPath = relPath.replace(/\\/g, '/');
            if (entry.isDirectory()) {
                if (!ignoredDirs.includes(entry.name)) {
                    const shouldSkip = respectGitIgnore && shouldIgnore(normalizedRelPath, true, gitIgnoreRules);
                    if (!shouldSkip) {
                        walk(path.join(currentDir, entry.name), relPath);
                    }
                }
            }
            else if (entry.isFile()) {
                if (entry.name === '.gitignore' || entry.name.startsWith('.git'))
                    continue;
                if (/\.(?:test|spec)\.[a-zA-Z0-9]+$/i.test(entry.name))
                    continue;
                const shouldSkip = respectGitIgnore && shouldIgnore(normalizedRelPath, false, gitIgnoreRules);
                if (shouldSkip)
                    continue;
                const ext = path.extname(entry.name).toLowerCase();
                const fullPath = path.join(currentDir, entry.name);
                try {
                    const content = fs.readFileSync(fullPath, 'utf-8');
                    scannedFiles++;
                    const lines = content.split('\n');
                    for (const rule of RULES) {
                        if (rule.extensions.includes(ext) || rule.extensions.includes('*')) {
                            for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
                                const lineContent = lines[lineIdx];
                                if (rule.regex.test(lineContent)) {
                                    findings.push({
                                        id: rule.id,
                                        title: rule.title,
                                        severity: rule.severity,
                                        category: rule.category,
                                        file: normalizedRelPath,
                                        line: lineIdx + 1,
                                        description: rule.description,
                                        remediation: rule.remediation,
                                    });
                                }
                            }
                        }
                    }
                }
                catch {
                    // Skip binary or unreadable files
                }
            }
        }
    }
    walk(rootDir);
    const counts = {
        critical: findings.filter((f) => f.severity === 'CRITICAL').length,
        high: findings.filter((f) => f.severity === 'HIGH').length,
        medium: findings.filter((f) => f.severity === 'MEDIUM').length,
        low: findings.filter((f) => f.severity === 'LOW').length,
    };
    const verdict = counts.critical > 0 || counts.high > 0 ? 'REJECTED' : 'APPROVED_FOR_SHIP';
    return {
        targetDir: rootDir,
        scannedFiles,
        findings,
        verdict,
        counts,
    };
}
// ============================================================================
// Remote Audit (In-Memory ZIP + multipart/form-data)
// ============================================================================
function createZipBuffer(rootDir, gitIgnoreRules = []) {
    const zip = new adm_zip_1.default();
    function addToZip(currentDir, relBase = '') {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });
        for (const entry of entries) {
            const relPath = relBase ? path.join(relBase, entry.name) : entry.name;
            const normalizedRelPath = relPath.replace(/\\/g, '/');
            if (entry.isDirectory()) {
                if (!DEFAULT_IGNORED_DIRS.includes(entry.name)) {
                    const shouldSkip = shouldIgnore(normalizedRelPath, true, gitIgnoreRules);
                    if (!shouldSkip) {
                        addToZip(path.join(currentDir, entry.name), relPath);
                    }
                }
            }
            else if (entry.isFile()) {
                const shouldSkip = shouldIgnore(normalizedRelPath, false, gitIgnoreRules);
                if (shouldSkip)
                    continue;
                const fullPath = path.join(currentDir, entry.name);
                try {
                    const content = fs.readFileSync(fullPath);
                    zip.addFile(normalizedRelPath, content);
                }
                catch {
                    // Skip unreadable
                }
            }
        }
    }
    addToZip(rootDir);
    return zip.toBuffer();
}
async function runRemoteAudit(config, targetDir, gitIgnoreRules) {
    const formData = new FormData();
    const zipBuffer = createZipBuffer(targetDir, gitIgnoreRules);
    formData.append('file', new Blob([new Uint8Array(zipBuffer)]), 'project.zip');
    formData.append('zip', new Blob([new Uint8Array(zipBuffer)]), 'project.zip');
    const abortCtrl = new AbortController();
    const timeoutId = setTimeout(() => abortCtrl.abort(), 60000);
    const response = await fetch(`${config.remoteUrl.replace(/\/+$/, '')}/api/audit`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${config.apiKey}`,
            'X-ShipSafe-Client': 'cli',
        },
        body: formData,
        signal: abortCtrl.signal,
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Remote audit failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
    const data = await response.json();
    const rawFindings = data.report?.findings || data.findings || [];
    // Transform backend response to ScanResult format
    const findings = rawFindings.map((f) => ({
        id: f.id || f.ruleId || 'UNKNOWN',
        title: f.title || f.message || 'Unknown finding',
        severity: String(f.severity || 'MEDIUM').toUpperCase(),
        category: f.category || f.area || 'Security',
        file: f.file || f.location?.file || 'unknown',
        line: f.line || f.location?.line,
        description: f.description || f.what || f.message || '',
        remediation: f.remediation || f.recommendedFix || 'See documentation for remediation steps.',
    }));
    const counts = {
        critical: findings.filter((f) => f.severity === 'CRITICAL').length,
        high: findings.filter((f) => f.severity === 'HIGH').length,
        medium: findings.filter((f) => f.severity === 'MEDIUM').length,
        low: findings.filter((f) => f.severity === 'LOW').length,
    };
    const verdict = counts.critical > 0 || counts.high > 0 ? 'REJECTED' : 'APPROVED_FOR_SHIP';
    return {
        targetDir,
        scannedFiles: data.scannedFiles || rawFindings.length,
        findings,
        verdict,
        counts,
    };
}
// ============================================================================
// Report Printers
// ============================================================================
function printTextReport(result, failOn) {
    const LINE = '─'.repeat(74);
    const isPass = result.verdict === 'APPROVED_FOR_SHIP';
    const failColor = isPass ? style.green : style.red;
    const failText = isPass ? 'APPROVED FOR SHIP' : 'REJECTED - SHIP BLOCKED';
    console.log('');
    // Header docket
    console.log(`┌${style.bold(LINE)}┐`);
    console.log(`│ ${style.bold('SHIPSAFE SECURITY DOCKET')} // VERDICT: ${failColor(failText)} ${style.reset().padEnd(74 - 25 - failText.length)}│`);
    console.log(`├${style.bold(LINE)}┤`);
    console.log(`│ ${style.dim('Target Directory:')} ${path.resolve(result.targetDir).slice(0, 70).padEnd(70)} │`);
    console.log(`│ ${style.dim('Scanned Files   :')} ${result.scannedFiles} source files verified ${style.reset().padEnd(74 - 28 - String(result.scannedFiles).length)}│`);
    console.log(`│ ${style.dim('Critical: ')} ${result.counts.critical}  ${style.bgRed(' HIGH: ' + result.counts.high)}  ${style.bgYellow(' MEDIUM: ' + result.counts.medium)}  ${style.bgBlue(' LOW: ' + result.counts.low)} ${style.reset().padEnd(74)} │`);
    console.log(`└${style.bold(LINE)}┘`);
    console.log('');
    if (result.findings.length === 0) {
        console.log(style.green('✓ All AST/regex perimeter checks passed. No high-risk vectors detected.'));
        console.log('');
        return;
    }
    // Findings table
    console.log(style.bold('FLAGGED FINDINGS:'));
    console.log(LINE);
    for (const f of result.findings) {
        const loc = f.line ? `${style.cyan(f.file)}:${style.dim(String(f.line))}` : style.cyan(f.file);
        const sevFunc = style[f.severity.toLowerCase()] || style.dim;
        console.log(sevFunc(`[${f.severity}]`) + ' ' + style.bold(f.id + ': ' + f.title));
        console.log(`  Location : ${loc}`);
        console.log(`  Threat   : ${f.category}`);
        console.log(`  Remedy   : ${f.remediation}`);
        console.log('');
    }
    console.log(LINE);
    console.log(style.dim(`Gatekeeper rule active: Fail on severity >= ${style.bold(failOn.toUpperCase())}`));
    console.log('');
}
function printJsonReport(result) {
    console.log(JSON.stringify(result, null, 2));
}
function printSarifReport(result, toolVersion) {
    const sarif = generateSarif(result, toolVersion);
    console.log(JSON.stringify(sarif, null, 2));
}
// ============================================================================
// Main CLI Entry Point
// ============================================================================
const PACKAGE_VERSION = '1.0.0';
async function runCli() {
    const { values, positionals } = (0, util_1.parseArgs)({
        args: process.argv.slice(2),
        options: {
            help: { type: 'boolean', short: 'h' },
            version: { type: 'boolean', short: 'v' },
            format: { type: 'string', default: 'text' },
            'fail-on': { type: 'string', default: 'high' },
            ignore: { type: 'string' },
            'remote-url': { type: 'string' },
            'api-key': { type: 'string' },
            'no-gitignore': { type: 'boolean' },
        },
        allowPositionals: true,
    });
    if (values.help) {
        console.log(`
================================================================================
                     SHIPSAFE SECURITY GATEKEEPER CLI
================================================================================

USAGE:
  shipsafe scan [dir] [options]

COMMANDS:
  scan [dir]       Scan target directory (default: current directory '.')

OPTIONS:
  --fail-on=<level>    Minimum severity to return exit code 1
                     (critical|high|medium|low) [default: high]
  --format=<type>      Output format: text, json, sarif [default: text]
  --ignore=<dirs>      Comma-separated directories to ignore
                     [default: node_modules,dist,.git]
  --remote-url=<url>   ShipSafe VPS endpoint for remote audit
                     (e.g., https://api.shipsafe.dev)
  --api-key=<key>      API key for remote authentication
  --no-gitignore       Disable .gitignore parsing (respect only --ignore dirs)
  -h, --help         Show this help docket and exit
  -v, --version      Display CLI version

EXAMPLES:
  # Local scan with ASCII docket output
  shipsafe scan .

  # JSON output for CI parsing
  shipsafe scan . --format=json

  # SARIF for GitHub Code Scanning
  shipsafe scan . --format=sarif

  # Remote audit to VPS (both flags required)
  shipsafe scan . \
    --remote-url=https://api.shipsafe.dev \
    --api-key=sk_live_...

  # Ignore specific directories
  shipsafe scan . --ignore=vendor,tmp,build

  # Bypass .gitignore, use only --ignore dirs
  shipsafe scan . --no-gitignore --ignore=node_modules,dist

================================================================================
`);
        process.exit(0);
    }
    if (values.version) {
        console.log(`@lankdev/shipsafe-cli v${PACKAGE_VERSION}`);
        process.exit(0);
    }
    const command = positionals[0] || 'scan';
    if (command !== 'scan') {
        console.error(`Unknown command: ${command}. Use 'shipsafe --help' for available commands.`);
        process.exit(2);
    }
    const targetDir = positionals[1] || '.';
    const failOn = values['fail-on'].toLowerCase();
    const format = values.format;
    const remoteUrl = values['remote-url'];
    const apiKey = values['api-key'];
    const noGitignore = values['no-gitignore'];
    const userIgnores = values.ignore ? values.ignore.split(',') : [];
    const ignoredDirs = Array.from(new Set([...DEFAULT_IGNORED_DIRS, ...userIgnores]));
    if (!fs.existsSync(targetDir)) {
        console.error(`Error: Target directory does not exist: ${targetDir}`);
        process.exit(2);
    }
    // Validate remote audit flags
    if ((remoteUrl && !apiKey) || (!remoteUrl && apiKey)) {
        console.error('Error: Both --remote-url and --api-key must be provided together for remote audit.');
        process.exit(2);
    }
    // Load .gitignore rules
    const gitIgnoreRules = noGitignore ? [] : loadGitIgnoreRules(path.resolve(targetDir));
    // Execute scan
    let result;
    if (remoteUrl && apiKey) {
        // Remote audit mode
        try {
            result = await runRemoteAudit({ remoteUrl, apiKey }, targetDir, gitIgnoreRules);
        }
        catch (error) {
            console.error(`Error: ${error.message ?? 'Remote audit failed — check URL, API key, and network'}`);
            process.exitCode = 2;
            if (process.env.NODE_ENV === 'test') {
                process.exit(2);
            }
            return;
        }
    }
    else {
        // Local scan mode
        result = scanDirectory(targetDir, { ignoredDirs, gitIgnoreRules, respectGitIgnore: !noGitignore });
    }
    // Output format
    if (format === 'json') {
        printJsonReport(result);
    }
    else if (format === 'sarif') {
        printSarifReport(result, PACKAGE_VERSION);
    }
    else {
        // Text format — the Customs Docket
        printTextReport(result, failOn);
    }
    // Determine exit code based on threshold
    const thresholdWeight = SEVERITY_WEIGHT[failOn.toUpperCase()] || 3;
    const hasFailingViolation = result.findings.some((f) => SEVERITY_WEIGHT[f.severity] >= thresholdWeight);
    const exitCode = hasFailingViolation ? 1 : 0;
    process.exitCode = exitCode;
    // In test environment, call process.exit so test mocks capture the code
    if (process.env.NODE_ENV === 'test') {
        process.exit(exitCode);
    }
}
// Entry point when running `node dist/index.js` directly
if (process.env.NODE_ENV !== 'test' &&
    typeof require !== 'undefined' &&
    require.main === module) {
    runCli().catch((err) => {
        console.error(err);
        process.exit(2);
    });
}
