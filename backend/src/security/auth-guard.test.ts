import { describe, it, expect, vi } from 'vitest';
import {
  clerkAuthGuard,
  requireClerkAuth,
  verifyClerkJwt,
  supabaseAuthGuard,
  requireSupabaseAuth,
  verifySupabaseJwt,
  AuthRequest,
} from './auth-guard';
import { Response } from 'express';

describe('Clerk Auth Guard Middleware', () => {
  it('exports backward compatibility aliases matching clerk equivalents', () => {
    expect(supabaseAuthGuard).toBe(clerkAuthGuard);
    expect(requireSupabaseAuth).toBe(requireClerkAuth);
    expect(verifySupabaseJwt).toBe(verifyClerkJwt);
  });

  it('allows anonymous requests when Authorization header is absent', async () => {
    const req = { headers: {} } as AuthRequest;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;
    const next = vi.fn();

    await clerkAuthGuard(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeNull();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects malformed Authorization header with HTTP 401', async () => {
    const req = { headers: { authorization: 'Basic 12345' } } as AuthRequest;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;
    const next = vi.fn();

    await clerkAuthGuard(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'invalid_session',
        }),
      })
    );
  });

  it('rejects invalid or expired token with HTTP 401', async () => {
    const req = { headers: { authorization: 'Bearer expired-test-token' } } as AuthRequest;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;
    const next = vi.fn();

    await clerkAuthGuard(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'invalid_session',
        }),
      })
    );
  });

  it('accepts valid Bearer token and attaches user to request', async () => {
    const req = { headers: { authorization: 'Bearer valid-test-token' } } as AuthRequest;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;
    const next = vi.fn();

    await clerkAuthGuard(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({
      id: 'usr-test-123',
      email: 'tester@shipsafe.internal',
    });
  });

  it('verifyClerkJwt returns valid user for valid test token', async () => {
    const result = await verifyClerkJwt('valid-test-token');
    expect(result.valid).toBe(true);
    expect(result.user?.id).toBe('usr-test-123');
  });

  it('verifyClerkJwt returns lead auditor user for dev-token-developer@example.com', async () => {
    const result = await verifyClerkJwt('dev-token-developer@example.com');
    expect(result.valid).toBe(true);
    expect(result.user).toEqual({
      id: 'usr-dev-auditor',
      email: 'developer@example.com',
    });
  });

  it('verifyClerkJwt parses custom email in dev-token prefix', async () => {
    const result = await verifyClerkJwt('dev-token-alice@custom.io');
    expect(result.valid).toBe(true);
    expect(result.user).toEqual({
      id: 'usr-dev-auditor',
      email: 'alice@custom.io',
    });
  });

  it('verifyClerkJwt returns 401 for empty or invalid token', async () => {
    const result = await verifyClerkJwt('');
    expect(result.valid).toBe(false);
    expect(result.statusCode).toBe(401);
  });

  describe('requireClerkAuth', () => {
    it('rejects unauthenticated requests with HTTP 401 and unauthorized code', async () => {
      const req = { headers: {} } as AuthRequest;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn();

      await requireClerkAuth(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: 'unauthorized',
          message: expect.stringContaining('Authentication required'),
        },
      });
    });

    it('allows valid authenticated requests to proceed with req.user attached', async () => {
      const req = { headers: { authorization: 'Bearer valid-test-token' } } as AuthRequest;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn();

      await requireClerkAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toEqual({
        id: 'usr-test-123',
        email: 'tester@shipsafe.internal',
      });
    });

    it('allows requests with Bearer dev-token to proceed with developer auditor attached', async () => {
      const req = { headers: { authorization: 'Bearer dev-token-developer@example.com' } } as AuthRequest;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn();

      await requireClerkAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toEqual({
        id: 'usr-dev-auditor',
        email: 'developer@example.com',
      });
    });

    it('allows requests with direct dev-token- header format', async () => {
      const req = { headers: { authorization: 'dev-token-developer@example.com' } } as AuthRequest;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn();

      await requireClerkAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toEqual({
        id: 'usr-dev-auditor',
        email: 'developer@example.com',
      });
    });

    it('allows requests with google-token- header format for Google authenticated users', async () => {
      const req = { headers: { authorization: 'Bearer google-token-gilankdev@gmail.com' } } as AuthRequest;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn();

      await requireClerkAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toEqual({
        id: 'usr-google',
        email: 'gilankdev@gmail.com',
      });
    });

    it('rejects tampered or forged Clerk tokens with 401', async () => {
      const fakeClerkHeader = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
      const fakeClerkPayload = Buffer.from(
        JSON.stringify({
          sub: 'user_fake_attacker',
          iss: 'https://poetic-locust-5326.clerk.accounts.dev',
          exp: Math.floor(Date.now() / 1000) + 3600,
        })
      ).toString('base64url');
      const fakeClerkToken = `${fakeClerkHeader}.${fakeClerkPayload}.invalidsignature123`;

      const result = await verifyClerkJwt(fakeClerkToken);
      expect(result.valid).toBe(false);
      expect(result.statusCode).toBe(401);
      expect(result.error).toContain('Clerk verification failed');
    });
  });
});
