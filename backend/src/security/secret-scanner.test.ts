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

  it('guarantees masking is strictly idempotent on both maskSecret and maskAllSecretsInText', () => {
    // 1. maskSecret idempotency
    const testCases = [
      fakeStripe,
      fakeAws,
      fakeGithub,
      'sk_l****',
      'AKIA****',
      'ghp_****',
      '****',
      'abc****',
      'abc',
      '12345678'
    ];

    for (const item of testCases) {
      const maskedOnce = maskSecret(item);
      const maskedTwice = maskSecret(maskedOnce);
      const maskedThrice = maskSecret(maskedTwice);
      expect(maskedTwice).toBe(maskedOnce);
      expect(maskedThrice).toBe(maskedOnce);
    }

    // 2. maskAllSecretsInText idempotency
    const fullText = `API_KEY=${fakeStripe} and AWS=${fakeAws} and GH=${fakeGithub}`;
    const run1 = maskAllSecretsInText(fullText);
    const run2 = maskAllSecretsInText(run1);
    const run3 = maskAllSecretsInText(run2);

    expect(run1).toBe(`API_KEY=sk_l**** and AWS=AKIA**** and GH=ghp_****`);
    expect(run2).toBe(run1);
    expect(run3).toBe(run1);
  });

  it('detects standard, encrypted, and PGP private key headers', () => {
    const rsaKey = '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA0...';
    const opensshKey = '-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjE...';
    const encryptedKey = '-----BEGIN ENCRYPTED PRIVATE KEY-----\nMIIFDjBABgkqhkiG9w0BBQ0w...';
    const pgpKey = '-----BEGIN PGP PRIVATE KEY BLOCK-----\nVersion: GnuPG v2...';

    expect(scanContentForSecrets(rsaKey, 'id_rsa').length).toBe(1);
    expect(scanContentForSecrets(opensshKey, 'id_ed25519').length).toBe(1);
    expect(scanContentForSecrets(encryptedKey, 'key.pem').length).toBe(1);
    expect(scanContentForSecrets(pgpKey, 'secring.gpg').length).toBe(1);
  });
});
