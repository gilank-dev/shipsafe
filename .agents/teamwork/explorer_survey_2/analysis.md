# Super Admin Dashboard (SuperAdminDashboard.tsx) Investigation & Analysis

## Executive Summary

This report delivers a comprehensive investigation of **Item 3 of the UI/UX cleanup request** for ShipSafe:
- **Header**: Replace `ShipSafe Mission Control [ADMIN LEDGER]` with `ShipSafe Admin`.
- **Sub-Tabs**: Replace bracketed numbers (`[01 // ...]`, `[02 // ...]`, etc.) with clean labels:
  - `Users`
  - `Organizations`
  - `Vouchers`
  - `Security & Logs`
- **Access Restricted Screen**: Address the `[CLEARANCE: ACCESS RESTRICTED]` specification, detailing current implementation (`return null` + client redirect to `/console`) vs. a clean, user-friendly `Access Restricted` screen design.
- **Routing & Entry Points**: Trace how the admin dashboard is mounted, protected, and navigated across `App.tsx`, `ConsoleSidebar.tsx`, and `LandingPage.tsx`.
- **Test Matrix**: Complete inventory of all frontend (`vitest`) and backend test suites asserting on admin headers, tabs, authorization, and telemetry.

---

## 1. Inventory of Target Occurrences & Exact Line Numbers

### 1.1 Header Component
- **File**: `frontend/src/components/admin/SuperAdminDashboard.tsx`
- **Lines 731–733**:
  ```tsx
  // Existing:
  <span className="text-xs font-bold uppercase tracking-wider text-ink">
    ShipSafe Mission Control [ADMIN LEDGER]
  </span>

  // Proposed Replacement:
  <span className="text-xs font-bold tracking-wider text-ink">
    ShipSafe Admin
  </span>
  ```
- **Adjacent UI in Header**:
  - Line 728: `<span>[CONSOLE]</span>` (Back button returning to `/console`). Recommend simplifying to `<span>Console</span>`.
  - Line 740: `<TierStamp tier="enterprise" isSuperAdmin={true} size="sm" />` (Targeted by Explorer 1 for badge cleanup).

### 1.2 Sub-Tabs Navigation Bar
- **File**: `frontend/src/components/admin/SuperAdminDashboard.tsx`
- **Lines 827–878**:
  ```tsx
  {/* Existing 4 Sub-Tabs: */}
  // Tab 1 (Line 839):
  [01 // USERS, ROLES &amp; QUOTAS]
  // -> Replace with:
  Users

  // Tab 2 (Line 851):
  [02 // ENTERPRISE ORGANIZATIONS &amp; SEATS]
  // -> Replace with:
  Organizations

  // Tab 3 (Line 863):
  [03 // VOUCHERS &amp; WHATSAPP FULFILLMENT]
  // -> Replace with:
  Vouchers

  // Tab 4 (Line 875):
  [04 // SECURITY ABUSE, CLI TOKENS &amp; AUDIT LOGS]
  // -> Replace with:
  Security & Logs
  ```
- **Internal Section Dividers / Comments**:
  - Line 883: `{/* SUB-TAB 1: USERS, ROLES & QUOTAS */}`
  - Line 1199: `{/* SUB-TAB 2: ENTERPRISE ORGANIZATIONS & SEATS */}`
  - Line 1430: `{/* SUB-TAB 3: VOUCHERS & WHATSAPP FULFILLMENT */}`
  - Line 1617: `{/* SUB-TAB 4: SECURITY ABUSE, CLI TOKENS & AUDIT LOGS */}`

### 1.3 Access Restricted Screen / Clearance Gatekeeper
- **File**: `frontend/src/components/admin/SuperAdminDashboard.tsx`
- **Lines 697–711**:
  ```tsx
  // Access restriction: if not authorized, redirect immediately to /console
  useEffect(() => {
    if (!isAuthorized) {
      if (onNavigate) {
        onNavigate('/console')
      } else if (typeof window !== 'undefined') {
        window.history.pushState({}, '', '/console')
        window.dispatchEvent(new PopStateEvent('popstate'))
      }
    }
  }, [isAuthorized, onNavigate])

  if (!isAuthorized) {
    return null
  }
  ```
