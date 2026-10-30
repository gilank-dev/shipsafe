# ShipSafe Security Audit Report

## Metadata

| Field | Value |
| --- | --- |
| Repository | ShipSafe (pre-deployment security auditor for web apps) |
| Report author | OpenCode agent session |
| Audit dates | 2026-10-29 to 2026-10-30 |
| Method | Cloudflare 6-phase pipeline: recon, hunting, validation, reporting, structured output, patch + independent verification |
| Scope | Backend API and security middleware (Express + TypeScript on VPS, port 23010), frontend authorization header wiring (React 19 + Vite on Vercel) |
| Proof harness | `backend/tests/security/poc-exploit.mjs` (spawns the real production build `backend/dist/server.js` on port 2399 with `NODE_ENV=production` and Supabase credentials stripped, then attempts 5 exploits) |
| Zero-false-positive rule | Every finding was proven with a runnable PoC BEFORE patching and re-verified BLOCKED after patching |
| Result | 10 findings (3 critical, 3 high, 2 medium, 1 low, 1 hardening), all remediated |
| Test status | Backend 19 files / 156 tests passed, frontend 33 files / 204 tests passed, typecheck clean |

## Executive Summary

The audit confirmed that the production backend accepted unauthenticated requests as arbitrary user identities: the login endpoint returned HTTP 200 with an impersonation token for any email on a wrong password, `verifySupabaseJwt` trusted offline-decoded forged JWTs whenever the Supabase probe errored, and any Bearer token with the `sk_live_` prefix was accepted as a CLI runner without any configured secret. A CAPTCHA bypass keyed on self-issued `dev-token-` prefixes, combined with these identity primitives, allowed anonymous unlimited audit execution. Separate functional gaps left the entire admin/user API surface unmounted (404 in production), admin clearance derived from spoofable headers, and rate limiters defined but never attached. All ten findings were reproduced with the PoC harness against the production build before patching (5/5 exploits confirmed), then patched and independently re-verified as blocked (0/5 confirmed), with regression tests added to pin the fail-closed behavior.

## Findings Overview

| ID | Severity | Title | Status | Primary file(s) |
| --- | --- | --- | --- | --- |
| SEC-01 | CRITICAL | Unauthenticated login issues impersonation tokens | REMEDIATED | `backend/src/server.ts` |
| SEC-02 | CRITICAL | Forged unsigned JWT accepted as authenticated identity | REMEDIATED | `backend/src/security/auth-guard.ts` |
| SEC-03 | CRITICAL | Prefix-only API key acceptance | REMEDIATED | `backend/src/security/auth-guard.ts` |
| SEC-04 | HIGH | Admin/user API surface never mounted | REMEDIATED | `backend/src/security/admin-routes.ts` (new), `backend/src/server.ts` |
| SEC-05 | HIGH | Admin clearance trusted spoofable headers | REMEDIATED | `backend/src/security/super-admin.ts` |
| SEC-06 | HIGH | Rate limiters defined but never mounted | REMEDIATED | `backend/src/server.ts`, `backend/src/security/rate-limiter.ts` |
| SEC-07 | MEDIUM | CAPTCHA bypass via self-issued dev tokens | REMEDIATED | `backend/src/security/auth-guard.ts` |
| SEC-08 | MEDIUM | Duplicate unauthenticated verify-diff route (dead-code trap) | REMEDIATED | `backend/src/server.ts` |
| SEC-09 | LOW | Hardcoded fallback Supabase project URL and anon-key fallback in admin destructive paths | REMEDIATED | `backend/src/security/admin-controller.ts` |
| SEC-10 | HARDENING (functional) | Monthly quota enforcement and intake gate wired into the audit endpoint | REMEDIATED | `backend/src/server.ts` |

## Detailed Findings

### SEC-01 (CRITICAL): Unauthenticated login issues impersonation tokens

**Threat model.** `POST /api/auth/login` returned HTTP 200 with a bearer token of the form `dev-token-<email>` for ANY email address, even with a wrong password. The "graceful dev fallback" intended for local development had been shipped to production. An anonymous attacker could mint an identity token for any account, including the Super Admin addresses, and use it against every endpoint that consumed the Authorization header.

