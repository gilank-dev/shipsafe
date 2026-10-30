import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import http from 'http';
import { buildAdminRouter } from './admin-routes';
import {
  getIntakeStatus,
  getLiveTelemetry,
  listAdminUsers,
  deleteAdminUser,
  generateVoucher,
  revokeVoucher,
  redeemVoucherUser,
  listScanTelemetry,
  addScanTelemetry,
  listAdminAuditLogs,
} from './admin-controller';
import { requireSuperAdmin, isSuperAdminEmail, SUPER_ADMIN_EMAIL_WHITELIST } from './super-admin';
import { globalAuditQueue, AuditQueue } from '../engine/queue';

/**
 * TEST-ONLY identity middleware. In production requireClerkAuth sets req.user
 * from a verified Supabase/CLI token; here we accept the same "verified identity"
 * concept via the x-admin-email header so every whitelisted-flow can be exercised.
 * Identity NEVER comes from anywhere else (paths, body, query).
 */
const testAuthStub = ((req: unknown, _res: unknown, next: () => void) => {
  const header = (req as express.Request).headers?.['x-admin-email'];
  (req as express.Request & { user?: { id: string; email: string } }).user =
    typeof header === 'string' && header ? { id: 'usr-admin-test', email: header } : undefined;
  next();
}) as unknown as express.RequestHandler;

