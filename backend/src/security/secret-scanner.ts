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
  { name: 'RSA / OpenSSH Private Key', regex: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g },
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
  'INSERT_HERE'
];

export function maskSecret(value: string): string {
  if (!value || value.length <= 4) return '****';
  return value.substring(0, 4) + '****';
}

export function isFalsePositive(match: string): boolean {
  const upper = match.toUpperCase();
  for (const ignored of IGNORE_SUBSTRINGS) {
    if (upper.includes(ignored)) return true;
  }
  // All identical characters check
  if (/^(.)\1+$/.test(match)) return true;
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
        if (!isFalsePositive(rawSecret)) {
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
