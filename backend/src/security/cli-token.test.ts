import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { issueCliToken, verifyCliToken, isCliToken } from './cli-token'

describe('CLI Access Token Security', () => {
  const originalSecret = process.env.CLI_TOKEN_SECRET

  beforeEach(() => {
    process.env.CLI_TOKEN_SECRET = 'test_secret_key_minimum_16_characters_for_hmac'
  })

  afterEach(() => {
    process.env.CLI_TOKEN_SECRET = originalSecret
  })

  it('correctly identifies valid CLI token prefix', () => {
    expect(isCliToken('sk_shipsafe_12345')).toBe(true)
    expect(isCliToken('sk_live_12345')).toBe(false)
    expect(isCliToken('Bearer sk_shipsafe_12345')).toBe(false)
  })

  it('successfully issues and verifies a token', () => {
    const user = { id: 'usr-developer-99', email: 'dev@shipsafe.dev' }
    const { token, expiresAt } = issueCliToken(user, 3600)

    expect(token.startsWith('sk_shipsafe_')).toBe(true)
    expect(expiresAt).toBeDefined()

    const verifyResult = verifyCliToken(token)
    expect(verifyResult.valid).toBe(true)
    expect(verifyResult.user?.id).toBe(user.id)
    expect(verifyResult.user?.email).toBe(user.email)
    expect(verifyResult.expiresAt).toBe(expiresAt)
  })

  it('rejects tampered token payload', () => {
    const user = { id: 'usr-developer-99', email: 'dev@shipsafe.dev' }
    const { token } = issueCliToken(user, 3600)

    const [prefixAndPayload, signature] = token.split('.')
    const tamperedPayload = prefixAndPayload + 'tampered'
    const tamperedToken = `${tamperedPayload}.${signature}`

    const verifyResult = verifyCliToken(tamperedToken)
    expect(verifyResult.valid).toBe(false)
    expect(verifyResult.error).toContain('Token signature verification failed')
  })

  it('rejects tampered token signature', () => {
    const user = { id: 'usr-developer-99', email: 'dev@shipsafe.dev' }
    const { token } = issueCliToken(user, 3600)

    const [prefixAndPayload] = token.split('.')
    const fakeSignature = 'fake_signature_with_equal_length_buffer_test_abc123'
    const tamperedToken = `${prefixAndPayload}.${fakeSignature}`

    const verifyResult = verifyCliToken(tamperedToken)
    expect(verifyResult.valid).toBe(false)
  })

  it('rejects expired token', () => {
    const user = { id: 'usr-developer-99', email: 'dev@shipsafe.dev' }
    // Issue token with -10 second TTL (already expired)
    const { token } = issueCliToken(user, -10)

    const verifyResult = verifyCliToken(token)
    expect(verifyResult.valid).toBe(false)
    expect(verifyResult.error).toContain('Token has expired')
  })

  it('rejects malformed token strings', () => {
    expect(verifyCliToken('not_a_token').valid).toBe(false)
    expect(verifyCliToken('sk_shipsafe_nodots').valid).toBe(false)
    expect(verifyCliToken('sk_shipsafe_.').valid).toBe(false)
  })
})
