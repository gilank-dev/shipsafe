export interface SecretPattern {
  name: string
  regex: RegExp
  /** Suggested placeholder shown in the hint, e.g. AKIA_REDACTED. */
  placeholder: string
}

export interface SecretHit {
  field: string
  line: number
  pattern: string
  /** First 4 characters + ****. The raw match is never stored. */
  masked: string
  placeholder: string
}

export const SECRET_PATTERNS: readonly SecretPattern[] = [
  { name: 'Stripe live secret', regex: /sk_live_[A-Za-z0-9]{10,}/g, placeholder: 'sk_live_REDACTED' },
  { name: 'Stripe restricted key', regex: /rk_live_[A-Za-z0-9]{10,}/g, placeholder: 'rk_live_REDACTED' },
  { name: 'AWS access key id', regex: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g, placeholder: 'AKIA_REDACTED' },
  { name: 'GitHub token', regex: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/g, placeholder: 'ghp_REDACTED' },
  { name: 'Slack token', regex: /\bxox[abprs]-[A-Za-z0-9-]{10,}/g, placeholder: 'xoxb-REDACTED' },
  { name: 'Google API key', regex: /\bAIza[0-9A-Za-z_-]{35}\b/g, placeholder: 'AIza_REDACTED' },
  {
    name: 'Private key block',
    regex: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY(?: BLOCK)?-----/g,
    placeholder: '-----BEGIN PRIVATE KEY REDACTED-----',
  },
  {
    name: 'JWT',
    regex: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
    placeholder: 'JWT_REDACTED',
  },
  {
    name: 'URL with credentials',
    regex: /\b[a-z][a-z0-9+.-]*:\/\/[^\s:/@]+:[^\s@/]{3,}@/g,
    placeholder: 'scheme://user:PASSWORD_REDACTED@host',
  },
  {
    name: 'Secret assignment',
    regex: /\b(?:secret|token|api[_-]?key|password|passwd)\b\s*[:=]\s*['"]?[A-Za-z0-9/+_=-]{20,}/gi,
    placeholder: 'REDACTED',
  },
]

const IGNORE_MARKERS = ['REDACTED', 'EXAMPLE', 'PLACEHOLDER', 'your_', 'xxxx', '****']

export function maskSecret(value: string): string {
  return value.slice(0, 4) + '****'
}

function isIgnored(match: string, line: string): boolean {
  const haystacks = [match, line]
  if (haystacks.some((h) => IGNORE_MARKERS.some((m) => h.includes(m)))) return true
  if (/<[^>\n]*>/.test(match)) return true
  // After the key name and separator, a value of one repeated character is a dummy.
  const value = match.replace(/^[^:=]*[:=]\s*['"]?/, '')
  return /^(.)\1+$/.test(value)
}

/** Scans text for secret-shaped values. Pure; safe to call on every render via useMemo. */
export function scanSecrets(text: string, field = 'description'): SecretHit[] {
  if (!text) return []
  const hits: SecretHit[] = []
  const lines = text.split('\n')
  lines.forEach((lineText, index) => {
    const taken: Array<[number, number]> = []
    for (const pattern of SECRET_PATTERNS) {
      for (const m of lineText.matchAll(pattern.regex)) {
        const start = m.index ?? 0
        const end = start + m[0].length
        if (taken.some(([s, e]) => start < e && end > s)) continue
        if (isIgnored(m[0], lineText)) continue
        taken.push([start, end])
        hits.push({
          field,
          line: index + 1,
          pattern: pattern.name,
          masked: maskSecret(m[0]),
          placeholder: pattern.placeholder,
        })
      }
    }
  })
  return hits
}

export function hitKey(hit: SecretHit): string {
  return `${hit.field}|${hit.pattern}|${hit.masked}|${hit.line}`
}
