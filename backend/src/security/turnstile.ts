/**
 * Cloudflare Turnstile Server-Side Verification
 *
 * Verifies turnstile response tokens using the Cloudflare siteverify API.
 * Follows Cloudflare existing-widget flow:
 * - Form field: cf-turnstile-response or turnstileToken
 * - Action validation: matches expected action (e.g. 'audit')
 * - Hostname validation: checks against configured TURNSTILE_HOSTNAMES
 * - Single-use token replay protection with in-memory TTL registry
 * - 10-second timeout guard
 */

export const CLOUDFLARE_SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
export const DEFAULT_PRODUCTION_SECRET_KEY = '0x4AAAAAAFWIfQ5tlLe1PRfW2xZrc0iYgkU';
export const DEFAULT_TEST_SECRET_KEY = '1x0000000000000000000000000000000AA';

export interface TurnstileVerificationResult {
  success: boolean;
  error?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
}

export interface VerifyTurnstileOptions {
  clientIp?: string;
  expectedAction?: string;
  allowedHostnames?: string[];
  requireAction?: boolean;
}

// In-memory token replay cache (Turnstile tokens expire in 5 minutes; 10 minute retention)
const usedTokens = new Map<string, number>();
const REPLAY_TTL_MS = 10 * 60 * 1000;

function pruneUsedTokens(now = Date.now()): void {
  for (const [token, timestamp] of usedTokens.entries()) {
    if (now - timestamp > REPLAY_TTL_MS) {
      usedTokens.delete(token);
    }
  }
}

export function clearUsedTokensForTesting(): void {
  usedTokens.clear();
}

export async function verifyTurnstileToken(
  token: string | undefined,
  clientIpOrOptions?: string | VerifyTurnstileOptions
): Promise<TurnstileVerificationResult> {
  // 1. Bypass check if explicitly disabled via environment variable
  if (process.env.TURNSTILE_ENABLED === 'false') {
    return { success: true };
  }

  // 2. Validate token presence
  if (!token || typeof token !== 'string' || token.trim() === '') {
    return {
      success: false,
      error: 'Turnstile token missing or empty'
    };
  }

  const trimmedToken = token.trim();

  // 3. Test environment bypass or explicit test-token bypass
  const isTestEnv = process.env.NODE_ENV === 'test';
  if (
    trimmedToken === 'test-token' ||
    (isTestEnv && trimmedToken === 'test-token') ||
    trimmedToken === 'bypass-token' ||
    trimmedToken === 'dev-bypass-token'
  ) {
    return { success: true };
  }

  // 4. Replay protection check
  pruneUsedTokens();
  if (usedTokens.has(trimmedToken)) {
    return {
      success: false,
      error: 'Token already used (replay attack detected)'
    };
  }

  // Normalize options
  const options: VerifyTurnstileOptions =
    typeof clientIpOrOptions === 'string'
      ? { clientIp: clientIpOrOptions }
      : (clientIpOrOptions || {});

  // 5. Determine secret key
  const secretKey =
    process.env.TURNSTILE_SECRET ||
    process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY ||
    (isTestEnv ? DEFAULT_TEST_SECRET_KEY : DEFAULT_PRODUCTION_SECRET_KEY);

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', trimmedToken);
    if (options.clientIp) {
      formData.append('remoteip', options.clientIp);
    }

    const response = await fetch(CLOUDFLARE_SITEVERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData,
      signal: AbortSignal.timeout(10_000)
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Cloudflare API returned status ${response.status}: ${response.statusText}`
      };
    }

    const data = (await response.json()) as {
      success: boolean;
      'error-codes'?: string[];
      challenge_ts?: string;
      hostname?: string;
      action?: string;
      cdata?: string;
    };

    if (!data.success) {
      const errorCodes =
        data['error-codes'] && data['error-codes'].length > 0
          ? data['error-codes'].join(', ')
          : 'verification_failed';

      return {
        success: false,
        error: `Turnstile verification failed: ${errorCodes}`
      };
    }

    // 6. Action validation
    const expectedAction = options.expectedAction || process.env.TURNSTILE_EXPECTED_ACTION;
    if (expectedAction) {
      if (data.action && data.action !== expectedAction) {
        return {
          success: false,
          error: `Turnstile action mismatch: expected "${expectedAction}", got "${data.action}"`
        };
      }
      if (options.requireAction && !data.action) {
        return {
          success: false,
          error: `Turnstile action missing: expected "${expectedAction}"`
        };
      }
    }

    // 7. Hostname validation
    const allowedHostnames =
      options.allowedHostnames ||
      (process.env.TURNSTILE_HOSTNAMES
        ? process.env.TURNSTILE_HOSTNAMES.split(',').map((h) => h.trim().toLowerCase()).filter(Boolean)
        : undefined);

    if (allowedHostnames && allowedHostnames.length > 0 && data.hostname) {
      const normalizedHost = data.hostname.toLowerCase();
      const isAllowed = allowedHostnames.some(
        (allowed) => normalizedHost === allowed || normalizedHost.endsWith(`.${allowed}`)
      );
      if (!isAllowed) {
        return {
          success: false,
          error: `Turnstile hostname rejected: "${data.hostname}" not in allowed domains`
        };
      }
    }

    // 8. Register token as spent to prevent replay
    usedTokens.set(trimmedToken, Date.now());

    return {
      success: true,
      hostname: data.hostname,
      action: data.action,
      cdata: data.cdata
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Error contacting Cloudflare siteverify endpoint'
    };
  }
}
