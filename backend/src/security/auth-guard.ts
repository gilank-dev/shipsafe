import { Request, Response, NextFunction } from 'express';
import { verifyCliToken, isCliToken } from './cli-token';

export interface AuthenticatedUser {
  id: string;
  email?: string;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser | null;
}

export interface VerifyJwtResult {
  valid: boolean;
  user?: AuthenticatedUser;
  error?: string;
  statusCode?: number;
}

/**
 * Verifies authentication token against Supabase Auth, CLI tokens, or dev tokens.
 */
export async function verifySupabaseJwt(token: string): Promise<VerifyJwtResult> {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Token is missing or empty', statusCode: 401 };
  }

  // 1. Validate signed ShipSafe CLI access tokens
  if (isCliToken(token)) {
    const cliResult = verifyCliToken(token);
    if (cliResult.valid && cliResult.user) {
      return {
        valid: true,
        user: {
          id: cliResult.user.id,
          email: cliResult.user.email || 'cli@shipsafe.dev',
        },
      };
    }
    return {
      valid: false,
      error: cliResult.error || 'Invalid or expired CLI access token. Please run shipsafe login.',
      statusCode: 401,
    };
  }

  // 2. ShipSafe CLI automation API keys must match EXACTLY a configured secret.
  //    Prefix-only matching was a critical bypass (any "sk_live_*" string got in).
  const configuredApiKey = process.env.SHIPSAFE_API_KEY || process.env.CLI_API_KEY;
  if (configuredApiKey && token === configuredApiKey) {
    return {
      valid: true,
      user: { id: 'usr-cli-runner', email: 'auditor@shipsafe.dev' },
    };
  }

  // 3. Developer / OAuth-provider placeholder tokens.
  //    These are self-issued client-side and forgeable, so they are only
  //    honored outside production. Production requires a real Supabase session.
  if (
    token.startsWith('dev-token-') ||
    token.startsWith('google-token-') ||
    token.startsWith('github-token-')
  ) {
    if (process.env.NODE_ENV === 'production') {
      return {
        valid: false,
        error: 'Self-issued developer tokens are not accepted in production. Sign in with GitHub or Google.',
        statusCode: 401,
      };
    }

    let email = 'auditor@shipsafe.dev';
    let idPrefix = 'usr-cli-runner';

    const prefix = token.startsWith('google-token-')
      ? 'google-token-'
      : token.startsWith('github-token-')
        ? 'github-token-'
        : 'dev-token-';
    const suffix = token.slice(prefix.length);
    if (suffix && suffix.includes('@')) {
      email = suffix;
    }
    idPrefix = token.startsWith('google-token-')
      ? 'usr-google'
      : token.startsWith('github-token-')
        ? 'usr-github'
        : 'usr-dev-auditor';

    return {
      valid: true,
      user: { id: idPrefix, email },
    };
  }

  // Bypass for unit testing / development
  if (process.env.NODE_ENV === 'test' || process.env.AUTH_TEST_BYPASS === 'true') {
    if (token === 'valid-test-token') {
      return { valid: true, user: { id: 'usr-test-123', email: 'tester@shipsafe.internal' } };
    }
    if (token === 'expired-test-token' || token === 'invalid-token') {
      return { valid: false, error: 'Token is expired or signature mismatch', statusCode: 401 };
    }
  }

  // 3. Inspect JWT structure (header.payload.signature)
  const parts = token.split('.');
  if (parts.length === 3) {
    try {
      const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
      const payload = JSON.parse(payloadJson);

      // Check expiration if exp claim is present
      if (payload.exp && typeof payload.exp === 'number') {
        const nowSec = Math.floor(Date.now() / 1000);
        if (payload.exp < nowSec) {
          return { valid: false, error: 'Session token has expired. Please sign in again.', statusCode: 401 };
        }
      }

      // If Supabase is configured, verify against Supabase /auth/v1/user
      const supabaseUrl = process.env.SUPABASE_URL;
      const apiKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

      if (supabaseUrl && apiKey && !supabaseUrl.includes('your-project-ref')) {
        try {
          const url = `${supabaseUrl.replace(/\/+$/, '')}/auth/v1/user`;
          const res = await fetch(url, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'apikey': apiKey,
            },
          });

          if (res.ok) {
            const userData = (await res.json()) as { id?: string; email?: string };
            if (userData?.id) {
              return {
                valid: true,
                user: {
                  id: userData.id,
                  email: userData.email || payload.email || `${userData.id}@supabase.user`,
                },
              };
            }
          } else if (res.status === 401 || res.status === 403) {
            return { valid: false, error: 'Supabase verification failed: Invalid session', statusCode: 401 };
          }
          // Any other non-OK status means the auth verifier is degraded — fall
          // through to the fail-closed decision below (never trust the payload).
        } catch (err) {
          console.warn('[ShipSafe Auth] Supabase endpoint probe warning:', err);
        }
      }

      // FAIL-CLOSED: the token signature was never verified. Offline decoding is
      // only acceptable outside production (local dev / unit tests). In production
      // an unverified JWT must NEVER be trusted — this was a complete auth bypass.
      if (process.env.NODE_ENV === 'production') {
        return {
          valid: false,
          error: 'Authentication service temporarily unavailable. Please try signing in again shortly.',
          statusCode: 503,
        };
      }

      // Offline / decoded JWT user payload fallback (dev and test only)
      if (payload && payload.sub) {
        return {
          valid: true,
          user: {
            id: payload.sub,
            email: payload.email || `${payload.sub}@supabase.user`,
          },
        };
      }
    } catch {
      // Not a valid JSON payload, proceed to standard verifiers
    }
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const apiKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !apiKey || supabaseUrl.includes('your-project-ref')) {
    return { valid: false, error: 'Supabase authentication service is not configured on server', statusCode: 503 };
  }

  try {
    const url = `${supabaseUrl.replace(/\/+$/, '')}/auth/v1/user`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': apiKey,
      },
    });

    if (!res.ok) {
      return { valid: false, error: 'Invalid or expired session token', statusCode: 401 };
    }

    const userData = (await res.json()) as { id?: string; email?: string };
    if (!userData || !userData.id) {
      return { valid: false, error: 'Invalid user payload received from auth service', statusCode: 401 };
    }

    return {
      valid: true,
      user: {
        id: userData.id,
        email: userData.email,
      },
    };
  } catch (err) {
    console.error('[ShipSafe Auth] Error contacting Supabase auth:', err);
    return { valid: false, error: 'Could not contact authentication service', statusCode: 503 };
  }
}