- **Discovery Regarding `[CLEARANCE: ACCESS RESTRICTED]`**:
  - The literal string `[CLEARANCE: ACCESS RESTRICTED]` was specified in `SPEC_LANDING_MCP_CLI.md` line 249:
    > *"Sesi dari email non-whitelist secara otomatis dialihkan ke interface standar dengan peringatan `[CLEARANCE: ACCESS RESTRICTED]`."*
  - In `backend/src/security/super-admin.ts` line 57–58, the server returns:
    ```json
    {
      "error": "FORBIDDEN",
      "code": "ADMIN_CLEARANCE_REQUIRED",
      "message": "Access denied: Super Admin cryptographic clearance required."
    }
    ```
  - Currently in `frontend/src/components/admin/SuperAdminDashboard.tsx`, when `!isAuthorized`, it redirects to `/console` and returns `null`.
  - In `frontend/src/App.tsx` lines 371–375, `App.tsx` also gates the route and redirects non-admins directly:
    ```tsx
    const isSuperAdmin = Boolean(authUser && (authUser.isSuperAdmin || isSuperAdminEmail(authUser.email)))
    if (!isSuperAdmin) {
      navigateTo('/console')
      return null
    }
    ```
  - In `frontend/src/components/admin/SuperAdminDashboard.test.tsx` line 244:
    ```tsx
    expect(container.firstChild).toBeNull()
    ```
- **Implementation Recommendations for Access Restriction**:
  - **Option A (Preserve silent redirect + toast notification)**:
    When unauthorized access is attempted, display `toast.error('Access Restricted: Super Admin privileges required.')` and redirect. Keeps `container.firstChild === null` passing test line 244.
  - **Option B (Dedicated Access Restricted screen)**:
    Instead of `return null`, render an accessible fallback screen if not redirected:
    ```tsx
    if (!isAuthorized) {
      return (
        <div className="min-h-screen bg-canvas text-ink flex items-center justify-center p-6 text-center font-sans">
          <div className="border border-rule bg-surface p-8 max-w-md w-full space-y-4">
            <Lock className="size-8 text-status-fail mx-auto" strokeWidth={1.5} />
            <h1 className="text-xl font-bold font-mono tracking-tight text-ink">
              Access Restricted
            </h1>
            <p className="text-xs text-ink-2 font-mono">
              You do not have permission to access the administrative dashboard.
            </p>
            <button
              type="button"
              onClick={handleBackToConsole}
              className="px-4 py-2 border border-ink bg-canvas hover:bg-ink hover:text-canvas text-xs font-mono transition-colors cursor-pointer"
            >
              Return to Console
            </button>
          </div>
        </div>
      )
    }
    ```
    *Note: If Option B is adopted, `SuperAdminDashboard.test.tsx` line 244 must be adjusted from `expect(container.firstChild).toBeNull()` to `expect(screen.getByText('Access Restricted')).toBeInTheDocument()`.*

---

## 2. Admin Dashboard Routing & Entry Point Analysis

### 2.1 Route Mounting in `frontend/src/App.tsx`
- **Lines 367–385**:
  ```tsx
  // Super Admin Route (Strictly gated by Super Admin whitelist)
  const isAdminRoute = currentPath === '/admin' || currentPath.startsWith('/admin/')

  if (isAdminRoute) {
    const isSuperAdmin = Boolean(authUser && (authUser.isSuperAdmin || isSuperAdminEmail(authUser.email)))
    if (!isSuperAdmin) {
      navigateTo('/console')
      return null
    }

    return (
      <>
        <SuperAdminDashboard onNavigate={navigateTo} />
        <AuthModal />
        <ToastContainer />
        <Analytics />
      </>
    )
  }
  ```

