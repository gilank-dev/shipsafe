# Implementation Plan: ErrorBoundary hardening + Clerk dev-key diagnostic

Workspace: `c:\Users\HYPE AMD\files\PROJECT\PERSONAL\KIRO TEST\frontend`
Shell: Windows + PowerShell. Chain commands with `;`, never `&&`. Quote every path (the root contains spaces).
Scope lock: ONLY `src/components/common/ErrorBoundary.tsx`, `src/main.tsx`, and `src/styles/index.css` (two small class additions). Do NOT touch any `.env*` file, do NOT change the key value, do NOT alter unrelated components.

---

## 0. What exploration found (the brief's assumptions were partly stale — honor these facts)

- `src/main.tsx` ALREADY imports and wires an `ErrorBoundary` from `./components/common/ErrorBoundary`, and it ALREADY sits OUTSIDE `ClerkProvider` inside `StrictMode`. Current render tree (verified):
  `StrictMode > ErrorBoundary > ClerkProvider > App`. Requirement 2 (boundary above ClerkProvider, StrictMode preserved) is therefore already satisfied structurally — do not re-wrap or move it. Line 7 reads:
  `const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || 'pk_test_...'` (a `pk_test_` dev fallback is hardcoded as the default — this is exactly the failure mode in the brief).
- `src/components/common/ErrorBoundary.tsx` ALREADY exists: a class component with `getDerivedStateFromError` + `componentDidCatch`, a dark-theme fallback using the real tokens, and two buttons (Reload, Reset Storage & Restart). Gaps vs requirements: (1) it renders `error.message` UNCONDITIONALLY (not gated by `import.meta.env.DEV`) and shows no stack; requirement 1 wants dev-only message+stack in a `<pre>` and NO stack leak in production; (2) no Clerk dev-key diagnostic exists anywhere (requirement 3).
- Palette tokens actually available (from `src/styles/tokens.css`, exposed to Tailwind v4 via `@theme`): `bg-canvas`, `bg-surface`, `bg-raised`, `text-ink`, `text-ink-2`, `text-ink-3`, `border-rule`, `border-rule-strong`, `text-fail`/`bg-status-fail-*`/`text-status-fail-fg`, `bg-warn-bg`/`text-warn-ink`/`border-warn-edge`, `text-status-warn-fg`/`bg-status-warn-bg`/`border-status-warn-border`. Font tokens: `font-mono`, `font-sans`. Text sizes: `text-caption`, `text-small`, `text-body`, `text-title`, `text-h3`. Radii: `--radius-chip` (2px), `--radius-control` (4px). There is NO `status-fail` single color utility named exactly `bg-status-fail` — the existing component uses `bg-status-fail` and `text-status-fail` which map to `--color-fail` via `--color-fail: var(--status-fail)`; the actual utilities are `bg-fail` / `text-fail`. The existing file uses `bg-status-fail`/`text-status-fail`, which are NOT in the `@theme` map — another latent bug to correct to `bg-fail`/`text-fail`.
- Two class names the existing component references are NOT defined anywhere in CSS: `btn-outline` (only `.btn`, `.btn-primary`, `.btn-quiet` exist) and `--radius-panel` (only `--radius-chip`/`--radius-control` exist). `rounded-[var(--radius-panel)]` resolves to empty (no rounding) and `btn-outline` renders as a bare `.btn`. Since requirement 1 says match existing conventions/tokens, fix these to defined tokens rather than introduce new design primitives.
- Build/verify commands (from `package.json`): `npm run typecheck` (`tsc -b`), `npm run build` (`vite build`), `npm run lint`, `npm run test` (`vitest run`). Baseline `npm run typecheck` currently exits 0.
- `.btn-primary` = ink background / canvas text (high contrast on dark). Use it for the primary Reload button.

## Chosen Clerk-hint approach: (a) pre-mount guard in `main.tsx`. Justification.

Pick **(a)**: detect `pk_test_` + non-localhost hostname in `main.tsx` BEFORE mounting, and render a dedicated explanatory fallback instead of mounting `ClerkProvider`.

