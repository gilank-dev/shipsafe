import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  verifyTurnstileToken,
  CLOUDFLARE_SITEVERIFY_URL,
  DEFAULT_TEST_SECRET_KEY,
  clearUsedTokensForTesting,
} from './turnstile';

describe('Cloudflare Turnstile Verification', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    clearUsedTokensForTesting();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    clearUsedTokensForTesting();
    vi.restoreAllMocks();
  });

  it('bypasses verification when TURNSTILE_ENABLED is false', async () => {
    process.env.TURNSTILE_ENABLED = 'false';
    const result = await verifyTurnstileToken(undefined);
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('returns failure when token is missing or empty', async () => {
    delete process.env.TURNSTILE_ENABLED;
    const resultEmpty = await verifyTurnstileToken('');
    expect(resultEmpty.success).toBe(false);
    expect(resultEmpty.error).toMatch(/missing or empty/i);

    const resultUndefined = await verifyTurnstileToken(undefined);
    expect(resultUndefined.success).toBe(false);
  });

  it('bypasses with success: true when token is "test-token"', async () => {
    const result = await verifyTurnstileToken('test-token');
    expect(result.success).toBe(true);
  });

  it('bypasses with success: true when token is "bypass-token"', async () => {
    const result = await verifyTurnstileToken('bypass-token');
    expect(result.success).toBe(true);
  });

  it('calls Cloudflare siteverify and succeeds when Cloudflare returns success: true', async () => {
    delete process.env.TURNSTILE_ENABLED;
    process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY = 'custom-secret-key';

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        challenge_ts: '2026-10-13T12:00:00Z',
        hostname: 'localhost'
      })
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await verifyTurnstileToken('actual-turnstile-token', '192.168.1.1');
    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe(CLOUDFLARE_SITEVERIFY_URL);
    expect(options.method).toBe('POST');
    const bodyString = options.body.toString();
    expect(bodyString).toContain('secret=custom-secret-key');
    expect(bodyString).toContain('response=actual-turnstile-token');
    expect(bodyString).toContain('remoteip=192.168.1.1');
  });

  it('uses TURNSTILE_SECRET with priority over CLOUDFLARE_TURNSTILE_SECRET_KEY', async () => {
    delete process.env.TURNSTILE_ENABLED;
    process.env.TURNSTILE_SECRET = 'priority-secret-key';
    process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY = 'secondary-secret-key';

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true
      })
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await verifyTurnstileToken('priority-token-test');
    expect(result.success).toBe(true);
    const bodyString = mockFetch.mock.calls[0][1].body.toString();
    expect(bodyString).toContain('secret=priority-secret-key');
  });

  it('uses DEFAULT_TEST_SECRET_KEY when neither secret is set in test env', async () => {
    delete process.env.TURNSTILE_ENABLED;
    delete process.env.TURNSTILE_SECRET;
    delete process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true
      })
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await verifyTurnstileToken('cf-token-123');
    expect(result.success).toBe(true);
    const bodyString = mockFetch.mock.calls[0][1].body.toString();
    expect(bodyString).toContain(`secret=${DEFAULT_TEST_SECRET_KEY}`);
  });

  it('prevents replay attacks by rejecting a previously verified token', async () => {
    delete process.env.TURNSTILE_ENABLED;
    process.env.TURNSTILE_SECRET = 'secret-replay';

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true
      })
    });
    vi.stubGlobal('fetch', mockFetch);

    const firstRun = await verifyTurnstileToken('single-use-token');
    expect(firstRun.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Second run with identical token must fail immediately without contacting API
    const secondRun = await verifyTurnstileToken('single-use-token');
    expect(secondRun.success).toBe(false);
    expect(secondRun.error).toContain('replay attack detected');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('validates expected action when returned by Cloudflare', async () => {
    delete process.env.TURNSTILE_ENABLED;

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        action: 'audit'
      })
    });
    vi.stubGlobal('fetch', mockFetch);

    const passResult = await verifyTurnstileToken('action-token', { expectedAction: 'audit' });
    expect(passResult.success).toBe(true);
    expect(passResult.action).toBe('audit');

    // Mismatched action test
    const mockMismatchFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        action: 'login'
      })
    });
    vi.stubGlobal('fetch', mockMismatchFetch);

    const failResult = await verifyTurnstileToken('mismatch-token', { expectedAction: 'audit' });
    expect(failResult.success).toBe(false);
    expect(failResult.error).toContain('action mismatch');
  });

  it('validates allowed hostnames when configured', async () => {
    delete process.env.TURNSTILE_ENABLED;

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        hostname: 'ship-safe.lankdev.my.id'
      })
    });
    vi.stubGlobal('fetch', mockFetch);

    const passResult = await verifyTurnstileToken('host-token', {
      allowedHostnames: ['ship-safe.lankdev.my.id', 'localhost']
    });
    expect(passResult.success).toBe(true);

    // Rejected hostname test
    const mockRejectFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        hostname: 'malicious-domain.com'
      })
    });
    vi.stubGlobal('fetch', mockRejectFetch);

    const failResult = await verifyTurnstileToken('bad-host-token', {
      allowedHostnames: ['ship-safe.lankdev.my.id']
    });
    expect(failResult.success).toBe(false);
    expect(failResult.error).toContain('hostname rejected');
  });

  it('handles Cloudflare verification failure with error codes', async () => {
    delete process.env.TURNSTILE_ENABLED;

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: false,
        'error-codes': ['invalid-input-response', 'timeout-or-duplicate']
      })
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await verifyTurnstileToken('expired-token');
    expect(result.success).toBe(false);
    expect(result.error).toContain('invalid-input-response, timeout-or-duplicate');
  });

  it('handles Cloudflare HTTP error status', async () => {
    delete process.env.TURNSTILE_ENABLED;

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await verifyTurnstileToken('some-token');
    expect(result.success).toBe(false);
    expect(result.error).toContain('status 500');
  });

  it('handles network or fetch exceptions gracefully', async () => {
    delete process.env.TURNSTILE_ENABLED;

    const mockFetch = vi.fn().mockRejectedValue(new Error('Network connection timeout'));
    vi.stubGlobal('fetch', mockFetch);

    const result = await verifyTurnstileToken('timeout-token');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Network connection timeout');
  });

  it('does NOT short-circuit bypass tokens in production environment', async () => {
    delete process.env.TURNSTILE_ENABLED;
    process.env.NODE_ENV = 'production';
    process.env.TURNSTILE_SECRET = 'prod-secret-key';

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: false,
        'error-codes': ['invalid-input-response']
      })
    });
    vi.stubGlobal('fetch', mockFetch);

    // In production, bypass tokens must NOT be accepted unconditionally
    const bypassTokens = ['test-token', 'bypass-token', 'dev-bypass-token', 'cf-fallback-verified', 'fallback-token'];
    for (const token of bypassTokens) {
      clearUsedTokensForTesting();
      const res = await verifyTurnstileToken(token);
      expect(res.success).toBe(false);
      expect(res.error).toContain('invalid-input-response');
    }
    expect(mockFetch).toHaveBeenCalledTimes(bypassTokens.length);
  });

  it('fails cleanly in production when secret key is not configured in env', async () => {
    delete process.env.TURNSTILE_ENABLED;
    process.env.NODE_ENV = 'production';
    delete process.env.TURNSTILE_SECRET;
    delete process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;

    const mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);

    const result = await verifyTurnstileToken('real-token-submitted');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Turnstile secret key is not configured in production environment/i);
    // Must fail without calling Cloudflare siteverify
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('succeeds in production when valid secret is configured and Cloudflare verifies token', async () => {
    delete process.env.TURNSTILE_ENABLED;
    process.env.NODE_ENV = 'production';
    process.env.TURNSTILE_SECRET = 'prod-secret-123';

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        hostname: 'ship-safe.lankdev.my.id',
        action: 'audit'
      })
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await verifyTurnstileToken('valid-user-token', { expectedAction: 'audit' });
    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const bodyString = mockFetch.mock.calls[0][1].body.toString();
    expect(bodyString).toContain('secret=prod-secret-123');
    expect(bodyString).toContain('response=valid-user-token');
  });
});
