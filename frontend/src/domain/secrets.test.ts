import { describe, expect, it } from 'vitest'
import { maskSecret, scanSecrets } from './secrets'

// Test values are assembled at runtime so no pattern-valid credential sits in the source.
const fakeAws = 'AKIA' + 'IOSFODNN7EXAMPL0'.replace('EXAMPL0', 'ZQ4TR6K')
const fakeStripe = 'sk_' + 'live_' + '51Hx9aBcDeFgHiJkLmNo'
const fakeGithub = 'gh' + 'p_' + 'a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8'
const fakePrivateKey = '-----BEGIN ' + 'PRIVATE KEY-----'

describe('scanSecrets', () => {
  it('detects the four spec patterns', () => {
    const text = [`aws=${fakeAws}`, fakeStripe, fakeGithub, fakePrivateKey].join('\n')
    const names = scanSecrets(text).map((h) => h.pattern)
    expect(names).toEqual(
      expect.arrayContaining(['AWS access key id', 'Stripe live secret', 'GitHub token', 'Private key block']),
    )
  })

  it('reports the line number and masks to 4 characters', () => {
    const hits = scanSecrets(`first line\nkey: ${fakeAws}`)
    expect(hits).toHaveLength(1)
    expect(hits[0]).toMatchObject({ line: 2, masked: 'AKIA****' })
  })

  it('never stores the raw match', () => {
    const serialized = JSON.stringify(scanSecrets(`token ${fakeStripe}`))
    expect(serialized).not.toContain(fakeStripe)
    expect(serialized).not.toContain(fakeStripe.slice(0, 12))
  })

  it('ignores placeholders and dummy values', () => {
    expect(scanSecrets('sk_live_REDACTED')).toEqual([])
    expect(scanSecrets('AKIA_REDACTED')).toEqual([])
    expect(scanSecrets('api_key = EXAMPLE_KEY_FOR_DOCS_ONLY_1234')).toEqual([])
    expect(scanSecrets('password: aaaaaaaaaaaaaaaaaaaaaaaa')).toEqual([])
  })

  it('returns nothing for empty text', () => {
    expect(scanSecrets('')).toEqual([])
  })

  it('detects a credential in a connection string', () => {
    const hits = scanSecrets('postgres://admin:Tr0ub4dor9xQ@db.internal:5432/app')
    expect(hits[0]?.pattern).toBe('URL with credentials')
    expect(hits[0]?.masked.length).toBeLessThanOrEqual(8)
  })
})

describe('maskSecret', () => {
  it('keeps at most 4 leading characters', () => {
    expect(maskSecret('abcdefghijkl')).toBe('abcd****')
    expect(maskSecret('ab')).toBe('ab****')
  })
})
