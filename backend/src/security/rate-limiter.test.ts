import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { globalLimiter, auditLimiter, authVoucherLimiter } from './rate-limiter';

describe('ShipSafe Rate Limiter Suite', () => {
  it('exports valid rate limiting middlewares', () => {
    expect(typeof globalLimiter).toBe('function');
    expect(typeof auditLimiter).toBe('function');
    expect(typeof authVoucherLimiter).toBe('function');
  });

  it('passes requests through next() under normal traffic', async () => {
    const req = {
      ip: '127.0.0.1',
      headers: {},
      app: { get: vi.fn() },
    } as unknown as Request;

    const res = {
      setHeader: vi.fn(),
      getHeader: vi.fn(),
    } as unknown as Response;

    const next = vi.fn() as unknown as NextFunction;

    await (globalLimiter as any)(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
