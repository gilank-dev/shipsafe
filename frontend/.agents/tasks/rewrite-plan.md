# Rewrite Plan: align `frontend/DESIGN.md` and `frontend/.agents/tasks/plan.md` to spec v3 (3-tier)

Scope: DOCUMENTATION ONLY. No application source code changes. Do NOT modify `shipsafe-spec.md`. Edit the two target `.md` files in place.

Environment: Windows + PowerShell. This folder is NOT a git repository, so never run git commands. Chain PowerShell commands with `;` (never `&&`). Quote every path (they contain spaces).

Authoritative source of truth (read fully, DO NOT MODIFY): `c:\Users\HYPE AMD\files\PROJECT\PERSONAL\KIRO TEST\shipsafe-spec.md` — "ShipSafe v3 — 3-Tier: Vercel + VPS + Supabase".

Targets to rewrite:
1. `c:\Users\HYPE AMD\files\PROJECT\PERSONAL\KIRO TEST\frontend\DESIGN.md`
2. `c:\Users\HYPE AMD\files\PROJECT\PERSONAL\KIRO TEST\frontend\.agents\tasks\plan.md`

Verification note (documentation task): there is no build/test to run for Markdown. "Verify" for each item below means a reviewer confirms the stated structural outcome by reading the file. The one scripted check available is the removed-feature string sweep in section C, which the implementer MUST run against both finished files with PowerShell `Select-String` before declaring done.

---

## 0. Why this rewrite (context the implementer must hold)

- The spec on disk is now **v3 three-tier**: Frontend -> Vercel, Backend + AI -> VPS, Database + Auth -> Supabase. Input is a single ZIP (max 10 MB) uploaded to the VPS backend. Output is a **Full Report** + one **remediation prompt per finding** per coding-agent target. The **Go/No-Go verdict and the Release Security Officer chatbot were removed** (removed in v2, still absent in v3).
- `DESIGN.md` currently describes the **old v1** product: 13 manual input widgets, `@Title` dependency matrix + execution waves, a topological planner/runner, a Go/No-Go verdict with GO / CONDITIONAL GO / NO-GO stamp, VerdictBadge/VerdictStamp, a Release Security Officer ChatWidget, and a **client-only SPA on a typed mock with no backend** (Vite + React, not Next.js). All of this contradicts spec v3 and must go.
- `plan.md` currently describes the **v2** product (client-only Vite SPA + mock, ZIP upload) and opens with a "section 0" narrative documenting the v1/v2 spec conflict, plus v1-to-v2 disposition tables. That conflict is resolved; v3 is what we build. The mock-only framing and the Vite client-only stack must be replaced with the Next.js on Vercel + real VPS backend + Supabase stack.

Both rewrites must end up internally consistent with each other and with spec v3. `DESIGN.md` is the frontend-tier design brief; `plan.md` is the frontend-tier implementation plan that follows it.

Key reframes shared by both docs:
- Stack is **Next.js (App Router) + TypeScript + React 18** on **Vercel**, not a Vite client-only SPA.
- The frontend uploads ONE ZIP to the **real VPS backend** at `POST /api/audit` (multipart) with an optional `Authorization: Bearer <Supabase JWT>`. The frontend does NOT process the ZIP and does NOT hold the LLM key.
- Shared TypeScript types + Zod schema live in `packages/shared` (spec 9.2) and are imported by both frontend and backend.
- Supabase provides Postgres (`audits`, optional `findings`), Auth (email/password and/or OAuth Google/GitHub), and RLS per `user_id`. Login is OPTIONAL; anonymous users audit without storage; only logged-in users get saved history.
- Raw ZIP contents are never stored permanently; only the report is persisted (and only when logged in).
- Mock is demoted: it is NOT the product architecture. The product calls the real backend through one typed API client. A mock implementation of that same client interface is allowed only for local dev/tests.

---

## A. Target outline for the rewritten `DESIGN.md`

Keep `DESIGN.md` a design brief for the **Vercel frontend tier** (it lives under `frontend/`). Preserve the reusable design-craft material (anti-slop, tokens, typography, rhythm, motion, accessibility, safe markdown, self-credibility, severity semantics). Remove everything tied to deleted features. Reframe the stack. Target section structure:

