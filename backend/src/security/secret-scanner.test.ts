import { describe, it, expect } from 'vitest';
import { scanContentForSecrets, maskSecret, maskAllSecretsInText } from './secret-scanner';

// Test values are assembled at runtime so no pattern-valid credential sits statically in source code.
const fakeStripe = ['sk', 'live', '123456789012345678901234'].join('_');
const fakeAws = ['AKIA', '1234567890ABCDEF'].join('');
const fakeGithub = ['ghp', '123456789012345678901234567890123456'].join('_');

describe('Secret Scanner and Masking', () => {
  it('masks secret to first 4 characters plus ****', () => {
    expect(maskSecret(fakeStripe)).toBe('sk_l****');
    expect(maskSecret(fakeAws)).toBe('AKIA****');
    expect(maskSecret(fakeGithub)).toBe('ghp_****');
  });

  it('detects and masks real-looking AWS, Stripe, and GitHub tokens', () => {
    const text = `
      AWS_KEY=${fakeAws}
      STRIPE=${fakeStripe}
      GH=${fakeGithub}
    `;

    const findings = scanContentForSecrets(text, '.env');
    expect(findings.length).toBe(3);
    expect(findings.some((f) => f.masked === 'AKIA****')).toBe(true);
    expect(findings.some((f) => f.masked === 'sk_l****')).toBe(true);
    expect(findings.some((f) => f.masked === 'ghp_****')).toBe(true);
  });

  it('ignores false positives like REDACTED, EXAMPLE, and PLACEHOLDER', () => {
    const text = `
      AWS_KEY=AKIA_REDACTED_KEY_HERE
      STRIPE=sk_live_EXAMPLE_TOKEN_FOR_DOCS
      DUMMY=sk_live_PLACEHOLDER_STRING_123
    `;

    const findings = scanContentForSecrets(text, '.env.example');
    expect(findings.length).toBe(0);
  });

  it('masks all secrets inside a large blob without leaking raw strings', () => {
    const text = `Authorization: Bearer ${fakeStripe} in header`;
    const masked = maskAllSecretsInText(text);
    expect(masked).toBe('Authorization: Bearer sk_l**** in header');
    expect(masked).not.toContain('123456789012345678901234');
  });

  it('does not flag localhost database connection strings or template files as real secrets', () => {
    const localDb = 'DATABASE_URL=postgres://postgres:password123@localhost:5432/mydb';
    const findings = scanContentForSecrets(localDb, 'docker-compose.yml');
    expect(findings.length).toBe(0);

    const templateText = `STRIPE=${fakeStripe}`;
    const templateFindings = scanContentForSecrets(templateText, '.env.sample');
    expect(templateFindings.length).toBe(0);
  });
});
