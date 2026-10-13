# Implementation Plan: ShipSafe Frontend

Workspace: `c:\Users\HYPE AMD\files\PROJECT\PERSONAL\KIRO TEST\frontend` (only `DESIGN.md` exists; greenfield).
Shell: Windows + PowerShell. Chain with `;`, never `&&`. Quote every path (the root path contains spaces). `KIRO TEST` is not a git repository, so do not run git commands.
Loop contract (unchanged): the implementer runs first, the reviewer renders the last verdict in `frontend\.agents\tasks\review.json` (`{"verdict":"APPROVED"|"CHANGES_REQUESTED","findings":[...],"reviewDoc":"<path>"}`), and the final verification step is retained. This step did not restructure the workflow tail. The work is one connected UI around a single store and a single API client, so it does not split into independent features.

---

## 0. READ FIRST: the spec on disk is not the spec the brief assumed

I read `shipsafe-spec.md` in full and `frontend/DESIGN.md` in full. They disagree:

| Fact | Evidence |
|---|---|
| `shipsafe-spec.md` is **v2, "ZIP Upload"** (379 lines, last written 21:02:32). It has no widgets, no `@` mentions, no prompt templates, no chatbot, no Go/No-Go verdict. Spec section 1 states these were removed on purpose: "Dihapus: 6 kotak input manual, widget chatbot Release Security Officer, verdict Go/No-Go". | `shipsafe-spec.md` sections 1, 2, 8, 9 |
| `frontend/DESIGN.md` (last written 21:00:49, 1.7 minutes **before** the spec changed) was written against the old v1 13-widget spec (`### Widget N: "Title"`). | `DESIGN.md` sections 3, 8, 15 |
| The v1 text (13 titles, 6 placeholders, 5 LLM prompts, persona) exists nowhere in the workspace. `.kiro/specs/shipsafe/requirements.md` and `frontend-design.md` are v1 requirement summaries that do not contain the prompt bodies. There is no git history. | searched the workspace, `PERSONAL\` subtree, and `.kiro\specs` |

Decision (assumption, do not stall): **build the frontend for the current spec on disk (v2).** Reasons: (1) the original user message says only "build the frontend", and the newest spec is the authoritative statement of the product; (2) the brief's own rule is "verbatim, never paraphrased", and the v1 prompt text cannot be recovered, so building v1 would force inventing text, which is a worse violation; (3) building removed features contradicts spec v2.

What carries over unchanged from `DESIGN.md`: stack and exact pins (section 4, verified to exist with `npm view`), design tokens and contrast table (5.x), typography, rhythm, motion (11), accessibility (14), safe markdown rules (7, 15.23), secret patterns and masking (8.6), the typed API client + mock pattern (9), error copy tone (10, 12), security headers (15.33), testing approach (17). What does not apply: widget config, `resolvePrompt`, dependency graph, topological runner, widget-level stale chain, VerdictBadge/Stamp, ChatWidget, Go/No-Go, Fix-It Checklist, `@` store keyed by title.

Disposition of every capability the task request named:

| Requested capability | Disposition under spec v2 |
|---|---|
| Vite + React + TS + Tailwind, exact pins | **Built** (item 1). |
| `widgets.config.ts` with 13 widgets, verbatim prompts | **Not built.** Replaced by a spec-extraction mechanism for the text v2 *does* freeze: the Disclaimer (spec section 7). The same script and conformance test also lock `Severity`, `Area`, `AgentTarget` unions to the spec (item 3). |
| Store keyed by widget title | Replaced by a Zustand store keyed by concern: `submission`, `audit`, `ui` (item 6). |
| `resolvePrompt`, graph, topological runner | Not applicable (no mentions or prompts exist in v2). Replaced by a staged audit controller: upload, scanning, auditing, report (items 5, 6, 10). |
| Stale / "Outdated" detection | **Built in v2 form:** a report is Outdated when the ZIP or project context changed after it ran (item 4 `stale.ts`, item 10 `StaleNotice`). |
| AppShell 3-zone grid | **Built in v2 form:** top banner, left submission panel, main report panel (spec 9.1). There is no bottom chatbot zone. Stacks on 375 / 768 / 1440 (item 8). |
| StaticTextWidget (Disclaimer, amber, always visible) | **Built** as `DisclaimerBanner` (item 8). |
| InputWidget (label, resizable textarea 6-8 lines, counter, mono) | **Built** as `ContextForm` (item 9): description textarea 6 rows, resizable, counter. Monospace only for code/paths/prompts. |
| GenerationWidget (Run, loading/empty/error, markdown + tables, Copy) | **Built** as the report area: Run Audit, `ProgressStepper`, `EmptyState`, `ErrorPanel`, `MarkdownView` with `remark-gfm` tables, Copy Prompt / Copy All (items 9 to 12). |
| VerdictBadge (GO / CONDITIONAL GO / NO-GO) | **Not built.** Spec v2 removes the verdict. Reusing those colors for a verdict would reintroduce a removed feature. Scorecard uses Pass / Partial / Fail tokens instead. |
| ChatWidget | **Not built** (removed by spec v2). |
| Run Full Audit orchestration | Replaced by Run Audit over one ZIP, with a 4-stage progress stepper (spec flow step 5). |
| Typed mock behind one API client, realistic content, no lorem ipsum | **Built** (item 5). The mock reads ZIP entry **names only** (central directory, no decompression) so even unknown ZIPs get structural, non-invented findings. |
| Client-side secret scanner + block/confirm dialog | **Built** (items 4, 9). It scans the free-text project context before send. It does not unzip in the browser (spec: ZIP is hostile data and all processing is server-side). |
| Severity color tokens; verdict color tokens | Severity + Pass/Partial/Fail tokens built (item 2). Verdict tokens omitted. |
| Keyboard, focus, WCAG 2.2 AA, semantic HTML, all states | **Built** throughout; gated in items 15 and 16. |

If the owner restores the v1 spec, the `DESIGN.md` pipeline (sections 3 to 9) is the starting point for a follow-up. Do not guess v1 text.

---

## 1. Facts from exploration the implementer must honor

- Node v24.19.0, npm 11.6.2. All pins in `DESIGN.md` 4.1 were checked: every one resolves on the registry (`npm view` run in this step).
- Spec relevant numbers: ZIP max 10 MB; magic bytes `PK\x03\x04`; accepted MIME `application/zip`, `application/x-zip-compressed`, ext `.zip`; server caps (mock mirrors): 100 MB decompressed, ratio 100:1, 5,000 entries, depth limit; 5 severities; 4 areas; 5 agent targets; finding fields (`id`, `title`, `severity`, `area`, `location?`, `what`, `why`, `recommendedFix`, `verifyWith?`, `remediationPrompt`); report parts: Executive Summary, Risk Scorecard, Findings, Secrets to Rotate, Gaps / Not Assessed.
- The frozen Disclaimer is the fenced block under `## 7. Disclaimer` in the spec. It contains a leading `⚠️` emoji and an **em dash**. Both are frozen data: keep the string byte-exact, exempt `src/config/text/` from the "no em dash / no emoji" lint, and follow `DESIGN.md` 15.5 for the visual treatment (wrap the glyph in a `hidden` span, draw an outline alert triangle).
- `DESIGN.md` bans em dashes, emoji, gradients, shadows (except the dialog), Inter, pills, colored card borders, `indigo|purple|violet|fuchsia|pink` classes, and default Tailwind palettes. Tokens only.
- Interpretation call (documented trade-off): spec Req 1.2 says the disclaimer stays visible at the top. The Disclaimer is non-dismissible, first in the DOM, sticky at >= 768px. Below 768px it is the first block and scrolls away, because the ~470 character text would pin about 30% of a 667px phone. Mitigation: repeat a one-line reminder in the dropzone helper and in the secret-scan dialog. State this in the README and in item 8's test names.
- UI language is English (the frozen Disclaimer and prompt formats are English).
- Mock labeling: persistent toolbar tag "Mock responses, no model attached", plus a footer line in the report ("Generated by the mock engine"). Never inside report text.
- Context7: before writing code against Tailwind v4 (`@theme`, `@tailwindcss/vite`), react-markdown 10, Zustand 5, Vitest 4 / vitest-axe, `eslint-plugin-react-hooks` 7 flat config, and Playwright, read the current docs via the Context7 MCP if available (otherwise the official docs). Do not rely on memory for these APIs.
- TDD per `ultra-dev`: for each pure module and each component, write the failing test first, then the minimum code, then refactor. Keep tests next to code as `*.test.ts(x)`.

