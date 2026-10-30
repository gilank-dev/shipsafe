export interface SecretFinding {
  patternName: string;
  masked: string;
  line?: number;
  file?: string;
  snippet?: string;
}

const SECRET_PATTERNS: { name: string; regex: RegExp }[] = [
  { name: 'Stripe Live Secret Key', regex: /sk_live_[0-9a-zA-Z]{24,}/g },
  { name: 'Stripe Restricted Key', regex: /rk_live_[0-9a-zA-Z]{24,}/g },
  { name: 'AWS Access Key ID', regex: /AKIA[0-9A-Z]{16}/g },
  { name: 'GitHub Personal Access Token', regex: /ghp_[0-9a-zA-Z]{36}/g },
  { name: 'GitHub Fine-grained PAT', regex: /github_pat_[0-9a-zA-Z_]{60,}/g },
  { name: 'RSA / OpenSSH / PGP Private Key', regex: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED |PGP )?PRIVATE KEY(?: BLOCK)?-----/g },
  { name: 'Database Connection String', regex: /(?:postgres|postgresql|mysql|mongodb|mongodb\+srv|redis):\/\/[a-zA-Z0-9_]+:[^@\s"']+@[^\s"']+/g },
  { name: 'Slack Incoming Webhook', regex: /https:\/\/hooks\.slack\.com\/services\/T[0-9A-Z]{8,}\/B[0-9A-Z]{8,}\/[0-9a-zA-Z]{24}/g },
  { name: 'SendGrid API Key', regex: /SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}/g },
  { name: 'JWT Secret or Supabase Key', regex: /eyJhbGciOi[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g }
];

const IGNORE_SUBSTRINGS = [
  'REDACTED',
  'EXAMPLE',
  'PLACEHOLDER',
  'YOUR_',
  'YOUR-',
  'SAMPLE',
  'TEST',
  'DUMMY',
  'XXXX',
  '****',
  'CHANGE_ME',
  'CHANGEME',
  'INSERT_HERE',
  'REPLACE_ME',
  'YOUR_KEY',
  'YOUR_API_KEY',
  'FOOBAR',
  'FAKE_KEY'
];

export function maskSecret(value: string): string {
  if (!value) return '****';
  // Idempotency: if already masked (e.g. "sk_l****" or "AKIA****" or "****"), preserve without mutating
  if (value.endsWith('****')) {
    const prefix = value.slice(0, -4);
    if (prefix.length <= 4 && !prefix.includes('*')) {
      return value;
    }
  }
  if (value.length <= 4) return '****';
  return value.substring(0, 4) + '****';
}

export function isFalsePositive(match: string, line?: string, filePath?: string): boolean {
  // 1. Template / Example file ignore
  if (filePath && (
    /\.(?:example|sample|template|dist)$/i.test(filePath) ||
    /\.(?:example|sample|template)\.[a-zA-Z0-9]+$/i.test(filePath) ||
    /(?:^|[\\/])(?:examples?|samples?|templates?)[\\/]/i.test(filePath)
  )) {
    return true;
  }

  // 2. Substrings check in match
  const upper = match.toUpperCase();
  for (const ignored of IGNORE_SUBSTRINGS) {
    if (upper.includes(ignored)) return true;
  }

  // 3. All identical characters check (e.g. AAAAA...)
  if (/^(.)\1+$/.test(match)) return true;

  // 4. Localhost / local dev database connection strings
  if (/^(?:postgres|postgresql|mysql|mongodb|mongodb\+srv|redis):\/\//i.test(match)) {
    if (/localhost|127\.0\.0\.1|0\.0\.0\.0|test\.local|example\.com|host\.docker\.internal/i.test(match)) {
      return true;
    }
  }

  // 5. Line context check (documentation, comments, or explicit mock/sample markers)
  if (line) {
    const trimmed = line.trim();
    if (/^\s*(?:\/\/|#|\/\*|\*)\s*(?:e\.g\.|example|sample|placeholder|dummy|mock)\b/i.test(trimmed)) {
      return true;
    }
    if (/\b(?:process\.env\.[A-Z0-9_]+\s*\|\|\s*['"`]|import\.meta\.env\.[A-Z0-9_]+\s*\|\|\s*['"`])/i.test(trimmed)) {
      // Fallback default value in code like process.env.KEY || 'dummy'
      if (/mock|dummy|sample|local|test|dev/i.test(trimmed)) {
        return true;
      }
    }
  }

  return false;
}

export function scanContentForSecrets(content: string, filePath?: string): SecretFinding[] {
  const findings: SecretFinding[] = [];
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    for (const pattern of SECRET_PATTERNS) {
      pattern.regex.lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = pattern.regex.exec(line)) !== null) {
        const rawSecret = match[0];
        if (!isFalsePositive(rawSecret, line, filePath)) {
          findings.push({
            patternName: pattern.name,
            masked: maskSecret(rawSecret),
            line: index + 1,
            file: filePath,
            snippet: line.trim().substring(0, 100)
          });
        }
      }
    }
  });

  return findings;
}

export function maskAllSecretsInText(text: string): string {
  let maskedText = text;

  for (const pattern of SECRET_PATTERNS) {
    pattern.regex.lastIndex = 0;
    maskedText = maskedText.replace(pattern.regex, (match) => {
      if (isFalsePositive(match)) return match;
      return maskSecret(match);
    });
  }

  return maskedText;
}
