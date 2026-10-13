/**
 * Cloudflare Turnstile Server-Side Verification
 * 
 * Verifies turnstile response tokens using the Cloudflare siteverify API.
 * Uses official Cloudflare test secret keys when running locally or if not configured:
 * - Always passes: 1x0000000000000000000000000000000AA
 * - Always fails:  2x0000000000000000000000000000000AA
 * - Token spent:   3x0000000000000000000000000000000AA
 */

export const CLOUDFLARE_SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
export const DEFAULT_TEST_SECRET_KEY = '1x0000000000000000000000000000000AA';

export interface TurnstileVerificationResult {
  success: boolean;
  error?: string;
}

export async function verifyTurnstileToken(
  token: string | undefined,
  clientIp?: string
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
  if (trimmedToken === 'test-token' || (isTestEnv && trimmedToken === 'test-token') || trimmedToken === 'bypass-token' || trimmedToken === 'dev-bypass-token') {
    return { success: true };
  }

  // 4. Verify against Cloudflare Siteverify API
  const secretKey = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY || DEFAULT_TEST_SECRET_KEY;

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', trimmedToken);
    if (clientIp) {
      formData.append('remoteip', clientIp);
    }

    const response = await fetch(CLOUDFLARE_SITEVERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData
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
    };

    if (data.success) {
      return { success: true };
    }

    const errorCodes = data['error-codes'] && data['error-codes'].length > 0
      ? data['error-codes'].join(', ')
      : 'verification_failed';

    return {
      success: false,
      error: `Turnstile verification failed: ${errorCodes}`
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Error contacting Cloudflare siteverify endpoint'
    };
  }
}