---

## 2. Target architecture

```
frontend/
  DESIGN.md  README.md  package.json  package-lock.json  .npmrc  .gitignore  .gitattributes  .env.example
  index.html                       # no inline script or style
  vite.config.ts  tsconfig.json  tsconfig.app.json  tsconfig.node.json  eslint.config.js  playwright.config.ts
  public/theme-init.js  public/favicon.svg
  scripts/extract-spec-text.mjs  scripts/check-headers.mjs
  e2e/*.spec.ts
  src/
    main.tsx  App.tsx
    config/   limits.ts  agents.ts  text/disclaimer.txt  spec-conformance.test.ts
    domain/   types.ts  secrets.ts  zip-validate.ts  hash.ts  stale.ts  findings.ts  export.ts  format.ts  (+ .test.ts each)
    state/    store.ts  selectors.ts  announcer.ts  audit-controller.ts  (+ tests)
    api/      client.ts  errors.ts  http.ts  parse-report.ts
      mock/   engine.ts  zip-entries.ts  sample-zips.ts  prompts.ts  heuristics.ts  scenarios/ledgerline.ts  waybill.ts  harborlog.ts
    components/
      shell/     AppShell.tsx  SkipLinks.tsx  DisclaimerBanner.tsx  Toolbar.tsx  ThemeToggle.tsx  SampleMenu.tsx
      submission/ ContextForm.tsx  UploadDropzone.tsx  AgentSelector.tsx  RunAuditButton.tsx
      run/       ProgressStepper.tsx  EmptyState.tsx  ErrorPanel.tsx  StaleNotice.tsx
      report/    ReportView.tsx  ExecutiveSummary.tsx  Scorecard.tsx  FindingList.tsx  FindingCard.tsx  PromptModal.tsx  SecretsToRotate.tsx  NotAssessed.tsx  ExportBar.tsx
      markdown/  MarkdownView.tsx  ScrollableTable.tsx  CodeBlock.tsx
      dialogs/   Dialog.tsx  SecretScanDialog.tsx  ConfirmDialog.tsx
      ui/        Button.tsx  IconButton.tsx  Chip.tsx  CopyButton.tsx  SeverityTag.tsx  StatusTag.tsx  icons.tsx  VisuallyHidden.tsx  LiveAnnouncer.tsx
    styles/   index.css  tokens.css  markdown.css  print.css
    test/     setup.ts  design-rules.test.ts  pins.test.ts  contrast.test.ts  no-persistence.test.ts
```

Core types (`src/domain/types.ts`), taken from spec 9.2, with two small extensions flagged as such:

```ts
export type Severity = 'Critical' | 'High' | 'Medium' | 'Low' | 'Info'
export type Area = 'Secrets' | 'Dependencies' | 'HTTP' | 'Code'
export type AgentTarget = 'Generic' | 'Cursor' | 'ClaudeCode' | 'Copilot' | 'Windsurf'
export interface FindingLocation { file: string; line?: number; snippet?: string }
export interface Finding {
  id: string; title: string; severity: Severity; area: Area
  location?: FindingLocation          // never invented; absent renders "Location not determined"
  what: string; why: string; recommendedFix: string; verifyWith?: string
  remediationPrompt: string
  confidence?: 'Confirmed' | 'Likely, verify' | 'Not enough information'   // EXTENSION, for spec 5.2 and Req 5.5
}
export interface ScorecardRow { area: Area; score: number | null; status: string; topConcern: string } // score null = not assessed (EXTENSION)
export interface AuditReport {
  summary: string; countsBySeverity: Record<Severity, number>; scorecard: ScorecardRow[]
  findings: Finding[]; secretsToRotate: string[]; notAssessed: string[]; skippedFiles: string[]
}
export type AuditStage = 'upload' | 'scanning' | 'auditing' | 'report'
export type ApiErrorKind = 'network' | 'timeout' | 'rate_limited' | 'too_large' | 'not_zip' | 'unsafe_archive' | 'server' | 'bad_response' | 'aborted'
```

API surface (`src/api/client.ts`, the only I/O module components may import):

```ts
export interface AuditRequest { file: File; context: { description: string; deployTarget: string; handlesPII: boolean; handlesPayments: boolean }; agentTarget: AgentTarget }
export interface ShipSafeApi {
  audit(req: AuditRequest, opts: { signal: AbortSignal; onStage: (s: AuditStage, uploadPct?: number) => void }): Promise<{ reportId: string; report: AuditReport }>
  formatPrompts(reportId: string, target: AgentTarget, opts: { signal: AbortSignal }): Promise<Record<string, string>> // finding id -> prompt
}
```

HTTP mode contract for the future backend: `POST {base}/audit` multipart (`file`, `context` JSON, `agentTarget`), `POST {base}/audit/{reportId}/prompts` JSON `{agentTarget}`. Errors are `{ error: { code, message, retryAfterSeconds? } }` with 413, 415, 422, 429, 5xx. Client timeout 120 s. Responses validated by a hand-written type guard (`parse-report.ts`, no new dependency); a report with any finding missing `remediationPrompt` is `bad_response` (Req 6.1).

---

## 3. Ordered tasks

