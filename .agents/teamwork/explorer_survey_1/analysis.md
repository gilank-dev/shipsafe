# Investigation Analysis: Items 1 & 2 (Identity Badges & Sidebar Navigation)

**Date**: 2026-10-30  
**Agent**: Explorer 1 (Badge & Navigation Explorer)  
**Scope**: 
1. Identity Badges: Clean labels ('Admin', 'Enterprise', 'Pro', 'Free'), removal of all brackets/prefixes (`[CLEARANCE: SUPER ADMIN]`, `[TIER: FREE]`, `[TIER: PRO]`, `[TIER: ENTERPRISE // ORG]`), exactly 1 clean badge per user.
2. Sidebar Navigation: Clean 'Admin' navigation item replacing `[ADMIN LEDGER]`, strict DOM gating on `isSuperAdmin`.

---

## 1. Executive Summary

ShipSafe currently uses two badge components:
- `TierStamp.tsx`: Rectilinear stamp component using brackets and prefixes (`[CLEARANCE: SUPER ADMIN]`, `[TIER: ENTERPRISE // ORG]`, `[TIER: PRO]`, `[TIER: FREE]`). This component is rendered in `ConsoleSidebar.tsx` and `SuperAdminDashboard.tsx`.
- `TierBadge.tsx`: Clean badge component that already renders clean text without brackets (`Admin`, `Enterprise`, `Pro`, `Free`). This component is rendered in `LandingPage.tsx`, `ConsolePricingPage.tsx`, and `UserIdentityHeader.tsx`.

In `ConsoleSidebar.tsx`:
- When a user is a Super Admin, lines 216–230 render **two badges**: a hardcoded `<span>[TIER: ENTERPRISE]</span>` AND `<TierStamp isSuperAdmin={true} size="xs" />` (`[CLEARANCE: SUPER ADMIN]`). This directly violates the requirement to display exactly 1 clean badge per user.
- The Admin navigation item at lines 163–179 is currently rendered as `<span className="truncate font-semibold">[ADMIN LEDGER]</span>`.
- The DOM condition `{isSuperAdmin && ( ... )}` strictly prevents rendering when the user is not a super admin, but the label must be replaced with clean `Admin`.

---

## 2. Item 1: Identity Badges & Tier Labels Survey

### 2.1 File & Line Number Inventory

| File Path | Line Numbers | Current Content / Element | Issue / Required Change |
|---|---|---|---|
| `frontend/src/components/ui/TierStamp.tsx` | Lines 42, 56, 68, 85, 96 | `[CLEARANCE: SUPER ADMIN]`, `[TIER: ENTERPRISE // ORG]`, `[TIER: PRO]`, `[TIER: FREE]` | Remove brackets and prefixes. Replace with clean labels: `'Admin'`, `'Enterprise'`, `'Pro'`, `'Free'`. Retain rectilinear border, font tokens (`font-mono`), and background/text contrast. |
| `frontend/src/components/shell/ConsoleSidebar.tsx` | Lines 216–230 | Dual-badge block when `isSuperAdmin`: hardcoded `<span>[TIER: ENTERPRISE]</span>` + `<TierStamp isSuperAdmin={true} size="xs" />` | Remove the duplicate hardcoded Enterprise badge. Render exactly 1 badge: `<TierStamp tier={effectiveTier} isSuperAdmin={isSuperAdmin} size="xs" />`. |
| `frontend/src/components/ui/TierStamp.test.tsx` | Lines 6–38 | Asserts exact text `[TIER: FREE]`, `[TIER: PRO]`, `[TIER: ENTERPRISE // ORG]`, `[CLEARANCE: SUPER ADMIN]` | Update assertions to expect clean strings: `'Free'`, `'Pro'`, `'Enterprise'`, `'Admin'`. |
| `frontend/src/components/admin/SuperAdminDashboard.tsx` | Line 740 | `<TierStamp tier="enterprise" isSuperAdmin={true} size="sm" />` | Header identity badge. Will automatically render clean `'Admin'` once `TierStamp.tsx` is updated. |
| `frontend/src/components/admin/SuperAdminDashboard.tsx` | Line 954 | `<TierStamp tier={u.tier} isSuperAdmin={u.isSuperAdmin} size="xs" />` | User list table rows. Will automatically render clean `'Admin'`, `'Enterprise'`, `'Pro'`, or `'Free'` once `TierStamp.tsx` is updated. |
| `frontend/src/components/admin/SuperAdminDashboard.tsx` | Line 653 | WhatsApp voucher helper string: `[TIER: ${isEnterprise ? 'ENTERPRISE // ORG' : 'PRO'}]` | Text template cleanup: replace with clean `Enterprise` / `Pro`. |
| `frontend/src/config/super-admin.ts` | Line 6 | JSDoc comment: `...and [CLEARANCE: SUPER ADMIN] stamps.` | Doc comment cleanup. |
| `frontend/src/components/ui/TierBadge.tsx` | Lines 38, 61, 71, 74 | `'Admin'`, `'Free'`, `'Enterprise'`, `'Pro'` | Already clean. No change needed. |
| `frontend/src/components/landing/LandingPage.tsx` | Line 577 | `<TierBadge tier={effectiveTier} isSuperAdmin={user.isSuperAdmin} size="xs" />` | Already clean (renders 1 badge). Navigation button next to it on line 585 also says `'Admin'`. |
| `frontend/src/components/pricing/ConsolePricingPage.tsx` | Line 163 | `<TierBadge tier={effectiveTier} isSuperAdmin={user?.isSuperAdmin} size="xs" />` | Already clean (renders 1 badge). |
| `frontend/src/components/ui/UserIdentityHeader.tsx` | Line 58 | `<TierBadge tier={effectiveTier} isSuperAdmin={user.isSuperAdmin} size="xs" />` | Already clean (renders 1 badge). |

