import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { verifyTurnstileToken, CLOUDFLARE_SITEVERIFY_URL, DEFAULT_TEST_SECRET_KEY } from './turnstile';

describe('Cloudflare Turnstile Verification', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
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

  it('uses DEFAULT_TEST_SECRET_KEY when CLOUDFLARE_TURNSTILE_SECRET_KEY is not set', async () => {
    delete process.env.TURNSTILE_ENABLED;
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

    const result = await verifyTurnstileToken('some-token');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Network connection timeout');
  });
});