1. **Header + source-of-truth note.** State this is the v3 frontend-tier brief; `../shipsafe-spec.md` (v3, 3-tier) is the source of truth; where the brief and spec disagree on frozen text, the spec wins. Keep the Stitch-unavailable tooling note if desired (optional).

2. **1. Design read.** Reframe the concept to a **single-screen upload-and-report security tool**: the user uploads one ZIP, picks a coding-agent target, and reads a Full Report with a copyable remediation prompt per finding. REMOVE the "customs desk / three-zone with a verdict stamp and a sign-off officer at the bottom" framing. Keep the ink-on-ruled-paper visual language and the ENERGY/RHYTHM/MOTION dials. The identity motif stays the **ruled form**; REMOVE the "verdict is a hard-edged stamp" line — the key moment is now the report arriving, not a stamp. Update the accent policy: chroma means state, and the required semantic colors are the **five severity colors** (Critical red, High orange, Medium yellow, Low blue, Info gray) plus scorecard status and the amber disclaimer band — DELETE the GO/CONDITIONAL GO/NO-GO verdict color mention.
   - **1.1 Principles.** Keep principles about honesty of content, every-state-designed, quiet motion, frozen-text-is-data, and security-tool credibility. REMOVE "The decision is the page / can I ship this / hierarchy built toward the verdict" — replace with hierarchy built toward the findings and their remediation prompts. The "one orchestrated motion moment (the stamp landing)" becomes the report-reveal moment (no stamp).
   - **1.2 Anti-slop stance.** KEEP the whole table (it is reusable design-craft). In the "uppercase appears only where the spec mandates it" row, DELETE the reference to verdict values GO / CONDITIONAL GO / NO-GO; uppercase is now used only for severity labels if at all (sentence/title case otherwise). Everything else in this table stays.

3. **2. Research and sources.** KEEP verbatim — all sources (anti-slop, WCAG 2.2, prefers-reduced-motion, Nielsen heuristics, GOV.UK error messages, Fontsource) remain valid and are not tied to removed features.

4. **3. Spec carry (what the UI must carry under v3).** REPLACE the entire old section 3 (13-widget table, frozen widget prompts, `@Title` dependency matrix, execution waves, old flows, old entities). New content:
   - **3.1 Frozen text.** The only frozen text in v3 is the **Disclaimer (spec section 7)**. Describe the extraction mechanism: `scripts/extract-spec-text.mjs` reads `../shipsafe-spec.md`, finds `## 7. Disclaimer`, takes the first fenced block, writes it byte-for-byte (LF, one trailing newline) to `src/config/text/disclaimer.txt`; a conformance test re-parses the spec and asserts equality; `.gitattributes` forces LF. Note that the Disclaimer contains a leading warning glyph and an em dash, both **frozen data** exempt from the no-em-dash / no-emoji style rules (see section D for the verbatim text).
   - **3.2 Data model carried into the UI.** Reference the shared types from spec 9.2 (`Severity`, `Area`, `AgentTarget`, `Finding`, `AuditReport`) imported from `packages/shared`. List `AgentTarget` values exactly: Generic, Cursor, ClaudeCode, Copilot, Windsurf. List the five report sections (Executive Summary, Risk Scorecard, Findings, Secrets to Rotate, Gaps / Not Assessed) and the finding fields (id, title, severity, area, location?, what, why, recommendedFix, verifyWith?, remediationPrompt).
   - **3.3 Flows to support (v3).** Land (disclaimer visible, empty dropzone, optional auth controls, agent selector). Optionally sign in with Supabase. Fill optional context, select ZIP (client-side validation: 10 MB, `.zip`), choose agent target. Run audit -> client-side secret hint on context text -> upload to VPS `POST /api/audit` with staged progress (upload -> scanning -> auditing -> report) -> render Full Report -> open per-finding remediation prompt, Copy / Copy All / download `.md`. If logged in, the report is saved and appears in history; history can be reopened. Edit inputs after a report -> report marked outdated, re-run. Toggle theme.
   - **3.4 Constraints the spec puts on the frontend.** Next.js App Router on Vercel; backend holds the LLM key (frontend never does); `@supabase/supabase-js` for auth UI + obtaining the JWT (Supabase holds auth); state in Zustand with no sensitive local persistence; safe markdown via react-markdown + remark-gfm + rehype-sanitize, no raw HTML / no `dangerouslySetInnerHTML`; client-side secret hint on the optional context text before send; ShipSafe passes its own security-header self-audit; severity colors per spec; tables render as markdown with horizontal scroll; light/dark themes, responsive, mobile stacks.