### 2.2 Dual-Badge Analysis in `ConsoleSidebar.tsx`

In `ConsoleSidebar.tsx`:
```tsx
// CURRENT (Lines 216-230):
<div className="mt-1 flex flex-col gap-1 items-start">
  {isSuperAdmin ? (
    <>
      <span
        data-testid="tier-stamp-enterprise"
        className="inline-flex items-center font-mono font-semibold uppercase tracking-wider border border-ink bg-surface text-ink select-none rounded-none shadow-none text-[9px] px-1.5 py-0.5"
        title="Tier: Enterprise Organization"
      >
        [TIER: ENTERPRISE]
      </span>
      <TierStamp isSuperAdmin={true} size="xs" />
    </>
  ) : (
    <TierStamp tier={effectiveTier} isSuperAdmin={false} size="xs" />
  )}
</div>
```

**Proposed Clean Single-Badge Replacement**:
```tsx
<div className="mt-1 flex items-center">
  <TierStamp tier={effectiveTier} isSuperAdmin={isSuperAdmin} size="xs" />
</div>
```
When `isSuperAdmin` is `true`, `TierStamp` renders exactly 1 badge: `'Admin'`.
When `isSuperAdmin` is `false`, `TierStamp` renders exactly 1 badge: `'Enterprise'`, `'Pro'`, or `'Free'`.

---

## 3. Item 2: Sidebar Navigation & DOM Gating Survey

### 3.1 Current Implementation in `ConsoleSidebar.tsx`

Lines 163–179:
```tsx
{/* Admin Group (Strictly gated: ONLY shown if user has Super Admin clearance) */}
{isSuperAdmin && (
  <div className="space-y-1 border-t border-rule pt-3">
    <p className="px-2 text-[10px] font-mono uppercase tracking-wider text-ink-3 font-semibold mb-1.5">
      Management
    </p>

    <button
      type="button"
      onClick={() => handleNavigate('/admin')}
      className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-mono text-ink hover:bg-surface border border-rule transition-colors text-left cursor-pointer rounded-none"
      title="Super Admin Dashboard & System Ledger"
    >
      <Terminal className="size-4 shrink-0" strokeWidth={1.5} />
      <span className="truncate font-semibold">[ADMIN LEDGER]</span>
    </button>
  </div>
)}
```

### 3.2 Evaluation of DOM Gating Condition

1. **DOM Gating Strictness**:
   - The expression `{isSuperAdmin && ( ... )}` evaluates conditionally in React JSX.
   - If `isSuperAdmin` is `false`, React evaluates this to `false` and renders nothing to the DOM tree (no placeholder node, no hidden CSS element, no DOM node whatsoever).
   - If user is not authenticated (`user === null`), `user?.isSuperAdmin` is `undefined`, `user?.email` is `undefined`, and `isSuperAdminEmail(undefined)` returns `false`. `isSuperAdmin` is `false`. The entire Management section does NOT exist in the DOM.
   - If user is authenticated but not an admin (e.g. `user.isSuperAdmin === false` and `user.email` is not in whitelist), `isSuperAdmin` is `false`. The Management section does NOT exist in the DOM.

2. **Navigation Item Label & Title**:
   - Change `[ADMIN LEDGER]` to `Admin`.
   - Update `title` attribute from `"Super Admin Dashboard & System Ledger"` to `"Super Admin Dashboard"` or `"Admin Dashboard"`.

---

## 4. Super Admin Identity Architecture (`isSuperAdmin`)

### 4.1 Whitelist & Computation Points

1. **Email Whitelist (Single Source of Truth)**:
   - **Frontend**: `frontend/src/config/super-admin.ts`
     ```ts
     export const SUPER_ADMIN_EMAIL_WHITELIST = new Set([
       'hi@lankdev.my.id',
       'gilankdev@gmail.com',
       'ghilankputraramadhan@gmail.com',
     ])
     export function isSuperAdminEmail(email?: string | null): boolean {
       if (!email || typeof email !== 'string') return false
       return SUPER_ADMIN_EMAIL_WHITELIST.has(email.trim().toLowerCase())
     }
     ```
   - **Backend**: `backend/src/security/super-admin.ts`
     Exact identical 3-email whitelist and `isSuperAdminEmail` helper.

