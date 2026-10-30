import { describe, it, expect, afterAll, vi } from 'vitest';
import { verifySupabaseJwt } from './auth-guard';
import { requireSuperAdmin } from './super-admin';
import type { Request, Response, NextFunction } from 'express';

/**
 * SECURITY REGRESSION — PoC evidence: SEC-poc E1/E2/E2b/E3/E5 (2026-10-29).
 * These tests pin the production-mode fail-closed behavior introduced to close
 * the following confirmed exploits:
 *   - Self-issued dev-* tokens accepted in production (audit CAPTCHA bypass)
 *   - Unsigned/forged JWTs trusted via the offline payload fallback
 *   - Prefix-only sk_live_* tokens accepted without a configured API key
 *   - x-admin-email / x-user-email headers trusted as admin clearance
 * vitest runs with NODE_ENV=test; each test temporarily forces NODE_ENV=production.
 */

function withProductionEnv<T>(fn: () => Promise<T>): Promise<T> {
  const before = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  const savedSupabaseUrl = process.env.SUPABASE_URL;
  const savedKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const savedAnon = process.env.SUPABASE_ANON_KEY;
  process.env.SUPABASE_URL = '';
  process.env.SUPABASE_SERVICE_ROLE_KEY = '';
  process.env.SUPABASE_ANON_KEY = '';
  return fn().finally(() => {
    process.env.NODE_ENV = before;
    process.env.SUPABASE_URL = savedSupabaseUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = savedKey;
    process.env.SUPABASE_ANON_KEY = savedAnon;
  });
}

const forgedUnsignedJwt = (() => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      sub: '8f7a6b5c-4d3e-2f1a-0b9c-8d7e6f5a4b3c',
      email: 'gilankdev@gmail.com',
      exp: Math.floor(Date.now() / 1000) + 3600,
    })
  ).toString('base64url');
  return `${header}.${payload}.forged-signature`;
})();

describe('Production auth fail-closed regression (SEC 2026-10-29)', () => {
  it('rejects forged unsigned JWTs even with whitelisted-email payloads', async () => {
    await withProductionEnv(async () => {
      const result = await verifySupabaseJwt(forgedUnsignedJwt);
      expect(result.valid).toBe(false);
      expect(result.statusCode).toBe(503);
      expect(result.error).toContain('unavailable');
    });
  });

  it('rejects self-issued dev-token-* / google-token-* / github-token-* tokens in production', async () => {
    await withProductionEnv(async () => {
      for (const token of [
        'dev-token-gilankdev@gmail.com',
        'google-token-gilankdev@gmail.com',
        'github-token-gilankdev@gmail.com',
      ]) {
        const result = await verifySupabaseJwt(token);
        expect(result.valid).toBe(false);
        expect(result.statusCode).toBe(401);
      }
    });
  });

  it('rejects arbitrary sk_live_* tokens when no API key is configured', async () => {
    await withProductionEnv(async () => {
      const result = await verifySupabaseJwt('sk_live_forge_master_0000');
      expect(result.valid).toBe(false);
    });
  });

  it('requireSuperAdmin no longer trusts x-admin-email headers', () => {
    const req = {
      headers: { 'x-admin-email': 'gilankdev@gmail.com' },
    } as unknown as Request;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;
    const next = vi.fn() as unknown as NextFunction;

    requireSuperAdmin(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'ADMIN_CLEARANCE_REQUIRED' })
    );
  });
});