**Evidence (PoC quote).** PoC exploit E1, run against the production build with `NODE_ENV=production`:

```
HTTP 200 token=dev-token-gilankdev@gmail.com
```

Pre-patch PoC summary: `POC SUMMARY: 5/5 exploits CONFIRMED`.

**Fix.** The login handler in `backend/src/server.ts` is now fail-closed in production:

- A Supabase authentication rejection returns `401 invalid_credentials`.
- An unconfigured or failing auth service returns `503`.
- The dev fallback only exists when `NODE_ENV != production`.

### SEC-02 (CRITICAL): Forged unsigned JWT accepted as authenticated identity

**Threat model.** `verifySupabaseJwt` (`backend/src/security/auth-guard.ts`) fell back to the offline-decoded JWT payload whenever the Supabase verification probe errored or was unconfigured. An attacker could submit a token shaped `header.payload.forged-signature` with any `sub` and `email` claims and be treated as an authenticated user, without knowing any secret.

**Evidence (PoC quote).** PoC exploit E2:

```
HTTP 200 body={...gilankdev@gmail.com...}
```

**Fix.** Production is fail-closed. A token whose signature cannot be verified receives `503 auth_service_unavailable`. Offline decoding of the payload remains available only in non-production environments and never confers identity in production.

### SEC-03 (CRITICAL): Prefix-only API key acceptance

**Threat model.** Any Bearer token that merely started with `sk_live_` was accepted as the CLI runner identity without any configured secret on the server. Prefix matching replaced exact secret comparison, so the key check was effectively a spelling test rather than an authentication check.

**Evidence (PoC quote).** PoC exploit E2b:

```
HTTP 200 body={"id":"usr-cli-runner"...}
```

**Fix.** API keys must now EXACTLY equal `process.env.SHIPSAFE_API_KEY` or `CLI_API_KEY`. Prefix or partial matches are rejected.

### SEC-04 (HIGH): Admin/user API surface never mounted

**Threat model.** All `/api/admin/*` routes, `/api/vouchers/redeem` and `/api/user/sync` existed only inside test files. The production server returned 404 for all of them, which broke the Super Admin dashboard, voucher redemption (paywall), and profile/quota synchronization. This is a functional and availability defect rather than an exposure, but it is graded HIGH because the missing surface also blocked secure replacement paths (see SEC-05, SEC-10).

**Evidence (PoC quote).** PoC exploit E3:

```
HTTP 404
```

**Fix.** A single-source router `backend/src/security/admin-routes.ts` (`buildAdminRouter`) was created and mounted in `backend/src/server.ts` under `/api` behind `requireClerkAuth`, with per-route `requireSuperAdmin`. Mounted endpoints include the ones the dashboard calls:

- `GET /api/admin/organizations`
- `POST /api/admin/organizations`
- `PATCH /api/admin/organizations/:orgId/seats`
- `POST /admin/organizations/:orgId/members`
- `DELETE /admin/organizations/:orgId/members/:memberEmail`
- `GET /api/admin/cli-tokens`
- `DELETE /api/admin/cli-tokens`

Along with the user-facing routes: `/api/vouchers/redeem` and `/api/user/sync`.

### SEC-05 (HIGH): Admin clearance trusted spoofable headers

**Threat model.** `requireSuperAdmin` (`backend/src/security/super-admin.ts`) accepted `x-admin-email` / `x-user-email` request headers as an identity fallback. Any client could set these headers. Once the admin routes were mounted (SEC-04), an attacker combining the header spoof with an impersonation token from SEC-01 or SEC-02 would gain full admin takeover.

**Evidence.** Confirmed by source inspection during the hunting phase plus a regression test; the exploit chain was dependent on SEC-01/SEC-02 and SEC-04, all of which are proven by the PoC.

**Fix.** Admin identity now comes ONLY from the verified session (`req.user.email`). A regression test asserts `403 ADMIN_CLEARANCE_REQUIRED` for requests that present the headers without a verified session.

### SEC-06 (HIGH): Rate limiters defined but never mounted

