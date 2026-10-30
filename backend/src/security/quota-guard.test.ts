import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchUserQuota,
  consumeUserAuditQuota,
  refundUserAuditQuota,
  checkEnterpriseRateLimit,
  TIER_UPLOAD_LIMITS_BYTES,
  TIER_DECOMPRESSED_LIMITS_BYTES,
  TIER_PRIORITY_WEIGHT
} from './quota-guard';

describe('Quota Guard & Paywall Engine', () => {
  const originalEnv = { ...process.env };
  const validUserId = '11111111-2222-4333-8444-555555555555';

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Tier Constants', () => {
    it('defines valid upload, decompressed and priority weights across tiers', () => {
      expect(TIER_UPLOAD_LIMITS_BYTES.free).toBe(10 * 1024 * 1024);
      expect(TIER_UPLOAD_LIMITS_BYTES.pro).toBe(50 * 1024 * 1024);
      expect(TIER_UPLOAD_LIMITS_BYTES.enterprise).toBe(100 * 1024 * 1024);

      expect(TIER_DECOMPRESSED_LIMITS_BYTES.free).toBe(25 * 1024 * 1024);
      expect(TIER_DECOMPRESSED_LIMITS_BYTES.pro).toBe(100 * 1024 * 1024);
      expect(TIER_DECOMPRESSED_LIMITS_BYTES.enterprise).toBe(250 * 1024 * 1024);

      expect(TIER_PRIORITY_WEIGHT.enterprise).toBeGreaterThan(TIER_PRIORITY_WEIGHT.pro);
      expect(TIER_PRIORITY_WEIGHT.pro).toBeGreaterThan(TIER_PRIORITY_WEIGHT.free);
    });
  });

  describe('Enterprise FUP Sliding Window Rate Limiter', () => {
    it('permits requests within hourly cap and blocks when exceeded', () => {
      const orgId = 'org-test-window-1';
      for (let i = 0; i < 60; i++) {
        const check = checkEnterpriseRateLimit(orgId);
        expect(check.allowed).toBe(true);
      }
      const exceeded = checkEnterpriseRateLimit(orgId);
      expect(exceeded.allowed).toBe(false);
      expect(exceeded.retryAfterSeconds).toBeGreaterThan(0);
    });
  });

  describe('fetchUserQuota', () => {
    it('returns development fallback when credentials are not configured', async () => {
      delete process.env.SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      const quota = await fetchUserQuota(validUserId);
      expect(quota.tier).toBe('pro');
      expect(quota.limit).toBe(50);
      expect(quota.remaining).toBe(50);
    });

    it('returns development fallback when Supabase URL has placeholder value', async () => {
      process.env.SUPABASE_URL = 'https://your-project-ref.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'valid-key';

      const quota = await fetchUserQuota(validUserId);
      expect(quota.tier).toBe('pro');
    });

    it('successfully calls get_user_quota RPC when Supabase is configured', async () => {
      process.env.SUPABASE_URL = 'https://mock.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'secret-key';

      const mockResponse = {
        tier: 'free',
        used: 1,
        limit: 3,
        remaining: 2,
        reset_date: '2026-11-29T00:00:00Z'
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as any);

      const quota = await fetchUserQuota(validUserId);
      expect(quota.tier).toBe('free');
      expect(quota.used).toBe(1);
      expect(quota.remaining).toBe(2);
    });

    it('falls back gracefully to free tier when Supabase network throws error', async () => {
      process.env.SUPABASE_URL = 'https://mock.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'secret-key';

      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network timeout'));

      const quota = await fetchUserQuota(validUserId);
      expect(quota.tier).toBe('free');
      expect(quota.limit).toBe(3);
      expect(quota.remaining).toBe(3);
    });
  });

  describe('consumeUserAuditQuota', () => {
    it('returns allowed dev fallback when Supabase is not configured', async () => {
      delete process.env.SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      const res = await consumeUserAuditQuota(validUserId);
      expect(res.allowed).toBe(true);
      expect(res.tier).toBe('pro');
    });

    it('calls consume_audit_quota RPC and returns status when configured', async () => {
      process.env.SUPABASE_URL = 'https://mock.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'secret-key';

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          allowed: true,
          tier: 'pro',
          used: 5,
          limit: 50,
          remaining: 45
        })
      } as any);

      const res = await consumeUserAuditQuota(validUserId);
      expect(res.allowed).toBe(true);
      expect(res.used).toBe(5);
      expect(res.remaining).toBe(45);
    });

    it('fails open when consume RPC returns network error', async () => {
      process.env.SUPABASE_URL = 'https://mock.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'secret-key';

      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('PostgREST offline'));

      const res = await consumeUserAuditQuota(validUserId);
      expect(res.allowed).toBe(true);
      expect(res.tier).toBe('free');
    });
  });

  describe('refundUserAuditQuota', () => {
    it('gracefully no-ops when Supabase is unconfigured', async () => {
      delete process.env.SUPABASE_URL;
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      await refundUserAuditQuota(validUserId);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('invokes refund_audit_quota RPC when configured', async () => {
      process.env.SUPABASE_URL = 'https://mock.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'secret-key';

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, refunded: true })
      } as any);

      await refundUserAuditQuota(validUserId);
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/rest/v1/rpc/refund_audit_quota'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ target_user_id: validUserId })
        })
      );
    });
  });
});
