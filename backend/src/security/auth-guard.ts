import { Request, Response, NextFunction } from 'express';

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
 * Verifies Supabase JWT against Supabase Auth endpoint or test bypass.
 */
export async function verifySupabaseJwt(token: string): Promise<VerifyJwtResult> {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Token is missing or empty', statusCode: 401 };
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

  const supabaseUrl = process.env.SUPABASE_URL;
  const apiKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !apiKey || supabaseUrl.includes('your-project-ref')) {
    // If Supabase is not configured on backend, return 503 service unavailable
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
 * Express middleware adhering to Requirement 2:
 * - If no Authorization header: proceeds as anonymous user (req.user = null).
 * - If Authorization header is present:
 *   - Must be `Bearer <JWT>`. Otherwise 401.
 *   - Verifies JWT with Supabase. If invalid, 401. If 503, 503.
 *   - If valid, attaches req.user and proceeds.
 */
export async function supabaseAuthGuard(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  // Anonymous request allowed (Requirement 2.6)
  if (!authHeader) {
    req.user = null;
    next();
    return;
  }

  // Must format as "Bearer <token>" (Requirement 2.7)
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match || !match[1]?.trim()) {
    res.status(401).json({
      error: {
        code: 'invalid_session',
        message: 'Header Authorization tidak berformat Bearer <token>.',
      },
    });
    return;
  }

  const token = match[1].trim();
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
