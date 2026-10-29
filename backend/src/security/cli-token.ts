import * as crypto from 'crypto'

export interface CliTokenUser {
  id: string
  email?: string
}

export interface CliTokenPayload {
  v: number
  sub: string
  email?: string
  iat: number
  exp: number
}

export interface CliTokenIssueResult {
  token: string
  expiresAt: string
}

export interface CliTokenVerifyResult {
  valid: boolean
  user?: CliTokenUser
  expiresAt?: string
  error?: string
}

const DEFAULT_TTL_SECONDS = 30 * 24 * 60 * 60 // 30 days
const TOKEN_PREFIX = 'sk_shipsafe_'
const DEV_FALLBACK_SECRET = 'shipsafe_dev_fallback_secret_key_change_in_production_32b'

function getSecret(): string {
  const secret = process.env.CLI_TOKEN_SECRET
  if (secret && secret.length >= 16) {
    return secret
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('CLI_TOKEN_SECRET environment variable is missing or too short in production.')
  }
  return DEV_FALLBACK_SECRET
}

export function isCliToken(token: string): boolean {
  return typeof token === 'string' && token.startsWith(TOKEN_PREFIX)
}

export function issueCliToken(
  user: CliTokenUser,
  ttlSeconds = DEFAULT_TTL_SECONDS
): CliTokenIssueResult {
  if (!user || !user.id) {
    throw new Error('User ID is required to issue a CLI access token.')
  }

  const secret = getSecret()
  const now = Math.floor(Date.now() / 1000)
  const exp = now + ttlSeconds

  const payloadObj: CliTokenPayload = {
    v: 1,
    sub: user.id,
    email: user.email || '',
    iat: now,
    exp,
  }

  const payloadEncoded = Buffer.from(JSON.stringify(payloadObj), 'utf8').toString('base64url')
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payloadEncoded)
    .digest('base64url')

  const token = `${TOKEN_PREFIX}${payloadEncoded}.${signature}`
  const expiresAt = new Date(exp * 1000).toISOString()

  return { token, expiresAt }
}

export function verifyCliToken(token: string): CliTokenVerifyResult {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Token is empty or invalid.' }
  }

  if (!token.startsWith(TOKEN_PREFIX)) {
    return { valid: false, error: 'Token does not match ShipSafe CLI token prefix.' }
  }

  const tokenBody = token.slice(TOKEN_PREFIX.length)
  const dotIndex = tokenBody.indexOf('.')
  if (dotIndex === -1) {
    return { valid: false, error: 'Malformed token structure: missing signature separator.' }
  }

  const payloadEncoded = tokenBody.slice(0, dotIndex)
  const signatureProvided = tokenBody.slice(dotIndex + 1)

  if (!payloadEncoded || !signatureProvided) {
    return { valid: false, error: 'Malformed token structure: empty payload or signature.' }
  }

  let secret: string
  try {
    secret = getSecret()
  } catch (err: unknown) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : 'CLI token verification secret unavailable.',
    }
  }

  // Compute expected HMAC signature
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payloadEncoded)
    .digest('base64url')

  // Timing safe comparison
  const sigProvidedBuffer = Buffer.from(signatureProvided, 'utf8')
  const expectedSigBuffer = Buffer.from(expectedSignature, 'utf8')

  if (sigProvidedBuffer.length !== expectedSigBuffer.length) {
    return { valid: false, error: 'Invalid token signature length.' }
  }

  if (!crypto.timingSafeEqual(sigProvidedBuffer, expectedSigBuffer)) {
    return { valid: false, error: 'Token signature verification failed.' }
  }

  // Parse payload
  let payload: CliTokenPayload
  try {
    const jsonStr = Buffer.from(payloadEncoded, 'base64url').toString('utf8')
    payload = JSON.parse(jsonStr)
  } catch {
    return { valid: false, error: 'Failed to decode token payload.' }
  }

  if (payload.v !== 1) {
    return { valid: false, error: `Unsupported token version: ${payload.v}` }
  }

  if (!payload.sub) {
    return { valid: false, error: 'Token payload missing subject identifier.' }
  }

  const now = Math.floor(Date.now() / 1000)
  if (typeof payload.exp !== 'number' || now > payload.exp) {
    return {
      valid: false,
      error: `Token has expired at ${new Date((payload.exp || 0) * 1000).toISOString()}.`,
    }
  }

  return {
    valid: true,
    user: {
      id: payload.sub,
      email: payload.email || undefined,
    },
    expiresAt: new Date(payload.exp * 1000).toISOString(),
  }
}