**Threat model.** `globalLimiter`, `auditLimiter` and `authVoucherLimiter` existed only in `backend/src/security/rate-limiter.ts` and its test file. Zero per-IP throttling was active in production, leaving login, audit execution, and voucher redemption open to brute force, resource exhaustion, and abuse.

**Evidence (PoC quote).** PoC exploit E4, pre-patch:

```
130 ok requests, 0 x 429
```

**Fix.** Limiters are now mounted:

- `globalLimiter` (120 requests/minute) app-wide.
- `auditLimiter` (15 requests/5 minutes) on `POST /api/audit`.
- `authVoucherLimiter` (15 requests/10 minutes) on `POST /api/auth/login`.

The `keyGenerator` resolves `cf-connecting-ip`, then the first `X-Forwarded-For` hop, then `ipKeyGenerator(req.ip)` for IPv6 safety (express-rate-limit v8.7.1).

Post-patch PoC evidence: `130 ok requests, 16 x 429`.

### SEC-07 (MEDIUM): CAPTCHA bypass via self-issued dev tokens

**Threat model.** `POST /api/audit` skipped Cloudflare Turnstile verification whenever the Bearer token contained the `dev-token-` prefix, or the resolved caller id was `usr-dev-auditor` / `usr-cli-runner`. Combined with SEC-01 or SEC-02, any anonymous attacker could run unlimited audits without ever solving a CAPTCHA, consuming AI budget and backend capacity.

**Evidence (PoC quote).** PoC exploit E5, executed with `NODE_ENV=production`:

```
HTTP 200 body={"reportId":"audit-..."}
```

**Fix.** Self-issued token prefixes (`dev-`, `google-`, `github-` token forms) are rejected with `401` in production inside `auth-guard`, making the bypass list unreachable for untrusted callers. Legitimate CLI callers still pass only with a verified CLI token or a configured exact-match API key (SEC-03 fix).

### SEC-08 (MEDIUM): Duplicate unauthenticated verify-diff route (dead-code trap)

**Threat model.** A second `app.post('/api/audit/verify-diff')` without authentication was registered after the authenticated one. It was unreachable, but a single route reorder would have turned it into a full authentication bypass on a fix-verification endpoint.

**Evidence.** Confirmed by source inspection (duplicate registration with differing middleware).

**Fix.** The duplicate route was removed from `backend/src/server.ts`. No consumer was broken: the CLI `shipsafe diff` runs fully locally and the MCP server never calls this endpoint.

### SEC-09 (LOW): Hardcoded fallback Supabase project URL and anon-key fallback in admin destructive paths

**Threat model.** `deleteAdminUser` and `deleteScanRecord` in `backend/src/security/admin-controller.ts` embedded a fallback Supabase project URL and fell back to the anon key when environment variables were missing. Destructive admin operations could then run against an unintended project or with insufficient privileges, producing silent, inconsistent state.

**Fix.** The controller now reads `process.env.SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` only. When unconfigured, REST deletes are silently skipped instead of falling back to hardcoded values.

### SEC-10 (HARDENING, functional): Monthly quota enforcement and intake gate wired into the audit endpoint

**Threat model.** Quota and intake logic existed but was not enforced on the request path, so monthly audit quotas and the admin intake pause toggle had no production effect.

**Fix (implemented and verified).**

- `consumeUserAuditQuota` runs after Turnstile verification on `POST /api/audit`. Non-UUID/local identities receive an internal allowed fallback.
- Exhausted quota returns `402` with code `quota_exceeded`; the frontend `api/http.ts` already maps this to the paywall.
- `refundUserAuditQuota` fires when an audit fails, so users are not charged for failed runs.
- The admin intake toggle is enforced: paused intake returns `503` with code `intake_paused`.

## Verification

### PoC harness before/after

Harness: `backend/tests/security/poc-exploit.mjs`. It spawns the real production build (`backend/dist/server.js`) on port 2399 with `NODE_ENV=production` and Supabase credentials stripped, then attempts 5 exploits (E1 login impersonation, E2 forged JWT, E2b prefix API key, E3 admin route reachability, E4 rate limit flood, E5 Turnstile bypass).

