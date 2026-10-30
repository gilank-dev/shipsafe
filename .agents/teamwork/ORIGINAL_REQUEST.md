# Original User Request

## Parameters
[skip-interview]
How this run was launched; not part of the task.

## Approved Request — 2026-10-30T10:01:23Z

Execute comprehensive UI/UX cleanup and de-overengineering across ShipSafe:
1. Identity Badges:
   - Clean labels: 'Admin', 'Enterprise', 'Pro', 'Free'
   - Eliminate all brackets and prefixes: no '[CLEARANCE: SUPER ADMIN]', no '[TIER: FREE]', no '[TIER: PRO]', no '[TIER: ENTERPRISE // ORG]'.
   - In ConsoleSidebar and profile headers, display exactly 1 clean badge per user (if super admin display 'Admin', otherwise display 'Enterprise', 'Pro', or 'Free').
   - Keep existing tokens, border styles, and fonts (rectilinear, zero-slop) intact.
2. Sidebar Navigation:
   - Replace '[ADMIN LEDGER]' with clean 'Admin' navigation item.
   - Strictly gate the 'Admin' navigation item: ONLY render in the DOM if the authenticated user is an authorized admin (isSuperAdmin). If not admin, the item MUST NOT exist in the DOM.
3. Super Admin Dashboard (SuperAdminDashboard.tsx):
   - Header: 'ShipSafe Admin' (remove '[ADMIN LEDGER]').
   - Sub-tabs: 'Users', 'Organizations', 'Vouchers', 'Security & Logs' (remove '01 //', '02 //', etc.).
   - Access restricted screen: Clean 'Access Restricted' title and message instead of '[CLEARANCE: ACCESS RESTRICTED]'.
4. Full Codebase Sweep for Jargon & Over-Engineering:
   - Search and replace remaining military / customs officer / sci-fi jargon (e.g. 'Security Clearance Verdict' -> 'Security Audit Verdict', 'Official security clearance PDF certificate' -> 'Official Security Audit Report', 'Terms of Clearance' -> 'Terms of Service', 'Customs Docket' -> 'Security Audit Docket', 'Boundary Breach' -> 'Page Not Found').
5. Verification:
   - Run typecheck, lint, and all test suites (frontend, backend, cli, mcp) to ensure 100% green tests with zero regressions.