- From the code: `clerkPubKey` is a plain module-scope const already computed on line 7, before `createRoot(...).render(...)`. The guard is a trivial synchronous `if` with zero added state/async.
- Approach (b) (let ClerkProvider throw, catch in the boundary) is unreliable: `@clerk/clerk-react@5.61.10` does not guarantee a synchronous render-phase throw for a dev-key-on-production-domain mismatch — it may warn/degrade or fail asynchronously (outside React's render phase, e.g. network/redirect), which a React error boundary cannot catch. The explicit pre-mount check is deterministic and testable.
- The ErrorBoundary still stays in place as the catch-all for genuine render-time throws (requirement 2), so both layers coexist: deterministic guard for the known failure, boundary for the unknown.
- Do NOT print or embed the key value anywhere (requirement 3) — the guard tests only `clerkPubKey.startsWith('pk_test_')` and the hostname.

---

## Implementation items (ordered; each leaves the project buildable)

- [ ] 1. Add the two missing CSS primitives the fallback UI relies on, so classes resolve instead of silently no-op'ing.
      In `src/styles/index.css`, inside the existing `@layer components` block (next to `.btn-primary`/`.btn-quiet`), add a `.btn-outline` rule: transparent background, `1px solid var(--rule-strong)` border, `color: var(--ink)`, same hover as `.btn` (`border-color: var(--ink)`), reusing `--radius-control`. Also add a `--radius-panel` token to `tokens.css` `@theme inline` block set to the same 4px as `--radius-control` (or change the component to use `rounded-[var(--radius-control)]` in item 2 instead — pick adding the token so the existing on-brand markup stays stable). Keep both minimal; do not restyle anything else.
      Files: `src/styles/index.css`, `src/styles/tokens.css`
      Verify: `npm run build` exits 0 and Vite emits no "unknown utility" warning for `btn-outline`/`radius-panel`; `npm run typecheck` still exits 0.

- [ ] 2. Rework `src/components/common/ErrorBoundary.tsx` to meet requirement 1 while keeping the existing on-brand copy and two-button layout.
      Keep the class component, `getDerivedStateFromError`, `componentDidCatch` (keep the existing `console.error('[ShipSafe Uncaught Exception]:', ...)`), both `handleReload` and `handleResetAndReload` handlers, and the existing dark-theme shell markup. Changes: (a) correct the broken token classes `bg-status-fail`/`text-status-fail` to the defined `bg-fail`/`text-fail` (and `animate-pulse` is fine as a Tailwind built-in). (b) Gate the error detail behind `import.meta.env.DEV`: in development render the error message AND `error.stack` inside a scrollable `<pre className="... font-mono text-caption text-ink-2 ...">` (reuse the existing `bg-canvas border border-rule rounded` detail box, change `<code>` to `<pre>` and include `this.state.error?.stack`); in production render NOTHING of the error object (no message, no stack) — only the human headline + reload guidance line. (c) Ensure a short human-readable headline and a one-line "try reloading" instruction are present in BOTH environments (the existing "Application Error" headline + the existing explanatory paragraph satisfy this; add/confirm an explicit "Please reload the page to continue." style line). Keep the primary Reload button (`btn btn-primary`) calling `window.location.reload()` and the secondary reset button (`btn btn-outline`). Add `type="button"` (already present). No stack is ever shown when `import.meta.env.DEV` is false.
      Files: `src/components/common/ErrorBoundary.tsx`
      Verify: `npm run typecheck` exits 0; `npm run build` (production, `import.meta.env.DEV===false`) exits 0 and the built JS does not render the stack branch — confirm by grepping the dev-only string you place in the `<pre>` label (e.g. a `data-testid="error-detail"` or the word "Stack") is wrapped so it is tree-shaken/guarded; if a unit test exists for this component run `npm run test -- ErrorBoundary`, otherwise rely on typecheck+build.

- [ ] 3. Add the pre-mount Clerk dev-key diagnostic (approach a) in `src/main.tsx`, without changing any other behavior.
      After `clerkPubKey` is computed and after the `rootEl` null-check, add a guard: compute `const host = window.location.hostname` and `const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '[::1]'`. If `clerkPubKey.startsWith('pk_test_') && !isLocal`, call `createRoot(rootEl).render(...)` with a dedicated explanatory fallback (reuse the same dark-theme shell/token classes as the ErrorBoundary fallback — `min-h-[100dvh] bg-canvas text-ink`, a `bg-surface border border-rule` panel, a headline, and the message: "This site is using a Clerk development key on a production domain. Set VITE_CLERK_PUBLISHABLE_KEY to a pk_live_ key and redeploy." plus a Reload button calling `window.location.reload()`), then `return` so `ClerkProvider` is never mounted. Otherwise fall through to the EXISTING unchanged `createRoot(rootEl).render(<StrictMode><ErrorBoundary><ClerkProvider ...><App/></ClerkProvider></ErrorBoundary></StrictMode>)`. Do NOT print `clerkPubKey`'s value. Keep `StrictMode` and the existing boundary wiring exactly as-is on the normal path. Optionally extract the fallback markup into a tiny local function/component in `main.tsx` (do not create a new file) to avoid duplicating the panel — keep it simple.
      Files: `src/main.tsx`
      Verify: `npm run typecheck` exits 0; `npm run build` exits 0. Manual reasoning check: on localhost the normal tree renders (guard false); on a production hostname with the `pk_test_` fallback the dedicated message renders and ClerkProvider is skipped.

- [ ] 4. Full verification of the complete change set.
      Run the project's real gate from the frontend directory.
      Files: none (verification only).
      Verify: `Set-Location 'c:\Users\HYPE AMD\files\PROJECT\PERSONAL\KIRO TEST\frontend'; npm run typecheck; npm run lint; npm run build` — all exit 0. If a Vitest suite covering `ErrorBoundary` or `main` exists, also run `npm run test`; if none exists, do not add one for this scoped fix. Confirm no `.env*` file and no component outside the three listed files was modified (e.g. `git status --porcelain` if the repo is a git repo, otherwise review the diff of the three files only).

---

## Notes / assumptions (made rather than stalling)

- The brief referenced `.agents/tasks/blank-page-investigation.md` and claimed `main.tsx` has no error boundary. Neither holds on disk: the report file does not exist, and the boundary is already wired. The plan adapts to the real code — it hardens the existing boundary and adds the missing diagnostic rather than creating a duplicate boundary.
- Headline wording: the existing "Application Error // Runtime Fault" copy is on-brand and human-readable; it satisfies the "short human-readable headline" intent. The plan keeps it and only ensures an explicit reload-guidance line is present. If a reviewer prefers the literal "Something went wrong", that is a one-line copy change within item 2 and does not affect structure.
- `[::1]` is included in the localhost allow-list defensively; harmless if never hit.

---

## Implementation record (iteration 1) — DONE

Changes made (scope: 4 files; no `.env*`, no unrelated components):
1. `src/styles/tokens.css` — added `--radius-panel: 4px;` to the `@theme inline` block so `rounded-[var(--radius-panel)]` resolves.
2. `src/styles/index.css` — added `.btn-outline` component rule (transparent bg, `--rule-strong` border, `--ink` text, hover → `--ink` border) so the secondary button renders as intended instead of a bare `.btn`.
3. `src/components/common/ErrorBoundary.tsx` — fixed broken token classes `bg-status-fail`→`bg-fail` and `text-status-fail`→`text-fail` (the former were not in the `@theme` map); changed headline to "Something went wrong"; added explicit reload-guidance line in the paragraph (shown in both envs); gated error detail behind `import.meta.env.DEV` and now renders `error.message` + `error.stack` in a scrollable `<pre>` (production renders NO error object / NO stack). Primary Reload button + secondary Reset button retained.
4. `src/main.tsx` — added pre-mount Clerk dev-key diagnostic (approach a): if `clerkPubKey.startsWith('pk_test_')` AND hostname is not localhost/127.0.0.1/[::1], render a dedicated `DevKeyOnProductionFallback` panel (reusing the dark-theme tokens) with the message "This site is using a Clerk development key on a production domain. Set VITE_CLERK_PUBLISHABLE_KEY to a pk_live_ key and redeploy." + Reload button, and skip mounting ClerkProvider. Otherwise the existing `StrictMode > ErrorBoundary > ClerkProvider > App` tree renders unchanged. The key value is never printed.

Verification (run from `frontend/`, one-shot, PowerShell):
- `npm run typecheck` (tsc -b) → exit 0.
- `npm run build` (vite build) → exit 0; 472 modules transformed, built in ~3.9s; no "unknown utility" warnings for `btn-outline`/`radius-panel`.
- `npm run lint` (eslint .) → exit 1, but the ONLY errors are the 4 PRE-EXISTING `@typescript-eslint/no-explicit-any` errors in `src/components/dialogs/AuthModal.test.tsx` plus 1 pre-existing `react-hooks/exhaustive-deps` warning in `src/components/ui/TurnstileWidget.tsx`. New/edited files (`ErrorBoundary.tsx`, `main.tsx`, CSS) add ZERO new eslint problems.
- No ErrorBoundary/main Vitest suite exists; per scope, none was added.