5. **4. Stack (locked on approval).** REWRITE to spec 9.1 frontend stack: **Next.js (App Router) + TypeScript, React 18; Tailwind CSS + shadcn/ui + lucide-react; Zustand; react-markdown + remark-gfm + rehype-sanitize; `@supabase/supabase-js`**; calls the VPS backend over HTTPS. REMOVE the "Why not Next.js / client-only SPA is simpler to harden" rationale and REPLACE with a short rationale for Next.js on Vercel talking to a real VPS backend through one typed API client, with Supabase for auth. Note the three-tier split and that shared types/Zod live in `packages/shared`.
   - **4.1 Dependencies.** Replace the Vite-era pin table with the v3 frontend libraries named in spec 9.1 (Next.js, React 18, TypeScript, Tailwind, shadcn/ui, lucide-react, Zustand, react-markdown, remark-gfm, rehype-sanitize, @supabase/supabase-js, plus test tooling). Pinning discipline (exact versions, no `^`/`~`) is a valid engineering practice to KEEP as a stated rule; the implementer picks concrete current versions. Keep rehype-sanitize in the markdown stack (spec 9.1 and 9.4 both require it).
   - **4.2 Commands.** PowerShell commands for a Next.js app (`npm run dev`, `build`, `lint`, `test`, etc.). Keep the PowerShell `;` / quoted-path notes.
   - **4.3 Environment variables.** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public, safe), and the VPS backend base URL. State clearly: **no LLM key, no service_role key, no secret** in the frontend env. Keep the "no VITE_* name may contain KEY/SECRET/TOKEN/PASSWORD" spirit, retargeted to `NEXT_PUBLIC_*` (anon key is the allowed exception, named explicitly).
   - **4.4 Folder structure.** Reframe to a Next.js App Router layout under `frontend/` (e.g. `app/`, `components/`, `lib/`, `src/`-style as the implementer prefers) plus a reference to `packages/shared`. REMOVE the Vite folder tree, the `src/api/mock/**` lint ban framing as the only I/O story, the `domain/mentions.ts|graph.ts|planner.ts|runner.ts|verdict.ts|signoff.ts` modules, and `verdict/` and `widgets/` component folders. Keep lint rules that remain valid (ban `dangerouslySetInnerHTML`; ban raw-HTML rehype plugins; token-only palette; `target="_blank"` needs `rel`).

