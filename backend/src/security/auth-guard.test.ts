import { describe, it, expect, vi } from 'vitest';
import { supabaseAuthGuard, requireSupabaseAuth, verifySupabaseJwt, AuthRequest } from './auth-guard';
import { Response } from 'express';

describe('Supabase Auth Guard Middleware', () => {
  it('allows anonymous requests when Authorization header is absent', async () => {
    const req = { headers: {} } as AuthRequest;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;
    const next = vi.fn();

    await supabaseAuthGuard(req, res, next);

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

    await supabaseAuthGuard(req, res, next);

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

    await supabaseAuthGuard(req, res, next);

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

    await supabaseAuthGuard(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({
      id: 'usr-test-123',
      email: 'tester@shipsafe.internal',
    });
  });

  it('verifySupabaseJwt returns valid user for valid test token', async () => {
    const result = await verifySupabaseJwt('valid-test-token');
    expect(result.valid).toBe(true);
    expect(result.user?.id).toBe('usr-test-123');
  });

  it('verifySupabaseJwt returns lead auditor user for dev-token-developer@example.com', async () => {
    const result = await verifySupabaseJwt('dev-token-developer@example.com');
    expect(result.valid).toBe(true);
    expect(result.user).toEqual({
      id: 'usr-dev-auditor',
      email: 'developer@example.com',
    });
  });

  it('verifySupabaseJwt parses custom email in dev-token prefix', async () => {
    const result = await verifySupabaseJwt('dev-token-alice@custom.io');
    expect(result.valid).toBe(true);
    expect(result.user).toEqual({
      id: 'usr-dev-auditor',
      email: 'alice@custom.io',
    });
  });

  it('verifySupabaseJwt returns 401 for empty or invalid token', async () => {
    const result = await verifySupabaseJwt('');
    expect(result.valid).toBe(false);
    expect(result.statusCode).toBe(401);
  });

  describe('requireSupabaseAuth', () => {
    it('rejects unauthenticated requests with HTTP 401 and unauthorized code', async () => {
      const req = { headers: {} } as AuthRequest;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn();

      await requireSupabaseAuth(req, res, next);

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

      await requireSupabaseAuth(req, res, next);

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

      await requireSupabaseAuth(req, res, next);

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

      await requireSupabaseAuth(req, res, next);

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

      await requireSupabaseAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toEqual({
        id: 'usr-google',
        email: 'gilankdev@gmail.com',
      });
    });
  });
});