describe('Admin Controller & Endpoints Comprehensive Stress Test', () => {
  let app: express.Express;
  let server: http.Server;
  let baseUrl: string;

  beforeEach(async () => {
    app = express();
    app.use(express.json());

    // Mirror production wiring: shared router, but identity comes from the
    // x-admin-email stub (simulating what requireClerkAuth does in production).
    app.use('/api', buildAdminRouter(testAuthStub, { authMode: 'test' }));

    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        if (typeof addr === 'object' && addr !== null) {
          baseUrl = `http://127.0.0.1:${addr.port}`;
        }
        resolve();
      });
    });
  });

  afterEach(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  const authHeader = { 'x-admin-email': 'gilankdev@gmail.com' };

  describe('1. Security Authorization & Whitelist Guard', () => {
    it('blocks access to admin endpoints with HTTP 403 when credentials are empty or unauthorized', async () => {
      const unauthorizedEmails = ['hacker@evil.org', 'test@example.com', '', 'unknown@lankdev.com'];

      for (const email of unauthorizedEmails) {
        const headers: Record<string, string> = email ? { 'x-admin-email': email } : {};
        const res = await fetch(`${baseUrl}/api/admin/telemetry`, { headers });
        expect(res.status).toBe(403);
        const data = await res.json();
        expect(data.code).toBe('ADMIN_CLEARANCE_REQUIRED');
      }
    });

    it('grants access to all 3 whitelisted Super Admin owner emails', async () => {
      for (const email of SUPER_ADMIN_EMAIL_WHITELIST) {
        const res = await fetch(`${baseUrl}/api/admin/telemetry`, {
          headers: { 'x-admin-email': email },
        });
        expect(res.status).toBe(200);
      }
    });
  });

  describe('2. Telemetry, Queue & Intake Controls', () => {
    it('GET /api/admin/telemetry returns full platform, queue, and gateway metrics', async () => {
      const res = await fetch(`${baseUrl}/api/admin/telemetry`, { headers: authHeader });
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data).toHaveProperty('queue');
      expect(data.queue).toHaveProperty('activeWorkers');
      expect(data.queue).toHaveProperty('maxWorkers');
      expect(data.queue).toHaveProperty('queuedRequests');
      expect(data.queue).toHaveProperty('display');

      expect(data).toHaveProperty('gateway');
      expect(data.gateway).toHaveProperty('status');

      expect(data).toHaveProperty('sandbox');
      expect(data.sandbox).toHaveProperty('lingeringCount');

      expect(data).toHaveProperty('intake');
      expect(data.intake).toHaveProperty('isOpen');

      expect(data).toHaveProperty('totals');
      expect(data.totals).toHaveProperty('totalUsers');
      expect(data.totals).toHaveProperty('freeUsers');
      expect(data.totals).toHaveProperty('proUsers');
      expect(data.totals).toHaveProperty('entUsers');
    });

    it('handles high volume concurrent requests on GET /api/admin/telemetry', async () => {
      const requests = Array.from({ length: 25 }, () =>
        fetch(`${baseUrl}/api/admin/telemetry`, { headers: authHeader })
      );
      const responses = await Promise.all(requests);
      for (const res of responses) {
        expect(res.status).toBe(200);
      }
    });

    it('POST /api/admin/queue/flush successfully purges waiting queue tasks', async () => {
      // Create a test queue and simulate stuck items
      const testQueue = new AuditQueue(1, 5, 10000);
      let task1Finished = false;

      // Occupy worker slot
      const p1 = testQueue.run(
        () =>
          new Promise<string>((resolve) => {
            setTimeout(() => {
              task1Finished = true;
              resolve('done-1');
            }, 500);
          })
      );

      // Enqueue waiting tasks
      const p2 = testQueue.run(() => Promise.resolve('task-2'));
      const p3 = testQueue.run(() => Promise.resolve('task-3'));

      expect(testQueue.stats.waitingInQueue).toBe(2);

      // Flush queue
      const flushedCount = testQueue.flush();
      expect(flushedCount).toBe(2);
      expect(testQueue.stats.waitingInQueue).toBe(0);

      // Flushed tasks should reject with QUEUE_FLUSHED
      await expect(p2).rejects.toMatchObject({ code: 'QUEUE_FLUSHED' });
      await expect(p3).rejects.toMatchObject({ code: 'QUEUE_FLUSHED' });

      // Live endpoint flush test
      const res = await fetch(`${baseUrl}/api/admin/queue/flush`, {
        method: 'POST',
        headers: authHeader,
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(typeof data.flushed).toBe('number');
    });

    it('POST /api/admin/intake/toggle pauses and resumes scan intake', async () => {
      const initial = getIntakeStatus();

      // Toggle 1
      const res1 = await fetch(`${baseUrl}/api/admin/intake/toggle`, {
        method: 'POST',
        headers: authHeader,
      });
      expect(res1.status).toBe(200);
      const data1 = await res1.json();
      expect(data1.isOpen).toBe(!initial);
      expect(getIntakeStatus()).toBe(!initial);

      // Toggle 2 (restore)
      const res2 = await fetch(`${baseUrl}/api/admin/intake/toggle`, {
        method: 'POST',
        headers: authHeader,
      });
      expect(res2.status).toBe(200);
      const data2 = await res2.json();
      expect(data2.isOpen).toBe(initial);
      expect(getIntakeStatus()).toBe(initial);
    });
  });

  describe('3. User Management, Quotas & Role Mutations', () => {
    it('GET /api/admin/users lists all verified users and filters by tier/role', async () => {
      const res = await fetch(`${baseUrl}/api/admin/users`, { headers: authHeader });
      expect(res.status).toBe(200);
      const { users } = await res.json();
      expect(Array.isArray(users)).toBe(true);
      expect(users.length).toBeGreaterThanOrEqual(3);

      // Whitelisted owners exist
      const emails = users.map((u: any) => u.email);
      for (const owner of SUPER_ADMIN_EMAIL_WHITELIST) {
        expect(emails).toContain(owner);
      }

      // Filter by Enterprise
      const entRes = await fetch(`${baseUrl}/api/admin/users?filter=ENTERPRISE`, { headers: authHeader });
      const entData = await entRes.json();
      expect(entData.users.every((u: any) => u.tier === 'enterprise')).toBe(true);

      // Search query
      const searchRes = await fetch(`${baseUrl}/api/admin/users?search=gilankdev`, { headers: authHeader });
      const searchData = await searchRes.json();
      expect(searchData.users.some((u: any) => u.email === 'gilankdev@gmail.com')).toBe(true);
    });

    it('POST /api/admin/users/:id/tier updates tier and recalculates effectiveLimit', async () => {
      const targetEmail = 'tester-tier@example.com';
      // Setup a voucher to create target user
      const v = generateVoucher('pro_monthly', 1, 10, 0, 'admin@shipsafe.dev');
      redeemVoucherUser(v.voucher!.code, targetEmail);

      // Change tier to Enterprise
      const resEnt = await fetch(`${baseUrl}/api/admin/users/${encodeURIComponent(targetEmail)}/tier`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ tier: 'enterprise' }),
      });
      expect(resEnt.status).toBe(200);
      const entResult = await resEnt.json();
      expect(entResult.success).toBe(true);
      expect(entResult.user.tier).toBe('enterprise');
      expect(entResult.user.effectiveLimit).toBe(999999);

      // Change tier to Free
      const resFree = await fetch(`${baseUrl}/api/admin/users/${encodeURIComponent(targetEmail)}/tier`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ tier: 'free' }),
      });
      expect(resFree.status).toBe(200);
      const freeResult = await resFree.json();
      expect(freeResult.success).toBe(true);
      expect(freeResult.user.tier).toBe('free');
      expect(freeResult.user.effectiveLimit).toBe(3);

      // Nonexistent user returns 400
      const resFail = await fetch(`${baseUrl}/api/admin/users/nonexistent-user-xyz/tier`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ tier: 'pro' }),
      });
      expect(resFail.status).toBe(400);
    });

    it('POST /api/admin/users/:id/quota overrides custom quota limit and restores default', async () => {
      const targetEmail = 'tester-quota@example.com';
      const v = generateVoucher('pro_monthly', 1, 10, 0, 'admin@shipsafe.dev');
      redeemVoucherUser(v.voucher!.code, targetEmail);

      // Override with 150
      const res1 = await fetch(`${baseUrl}/api/admin/users/${encodeURIComponent(targetEmail)}/quota`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ customQuotaLimit: 150 }),
      });
      expect(res1.status).toBe(200);
      const data1 = await res1.json();
      expect(data1.success).toBe(true);
      expect(data1.user.customQuotaLimit).toBe(150);
      expect(data1.user.effectiveLimit).toBe(150);

      // Restore tier default with null
      const res2 = await fetch(`${baseUrl}/api/admin/users/${encodeURIComponent(targetEmail)}/quota`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ customQuotaLimit: null }),
      });
      expect(res2.status).toBe(200);
      const data2 = await res2.json();
      expect(data2.user.customQuotaLimit).toBeNull();
      expect(data2.user.effectiveLimit).toBe(50); // Pro default
    });

    it('POST /api/admin/users/:id/reset resets auditsUsed to 0', async () => {
      const targetEmail = 'tester-reset@example.com';
      const v = generateVoucher('pro_monthly', 1, 10, 0, 'admin@shipsafe.dev');
      redeemVoucherUser(v.voucher!.code, targetEmail);

      const res = await fetch(`${baseUrl}/api/admin/users/${encodeURIComponent(targetEmail)}/reset`, {
        method: 'POST',
        headers: authHeader,
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.user.auditsUsed).toBe(0);
      expect(data.user).toHaveProperty('billingCycleStart');
    });

    it('POST /api/admin/users/:id/status toggles account condition between active and suspended', async () => {
      const targetEmail = 'tester-status@example.com';
      const v = generateVoucher('pro_monthly', 1, 10, 0, 'admin@shipsafe.dev');
      redeemVoucherUser(v.voucher!.code, targetEmail);

      // Suspend
      const res1 = await fetch(`${baseUrl}/api/admin/users/${encodeURIComponent(targetEmail)}/status`, {
        method: 'POST',
        headers: authHeader,
      });
      expect(res1.status).toBe(200);
      const data1 = await res1.json();
      expect(data1.user.accountStatus).toBe('suspended');

      // Activate
      const res2 = await fetch(`${baseUrl}/api/admin/users/${encodeURIComponent(targetEmail)}/status`, {
        method: 'POST',
        headers: authHeader,
      });
      expect(res2.status).toBe(200);
      const data2 = await res2.json();
      expect(data2.user.accountStatus).toBe('active');
    });

    it('DELETE /api/admin/users/:id rejects deletion for all 3 whitelisted owner identities', async () => {
      for (const ownerEmail of SUPER_ADMIN_EMAIL_WHITELIST) {
        const res = await fetch(`${baseUrl}/api/admin/users/${encodeURIComponent(ownerEmail)}`, {
          method: 'DELETE',
          headers: authHeader,
        });
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.success).toBe(false);
        expect(data.message).toContain('Root Owner identity is cryptographically protected and cannot be deleted');
      }
    });

    it('DELETE /api/admin/users/:id permanently deletes non-owner user accounts', async () => {
      const targetEmail = 'disposable-user@example.com';
      const v = generateVoucher('pro_monthly', 1, 10, 0, 'admin@shipsafe.dev');
      redeemVoucherUser(v.voucher!.code, targetEmail);

      const res = await fetch(`${baseUrl}/api/admin/users/${encodeURIComponent(targetEmail)}`, {
        method: 'DELETE',
        headers: authHeader,
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.message).toContain('permanently deleted');

      // Second deletion should return 400
      const res2 = await fetch(`${baseUrl}/api/admin/users/${encodeURIComponent(targetEmail)}`, {
        method: 'DELETE',
        headers: authHeader,
      });
      expect(res2.status).toBe(400);
    });
  });

  describe('4. Voucher System & Redemption Stress Test', () => {
    it('generates Pro (single-use) and Enterprise (multi-use) vouchers', async () => {
      // 1. Pro voucher
      const resPro = await fetch(`${baseUrl}/api/admin/vouchers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ grantType: 'pro_monthly', maxUses: 1, expirationDays: 30 }),
      });
      expect(resPro.status).toBe(201);
      const proData = await resPro.json();
      expect(proData.success).toBe(true);
      expect(proData.voucher.code).toMatch(/^SS-PRO-/);
      expect(proData.voucher.maxUses).toBe(1);

      // 2. Enterprise multi-use voucher
      const resEnt = await fetch(`${baseUrl}/api/admin/vouchers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ grantType: 'enterprise_monthly', maxUses: 10, expirationDays: 60 }),
      });
      expect(resEnt.status).toBe(201);
      const entData = await resEnt.json();
      expect(entData.voucher.code).toMatch(/^SS-ENT-/);
      expect(entData.voucher.maxUses).toBe(10);

      // 3. List vouchers
      const listRes = await fetch(`${baseUrl}/api/admin/vouchers`, { headers: authHeader });
      expect(listRes.status).toBe(200);
      const listData = await listRes.json();
      expect(listData.vouchers.some((v: any) => v.code === proData.voucher.code)).toBe(true);
      expect(listData.vouchers.some((v: any) => v.code === entData.voucher.code)).toBe(true);
    });

    it('redeems voucher and upgrades user tier', async () => {
      const v = generateVoucher('pro_monthly', 1, 30, 0, 'admin@shipsafe.dev');
      const email = 'redeemer-1@test.com';

      const res = await fetch(`${baseUrl}/api/vouchers/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: v.voucher!.code, email }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.grantType).toBe('pro_monthly');

      // Verify user tier is upgraded in admin ledger
      const users = await listAdminUsers(email, 'ALL');
      const u = users.find((x) => x.email === email);
      expect(u).toBeDefined();
      expect(u!.tier).toBe('pro');
    });

    it('rejects duplicate redemption by same user and prevents exceeding maxUses', async () => {
      const v = generateVoucher('enterprise_monthly', 2, 30, 0, 'admin@shipsafe.dev');
      const code = v.voucher!.code;

      // User 1 first redemption -> Success
      const r1 = await fetch(`${baseUrl}/api/vouchers/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, email: 'seat-1@corp.com' }),
      });
      expect(r1.status).toBe(200);

      // User 1 duplicate redemption -> Rejected
      const r1Again = await fetch(`${baseUrl}/api/vouchers/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, email: 'seat-1@corp.com' }),
      });
      expect(r1Again.status).toBe(400);
      const r1Data = await r1Again.json();
      expect(r1Data.message).toContain('already redeemed');

      // User 2 redemption -> Success (reaches maxUses 2)
      const r2 = await fetch(`${baseUrl}/api/vouchers/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, email: 'seat-2@corp.com' }),
      });
      expect(r2.status).toBe(200);

      // User 3 redemption -> Rejected (capacity exhausted)
      const r3 = await fetch(`${baseUrl}/api/vouchers/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, email: 'seat-3@corp.com' }),
      });
      expect(r3.status).toBe(400);
      const r3Data = await r3.json();
      expect(r3Data.message).toContain('maximum redemption limit reached');
    });

    it('rejects revoked and invalid vouchers', async () => {
      // 1. Invalid voucher
      const rInv = await fetch(`${baseUrl}/api/vouchers/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'SS-NONEXISTENT-9999', email: 'user@test.com' }),
      });
      expect(rInv.status).toBe(400);
      expect((await rInv.json()).message).toContain('Invalid voucher');

      // 2. Revoked voucher
      const v = generateVoucher('pro_monthly', 5, 30, 0, 'admin@shipsafe.dev');
      const revokeRes = await fetch(`${baseUrl}/api/admin/vouchers/${encodeURIComponent(v.voucher!.code)}`, {
        method: 'DELETE',
        headers: authHeader,
      });
      expect(revokeRes.status).toBe(200);

      const rRev = await fetch(`${baseUrl}/api/vouchers/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: v.voucher!.code, email: 'user@test.com' }),
      });
      expect(rRev.status).toBe(400);
      expect((await rRev.json()).message).toContain('deactivated');
    });

    it('handles high concurrency stress test on voucher redemptions', async () => {
      const v = generateVoucher('enterprise_monthly', 5, 30, 0, 'admin@shipsafe.dev');
      const code = v.voucher!.code;

      // 20 distinct users attempting to redeem concurrently
      const attempts = Array.from({ length: 20 }, (_, i) =>
        fetch(`${baseUrl}/api/vouchers/redeem`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, email: `concurrent-dev-${i}@stress.com` }),
        }).then((res) => res.json())
      );

      const results = await Promise.all(attempts);
      const successes = results.filter((r) => r.success);
      const failures = results.filter((r) => !r.success);

      expect(successes.length).toBe(5);
      expect(failures.length).toBe(15);
      expect(failures.every((f) => f.message.includes('maximum redemption limit'))).toBe(true);
    });
  });

  describe('5. Telemetry Logs & Admin Audit Trail Management', () => {
    it('manages telemetry logs: lists, adds, deletes single, and clears all', async () => {
      // 1. Add telemetry entries
      addScanTelemetry({
        userEmail: 'telemetry-test@example.com',
        channel: 'CLI',
        zipSizeBytes: 10240,
        durationMs: 850,
        findingsCount: 4,
        severityCounts: { Critical: 1, High: 1, Medium: 1, Low: 1, Info: 0 },
        securityGateStatus: '[OK // COMPLETED]',
      });

      const listRes = await fetch(`${baseUrl}/api/admin/telemetry-logs`, { headers: authHeader });
      expect(listRes.status).toBe(200);
      const { logs } = await listRes.json();
      expect(Array.isArray(logs)).toBe(true);
      expect(logs.length).toBeGreaterThan(0);

      const testLog = logs.find((l: any) => l.userEmail === 'telemetry-test@example.com');
      expect(testLog).toBeDefined();

      // 2. Delete single log
      const delRes = await fetch(`${baseUrl}/api/admin/telemetry-logs/${encodeURIComponent(testLog.id)}`, {
        method: 'DELETE',
        headers: authHeader,
      });
      expect(delRes.status).toBe(200);

      // 3. Clear all telemetry logs
      const clearRes = await fetch(`${baseUrl}/api/admin/telemetry-logs`, {
        method: 'DELETE',
        headers: authHeader,
      });
      expect(clearRes.status).toBe(200);
      const clearData = await clearRes.json();
      expect(clearData.success).toBe(true);

      const listAfterClear = await fetch(`${baseUrl}/api/admin/telemetry-logs`, { headers: authHeader });
      const afterData = await listAfterClear.json();
      expect(afterData.logs.length).toBe(0);
    });

    it('DELETE /api/admin/audit-logs purges audit log trail cleanly', async () => {
      const purgeRes = await fetch(`${baseUrl}/api/admin/audit-logs`, {
        method: 'DELETE',
        headers: authHeader,
      });
      expect(purgeRes.status).toBe(200);
      const purgeData = await purgeRes.json();
      expect(purgeData.success).toBe(true);

      const logs = listAdminAuditLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].actionType).toBe('CLEAR_AUDIT_LOGS');
    });
  });
});