6. **5. Design tokens.** KEEP sections 5.1 through 5.6 almost entirely — they are reusable and valid. REQUIRED edits:
   - **5.1 Color.** DELETE the entire **Verdict (stamp fill and text)** table (GO/CONDITIONAL GO/NO-GO). KEEP the Neutrals table, the **Severity chips** table (Critical/High/Medium/Low/Info), the Pass/Partial/Fail status chips, and the warn-band / stale / focus tokens. In the "Rule for light fills" note, DELETE the "CONDITIONAL GO stamp" clause and keep the Medium-chip ink-border rule. In the Forbidden list keep everything.
   - **5.2 Typography.** KEEP. Remove the "verdict stamp" rows/usages from the scale: delete `--text-stamp` and the "stamp" usage of `--text-wordmark`; keep caption/small/body/title/md-h3/wordmark. The wide Archivo rationale stays. (If shadcn/ui's default font expectations conflict, note that tokens still govern; do not reintroduce Inter.)
   - **5.3 Spacing, 5.4 Rhythm, 5.5 Radius/borders, 5.6 Layout metrics.** KEEP. In 5.4 and 5.5 DELETE references to the verdict-widget structural break, the chat-zone "tear line", and the 3px double-border stamp. Reframe rhythm around: disclaimer band, submission area, continuous ruled report. The two-column desktop grid (submission left, report right) stays; mobile stacks.

7. **6. Layout.** REWRITE the wireframes. REMOVE the three-zone grid with `[11] Go/No-Go Verdict [NO-GO stamp]`, `[12] Fix-It Checklist`, the dashed tear line, and `[13] Release Security Officer` chat zone. New layout: sticky disclaimer band at top; a toolbar (wordmark, product descriptor, auth controls, theme toggle); a submission area (UploadDropzone, optional ContextForm, AgentSelector, Run button); a report area (Executive Summary, Risk Scorecard, Findings list with per-finding remediation prompt access, Secrets to Rotate, Gaps). Keep desktop two-column (submission / report) and mobile single-column DOM-order-equals-visual-order. Keep the top-rail sticky + `--rail-h` + `scroll-padding-top` accessibility handling and region/landmark semantics; update skip-link targets to "Skip to upload" and "Skip to report" (remove "Skip to Release Security Officer").

8. **7. Components.** REWRITE the component table to match **spec 9.4** exactly. The components are: `AppShell`, `DisclaimerBanner`, `AuthControls`, `UploadDropzone`, `ContextForm`, `AgentSelector`, `ReportView`, `FindingCard`, `SeverityBadge`, `PromptModal`, `MarkdownView`, `HistoryList`. REMOVE: `VerdictBadge`, `VerdictStamp`, `SignOffRecord`, `ChatWidget`, `StaticTextWidget`/`InputWidget`/`GenerationWidget` (the 13-widget abstraction), `PipelineRail`, `ReadsFromChips`, `FindingTally`-as-verdict, `SampleMenu` as a 6-input loader (a sample ZIP loader may be kept as a dev aid but not framed as the architecture). KEEP and adapt the reusable primitives: `MarkdownView` (react-markdown + remark-gfm + rehype-sanitize, no raw HTML, heading demotion, scrollable tables, safe links), `SeverityBadge` (the spec's name; keep the four-segment bar glyph idea and the severity color tokens), `PromptModal` (prompt in a focusable `<pre>`, Copy, never rendered as markdown), `CopyButton`, `Button`/`IconButton`/`Chip`, `ErrorPanel`, `EmptyState`, `LiveAnnouncer`, `icons.tsx` (drop verdict/chat-specific glyphs). Add `AuthControls` (Supabase login/signup/logout, optional) and `HistoryList` (logged-in audit history from Supabase). `FindingCard` keeps what/where/why/severity/fix/verify + Copy Prompt / View prompt.

9. **8. Frontend logic.** REWRITE to v3:
   - **8.1 Types.** Reference `packages/shared` (spec 9.2): `Severity`, `Area`, `AgentTarget`, `Finding`, `AuditReport`. REMOVE `WidgetDef`/`WidgetState`/`Store keyed by title`/`RunStatus` per-widget machine. Add a small UI state shape (submission inputs, audit status/stage, report, auth/session, history).
   - **8.2 REMOVE entirely** the mention resolver (`@Title`), **8.3 REMOVE** planner/runner/waves, replaced by a single-flight audit controller (validate ZIP -> optional secret hint on context -> call `api.audit` with an `AbortController`, staged progress). **8.4 Stale detection** keep in v3 form (report outdated when the selected ZIP or context changed after it ran). **8.5 REMOVE** the chat session entirely. **8.6 Secret guard** KEEP (the ten patterns, false-positive ignore list, masking = first 4 chars + `****`); retarget it to scan the optional free-text context before send (the browser never unzips; the ZIP is hostile data processed server-side). **8.7 Output parsing** REMOVE verdict/confidence/blockers/signoff parsers; keep only what the Full Report needs (report shape is validated by Zod from `packages/shared`; a report missing any `remediationPrompt` is a bad response). **8.8 REMOVE** the Fix-It checklist interactivity. **8.9 Size and input limits** KEEP (10 MB ZIP; context field caps; accepted-response cap), retargeted to the context form and the single ZIP.

10. **9. API client (single typed client to the real backend).** REWRITE. One typed client module is the only I/O surface. Its default implementation calls the **real VPS backend**: `POST {base}/api/audit` multipart (`file` ZIP, optional `context` JSON, `agentTarget`) with optional `Authorization: Bearer <Supabase JWT>`; staged upload progress; 413/415/422/429/5xx error mapping; client timeout. Response is the `AuditReport` validated by the shared Zod schema. An **optional mock implementation of the same interface** is allowed only for local dev/tests (behind the same client interface, dynamic-imported, never shipped as the product). REMOVE the `generate`/`chat` endpoints, the chat contract, and all framing that treats the mock as the architecture. REMOVE the 13-widget authored scenarios framed as the product; a small dev-only sample ZIP + mock report may be mentioned strictly as a local-dev convenience.

11. **10. Error handling.** KEEP the recoverable/fatal structure and the GOV.UK-style copy. Remove `generate`/`chat`/verdict/chat-specific rows; add rows for the audit upload path (network, timeout, rate_limited 429, too_large 413, not_zip 415, unsafe_archive 422, server 5xx, bad_response, aborted) and optional auth/history failures (sign-in failed, history fetch failed). Logged content stays scrubbed (no prompt/input/output text).

12. **11 Motion / 12 States / 13 Microcopy / 14 Accessibility / 15 Decisions / 16 Decision log** (whatever later-numbered sections exist). KEEP the reusable craft: motion only under `prefers-reduced-motion: no-preference` with one orchestrated moment (now the **report reveal**, not the stamp landing); the full state matrix (empty, loading, running, error, outdated, success) retargeted to upload/report (remove verdict/chat states); microcopy rules; WCAG 2.2 AA mapping; the frozen-glyph handling rule for the Disclaimer (keep it, it still applies); the security-header set for the frontend self-audit. In section 15 (open-choice decisions) remove any decision that only existed because of verdict/chat/widgets; keep the Disclaimer-visible decision, the mobile-disclaimer trade-off, the token/palette decisions, and the markdown-safety decision. REMOVE any remaining reference to a verdict, a chatbot, 13 widgets, `@` mentions, waves, a topological runner, or a mock-only / no-backend architecture.

End state for DESIGN.md: a coherent v3 Vercel-frontend design brief with no leftover reference to verdict, chatbot, 13 widgets, `@Title`, waves, topological runner, VerdictBadge/VerdictStamp, or client-only-SPA/mock-only framing; all preserved tables (anti-slop, tokens, contrast, severity, accessibility) still valid; the frozen Disclaimer handled as verbatim data.

---

## B. Target outline for the rewritten `plan.md`

Keep `plan.md` an **implementation plan for the frontend tier** (lives under `frontend/`), internally consistent with the rewritten `DESIGN.md` and spec v3. Target structure:

1. **Header + loop/environment contract.** Keep the Windows + PowerShell notes (`;` not `&&`, quote paths, not a git repo). Keep a short, accurate statement of the review loop. Note the plan targets **spec v3 (3-tier)** and that `DESIGN.md` (now rewritten) is the frontend brief.

2. **DELETE the old "section 0: the spec on disk is not the spec the brief assumed" conflict narrative and the v1/v2 disposition tables entirely.** REPLACE with a short note (a few sentences): the v1/v2 conflict is resolved; this plan builds spec v3 (frontend on Vercel, backend+AI on VPS, DB+Auth on Supabase); the frontend uploads one ZIP to the real VPS backend and renders the returned Full Report + per-finding remediation prompts, with optional Supabase auth and history. State that the mock is a dev/test-only implementation of the typed API client, not the product architecture.

3. **1. Facts from exploration the implementer must honor.** KEEP the useful spec numbers (ZIP max 10 MB, magic bytes `PK\x03\x04`, 5 severities, 4 areas, 5 agent targets, finding fields, five report sections). KEEP the frozen-Disclaimer facts (leading glyph + em dash are frozen data; extract to `src/config/text/disclaimer.txt`; exempt from no-em-dash/no-emoji lint; LF via `.gitattributes`). KEEP the English-UI note, the Disclaimer-visible interpretation + mobile trade-off, and the TDD / accessibility-gate stance. REMOVE anything that assumed server caps are mirrored by a browser mock as the architecture (reframe: the real VPS backend enforces zip-slip/zip-bomb/symlink guards; the frontend only validates size and extension client-side and renders backend errors). Add the three-tier split and the `packages/shared` reference.

4. **2. Target architecture.** REWRITE to the Next.js App Router frontend structure (match DESIGN.md section 4.4) plus `packages/shared` for types/Zod. REMOVE the Vite `src/` tree, the `domain/mentions|graph|planner|runner|verdict|signoff` modules, and the mock-as-architecture framing. Define the core types by importing from `packages/shared` (spec 9.2) rather than redefining; keep the UI-only state/stage/error enums. Define the single typed API client surface: `audit(req, opts)` calling `POST /api/audit` (multipart ZIP + optional context + agentTarget, optional Bearer JWT) returning a Zod-validated `AuditReport`; optional `formatPrompts`/history calls; the HTTP error contract (413/415/422/429/5xx); mock implementation behind the same interface for dev/tests only.

5. **3. Ordered implementation tasks.** REWRITE the task list to v3 frontend work, each item buildable and verifiable with the project's real Next.js commands. Keep valid engineering practices (exact pins, TDD, accessibility gates, security-header self-audit, PowerShell notes). Suggested ordered items (adjust to match DESIGN.md):
   1. Scaffold the Next.js (App Router) + TypeScript app with exact pins; Tailwind + shadcn/ui + lucide-react; scripts (`dev`, `build`, `lint`, `test`); `.env.example` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, backend base URL; a pins test (no `^`/`~`). Reference `packages/shared`.
   2. Design tokens, fonts, global CSS, automated design-rule + contrast tests (carry over DESIGN.md 5.x; DROP verdict tokens).
   3. Spec extraction + Disclaimer conformance test + config (`extract-spec-text.mjs` for the Disclaimer only; limits; agent targets from spec 6.2; union conformance against spec 9.2).
   4. Shared types + Zod schema usage from `packages/shared`; report parsing/validation; `scanSecrets` + `maskSecret` for the context field; client-side `validateZipFile` (10 MB, `.zip`, magic bytes read client-side for a fast reject); stale/hash helpers; export helpers (Copy All / `.md`).
   5. Supabase client + auth (`@supabase/supabase-js`): `AuthControls` (login/signup/logout, optional), obtain JWT, pass as Bearer to the backend. Note anonymous path still works.
   6. Typed API client: default HTTP implementation calling the real VPS backend `POST /api/audit`; staged upload progress; error mapping; optional mock implementation (dev/test only) behind the same interface.
   7. State store (Zustand) + single-flight audit controller (validate -> secret hint -> upload -> staged progress -> report); no sensitive local persistence.
   8. App shell, Disclaimer banner (frozen text via `?raw`, frozen-glyph handling), toolbar, theme toggle, auth controls placement.
   9. Submission area: `UploadDropzone` (10 MB + `.zip` client validation, drag-drop + picker, states), `ContextForm` (optional, with live secret hint), `AgentSelector` (Generic/Cursor/ClaudeCode/Copilot/Windsurf), Run button, secret-scan dialog.
   10. Run experience: progress (upload -> scanning -> auditing -> report), empty, error, outdated states.
   11. Safe `MarkdownView` (react-markdown + remark-gfm + rehype-sanitize; no raw HTML; scrollable tables; safe links; heading demotion).
   12. `ReportView`: Executive Summary, Risk Scorecard, `FindingCard` (what/where/why/severity/fix/verify + `SeverityBadge`), `PromptModal` (per-finding remediation prompt, Copy / Copy All / download `.md`), Secrets to Rotate (masked, "None found" empty state), Gaps / Not Assessed.
   13. `HistoryList` from Supabase when logged in (list + reopen saved reports); anonymous users see no history.
   14. Motion / forced-colors / print / microcopy review (one orchestrated moment = report reveal; DROP stamp).
   15. Frontend security headers self-audit (CSP compatible with Next.js, HSTS, nosniff, Referrer-Policy, Permissions-Policy; strict CORS is the backend's job but note the frontend expectations); a header check script if feasible.
   16. App-level integration + accessibility tests (sample report through the mock client; agent-switch updates prompts; outdated after context edit; oversize/non-ZIP rejected client-side; error-kind rendering; axe sweeps).
   17. Browser e2e (optional, document fallback if browser download blocked), README (how to run; mock vs real backend; three-tier deploy note: Vercel + VPS + Supabase; limits; disclaimer-on-mobile trade-off; accessibility statement), final verification.

6. **4. Spec requirement / QA mapping.** REWRITE the mapping tables against spec v3 sections 8 (Requirements 1-9) and 11 (final QA). Mark each as frontend (FE), backend-only (VPS), or Supabase, so it is clear which acceptance criteria the frontend tier satisfies vs. forwards/displays. REMOVE verdict/chat/13-widget rows. Add the optional-auth and history rows (Req 2, Req 8) and the "LLM key only on VPS / strict CORS / no permanent ZIP storage" rows (Req 4, Req 9) marked as backend with the frontend's display/forward responsibility.

7. **5. Risks and fallbacks.** REPLACE the "v1/v2 spec mismatch is the largest risk" item (resolved). Keep: do not add dependencies beyond the pinned list; read current library docs before coding against new major versions; Playwright-download fallback; the mobile-disclaimer trade-off. Add: the real backend contract must match `packages/shared` and spec 9.3; the mock must not drift from that contract.

End state for plan.md: a v3 frontend-tier implementation plan with no section-0 conflict narrative, no v1/v2 disposition tables, no verdict/chat/13-widget tasks, the Next.js + Supabase stack from spec 9.1, a single typed API client that calls the real VPS backend (mock allowed only for dev/tests), and mapping tables aligned to spec v3. Internally consistent with the rewritten DESIGN.md.

---

## C. Removed-feature string checklist (must NOT survive in either doc)

After rewriting, the implementer MUST confirm NONE of the following strings/concepts remain in `DESIGN.md` or `plan.md` (except where a string legitimately appears only to say a feature was removed — avoid even that; prefer clean rewrites with no mention). Run this PowerShell sweep from the frontend folder and expect zero hits:

```powershell
Set-Location "c:\Users\HYPE AMD\files\PROJECT\PERSONAL\KIRO TEST\frontend"
$targets = @("DESIGN.md", ".agents\tasks\plan.md")
$patterns = @(
  "Go/No-Go", "Go / No-Go", "No-Go", "NO-GO", "GO / CONDITIONAL GO", "CONDITIONAL GO",
  "VerdictBadge", "VerdictStamp", "verdict stamp", "SignOffRecord", "sign-off",
  "Release Security Officer", "ChatWidget", "chatbot", "RSO ",
  "13 widget", "thirteen widget", "widgets.config", "StaticTextWidget", "InputWidget", "GenerationWidget",
  "@Title", "mention matrix", "mentions.ts", "execution wave", "topological", "planner.ts", "runner.ts",
  "Fix-It Checklist", "Fix-It",
  "client-only SPA", "client-side SPA", "mock-only", "no backend", "Vite"
)
foreach ($t in $targets) {
  foreach ($p in $patterns) {
    Select-String -Path $t -SimpleMatch -Pattern $p | ForEach-Object { "HIT in $t : $p -> line $($_.LineNumber)" }
  }
}
```

Notes on the sweep:
- `Vite` must be gone (stack is Next.js). If the rewrite keeps any Vite reference it is a bug.
- `No-Go` / `NO-GO` / `CONDITIONAL GO` / verdict component names must be fully absent.
- "sign-off" and "Release Security Officer" and "chatbot"/"ChatWidget"/"RSO" must be absent.
- 13-widget machinery (`widgets.config`, the three widget component types, `@Title`, waves, `planner.ts`, `runner.ts`, topological) must be absent.
- "mock-only" / "no backend" / "client-only SPA" framing must be absent; the word "mock" may remain ONLY in the sense of an optional dev/test implementation of the real API client — if "mock" appears, confirm its surrounding sentence frames it as dev/test-only, not as the architecture.
- The word "verdict" lowercase: ensure it does not refer to a Go/No-Go product feature. (A stray lowercase "verdict" referring to the review loop's `verdict.json` in plan.md's loop contract is acceptable and is NOT the removed product feature; keep that distinction in mind when triaging hits.)

---

## D. Frozen Disclaimer text (spec section 7) — reproduce VERBATIM

Location in the authoritative spec: `c:\Users\HYPE AMD\files\PROJECT\PERSONAL\KIRO TEST\shipsafe-spec.md`, section `## 7. Disclaimer (banner atas, selalu terlihat)`, inside the first fenced code block. This is frozen data: the leading warning glyph and the em dash are part of the string and are EXEMPT from any no-em-dash / no-emoji style rule. Both docs must treat it as byte-exact and must point the implementer at this one source (do not retype it into components; extract it with `scripts/extract-spec-text.mjs` to `src/config/text/disclaimer.txt`).

Verbatim text:

```
⚠️ ShipSafe is an AI-assisted review, not a replacement for automated scanners or a professional pentest. If your ZIP contains real secrets, they are auto-masked for processing — but you should rotate any exposed credentials immediately. Always confirm findings with tools like gitleaks, trufflehog, npm audit / pip-audit / OSV-Scanner, and securityheaders.com.
```

Frozen-data details the rewrite must state:
- Leading glyph: `⚠️` (U+26A0 U+FE0F), warning sign. Keep byte-exact.
- One em dash `—` in "for processing — but you should". Keep byte-exact; exempt from the no-em-dash rule.
- Forward slashes in "npm audit / pip-audit / OSV-Scanner" are literal.
- Visual treatment per DESIGN.md's frozen-glyph rule (wrap the glyph for display, draw an outline alert triangle) stays valid; the stored string is unchanged.

---

## E. Existing material to PRESERVE (do not discard during rewrite)

From `DESIGN.md` (reusable design-craft, not tied to removed features):
- Anti-slop stance and the full 1.2 avoid-list table (minus the verdict-uppercase row edit).
- Section 2 research + sources table (verbatim; all still valid).
- Design tokens 5.1-5.6: neutrals, **severity chips** (Critical red / High orange / Medium yellow / Low blue / Info gray), Pass/Partial/Fail status chips, warn-band/stale/focus tokens, contrast ratios, the Medium-chip ink-border rule, the Forbidden list. (DROP only the verdict/stamp color table and the `--text-stamp` scale row.)
- Typography system (Archivo + IBM Plex Mono, self-hosted, the scale, the tabular-nums and line-length rules).
- Spacing / rhythm / radius / layout metrics (DROP verdict-widget break, tear line, stamp border).
- Safe markdown rules: react-markdown + remark-gfm + **rehype-sanitize**, no raw HTML, no `dangerouslySetInnerHTML`, heading demotion, scrollable tables, safe links.
- Accessibility (WCAG 2.2 AA) mapping, focus handling, forced-colors, reduced-motion.
- Security-tool self-credibility: self-hosted assets, strict-CSP-compatible, no secrets in the client, security-header set.
- The frozen-glyph handling rule for the Disclaimer and the Disclaimer-visible requirement + mobile trade-off.
- Reusable primitives: `MarkdownView`, `SeverityBadge` (severity colors + bar glyph), `PromptModal`, `CopyButton`, `Button`/`IconButton`/`Chip`, `ErrorPanel`, `EmptyState`, `LiveAnnouncer`, `icons.tsx` (minus verdict/chat glyphs).
- The secret scanner patterns (8.6), false-positive ignore list, and masking rule (first 4 chars + `****`), retargeted to the optional context field.
- The error-handling copy style (GOV.UK: what happened + how to fix; no "Oops/Sorry/Please/Invalid").
- Size/input limits concept (10 MB ZIP, context caps, accepted-response cap).

From `plan.md` (valid engineering practices):
- Exact dependency pinning (no `^`/`~`) and a pins test, retargeted to the Next.js + Supabase stack.
- TDD (red-green-refactor), tests next to code.
- Accessibility gates (vitest-axe / Playwright axe) and the design-rules lint test.
- Security-header self-audit step and script.
- PowerShell command notes (`;` not `&&`, quote paths, not a git repo).
- The spec-extraction + conformance test mechanism (retargeted to the Disclaimer only).
- The requirement/QA mapping discipline (rebuilt against spec v3 sections 8 and 11).
- The "do not add dependencies beyond the pinned list" and "read current library docs before coding new majors" risks.
- The Disclaimer-on-mobile documented trade-off and the Playwright-download fallback.

Add (new in v3, present in neither doc before): Supabase auth UI + optional login + JWT + RLS-backed history; the real VPS backend contract (`POST /api/audit`, multipart, Bearer JWT, Zod `AuditReport`); the `packages/shared` dependency; the three-tier deploy framing (Vercel + VPS + Supabase).

---

## F. Consistency gate (both docs together)

Before declaring done, confirm:
1. The removed-feature sweep in section C returns zero product-feature hits in both files.
2. The stack named in `plan.md` matches `DESIGN.md` section 4 (Next.js App Router, TypeScript, React 18, Tailwind, shadcn/ui, lucide-react, Zustand, react-markdown + remark-gfm + rehype-sanitize, @supabase/supabase-js).
3. Component names in `plan.md` tasks match the spec 9.4 set used in `DESIGN.md` section 7 (AppShell, DisclaimerBanner, AuthControls, UploadDropzone, ContextForm, AgentSelector, ReportView, FindingCard, SeverityBadge, PromptModal, MarkdownView, HistoryList).
4. Both docs describe one typed API client calling the real VPS backend, with the mock only as a dev/test implementation of that interface.
5. The Disclaimer is referenced as extracted-from-spec frozen data in both docs, byte-exact per section D.
6. Both docs reference `packages/shared` (spec 9.2) and the three-tier split (Vercel + VPS + Supabase).
```