/**
 * Express middleware:
 * - If no Authorization header: proceeds as anonymous user (req.user = null).
 * - If Authorization header is present:
 *   - Must be `Bearer <JWT>` or direct dev-token. Otherwise 401.
 *   - Verifies JWT with Supabase (or fallback). If invalid, 401. If 503, 503.
 *   - If valid, attaches req.user and proceeds.
 */
export async function supabaseAuthGuard(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  // Anonymous request allowed (when auth is optional)
  if (!authHeader) {
    req.user = null;
    next();
    return;
  }

  // Must format as "Bearer <token>" or direct dev-token
  let token = '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (match && match[1]?.trim()) {
    token = match[1].trim();
  } else if (
    authHeader.startsWith('dev-token-') ||
    authHeader.startsWith('google-token-') ||
    authHeader.startsWith('github-token-') ||
    authHeader.startsWith('sk_shipsafe_') ||
    authHeader.startsWith('sk_live_')
  ) {
    token = authHeader.trim();
  } else {
    res.status(401).json({
      error: {
        code: 'invalid_session',
        message: 'Header Authorization tidak berformat Bearer <token>.',
      },
    });
    return;
  }

  const result = await verifySupabaseJwt(token);

  if (!result.valid || !result.user) {
    const status = result.statusCode || 401;
    res.status(status).json({
      error: {
        code: status === 503 ? 'auth_service_unavailable' : 'invalid_session',
        message: result.error || 'Sesi tidak valid atau kedaluwarsa. Silakan login kembali.',
      },
    });
    return;
  }

  req.user = result.user;
  next();
}

/**
 * Mandatory Authentication Middleware:
 * Rejects any unauthenticated requests with HTTP 401 Unauthorized.
 * Users must sign in via Supabase (GitHub/Google) before auditing code or importing repositories.
 */
export async function requireSupabaseAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    // Check if test bypass is explicitly active for integration suites
    if (process.env.AUTH_TEST_BYPASS === 'true') {
      req.user = { id: 'usr-test-bypass', email: 'bypass@shipsafe.internal' };
      next();
      return;
    }

    res.status(401).json({
      error: {
        code: 'unauthorized',
        message: 'Authentication required. Please sign in with GitHub or Google before auditing code.',
      },
    });
    return;
  }

  // Delegate to standard token verifier
  return supabaseAuthGuard(req, res, next);
}

// Backwards compatibility aliases
export const clerkAuthGuard = supabaseAuthGuard;
export const requireClerkAuth = requireSupabaseAuth;
export const verifyClerkJwt = verifySupabaseJwt;
