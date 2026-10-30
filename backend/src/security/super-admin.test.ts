import { describe, it, expect, vi } from 'vitest';
import { SUPER_ADMIN_EMAIL_WHITELIST, isSuperAdminEmail, requireSuperAdmin } from './super-admin';
import type { Request, Response } from 'express';

describe('Super Admin Whitelist & Security Guard', () => {
  it('correctly validates whitelisted owner emails', () => {
    expect(isSuperAdminEmail('hi@lankdev.my.id')).toBe(true);
    expect(isSuperAdminEmail('gilankdev@gmail.com')).toBe(true);
    expect(isSuperAdminEmail('gilankdev@gmai.com')).toBe(false);
    expect(isSuperAdminEmail('ghilankputraramadhan@gmail.com')).toBe(true);
    expect(isSuperAdminEmail(' HI@LANKDEV.MY.ID ')).toBe(true);
  });

  it('rejects non-whitelisted emails', () => {
    expect(isSuperAdminEmail('hacker@evil.com')).toBe(false);
    expect(isSuperAdminEmail('user@gmail.com')).toBe(false);
    expect(isSuperAdminEmail(null)).toBe(false);
    expect(isSuperAdminEmail(undefined)).toBe(false);
    expect(isSuperAdminEmail('')).toBe(false);
  });

  it('enforces access in requireSuperAdmin middleware for authorized user', () => {
    const req = {
      user: { id: 'u-1', email: 'hi@lankdev.my.id' },
      headers: {},
      ip: '127.0.0.1',
    } as unknown as Request;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;

    const next = vi.fn();

    requireSuperAdmin(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('blocks unauthorized access in requireSuperAdmin with HTTP 403', () => {
    const req = {
      user: { id: 'u-2', email: 'unauthorized@example.com' },
      headers: {},
      ip: '127.0.0.1',
    } as unknown as Request;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;

    const next = vi.fn();

    requireSuperAdmin(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'FORBIDDEN',
        code: 'ADMIN_CLEARANCE_REQUIRED',
      })
    );
  });
});

import { generateVoucher, redeemVoucherUser } from './admin-controller';

describe('Enterprise Multi-Use Voucher License System', () => {
  it('generates and redeems multi-use enterprise voucher up to maxUses', () => {
    // 1. Admin generates enterprise voucher with 3 seats
    const genResult = generateVoucher('enterprise_monthly', 3, 30, 0, 'gilankdev@gmail.com');
    expect(genResult.success).toBe(true);
    expect(genResult.voucher).toBeDefined();
    const code = genResult.voucher!.code;
    expect(code).toMatch(/^SS-ENT-/);
    expect(genResult.voucher!.maxUses).toBe(3);

    // 2. Developer 1 redeems
    const r1 = redeemVoucherUser(code, 'dev1@corporate.com');
    expect(r1.success).toBe(true);
    expect(r1.grantType).toBe('enterprise_monthly');

    // 3. Same developer tries to redeem again -> blocked
    const r1_again = redeemVoucherUser(code, 'dev1@corporate.com');
    expect(r1_again.success).toBe(false);
    expect(r1_again.message).toContain('already redeemed');

    // 4. Developer 2 redeems
    const r2 = redeemVoucherUser(code, 'dev2@corporate.com');
    expect(r2.success).toBe(true);

    // 5. Developer 3 redeems
    const r3 = redeemVoucherUser(code, 'dev3@corporate.com');
    expect(r3.success).toBe(true);

    // 6. Developer 4 tries to redeem -> blocked by max limit
    const r4 = redeemVoucherUser(code, 'dev4@corporate.com');
    expect(r4.success).toBe(false);
    expect(r4.message).toContain('maximum redemption limit reached');
  });
});