Each item leaves the project buildable. Run from `c:\Users\HYPE AMD\files\PROJECT\PERSONAL\KIRO TEST\frontend` unless stated. "Full gate" means: `npm run typecheck; npm run lint; npm run test; npm run build`.

- [ ] 1. Scaffold the project with exact pins (manual files, no interactive `npm create`).
      Create `package.json` (`"type":"module"`, `"private":true`, scripts: `dev` = `vite`, `build` = `vite build`, `preview` = `vite preview`, `typecheck` = `tsc -b`, `lint` = `eslint .`, `test` = `vitest run`, `test:watch` = `vitest`, `e2e` = `playwright test`; single commands only). Create `.npmrc` (`save-exact=true`). Install with `--save-exact` and the **exact** versions from `DESIGN.md` 4.1: deps `react@19.3.0 react-dom@19.3.0 zustand@5.0.15 react-markdown@10.1.0 remark-gfm@4.0.1 @fontsource-variable/archivo@5.3.0 @fontsource/ibm-plex-mono@5.3.0`; devDeps `vite@7.3.7 @vitejs/plugin-react@5.2.0 typescript@5.9.3 tailwindcss@4.3.3 @tailwindcss/vite@4.3.3 @types/react@19.3.0 @types/react-dom@19.3.0 @types/node@24.19.2 vitest@4.1.11 jsdom@27.4.0 @testing-library/dom@10.4.2 @testing-library/react@16.3.3 @testing-library/user-event@14.6.8 @testing-library/jest-dom@6.10.0 axe-core@4.14.0 vitest-axe@0.1.0 eslint@9.39.5 @eslint/js@9.39.5 typescript-eslint@8.71.2 eslint-plugin-react-hooks@7.1.1 globals@16.5.0 @playwright/test@1.64.0 @axe-core/playwright@4.13.0`. Write `vite.config.ts` (react + `@tailwindcss/vite`, Vitest block: jsdom, `setupFiles: ['src/test/setup.ts']`, `exclude: ['e2e/**','node_modules/**']`), the three tsconfig files (strict, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `vite/client` types so `?raw` compiles), `eslint.config.js` (flat; `no-restricted-syntax` banning the `dangerouslySetInnerHTML` JSX attribute; `no-restricted-imports` banning `rehype-raw` and `**/api/mock/**` outside `src/api/client.ts` and tests; react-hooks rules per the plugin's current README), `index.html` (`lang="en"`, `<title>ShipSafe | Pre-deployment security gate</title>`, `<meta name="color-scheme" content="light dark">`, external `/theme-init.js` script, no inline script or style), `public/theme-init.js`, `public/favicon.svg` (plain ink square), `.gitignore` (`node_modules`, `dist`, `.env*` except `.env.example`, `playwright-report`, `test-results`), `.gitattributes` (`src/config/text/*.txt text eol=lf`), `.env.example` (`VITE_API_MODE=mock`, `VITE_API_BASE_URL=/api`, `VITE_MOCK_LATENCY=normal`; no secrets), `src/test/setup.ts` (jest-dom + `vitest-axe` matchers, per their README), a minimal `src/main.tsx` / `App.tsx` rendering the hidden `h1`. Add `src/test/pins.test.ts`: reads `package.json`, asserts no dependency version contains `^`, `~`, `*`, or `latest`, and each equals the `DESIGN.md` 4.1 table (embed the table in the test).
      Files: all above.
      Verify: `npm run typecheck; npm run lint; npm run test; npm run build` all exit 0; `pins.test.ts` passes.

- [ ] 2. Design tokens, fonts, global CSS, and automated design rules (depends on 1).
      Write `src/styles/tokens.css` transcribing `DESIGN.md` 5.1 hex values **exactly** (neutrals, severity chips, Pass/Partial/Fail status, warn band, focus, light + `html[data-theme="dark"]` + `prefers-color-scheme`), expose via Tailwind v4 `@theme` with Tailwind's default palette cleared (`--color-*: initial`), typography scale and Archivo (`wdth`/`wght` axes via `@fontsource-variable/archivo/wdth.css`) + Plex Mono 400/500/600 imports (5.2), spacing and rhythm (5.3, 5.4), radii 0/2/4 (5.5), layout metrics and breakpoints (5.6). `index.css`: `:focus-visible` 3px ink ring with 2px offset, `scroll-padding-top: calc(var(--rail-h) + 16px)`, `min-h-[100dvh]` usage, textarea/control base, forced-colors block (`DESIGN.md` 14.15), all motion only inside `@media (prefers-reduced-motion: no-preference)`. Omit verdict tokens (spec v2 has no verdict). Add `src/test/contrast.test.ts`: parses `tokens.css`, computes WCAG ratios for every foreground/background pair listed in `DESIGN.md` 5.1 for both themes (text >= 4.5, ink border/non-text >= 3) and fails on any miss. Add `src/test/design-rules.test.ts`: scans `src/**/*.{ts,tsx,css}` excluding `src/config/text/` and test files, and fails on: em dash, `linear-gradient|radial-gradient|conic-gradient`, `box-shadow` outside the dialog rule, `Inter`, Extended_Pictographic characters, `dangerouslySetInnerHTML`, `rehype-raw`, `(indigo|purple|violet|fuchsia|pink|blue|gray|slate)-\d`, `target="_blank"` without `rel="noopener noreferrer"`, and `localStorage|sessionStorage|indexedDB` outside `src/components/shell/ThemeToggle.tsx`.
      Files: `src/styles/*.css`, `src/test/contrast.test.ts`, `src/test/design-rules.test.ts`, `src/main.tsx` imports.
      Verify: `npm run test` (contrast and design-rules tests pass), `npm run build` succeeds and `dist` contains the self-hosted `.woff2` fonts (no external font URL in built CSS).

- [ ] 3. Spec extraction, config, and conformance test (depends on 1).
      `scripts/extract-spec-text.mjs ../shipsafe-spec.md` reads the spec, finds `## 7. Disclaimer`, takes the first fenced block, and writes it byte-for-byte (LF, one trailing newline) to `src/config/text/disclaimer.txt`. Fail loudly if the heading or fence is missing. `src/config/limits.ts`: `MAX_ZIP_BYTES = 10 * 1024 * 1024` (assumption: 10 MB means MiB; state it in README), `MAX_DESCRIPTION_CHARS = 1000`, `MAX_RESPONSE_CHARS = 500_000`, timeouts. `src/config/agents.ts`: ordered `AGENT_TARGETS` with display names (Generic, Cursor, Claude Code, GitHub Copilot, Windsurf) and the one-line style hint from spec 6.2. `spec-conformance.test.ts` re-reads `../shipsafe-spec.md` (override via `SHIPSAFE_SPEC_PATH`; the test **fails**, never skips, if unreadable) and asserts: disclaimer file equals spec section 7 block exactly; the `Severity`, `Area`, `AgentTarget` unions in `types.ts` equal the unions in spec 9.2 (parse the `type ... =` lines); spec 3 area names and spec 6.2 target names are all present in config; 4 areas, 5 severities, 5 targets.
      Files: `scripts/extract-spec-text.mjs`, `src/config/*`, `src/domain/types.ts` (types only), `src/config/spec-conformance.test.ts`.
      Verify: `node scripts/extract-spec-text.mjs ../shipsafe-spec.md; npm run test` passes; deleting one character in `disclaimer.txt` makes the conformance test fail (then restore).

- [ ] 4. Pure domain logic, test-first (depends on 3).
      - `secrets.ts`: `scanSecrets(text) -> SecretHit[]` with the ten patterns from `DESIGN.md` 8.6 (includes `sk_live_`, `AKIA`, `-----BEGIN PRIVATE KEY-----`, `ghp_`), false-positive ignore list (`REDACTED`, `EXAMPLE`, `PLACEHOLDER`, `your_`, `<...>`, `xxxx`, `****`, repeated char), `maskSecret(v)` = first 4 chars + `****`, hits carry `{ field, line, pattern, masked }`, raw match never stored. Tests: each pattern, `sk_live_REDACTED` ignored, masking never exceeds 4 leading chars.
      - `zip-validate.ts`: `validateZipFile(file) -> Promise<{ok:true}|{ok:false; code:'too_large'|'not_zip'|'empty'|'multiple'; message}>`. Order: count > 1 rejected; size > `MAX_ZIP_BYTES` rejected **before reading any bytes**; extension `.zip` required; MIME in the allowed list or empty string; read only `file.slice(0,4)` and require `50 4B 03 04`. Messages state what happened and the next step ("This file is 12.4 MB. The limit is 10 MB. Remove build output and node_modules, then zip again."). Tests with synthetic `File`s: oversize (assert `arrayBuffer`/`slice` not called), wrong extension, right extension with wrong magic, valid, empty file.
      - `hash.ts` (cyrb53), `stale.ts` (`snapshotOf(file, context)` = hash of name, size, lastModified, trimmed context fields; `isOutdated(report snapshot, current)`; revert-to-original clears it), `findings.ts` (severity order, `sortFindings`, `filterFindings`, `countBySeverity` derived from `findings` and compared with `countsBySeverity`), `export.ts` (`buildPromptsMarkdown(report, target)` with a header per finding `## F-001 Title (Severity)`, `promptFilename(target)`), `format.ts` (`formatBytes`).
      Files: `src/domain/*.ts` + tests.
      Verify: `npm run test -- src/domain` passes with the RED-then-GREEN history reflected in coverage of every branch above; full gate passes.

- [ ] 5. API client, HTTP implementation, and the typed mock layer (depends on 4).
      5a. `api/errors.ts` (`ApiError` with `kind`, `message`, `retryAfterMs`), `api/parse-report.ts` (type guard; rejects reports missing any required field or any `remediationPrompt`; caps text length), `api/http.ts` (XHR multipart upload so `onStage('upload', pct)` reports real progress; 120 s timeout; abort; maps 413 `too_large`, 415 `not_zip`, 422 `unsafe_archive`, 429 `rate_limited` using `Retry-After`, 5xx `server`), `api/client.ts` (exports `api` chosen once from `VITE_API_MODE`; the mock is dynamic-imported only in mock mode; no credential concept; `src/test` asserts no `VITE_*` name matches `/KEY|SECRET|TOKEN|PASSWORD/i`).
      5b. `mock/zip-entries.ts`: reads the End Of Central Directory and central directory **names, sizes and attributes only** (no decompression, no `DecompressionStream`), bounded reads. `mock/sample-zips.ts`: builds small valid store-only ZIPs in memory (own CRC32) for three labeled samples: Ledgerline (invoicing SaaS), Waybill (internal dispatch tool), Harborlog (public docs site); each contains plausible file paths that match the authored findings (for example `lib/supabase.ts`, `app/api/invoices/[id]/route.ts`, `docker-compose.yml`, `Dockerfile`, `next.config.js`, `package.json`, `.env.example`). No real or pattern-valid credential strings are written into any sample file. `mock/engine.ts`: stage timing (`upload` simulated 0 to 100, `scanning` ~700 ms, `auditing` 1.2 to 2.4 s deterministic from a hash of name+size, `report`), `VITE_MOCK_LATENCY=none` makes it instant, abort-aware; mirrors spec 4.1 and 4.2 server rules on the entry list (traversal `..`/absolute/drive letter, > 5,000 entries, depth limit, > 100 MB declared decompressed, ratio > 100:1 all return `unsafe_archive` with the specific reason; symlinks and non-regular entries are ignored and added to `skippedFiles`); failure sentinels in the file name for tests and demos (`__mock_fail_rate_limited`, `__mock_fail_timeout`, `__mock_fail_server`). Scenario selection by sample name; any other ZIP goes to `heuristics.ts`, which emits only **structure-derived** findings (`.env*` file included in the archive: Medium, "Likely, verify"; `package.json` with no `package-lock.json`/`yarn.lock`/`pnpm-lock.yaml`: Medium, Confirmed from entry list; `Dockerfile` without `.dockerignore`: Low), a skipped-files list from the spec 4.3 skip-list (`node_modules`, `.git`, `dist`, `build`, `.next`, `vendor`, `__pycache__`, binaries, images), and an honest Gaps entry: "File contents were not read in mock mode, so code, dependency versions and header configuration were not assessed." It never emits a CVE id, a fake line number, or content-based claims. Scorecard score is derived from findings (10 minus weighted counts, clamped), `null` and status "Not assessed" when no evidence exists for an area.
      5c. Authored scenarios (realistic, domain-specific, no lorem ipsum, fictional projects labeled as samples; locations only for paths that exist in the sample ZIP; dependency claims use confidence "Likely, verify" and no CVE ids; secrets always masked as first 4 chars + `****`):
        - Ledgerline (about 12 findings; 2 Critical, 4 High, 4 Medium, 1 Low, 1 Info): Supabase `service_role` key exposed through a `NEXT_PUBLIC_` variable (`lib/supabase.ts:4`, masked `eyJh****`, in `secretsToRotate`); IDOR on `GET /api/invoices/[id]` with no ownership check (`app/api/invoices/[id]/route.ts`); value shaped like a Stripe live secret in `docker-compose.yml:18` (`sk_l****`, rotate); CORS `*` with credentials in `next.config.js`; Node 18 end-of-life (`Dockerfile:1`); no rate limiting on `/api/auth/login`; Next.js 14.0.4 historical middleware authorization-bypass class (Likely, verify); `jsonwebtoken` 8.5.1 older signature-validation issues (Likely, verify); no CSP; `console.log(user)` logging email and card last4 (`app/api/invoices/route.ts:41`); `lodahs` possible typosquat of `lodash`; customer email in a URL query string; `.gitignore` covers `.env*.local` (Info).
        - Waybill (about 5 findings, no Critical): CSP present with `'unsafe-inline'`, no rate limiting on an internal login, one unpinned range, one outdated transitive risk (Likely, verify), a permissive CORS origin list; secrets clean; `notAssessed` lists CI config.
        - Harborlog (3 findings, Low and Info only): strict headers present, pinned dependencies, one missing `Permissions-Policy`, lockfile present; `secretsToRotate` empty (renders an explicit "None found" state).
      5d. `mock/prompts.ts`: `buildPrompt(finding, target, projectName)` returning a self-contained prompt with the six parts from spec 6.1 (role and goal; problem context with title, area, severity and short explanation; location or "Location not determined, search the repository for X"; expected behavior after the fix plus verification criteria; constraints: do not hardcode new secrets, do not change other behavior, follow project conventions, add a test where relevant; security note: never paste real secrets, rotate if exposed). Per-agent wrappers per spec 6.2: Generic (neutral numbered steps), Cursor (`@path/to/file` references, file-edit style), Claude Code (task style, asks to run tests/build to verify), GitHub Copilot (short, comment-oriented plus change description), Windsurf (workspace-oriented, similar to Cursor). `formatPrompts` re-wraps without changing finding content.
      Tests (write first): zip-entries parsing on built sample ZIPs; every rejection rule with hand-built hostile entry lists; each scenario returns all five report sections; `countsBySeverity` equals counts from `findings`; every finding has a non-empty prompt in every agent style; no prompt, summary, or finding text matches `scanSecrets`; no `CVE-\d{4}-\d+` appears anywhere in mock output; `parse-report` rejects missing prompts; `http.ts` error mapping with a fake XHR.
      Files: `src/api/**`, tests.
      Verify: `npm run test -- src/api` passes; full gate passes; `dist` built with `VITE_API_MODE=http` (`$env:VITE_API_MODE='http'; npm run build; Remove-Item Env:VITE_API_MODE`) contains no mock chunk (check the build output file list, no `mock` chunk name).

- [ ] 6. State store and audit controller (depends on 5).
      `state/store.ts` (Zustand 5): `submission { file, description, deployTarget, handlesPII, handlesPayments, agentTarget }`, `audit { status: 'idle'|'running'|'done'|'error', stage, uploadPct, startedAt, reportId, report, error, snapshot, promptsStatus }`, `ui { theme }`. Single source of truth: derived values (`isOutdated`, `canRun`, `inputsFilledCount`, severity counts, filtered findings) are selectors in `selectors.ts`, never copied into state, no `useEffect` state syncing. `announcer.ts`: tiny pub/sub feeding the live region. `audit-controller.ts`: `requestAudit()` single-flight; guard order: (1) `validateZipFile` again, (2) `scanSecrets` on the description with a session-scoped acknowledgement set keyed by `hash(field+pattern+masked+line)`, returning `{needsConfirmation, hits}` to the UI instead of opening UI itself, (3) call `api.audit` with an `AbortController`; `cancel()` aborts and returns to the previous state without an error; `setAgentTarget()` after a report calls `api.formatPrompts` and swaps prompts atomically (on failure keep the old prompts and show an inline error); `reset()`. Nothing user-provided is persisted anywhere. `no-persistence.test.ts` spies on `Storage.prototype.setItem` across a full mocked flow and allows only the theme key.
      Files: `src/state/*`, `src/test/no-persistence.test.ts`.
      Verify: `npm run test -- src/state src/test` passes (single-flight, cancel, agent-target switch, outdated after context edit and cleared on revert, guard order); full gate passes.

- [ ] 7. UI primitives and feedback components (depends on 2, 6).
      `Button` (primary / secondary / quiet; `aria-disabled` pattern with `aria-describedby` reason; 24px min target, 36px fine pointer, 44px coarse), `IconButton` (type-enforced `aria-label`), `Chip`, `CopyButton` (clipboard write, label "Copied" for 2 s, announces "Copied F-001 prompt", inline "Copy failed. Select the text and copy it manually." on rejection), `SeverityTag` (text + 4-segment bar glyph + token colors, Critical to Info), `StatusTag` (Pass / Partial / Fail / Not assessed with distinct glyphs), `icons.tsx` (hand-drawn 16px line glyphs only: play, stop, copy, check, cross, half, dash, alert-triangle, refresh, sun, moon, close, upload, file, chevron, download; `aria-hidden`, `currentColor`), `VisuallyHidden`, `LiveAnnouncer` (one polite region fed by `announcer`). `Dialog` base on native `<dialog>` with `showModal()`, labelled, Escape closes, focus returns to the trigger, opacity-only open transition; `ConfirmDialog` on top of it (safe action focused by default).
      Tests: Testing Library + `vitest-axe` for every state of each primitive; `Dialog` focus-in, Escape, focus-return.
      Files: `src/components/ui/*`, `src/components/dialogs/Dialog.tsx`, `ConfirmDialog.tsx`.
      Verify: `npm run test -- src/components/ui src/components/dialogs` passes with zero axe violations; full gate passes.

- [ ] 8. App shell, disclaimer, toolbar, theme, samples (depends on 7).
      `AppShell`: hidden `h1` "ShipSafe", `header` (landmark) containing `DisclaimerBanner` then `Toolbar`, `main` with two regions: left "Project submission" and right "Audit report" (`section`s with `aria-label`/`aria-labelledby`). Grid per `DESIGN.md` 5.6: `>=1024px` `minmax(22rem,27rem) minmax(0,1fr)` with 1px rule divider; below 1024px a single column in DOM order (banner, toolbar, submission, report) with a 48rem max content width, left aligned; gutters 16/24/40. Verified widths: 375, 768, 1440 (and 320 for reflow). `DisclaimerBanner`: renders `disclaimer.txt` through `?raw` with the glyph treatment from `DESIGN.md` 15.5; run-in bold "Disclaimer", amber `--warn-bg`, 2px bottom rule, non-dismissible; sticky at `>=768px`, static at first position below 768px. `AppShell` measures the header with `ResizeObserver` and sets `--rail-h` via `style.setProperty`. `SkipLinks` ("Skip to project submission", "Skip to audit report"). `Toolbar`: wordmark (Archivo wdth 125 / wght 800, plain ink square placeholder logo), descriptor "Pre-deployment security gate" (>= 768px), one status line (exactly one of: "Running audit, scanning", "Report outdated", "No ZIP selected", "{file} ready"), `SampleMenu` (disclosure listing the three labeled samples; confirm if a ZIP is already selected; loading builds an in-memory ZIP `File` and fills a plausible context), `ThemeToggle` (`aria-pressed`, persists only `shipsafe.theme`, silent fallback if storage is blocked), persistent "Mock responses, no model attached" tag in mock mode.
      Files: `src/components/shell/*`, `src/App.tsx`, `public/theme-init.js`.
      Verify: `npm run test -- src/components/shell` passes: disclaimer text equals the extracted spec string on load (strip the hidden glyph span and compare `textContent`), DOM order is disclaimer first then toolbar then submission then report, skip links target real ids, theme toggle, sample load confirm; full gate passes.

- [ ] 9. Submission panel: context, upload, agent target, Run Audit, secret dialog (depends on 6, 7, 8).
      - `ContextForm`: `fieldset` "Project context (optional)". Description textarea (label always visible, 6 rows, `resize: vertical`, `max-height: 70dvh`, `maxLength` 1000, `n / 1000` counter that changes at 90%, over-limit paste message "Pasted text was cut at 1,000 characters."), deployment target `<select>` (Not specified, Vercel, Netlify, AWS, Google Cloud, Azure, Docker or VPS, Other), checkboxes "Handles personal data (PII)" and "Handles payments". Live inline secret hint under the description using `useDeferredValue` + `useMemo(scanSecrets)` (no effect-based sync, `role="status"`): "Possible secret on line 3 (AKIA****). Replace it with a placeholder such as AKIA_REDACTED."
      - `UploadDropzone`: a real `<input type="file" accept=".zip,application/zip,application/x-zip-compressed">` (visually hidden, focusable) with a styled `<label>` and drag-and-drop on the region; states: empty, drag-over ("Drop the ZIP to select it"), selected (name, size as "6.2 MB of 10 MB", Remove), invalid (message from `validateZipFile`, linked via `aria-describedby`, `aria-invalid`, `role="alert"` on first render). Rejects multiple files and folders with a clear message. Helper line: "Redact real secrets if you can. ShipSafe masks what it finds, but rotate anything exposed." Keyboard: Enter and Space open the picker; Remove is a button.
      - `AgentSelector`: native radio group in a `fieldset` with legend "Coding agent for prompts", five options with the one-line style hint each, default Generic. Changing it after a report triggers `setAgentTarget` and announces "Prompts updated for Cursor".
      - `RunAuditButton`: the only primary button on the page, label "Run Audit" (becomes "Run audit again" after a report, "Cancel" while running). `aria-disabled` plus described reason "Choose a ZIP file to run the audit." when no valid file.
      - `SecretScanDialog`: native dialog, title "Possible real secrets found", lists masked hits (pattern name, line, masked token), body "ShipSafe sends this text to a model service. Replace real credentials with placeholders first.", buttons "Go back and redact" (default focus; focuses the description textarea) and "Send anyway" (records the acknowledgement).
      Tests: fixture ZIP accepted; 12 MB file rejected with the stated message; non-ZIP with `.zip` name rejected on magic bytes; drag-and-drop and picker both select; two files rejected; secret hint appears for `AKIA` + 16 chars, not for `sk_live_REDACTED`; dialog flow (hits then back; hits then send anyway proceeds); keyboard-only completion; axe clean in all states.
      Files: `src/components/submission/*`, `src/components/dialogs/SecretScanDialog.tsx`.
      Verify: `npm run test -- src/components/submission src/components/dialogs` passes; full gate passes.

- [ ] 10. Run experience: progress, empty, error, outdated (depends on 9).
      `ProgressStepper`: ordered list "Upload, Scanning, Auditing, Report" (a real sequence, so `<ol>` is justified), each with a state word (waiting / active / done / failed), upload shows a percent, "Running, 7 s" elapsed text is `aria-hidden` (announce stage changes only through `LiveAnnouncer`), Cancel button; a 2px indeterminate bar only in `no-preference` motion. `EmptyState` (report area before any run): one sentence of cause plus one action: "No report yet. Choose a ZIP and run the audit. The report lists each finding with its file, severity and a prompt you can paste into your coding agent." Action focuses the dropzone input. `ErrorPanel`: per-kind copy (no "Oops", "Sorry", "Please", "Invalid"): `network` "Could not reach the ShipSafe server. Check your connection, then retry."; `timeout` "The audit took longer than 2 minutes and was stopped. Retry, or remove large folders from the ZIP."; `rate_limited` "Too many requests. You can retry in {n} s." with Retry disabled until the countdown ends; `too_large` "The server rejected this ZIP as too large. The limit is 10 MB."; `not_zip` "The server could not read this file as a ZIP. Create a new ZIP and try again."; `unsafe_archive` "This archive was rejected: {reason}. ShipSafe does not extract archives with unsafe paths or extreme compression."; `server` "The audit service failed on its side. Retry in a moment."; `bad_response` "The service returned an unusable report. Retry."; `aborted` is silent. `role="alert"` on first render only. `StaleNotice`: "Outdated: the ZIP or project context changed after this report ran. Run the audit again." with the Run action; the old report stays readable. Wire `App.tsx` so the report area switches among empty, running, error, done (done renders a temporary `<ReportView/>` stub until item 12).
      Tests: stepper states from controller events, Cancel path, each error kind renders its copy and Retry, rate-limit countdown, Outdated appears after editing the description and clears when reverted.
      Files: `src/components/run/*`, `src/App.tsx`.
      Verify: `npm run test -- src/components/run src/App` passes (including an App-level sample-to-done run with `VITE_MOCK_LATENCY=none`); full gate passes.

- [ ] 11. Safe MarkdownView (depends on 7; can be done before 10 but is sequenced here for dependency clarity).
      `MarkdownView` with `react-markdown` + `remark-gfm` only: no `rehype-raw`, no raw HTML, images not rendered (alt text only), links `http(s)` only with `rel="noopener noreferrer nofollow"` and `target="_blank"` plus visually hidden "(opens in new tab)", heading demotion (`#` to h3, `##` to h4, `###` to h5, rest h6) so the page outline stays valid, task-list checkboxes read-only, `ScrollableTable` wrapping each table in `div[role=region][tabindex=0][aria-label="<nearest heading> table, scrollable"]` with `th scope="col"` and cells that contain exactly a severity word or Pass/Partial/Fail rendered through `SeverityTag` / `StatusTag`, `CodeBlock` (Plex Mono, focusable horizontal scroll, per-block Copy with the language in its label), an error boundary that falls back to `<pre>` plus "This text could not be formatted. Showing raw text." `markdown.css` for prose, `max-width: 72ch` on prose only, `tabular-nums` in tables.
      Tests: `<script>`, inline `<img onerror>`, raw `<iframe>`, `javascript:` link, and `![](http://x/beacon.png)` render as inert text or nothing; a GFM table gets the scroll region and `th scope`; heading demotion; boundary fallback; axe clean.
      Files: `src/components/markdown/*`, `src/styles/markdown.css`.
      Verify: `npm run test -- src/components/markdown` passes; full gate passes.

- [ ] 12. Report view (depends on 10, 11).
      `ReportView` renders, in spec 5.1 order: report meta line (ZIP name, time, "Prompts formatted for {agent}" with a Change link that focuses the selector); `ExecutiveSummary` (markdown summary + a derived severity tally "2 Critical, 4 High, 4 Medium, 1 Low, 1 Info", all five levels shown, zero counts muted); `Scorecard` (table Area | Score | Status | Top concern, score "7/10" plus a 10-cell decorative meter, `StatusTag` with glyph, "Not assessed" when `score` is null); `FindingList` (filter toggle-chips for severity and area with counts and `aria-pressed`, "Showing 7 of 12", Expand all / Collapse all, sorted by severity then id, a ruled continuous list, not a grid of cards); `FindingCard` (an `article` row with a button toggling `aria-expanded` and a labelled region; collapsed row: ID, `SeverityTag`, title, Area, Location in Plex Mono or "Location not determined"; expanded: What, Why it matters, Recommended fix, Verify with (commands in `CodeBlock`), the "Likely, verify" tag whenever `confidence` says so (always set for Dependencies findings), **Copy Prompt** and **View prompt** buttons; Critical and High start expanded); `PromptModal` (native dialog, prompt in a focusable `<pre>` with wrapping, Copy, Close, never rendered as markdown); `SecretsToRotate` (masked list with a "Compromised, rotate" tag per row, explicit "None found" empty state); `NotAssessed` (Gaps list, plus skipped files in a `details` showing the count); `ExportBar` ("Copy All Prompts" joins with a header per finding, "Download .md" via Blob + object URL named `shipsafe-remediation-prompts-{agent}.md`, announced; revokes the URL). Footer line "Generated {hh:mm} by the mock engine. AI-assisted review: confirm findings with the tools named under Verify with." in mock mode. Prompts in flight after an agent switch show `aria-busy` skeleton lines on the prompt buttons only.
      Tests: Ledgerline sample renders all five sections; fields present on every card; no invented location; Dependencies cards carry "Likely, verify"; filter and expand behavior; Copy All text begins with a header per finding and contains one prompt per finding; download builds the expected filename; modal focus return; agent switch updates prompts; zero axe violations on collapsed and expanded states.
      Files: `src/components/report/*`, `src/App.tsx`.
      Verify: `npm run test -- src/components/report` passes; full gate passes.

- [ ] 13. Motion, forced-colors, print, and copy review (depends on 12).
      Add the only orchestrated moment: on first report reveal the severity tally and Scorecard fade/translate in a 180 ms reveal (`grid-template-rows: 0fr to 1fr` for expand/collapse); everything inside `@media (prefers-reduced-motion: no-preference)`. No stamp (verdict removed). Forced-colors CSS maps borders to `CanvasText`, chips keep borders and text, focus uses `Highlight`. `print.css`: print only the report (hide submission, toolbar actions). Review all UI strings against `DESIGN.md` 12: sentence case, no em dashes, no exclamation marks, one name per action, cause plus next step in every empty and error state.
      Files: `src/styles/*.css`, small component class changes.
      Verify: `npm run test` (design-rules test still green) and `npm run build`.

- [ ] 14. ShipSafe passes its own header audit (spec Req 7.3) (depends on 1; do after 13 so built assets are final).
      In `vite.config.ts` add `preview.headers` with the set from `DESIGN.md` 15.33: `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`, `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, `Cache-Control: no-store` for `index.html`; a relaxed dev CSP only for HMR. Also emit the same headers as a host-neutral `public/_headers` file and document them in the README. Ensure no inline `<script>`, `<style>`, or `style="..."` attributes ship (CSSOM writes only; the `--rail-h` write uses `style.setProperty`). `scripts/check-headers.mjs` fetches the running preview and fails if any header is missing or `script-src`/`style-src` contains `'unsafe-inline'`.
      Files: `vite.config.ts`, `public/_headers`, `scripts/check-headers.mjs`.
      Verify: `npm run build; Start-Process -NoNewWindow powershell -ArgumentList '-Command','npm run preview -- --port 4173 --strictPort'` then `node scripts/check-headers.mjs http://localhost:4173` exits 0; stop the preview process afterwards.

- [ ] 15. App-level integration and accessibility tests (depends on 12, 13).
      Add `src/App.integration.test.tsx` (zero-latency mock): load Ledgerline sample, Run Audit, report appears with 2 Critical, `secretsToRotate` shown masked; switch agent to Cursor and prompts change; edit description, Outdated appears, revert clears; hostile fixture ZIP (path traversal name) shows the `unsafe_archive` error with the stated reason; oversize file never calls `api.audit`; `__mock_fail_rate_limited` shows the countdown and Retry; cancel mid-run returns to the prior state silently; secret dialog appears for a synthetic `AKIA` + 16 chars token in the description. Add `vitest-axe` sweeps over the full app in empty, selected, running, done, and error states in both themes.
      Files: `src/App.integration.test.tsx`.
      Verify: `npm run test` passes with the full suite; full gate passes.

- [ ] 16. Browser e2e, responsive, and visual review (depends on 14, 15).
      `npx playwright install chromium` (one time), `playwright.config.ts` with `webServer: npm run preview -- --port 4173 --strictPort` and `VITE_MOCK_LATENCY=none` set for the build. `e2e/flow.spec.ts` (keyboard-only: Tab through skip links, dropzone, agent radios, Run Audit; open a prompt modal; Copy All), `e2e/a11y.spec.ts` (`@axe-core/playwright`: zero serious or critical violations in light, dark, reduced-motion at 1440 and 375, and with `forcedColors: 'active'`), `e2e/responsive.spec.ts` (viewports 375x812, 768x1024, 1440x900, plus 320 for reflow: assert `document.documentElement.scrollWidth <= innerWidth`, DOM order banner then submission then report, two-column grid at 1440, single column at 375 and 768; reduced-motion run asserts `document.getAnimations().length === 0` after settle). Capture one screenshot set at 1440, 768, 375 (light) and 1440 (dark) once; do a single batched visual review against `DESIGN.md` anti-slop table, fix in one pass, and stop. If the Chromium download is blocked in the environment, record that in the README and keep the unit and integration suites as the gate.
      Files: `playwright.config.ts`, `e2e/*.spec.ts`.
      Verify: `npm run build; npm run e2e` passes; screenshots exist under `test-results`.

- [ ] 17. README, requirement mapping check, and final verification (depends on 16).
      `README.md` (spec task 15): what it is, how to run on PowerShell (`npm install; npm run dev` at `http://localhost:5173`), the commands, mock vs `http` mode and the future backend contract (section 2), samples and the file-name failure sentinels, limits (10 MiB assumption), the disclaimer-on-mobile trade-off, accessibility statement ("automated checks support, but do not replace, manual assistive-technology testing"), header set, and the spec v1-to-v2 note from section 0. Copy the section 4 requirement and QA mapping tables of this plan into the README as a "Requirement coverage" section (no separate docs file). Final run in order: `npm run typecheck; npm run lint; npm run test; npm run build; npm run e2e`. Write the reviewer evidence (command outputs, test counts) to `.agents/tasks/` as the workflow specifies; the reviewer writes `review.json` last.
      Files: `README.md`.
      Verify: all five commands exit 0; `node scripts/extract-spec-text.mjs ../shipsafe-spec.md` produces no diff in `src/config/text/disclaimer.txt`.

---

## 4. Spec requirement and QA mapping (nothing dropped)

Legend: **FE** satisfied in the frontend; **FE+mock** frontend behavior proven against the mock; **SERVER** backend-only, the frontend only displays or forwards it (no real backend exists, so the mock imitates it and the contract is documented).

### Spec section 8 (Requirements, acceptance criteria)

| Criterion | Where | Type |
|---|---|---|
| R1.1 Disclaimer exact text on load | Items 3, 8 (`disclaimer.txt` generated from spec 7; conformance + shell test) | FE |
| R1.2 Disclaimer stays at the top | Item 8 (sticky >= 768, first block below 768; documented trade-off + reminders) | FE |
| R2.1 Single ZIP by drag-drop or picker | Item 9 `UploadDropzone` | FE |
| R2.2 > 10 MB rejected before processing | Items 4, 9 (`validateZipFile`, no bytes read) | FE |
| R2.3 Magic bytes check | Items 4, 9 (`50 4B 03 04`) | FE |
| R2.4 Progress upload to scanning to auditing to report | Items 5, 10 `ProgressStepper` | FE+mock |
| R3.1 Zip-slip prevented | Item 5 engine rejects traversal; UI shows reason (item 10) | SERVER, FE+mock |
| R3.2 Zip-bomb rejected | Item 5 (size, ratio, entry count, depth) | SERVER, FE+mock |
| R3.3 Symlinks ignored | Item 5 (skipped, listed in Gaps) | SERVER, FE+mock |
| R3.4 Never execute/install ZIP code | Item 4/5: browser reads 4 magic bytes (mock reads entry names only); design-rules test forbids decompression APIs, `eval`, `Function` | FE |
| R3.5 Contents treated as data, anti-injection | Server delimiters (documented, section 2); FE renders all report text as untrusted (item 11) | SERVER, FE |
| R3.6 LLM key never in client | Item 5 (`VITE_*` name test, no key concept) | FE |
| R4.1 Filter noise, prioritize security files | Item 5 skip-list in mock; displayed in Gaps (item 12) | SERVER, FE+mock |
| R4.2 Secrets masked 4 chars + `****` in LLM input and display | Item 4 `maskSecret`; items 5, 12 (tests: no raw secret in any output) | SERVER, FE |
| R4.3 Skipped files recorded for Not Assessed | Items 5, 12 `NotAssessed` | FE+mock |
| R4.4 Chunking over token budget | Server only; no UI element required | SERVER |
| R5.1 Report has five sections | Item 12 | FE |
| R5.2 Every finding shows all fields | Item 12 `FindingCard` + test | FE |
| R5.3 Safe markdown render, no raw HTML | Item 11 | FE |
| R5.4 No invented location/CVE/version | Items 5, 12 (optional location renders "Location not determined"; no-CVE test) | FE+mock |
| R5.5 Dependency claims "Likely, verify" | Items 5, 12 | FE+mock |
| R6.1 One prompt per finding | Items 5 (`parse-report` rejects missing), 12 | FE+mock |
| R6.2 Self-contained prompt | Item 5d + tests | FE+mock |
| R6.3 No real secret in prompts | Item 5 test with `scanSecrets` | FE+mock |
| R6.4 Format per agent | Items 5d, 9, 6 (`setAgentTarget`) | FE+mock |
| R6.5 Copy per prompt, Copy All, download `.md` | Items 4 (`export.ts`), 12 `ExportBar` | FE |
| R7.1 Rate limiting | SERVER; FE handles 429 with countdown (item 10) | SERVER, FE |
| R7.2 No permanent storage | Item 6 `no-persistence.test.ts` (only theme stored) | FE |
| R7.3 Security headers on ShipSafe | Item 14 | FE |
| R7.4 Size and timeout limits | Items 3, 4, 5 (10 MiB client check, 120 s timeout) | FE |

### Spec section 11 (final QA checklist)

| Item | Where |
|---|---|
| Upload a <=10 MB ZIP and get a Full Report | Items 9, 10, 12, 15 |
| >10 MB or non-ZIP rejected with clear message | Items 4, 9, 15 |
| Extraction resists zip-slip/zip-bomb, symlinks ignored, no execution | Items 5, 10 (mock + UI), SERVER for real extraction |
| ZIP content is data, embedded instructions ignored | SERVER; FE renders safely (item 11) |
| Secrets masked in LLM input and display, rotation list | Items 4, 5, 12 `SecretsToRotate` |
| Report has Summary, Scorecard, Findings, Secrets to Rotate, Gaps | Item 12 |
| No invented locations/CVEs; deps labeled "Likely, verify" | Items 5, 12 |
| Each finding has a copyable self-contained remediation prompt | Items 5d, 12 |
| Prompts contain no real secret values | Item 5 test |
| Prompt format follows the chosen agent | Items 5d, 9 |
| Copy per prompt and Copy All / `.md` download work | Items 12, 15, 16 |
| Disclaimer always visible | Item 8 (with documented mobile trade-off) |
| Rate limiting, security headers, no persistent storage | Item 14 (headers), item 6 (storage), SERVER (rate limit) |

### Spec section 10 (tasks) coverage

Tasks 1, 2, 3, 11, 12 and 15 are fully frontend (items 1, 8, 9, 12, 17). Task 14 end-to-end tests are items 15 and 16 against the mock. Tasks 4 to 10 and 13 (API route, safe extraction, walker, scanner, LLM call, prompt generator, rate limiting) are backend work with no server in this repo; the frontend ships a typed contract and a mock that imitates their observable behavior.

---

## 5. Risks and fallbacks

- Spec/design mismatch (section 0) is the largest risk. If the owner wanted v1, this plan produces the wrong product. The README states the assumption, and the tokens, shell, primitives, markdown, secrets, and test infrastructure are reusable for v1.
- Mobile disclaimer is not sticky (deliberate). If the reviewer rejects this reading of Req 1.2, the fix is a CSS-only change in `DisclaimerBanner` (sticky at all widths) and an updated e2e assertion.
- `vitest-axe@0.1.0` and `eslint-plugin-react-hooks@7.1.1` setup details differ by version; read their current README via Context7 or official docs before wiring.
- Playwright browser download may fail offline; item 16 documents the fallback.
- Do not add dependencies beyond the pinned list. No ZIP library: the mock parses central directory names by hand and sample ZIPs are built with a tiny store-only writer.