### 2.2 Navigation Entry Points
1. **Console Sidebar (`frontend/src/components/shell/ConsoleSidebar.tsx`)**:
   - Lines 163–179:
     ```tsx
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
   - *Target for Item 2*: Replace `[ADMIN LEDGER]` with `Admin` and ensure strict DOM gating.
2. **Landing Page Top Navigation (`frontend/src/components/landing/LandingPage.tsx`)**:
   - Lines 578–587:
     ```tsx
     {user.isSuperAdmin && (
       <button
         type="button"
         onClick={() => navigate('/admin')}
         className="text-xs px-2.5 py-1 rounded-full border border-black/[0.08] dark:border-white/[0.12] bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white transition-all cursor-pointer font-mono font-medium shrink-0"
         title="Super Admin Dashboard"
       >
         Admin
       </button>
     )}
     ```
   - Already renders clean `'Admin'` text button.

---

## 3. Test Suites Inventory & Impact Analysis

### 3.1 Frontend Test Suite: `frontend/src/components/admin/SuperAdminDashboard.test.tsx`
Currently 14 tests, all passing (2010ms execution time).
Lines with direct dependencies on header and sub-tabs:

1. **Line 245**:
   ```tsx
   expect(screen.queryByText(/\[ADMIN LEDGER\]/i)).not.toBeInTheDocument()
   ```
   *Action*: Update to `expect(screen.queryByText(/ShipSafe Admin/i)).not.toBeInTheDocument()` (or verify neither old nor new header renders when unauthorized).
2. **Line 254**:
   ```tsx
   expect(screen.getByText(/ShipSafe Mission Control \[ADMIN LEDGER\]/i)).toBeInTheDocument()
   ```
   *Action*: Update to `expect(screen.getByText(/ShipSafe Admin/i)).toBeInTheDocument()`.
3. **Line 256**:
   ```tsx
   expect(screen.getByText('[01 // USERS, ROLES & QUOTAS]')).toBeInTheDocument()
   ```
   *Action*: Update to `expect(screen.getByRole('button', { name: /^Users$/i })).toBeInTheDocument()`.
4. **Line 272**:
   ```tsx
   const orgTab = screen.getByRole('button', { name: /\[02 \/\/ ENTERPRISE ORGANIZATIONS/i })
   ```
   *Action*: Update to `screen.getByRole('button', { name: /^Organizations$/i })`.
5. **Line 280**:
   ```tsx
   const voucherTab = screen.getByRole('button', { name: /\[03 \/\/ VOUCHERS/i })
   ```
   *Action*: Update to `screen.getByRole('button', { name: /^Vouchers$/i })`.
6. **Line 288**:
   ```tsx
   const secTab = screen.getByRole('button', { name: /\[04 \/\/ SECURITY ABUSE/i })
   ```
   *Action*: Update to `screen.getByRole('button', { name: /^Security & Logs$/i })`.
7. **Line 464**:
   ```tsx
   fireEvent.click(screen.getByRole('button', { name: /\[03 \/\/ VOUCHERS/i }))
   ```
   *Action*: Update to `screen.getByRole('button', { name: /^Vouchers$/i })`.

### 3.2 Related Frontend Tests
- `frontend/src/components/ui/TierStamp.test.tsx`: Asserts on `[CLEARANCE: SUPER ADMIN]` stamp (Handled in Item 1).
- `frontend/src/components/ui/TierBadge.test.tsx`: Asserts on `/admin/i` text. Already clean.
- `frontend/src/components/landing/LandingPage.test.tsx`: Asserts on direct contact links.

### 3.3 Backend Test Suites
- **`backend/src/security/admin-endpoints.test.ts`** (20 tests, all passing):
  - Tests API endpoints: `/api/admin/telemetry`, `/api/admin/users`, `/api/admin/organizations`, `/api/admin/vouchers`, `/api/admin/queue/flush`, etc.
  - Verifies HTTP 403 `ADMIN_CLEARANCE_REQUIRED` for non-admins.
- **`backend/src/security/super-admin.test.ts`** (5 tests, all passing):
  - Validates `SUPER_ADMIN_EMAIL_WHITELIST`, `isSuperAdminEmail()`, `requireSuperAdmin()` middleware.
- **`backend/src/security/auth-production-guard.test.ts`**:
  - Asserts that `requireSuperAdmin` does not trust spoofable headers (`x-admin-email`).

---

## 4. Proposed Implementation Patch Preview

### `frontend/src/components/admin/SuperAdminDashboard.tsx`
```diff
@@ -729,3 +729,3 @@
           <span className="text-rule-strong">/</span>
-          <span className="text-xs font-bold uppercase tracking-wider text-ink">
-            ShipSafe Mission Control [ADMIN LEDGER]
+          <span className="text-xs font-bold tracking-wider text-ink">
+            ShipSafe Admin
           </span>
@@ -836,3 +836,3 @@
           >
-            [01 // USERS, ROLES &amp; QUOTAS]
+            Users
           </button>
@@ -848,3 +848,3 @@
           >
-            [02 // ENTERPRISE ORGANIZATIONS &amp; SEATS]
+            Organizations
           </button>
@@ -860,3 +860,3 @@
           >
-            [03 // VOUCHERS &amp; WHATSAPP FULFILLMENT]
+            Vouchers
           </button>
@@ -872,3 +872,3 @@
           >
-            [04 // SECURITY ABUSE, CLI TOKENS &amp; AUDIT LOGS]
+            Security & Logs
           </button>
```

### `frontend/src/components/admin/SuperAdminDashboard.test.tsx`
```diff
@@ -245,2 +245,2 @@
-      expect(screen.queryByText(/\[ADMIN LEDGER\]/i)).not.toBeInTheDocument()
+      expect(screen.queryByText(/ShipSafe Admin/i)).not.toBeInTheDocument()
@@ -254,4 +254,4 @@
-      expect(screen.getByText(/ShipSafe Mission Control \[ADMIN LEDGER\]/i)).toBeInTheDocument()
+      expect(screen.getByText('ShipSafe Admin')).toBeInTheDocument()
       await waitFor(() => {
-        expect(screen.getByText('[01 // USERS, ROLES & QUOTAS]')).toBeInTheDocument()
+        expect(screen.getByRole('button', { name: /^Users$/i })).toBeInTheDocument()
       })
@@ -272,1 +272,1 @@
-      const orgTab = screen.getByRole('button', { name: /\[02 \/\/ ENTERPRISE ORGANIZATIONS/i })
+      const orgTab = screen.getByRole('button', { name: /^Organizations$/i })
@@ -280,1 +280,1 @@
-      const voucherTab = screen.getByRole('button', { name: /\[03 \/\/ VOUCHERS/i })
+      const voucherTab = screen.getByRole('button', { name: /^Vouchers$/i })
@@ -288,1 +288,1 @@
-      const secTab = screen.getByRole('button', { name: /\[04 \/\/ SECURITY ABUSE/i })
+      const secTab = screen.getByRole('button', { name: /^Security & Logs$/i })
@@ -464,1 +464,1 @@
-      fireEvent.click(screen.getByRole('button', { name: /\[03 \/\/ VOUCHERS/i }))
+      fireEvent.click(screen.getByRole('button', { name: /^Vouchers$/i }))
```

---

## 5. Verification Commands
- Frontend unit tests: `npm --prefix frontend test -- SuperAdminDashboard`
- Frontend typecheck: `npm --prefix frontend run typecheck`
- Frontend linting: `npm --prefix frontend run lint`
- Backend admin tests: `npm --prefix backend test -- admin`