2. **Client State (`frontend/src/state/store.ts`)**:
   - User profile interface:
     ```ts
     export interface UserProfile {
       id: string
       email?: string
       fullName?: string
       avatarUrl?: string
       tier?: SubscriptionTier
       isSuperAdmin?: boolean
       accountStatus?: AccountStatus
       organizationId?: string | null
       orgRole?: 'owner' | 'member' | null
       organizationName?: string | null
       customQuotaLimit?: number | null
     }
     ```
   - Auto-escalation upon login (`setAuthUser` in `store.ts`, lines 239–247):
     ```ts
     setAuthUser: (user) => {
       let finalUser = user
       if (finalUser && isSuperAdminEmail(finalUser.email)) {
         finalUser = {
           ...finalUser,
           isSuperAdmin: true,
           tier: 'enterprise',
         }
       }
       ...
     ```

3. **In `ConsoleSidebar.tsx`**:
   - Line 28:
     ```ts
     const isSuperAdmin = Boolean(user?.isSuperAdmin) || isSuperAdminEmail(user?.email)
     ```
   - Line 29:
     ```ts
     const effectiveTier = isSuperAdmin ? 'enterprise' : (user?.tier || quota?.tier || 'free')
     ```

4. **In `App.tsx` Route Guard**:
   - Line 371:
     ```ts
     const isSuperAdmin = Boolean(authUser && (authUser.isSuperAdmin || isSuperAdminEmail(authUser.email)))
     ```

---

## 5. Test Inventory & Regression Impact

### 5.1 Test Files Directly Asserting on Badges & Navigation

1. **`frontend/src/components/ui/TierStamp.test.tsx`**:
   - Line 10: `expect(stamp).toHaveTextContent('[TIER: FREE]')` -> will fail, must update to `'Free'`.
   - Line 19: `expect(stamp).toHaveTextContent('[TIER: PRO]')` -> will fail, must update to `'Pro'`.
   - Line 28: `expect(stamp).toHaveTextContent('[TIER: ENTERPRISE // ORG]')` -> will fail, must update to `'Enterprise'`.
   - Line 36: `expect(stamp).toHaveTextContent('[CLEARANCE: SUPER ADMIN]')` -> will fail, must update to `'Admin'`.

2. **`frontend/src/components/ui/TierBadge.test.tsx`**:
   - Tests `TierBadge.tsx`. Uses regex `/free/i`, `/pro/i`, `/enterprise/i`, `/admin/i`.
   - Currently 4/4 passing and already adheres to clean labels.

3. **`frontend/src/components/admin/SuperAdminDashboard.test.tsx`**:
   - Line 245: `expect(screen.queryByText(/\[ADMIN LEDGER\]/i)).not.toBeInTheDocument()` -> will need update when SuperAdminDashboard header is updated to `ShipSafe Admin` (Item 3).
   - Line 254: `expect(screen.getByText(/ShipSafe Mission Control \[ADMIN LEDGER\]/i)).toBeInTheDocument()` -> will need update to `/ShipSafe Admin/i`.

4. **New Recommended Test**:
   - `frontend/src/components/shell/ConsoleSidebar.test.tsx`:
     Currently no unit test exists for `ConsoleSidebar`. Adding this test suite will guarantee:
     - Gating: 'Admin' button is NOT in document when `isSuperAdmin` is false or null.
     - Presence: 'Admin' button IS in document when `isSuperAdmin` is true.
     - Single Badge: Exactly 1 badge rendered per user in sidebar profile card.

---

## 6. Implementation Plan for Items 1 & 2

1. **Edit `frontend/src/components/ui/TierStamp.tsx`**:
   - Replace `[CLEARANCE: SUPER ADMIN]` with `Admin`.
   - Replace `[TIER: ENTERPRISE // ORG]` with `Enterprise`.
   - Replace `[TIER: PRO]` with `Pro`.
   - Replace `[TIER: FREE]` with `Free`.
   - Retain existing classes: `font-mono`, `border`, `bg-*`, `text-*`, `rounded-none`, `shadow-none`.
2. **Edit `frontend/src/components/shell/ConsoleSidebar.tsx`**:
   - Replace `[ADMIN LEDGER]` with `Admin` in the navigation button.
   - In user profile card (lines 216–230), remove dual badge stack; render single badge `<TierStamp tier={effectiveTier} isSuperAdmin={isSuperAdmin} size="xs" />`.
3. **Edit `frontend/src/components/ui/TierStamp.test.tsx`**:
   - Update expected text contents to `'Free'`, `'Pro'`, `'Enterprise'`, `'Admin'`.
4. **Create `frontend/src/components/shell/ConsoleSidebar.test.tsx`**:
   - Add unit tests validating strict DOM gating of the Admin navigation item and single identity badge rendering.
5. **Run test suites & typechecks**:
   - `npm --prefix frontend run typecheck`
   - `npm --prefix frontend test -- --run`