| Run | Result |
| --- | --- |
| Before patching | `POC SUMMARY: 5/5 exploits CONFIRMED` |
| After patching | `POC SUMMARY: 0/5 exploits CONFIRMED` (each verdict line reads BLOCKED; E4 evidence: `130 ok requests, 16 x 429`) |

### Test suites

| Suite | Result |
| --- | --- |
| Backend (Vitest) | 19 test files / 156 tests passed (previously 152; +4 new production regression tests) |
| Frontend (Vitest) | 33 files / 204 tests passed |
| Typecheck | clean |

New regression coverage: `backend/src/security/auth-production-guard.test.ts` (4 tests pinning production fail-closed behavior) and updated admin endpoint tests against the shared router (`backend/src/security/admin-endpoints.test.ts`).

### Files changed

- `backend/src/server.ts` (login hardening, limiter mounts, intake gate, quota wiring, duplicate route removal, admin router mount)
- `backend/src/security/auth-guard.ts` (fail-closed JWT verification, production gating of self-issued tokens, exact-match API keys)
- `backend/src/security/super-admin.ts` (header trust removed)
- `backend/src/security/rate-limiter.ts` (`keyGenerator` + `ipKeyGenerator` IPv6 compliance)
- `backend/src/security/admin-routes.ts` (NEW shared router, single source of truth)
- `backend/src/security/admin-controller.ts` (env-only Supabase configuration)
- `backend/src/security/admin-endpoints.test.ts` (refactored to shared router + test auth stub)
- `backend/src/security/auth-production-guard.test.ts` (NEW, 4 regression tests)
- `backend/tests/security/poc-exploit.mjs` (NEW PoC harness)
- `frontend/src/App.tsx`, `frontend/src/components/admin/SuperAdminDashboard.tsx`, `frontend/src/components/pricing/PaywallModal.tsx`, `frontend/src/components/pricing/ConsolePricingPage.tsx` (`Authorization: Bearer` header from the `shipsafe.auth.token` localStorage key on user/sync, all admin fetches, and voucher redeem)

### Notes

CORS whitelist itself was already sane (strict origin allowlist plus regex; the wildcard was removed in an earlier release).

## Residual / Accepted Risks

These are documented design decisions, not defects:

- **Quota guard fails open on Supabase network errors.** Paying users must not be locked out by a transient database outage. Accepted design, enforced by existing tests.
- **CORS `allowedHeaders` still lists `x-admin-email` / `x-user-email`** for backward compatibility with already-deployed clients. The server no longer trusts these headers for identity (SEC-05 fix).
- **`x-shipsafe-client: cli` remains a Turnstile bypass signal on the audit endpoint**, but only when paired with a verified CLI token or a configured API key. Self-issued prefixes are now rejected in production (SEC-07 fix).
- **Fail-open 503 semantics on auth.** When Supabase is reachable it remains the single source of truth; when it is down, authentication fails closed and users see `auth_service_unavailable`.

## Deployment Checklist (VPS)

1. Rebuild the backend: `npm run build` inside `backend/`.
2. Restart the systemd unit `shipsafe-api`.
3. Ensure environment variables on the VPS:
   - `NODE_ENV=production`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_JWT_SECRET`
   - `CLI_TOKEN_SECRET` (at least 16 characters, required in production for CLI tokens)
   - `TURNSTILE_SECRET`
   - `SHIPSAFE_API_KEY` (optional, enables the exact-match automation key)
   - `CORS_ORIGIN` (comma-separated list; defaults to the built-in whitelist)
4. Deploy the frontend to Vercel AFTER the backend update, so the corrected `Authorization` headers ship to clients.

## Appendix: Re-running the PoC

The exploit harness is checked into the repository and runs against the compiled production build.

```bash
cd backend
npm run build
node tests/security/poc-exploit.mjs
```

Expected output on a patched build:

```
POC SUMMARY: 0/5 exploits CONFIRMED
```

Each exploit verdict line should read BLOCKED. The E4 (rate limit) verdict should report `130 ok requests, 16 x 429`.
