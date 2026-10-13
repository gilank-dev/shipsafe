# ShipSafe Frontend: Design Brief

Status: approved-for-implementation draft. Stack is locked once this document is approved (section 4).
Source of truth for product behavior: `../shipsafe-spec.md` (the "spec"). Where this brief and the spec disagree on frozen text, the spec wins. Where the spec leaves a choice open, section 15 lists the decision and why.

Note on tooling: the Google Stitch MCP tools named by the design skill were not available in this environment, so the visual direction is specified as text tokens, wireframes and rules below. Nothing in this brief depends on Stitch output.

---

## 1. Design read

Reading this as: Operate-mode single-screen security gate for solo developers and small teams shipping vibe-coded web apps, in a release-inspection-form visual language (ink on ruled paper, one verdict stamp), dial ENERGY 2 / RHYTHM 2 / MOTION 1.

Concept: ShipSafe is a customs desk for code. You declare what you are shipping (the manifest, left), inspectors report what they found (the findings, center), and a single officer decides whether the release may leave (sign-off, bottom). The UI should feel like a well-made inspection form: dense, legible, rectilinear, and trustworthy, not like a SaaS landing page.

Identity motif (one, repeated): the **ruled form**. Heavy 2px ink rule opens every widget, hairline rules separate fields, and the verdict is a hard-edged **stamp** (square corners, double border). Nothing else is decorative.

Accent policy: **chroma means state.** The interface is achromatic ink-on-paper. The only saturated color on screen is status: verdict, severity, pass/fail, stale. The single large area of chroma is the verdict stamp, which is the key moment. Primary actions are solid ink, not a brand hue. This avoids colliding with the spec's required green / amber / red / orange / yellow / blue / gray semantics.

### 1.1 Principles

1. **The decision is the page.** The user's one decision is "can I ship this?". Hierarchy is built toward the verdict and blockers, not toward stats or widgets of equal weight.
2. **Chroma is a signal, never decoration.** If a color is on screen, it tells you a state. State is never color alone (text label plus shape glyph always).
3. **Rectilinear and ruled.** Square panels, 1 to 4px control radii, rules instead of shadows. No pills, no floating cards, no glow, no glass.
4. **Real content or an honest label.** Every number, finding and message comes from the user's input, a derived parse of model output, or a clearly labeled sample/mock. No invented metrics, no fake activity, no testimonials.
5. **Every state is designed.** Empty, loading, running, stale, blocked, error and success each have specific copy with a cause and a next action.
6. **Quiet motion.** Motion confirms what changed. There is exactly one orchestrated moment (the stamp landing). Everything honors `prefers-reduced-motion`.
7. **Frozen text is data.** Widget titles, placeholders and prompts are never typed into components. They are generated from the spec and verified by test.
8. **Security-tool credibility.** ShipSafe must pass its own audit: self-hosted fonts, no inline scripts, strict CSP-compatible, no raw HTML rendering, no secrets in the client.

### 1.2 Anti-slop stance (what we are explicitly not doing)

| Slop tell (from research, section 2) | Our decision |
|---|---|
| Inter everywhere | Archivo (variable, with width axis) plus IBM Plex Mono. Reason in 5.2. |
| Indigo / purple / blue gradients, glow | No gradients. No glow. Flat fills only. |
| Dark mode by default, grey body text | Light default (follows OS), true light/dark toggle, both contrast-checked. |
| Identical rounded feature cards, card grid everywhere | The center column is one continuous ruled report, not a grid of cards. Verdict widget is structurally different. |
| Colored left/top border on cards | Not used. Status is a labeled chip or the stamp. |
| Badge above the hero, centered hero, 3-card row, "How it works" 1-2-3, stat banner, logo bar, testimonials, FAQ | None exist. There is no landing page. |
| All-caps tracked eyebrow labels, uppercase section headers | Sentence/title case only. Uppercase appears only where the spec mandates it (verdict values GO / CONDITIONAL GO / NO-GO). |
| Emoji and sparkle icons | No emoji in UI chrome. Custom 16px line glyphs, each tied to a function. The spec's own emoji are handled per 15.5. |
| Fake numbers and deltas | Only derived counts (inputs filled, finding tally, open blockers) or nothing. |
| Em dashes in copy | Zero em dashes in all UI text and in this document. |
| Missing states | Section 12 specifies empty, loading, error, stale, blocked for every widget. |
| Uniform spacing / uniform radius | Defined rhythm (5.4) and a three-value radius scale with reasons (5.5). |

---

## 2. Research and sources

Searches were run on current anti-AI-slop UI practice, then the pages below were fetched and read directly (HTTP 200, content confirmed). Search-engine result pages were used only to discover URLs.

| # | Source (URL) | What it says | What we did with it |
|---|---|---|---|
| 1 | https://www.adriankrebs.ch/blog/design-slop/ | Adrian Krebs' scoring of Show HN pages. Designer-reported tells: Inter everywhere, Space Grotesk / Instrument Serif combos, "VibeCode Purple", perma dark mode with grey body text and all-caps section labels, barely-passing dark-theme contrast, gradients, colored glows and shadows, badge above hero, colored top/left card borders, identical icon feature cards, numbered 1-2-3 steps, stat banner rows, emoji nav icons, shadcn defaults, glassmorphism. | Used as the primary avoid-list (table 1.2). Contrast is checked with real numbers (5.1). |
| 2 | https://www.developersdigest.tech/blog/ai-design-slop-and-how-to-spot-it | Summarizes the 16-pattern rubric and the finding that generated dark themes routinely fail WCAG AA body contrast. | Confirms the contrast gate and the "deliberate palette, type, layout" fix. |
| 3 | https://www.925studios.co/blog/ai-slop-design-tells | Slop is the statistical median (Inter, indigo gradient, three rounded cards). The fix is constraint: make the brand decisions yourself. Mentions Tailwind's indigo-500 default feedback loop. | We override Tailwind's default palette entirely with our own tokens; no `indigo-*`, `purple-*` or default `blue-*` classes are allowed. |
| 4 | https://www.mania.design/blog/spot-the-slop-a-ui-designers-guide-to-fixing-ai-defaults/ | "Slop is design with no author." Highest-leverage fix is a deliberate typeface. Use color semantically. Break uniformity on purpose. The missing states (empty, loading, error) are what AI skips and where trust is built. | Typeface chosen from the product's world (5.2). Semantic-only color. Full state matrix (section 12). |
| 5 | https://raw.githubusercontent.com/anthropics/claude-code/main/plugins/frontend-design/skills/frontend-design/SKILL.md | Ground the design in the subject matter. Avoid default type treatments (single accented headline word, all-caps labels, unnecessary labels above content). Structural devices (numbering, eyebrows) must encode real information. One orchestrated motion moment beats scattered fade-ups. Names calibrated defaults to avoid: cream plus terracotta, near-black plus acid green, hairline broadsheet, the SaaS-card kit. Error copy should state what happened and how to fix it. | Palette avoids cream/terracotta and black/acid-green. No numbered markers except where content is a real sequence. One motion moment. Microcopy rules in section 12. |
| 6 | https://www.w3.org/TR/WCAG22/ | WCAG 2.2: 1.4.3 contrast (4.5:1), 1.4.11 non-text contrast (3:1), 1.4.10 reflow, 2.4.7 focus visible, 2.4.11 focus not obscured (minimum, AA), 2.5.8 target size minimum (24px, AA), 3.3.1/3.3.3 error identification and suggestion, 4.1.3 status messages, 1.4.1 use of color. | Section 14 maps each rule to a concrete implementation requirement. The sticky rail is specifically handled for 2.4.11. |
| 7 | https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion | The media feature definition and syntax. | Motion section (11). |
| 8 | https://web.dev/articles/prefers-reduced-motion | Motion can cause dizziness, nausea and migraines for vestibular-sensitive users. Guidance to opt animations in under `no-preference`. | Animations are declared only inside `@media (prefers-reduced-motion: no-preference)`. |
| 9 | https://www.nngroup.com/articles/ten-usability-heuristics/ | Visibility of system status, error prevention, recognition over recall, help users recover from errors. | Per-widget run status, secret-scan confirm dialog (error prevention), "Reads from" chips (recognition), recoverable error panels. |
| 10 | https://design-system.service.gov.uk/components/error-message/ | Error messages describe what happened and how to fix it, in plain language; avoid "oops", "sorry", "please", "invalid". | Error copy table in section 12. |
| 11 | https://registry.npmjs.org/ and https://api.fontsource.org/v1/fonts/archivo | Used to resolve exact current versions and to confirm Archivo ships a variable `wdth` axis and IBM Plex Mono ships weights 100 to 700. | Section 4 pins. |

Takeaway applied everywhere: slop is the unmade decision. Each major decision in this brief has a one-line reason (decision log, section 16).

---

## 3. Spec extraction (everything the UI must carry)

### 3.1 Widgets (exactly 13, exact titles, exact order)

| # | Title (frozen, case-sensitive) | Type | Region | Slug (ids, anchors) |
|---|---|---|---|---|
| 1 | Disclaimer | static | top banner | `disclaimer` |
| 2 | Project Profile | input | left | `project-profile` |
| 3 | Tech Stack | input | left | `tech-stack` |
| 4 | Deployment Context | input | left | `deployment-context` |
| 5 | Code Artifacts | input (mono) | left | `code-artifacts` |
| 6 | Dependency Manifest | input (mono) | left | `dependency-manifest` |
| 7 | HTTP and Server Config | input (mono) | left | `http-and-server-config` |
| 8 | Secrets Audit | generation | center | `secrets-audit` |
| 9 | Dependency Audit | generation | center | `dependency-audit` |
| 10 | HTTP Hardening Audit | generation | center | `http-hardening-audit` |
| 11 | Go/No-Go Verdict | generation | center | `go-no-go-verdict` |
| 12 | Fix-It Checklist | generation | center | `fix-it-checklist` |
| 13 | Release Security Officer | chatbot | bottom full width | `release-security-officer` |

Titles are never used as DOM ids or URL fragments (the `/` in "Go/No-Go Verdict" and spaces are unsafe). Slugs are used for ids; titles are used for display and for `@` resolution only.

### 3.2 Frozen text (never typed by hand)

All widget titles, the Disclaimer content, the six input placeholders (spec section 5, widgets 2 to 7), the five generation prompts (widgets 8 to 12) and the chatbot persona (widget 13) are **frozen**. The implementer must not retype, reflow, "fix" or paraphrase them.

Mechanism:
1. `scripts/extract-spec-text.mjs` reads `../shipsafe-spec.md`, finds each `### Widget N: "Title"` heading in section 5, takes the first fenced code block after the `**Konten:**`, `**Placeholder:**`, `**Prompt:**` or `**Persona / initial prompt:**` label, and writes it byte-for-byte (LF endings, one trailing newline) to `src/config/text/<NN>-<slug>.txt`.
2. `src/config/widgets.config.ts` imports those files with Vite `?raw` and builds the 13-entry array. Titles are string literals in this one file only, and are also verified against the spec.
3. A conformance test (`src/config/spec-conformance.test.ts`) re-parses `../shipsafe-spec.md` at test time and asserts: 13 widgets, order, titles, regions, types, every placeholder, every prompt, the Disclaimer content, and the persona, all strictly equal. The test fails (it never skips) if the spec file cannot be read; the path defaults to `../shipsafe-spec.md` and can be overridden with `SHIPSAFE_SPEC_PATH`.
4. `.gitattributes` forces `src/config/text/*.txt text eol=lf` so Windows checkouts cannot change line endings.

### 3.3 Dependency graph and `@` matrix (spec section 4)

Dependencies are **derived by scanning each prompt's `@Title` mentions**, not hand-declared. A test asserts the derived graph equals this matrix:

| Widget | Reads (in prompt order) |
|---|---|
| Secrets Audit | Project Profile, Tech Stack, Deployment Context, Code Artifacts |
| Dependency Audit | Tech Stack, Deployment Context, Dependency Manifest |
| HTTP Hardening Audit | Tech Stack, Deployment Context, HTTP and Server Config, Code Artifacts |
| Go/No-Go Verdict | Project Profile, Deployment Context, Secrets Audit, Dependency Audit, HTTP Hardening Audit |
| Fix-It Checklist | Go/No-Go Verdict, Secrets Audit, Dependency Audit, HTTP Hardening Audit, Tech Stack |
| Release Security Officer | Project Profile, Tech Stack, Deployment Context, Go/No-Go Verdict, Fix-It Checklist |

Execution waves: W1 = Secrets Audit, Dependency Audit, HTTP Hardening Audit (parallel); W2 = Go/No-Go Verdict; W3 = Fix-It Checklist; Chat is interactive, not a wave.

### 3.4 Flows to support

1. Land: banner visible, six empty inputs, five empty audit widgets, chat locked.
2. Fill inputs (or load a labeled sample). Live secret hint while typing.
3. Run Full Audit: secret-scan gate, empty-input gate, W1 parallel, W2, W3, with stop/retry.
4. Run a single audit widget: auto-run missing upstream.
5. Edit an input after results exist: downstream results become Outdated (transitively).
6. Read verdict (stamp), blockers, fix checklist (tick items, copy).
7. RSO chat: auto opener, one question per turn, evidence requests, refusal while blockers open, final sign-off record.
8. Reset conversation.
9. Copy any output. Toggle theme.

### 3.5 Entities

`Widget` (config), `WidgetState` (value, status, error, timestamps, `basedOn` hash snapshot), `Store` keyed by title, `ChatMessage`, `ApiError`, `SecretHit`, `ParsedVerdict`, `FindingTally`, `ParsedSignOff`. Types are in 8.1.

### 3.6 Constraints stated by the spec that bind the frontend

- SPA with 3-zone grid plus top banner. Backend (generate and chat endpoints) holds the LLM key; none of that exists yet, so the frontend runs on a typed mock behind one client module.
- Store keyed by widget title. Zustand or Context suggested; we choose Zustand.
- `react-markdown` + `remark-gfm` suggested; sanitized markdown, no raw HTML.
- Client-side secret pattern detection with warn/confirm (`sk_live_`, `AKIA`, `-----BEGIN PRIVATE KEY-----`, `ghp_`, more in 8.6).
- Per-field and total input size limits.
- No server-side persistence of user input; none in the browser either (15.21).
- ShipSafe itself must pass its own security-header audit (self-hosted assets, strict CSP-compatible).
- Textareas 6 to 8 lines minimum, resizable, monospace for Code Artifacts, Dependency Manifest, HTTP and Server Config.
- Verdict colors GO green, CONDITIONAL GO amber, NO-GO red. Severity: Critical red, High orange, Medium yellow, Low blue, Info gray.
- Results tables render as markdown tables, horizontal scroll when wide.
- Spec task 16: light and dark themes, responsive, mobile stacks as inputs, audits, chatbot.

---

## 4. Stack (locked on approval)

**Vite + React + TypeScript + Tailwind CSS v4**, client-side SPA, state in Zustand, markdown via react-markdown + remark-gfm, tests with Vitest + Testing Library + vitest-axe, optional Playwright + axe for browser e2e. Location: `c:\Users\HYPE AMD\files\PROJECT\PERSONAL\KIRO TEST\frontend`. Host shell: Windows + PowerShell (chain commands with `;`, never `&&`).

Why not Next.js: the spec says "SPA (mis. React/Next.js)". There is no server to host API routes yet, and a client-only app is simpler to harden (static hosting, strict CSP). When the real backend arrives it is a separate service reached through the single API client, so switching later costs nothing. Why Tailwind v4: tokens live in CSS `@theme`, which makes the "no default palette" rule enforceable. Why Zustand over Context: derived stale state and the runner subscribe to fine-grained slices without re-rendering 13 widgets on every keystroke.

Node on this machine is v24.19.0 (npm 11.6.2); all pins below were checked against that engine range and against each other's peer ranges. TypeScript is held at 5.9.3 because `typescript-eslint@8.71.2` supports `>=4.8.4 <6.1.0`. Vite is held at the 7.x line because `@vitejs/plugin-react@6` needs extra peer packages that add risk without benefit here.

### 4.1 Exact versions (no `^` or `~` anywhere; use `npm install --save-exact`)

dependencies:

| Package | Version |
|---|---|
| react | 19.3.0 |
| react-dom | 19.3.0 |
| zustand | 5.0.15 |
| react-markdown | 10.1.0 |
| remark-gfm | 4.0.1 |
| @fontsource-variable/archivo | 5.3.0 |
| @fontsource/ibm-plex-mono | 5.3.0 |

devDependencies:

| Package | Version |
|---|---|
| vite | 7.3.7 |
| @vitejs/plugin-react | 5.2.0 |
| typescript | 5.9.3 |
| tailwindcss | 4.3.3 |
| @tailwindcss/vite | 4.3.3 |
| @types/react | 19.3.0 |
| @types/react-dom | 19.3.0 |
| @types/node | 24.19.2 |
| vitest | 4.1.11 |
| jsdom | 27.4.0 |
| @testing-library/dom | 10.4.2 |
| @testing-library/react | 16.3.3 |
| @testing-library/user-event | 14.6.8 |
| @testing-library/jest-dom | 6.10.0 |
| axe-core | 4.14.0 |
| vitest-axe | 0.1.0 |
| eslint | 9.39.5 |
| @eslint/js | 9.39.5 |
| typescript-eslint | 8.71.2 |
| eslint-plugin-react-hooks | 7.1.1 |
| globals | 16.5.0 |
| @playwright/test | 1.64.0 |
| @axe-core/playwright | 4.13.0 |

Lockfile `package-lock.json` is committed. No install scripts are needed beyond Playwright's explicit browser install.

### 4.2 Commands (PowerShell)

```powershell
cd "c:\Users\HYPE AMD\files\PROJECT\PERSONAL\KIRO TEST\frontend"
node scripts/extract-spec-text.mjs ../shipsafe-spec.md
npm install
npm run typecheck; npm run lint; npm run test; npm run build
npm run dev          # http://localhost:5173
npm run preview      # strict headers, used to self-audit with curl -I
npx playwright install chromium   # one time, for e2e
```

`package.json` scripts are single commands only (no chaining inside scripts): `dev`, `build` (`vite build`), `preview`, `typecheck` (`tsc -b`), `lint` (`eslint .`), `test` (`vitest run`), `test:watch`, `e2e` (`playwright test`).

### 4.3 Environment variables

| Name | Values | Default | Purpose |
|---|---|---|---|
| `VITE_API_MODE` | `mock` or `http` | `mock` | Selects the client implementation. |
| `VITE_API_BASE_URL` | URL | `/api` | Base for `http` mode. |
| `VITE_MOCK_LATENCY` | `normal` or `none` | `normal` | `none` makes tests instant. |

No variable may contain a key or secret. A test fails if any `VITE_*` name matches `/KEY|SECRET|TOKEN|PASSWORD/i`.

### 4.4 Folder structure

```
frontend/
  DESIGN.md
  index.html                 # no inline script or style
  public/theme-init.js       # classic external script, sets data-theme pre-paint
  public/favicon.svg
  scripts/extract-spec-text.mjs
  src/
    main.tsx  App.tsx
    config/   widgets.config.ts  limits.ts  text/*.txt  spec-conformance.test.ts
    domain/   types.ts  mentions.ts  graph.ts  stale.ts  planner.ts  runner.ts
              secrets.ts  verdict.ts  findings.ts  signoff.ts  hash.ts  (each with .test.ts)
    state/    store.ts  selectors.ts  announcer.ts
    api/      client.ts          # THE only module components may import for I/O
      mock/   engine.ts  scenarios/ledgerline.ts  waybill.ts  harborlog.ts  chat-script.ts
    components/
      shell/  AppShell.tsx  TopRail.tsx  Toolbar.tsx  SkipLinks.tsx  PipelineRail.tsx  SampleMenu.tsx  ThemeToggle.tsx
      widgets/ StaticTextWidget.tsx  InputWidget.tsx  GenerationWidget.tsx  ChatWidget.tsx
      verdict/ VerdictBadge.tsx  VerdictStamp.tsx  SignOffRecord.tsx
      markdown/ MarkdownView.tsx  renderers.tsx  SeverityTag.tsx  StatusTag.tsx  FindingTally.tsx  CodeBlock.tsx  ScrollableTable.tsx
      feedback/ ErrorPanel.tsx  EmptyState.tsx  StaleNotice.tsx  RunStatusLine.tsx  LiveAnnouncer.tsx
      dialogs/ SecretScanDialog.tsx  ConfirmDialog.tsx
      ui/     Button.tsx  IconButton.tsx  Chip.tsx  CopyButton.tsx  icons.tsx  VisuallyHidden.tsx
    styles/  index.css  tokens.css  markdown.css  print.css
    test/    setup.ts  fixtures/
```

Lint rules (error): no `dangerouslySetInnerHTML`; no import of `rehype-raw`; no import from `src/api/mock/**` outside `src/api/client.ts` and tests; no Tailwind classes matching `(indigo|purple|violet|fuchsia|pink)-` or default `blue-`/`gray-`/`slate-` palettes (tokens only); no `target="_blank"` without `rel="noopener noreferrer"`.

---

## 5. Design tokens

All tokens are CSS custom properties in `tokens.css`, exposed to Tailwind through `@theme`. Light is the default and follows `prefers-color-scheme`; `html[data-theme="dark"]` and `html[data-theme="light"]` override. `color-scheme` is set accordingly so native controls match.

### 5.1 Color

Contrast ratios were computed with the WCAG relative-luminance formula for every pair below (all pass their threshold; where a fill alone is below 3:1 against its surface, the component carries an ink border, see note). Text threshold 4.5:1, non-text 3:1.

Neutrals

| Token | Light | Dark | Use | Key ratio (light / dark) |
|---|---|---|---|---|
| `--canvas` | #EEF0EE | #0F1214 | page background | ink on canvas 15.59 / 15.77 |
| `--surface` | #F7F8F6 | #161A1D | panels, widget bodies | ink on surface 16.76 / 14.69 |
| `--raised` | #FFFFFF | #1C2125 | inputs, dialogs | ink on raised 17.85 / 13.62 |
| `--ink` | #14181B | #E8ECEA | primary text, primary button fill, heavy rules, focus ring | |
| `--ink-2` | #3E474D | #B7C0BC | secondary text, button hover fill | 8.91 / 9.40 on surface |
| `--ink-3` | #566067 | #97A19C | muted text, counters, timestamps | 6.04 / 6.58 on surface; 5.62 / 7.07 on canvas |
| `--placeholder` | #5C666D | #8E9893 | textarea placeholder | 5.87 / 5.46 on raised |
| `--rule` | #C8CDC9 | #2C3338 | decorative hairlines between sections | decorative only |
| `--rule-strong` | #6F7A74 | #7E8984 | control borders (inputs, buttons, chips) | 4.18 to 4.46 / 4.48 to 4.83 (needs 3) |

Verdict (stamp fill and text)

| Verdict | Light bg / fg | Dark bg / fg | Text ratio (L / D) | Fill vs surface (L / D) |
|---|---|---|---|---|
| GO | #17703B / #FFFFFF | #3DB36B / #06130B | 6.15 / 7.11 | 5.77 / 6.55 |
| CONDITIONAL GO | #F0AD1B / #14181B | #F2B63A / #14181B | 9.10 / 9.80 | 1.84 (border required) / 9.61 |
| NO-GO | #B3261E / #FFFFFF | #F0675F / #14070A | 6.54 / 6.40 | 6.14 / 5.68 |
| Unrecognized | `--ink-3` outline, no fill | same | n/a | n/a |

Severity chips

| Severity | Light bg / fg | Dark bg / fg | Text ratio (L / D) |
|---|---|---|---|
| Critical (red) | #B3261E / #FFFFFF | #F0675F / #14070A | 6.54 / 6.40 |
| High (orange) | #B34700 / #FFFFFF | #F28A3C / #1A0C02 | 5.50 / 7.72 |
| Medium (yellow) | #F2D93D / #14181B | #F2D93D / #14181B | 12.56 / 12.56 |
| Low (blue) | #1D5FBF / #FFFFFF | #6FA3F2 / #06101F | 6.10 / 7.44 |
| Info (gray) | #5A6369 / #FFFFFF | #A5AFAA / #0F1214 | 6.13 / 8.34 |

Pass/Partial/Fail status chips (outlined, transparent fill, colored text and border)

| Status | Light text | Dark text | Ratio on surface (L / D) | Glyph |
|---|---|---|---|---|
| Pass | #17703B | #3DB36B | 5.77 / 6.55 | check |
| Partial | #7A5200 | #F2B63A | 6.50 / 9.61 | half square |
| Fail | #B3261E | #F0675F | 6.14 / 5.68 | cross |
| Not Provided / Unknown | `--ink-3` | `--ink-3` | 6.04 / 6.58 | dash |

Other

| Token | Light | Dark | Use |
|---|---|---|---|
| `--warn-bg` / `--warn-ink` | #FBE9B7 / #14181B (14.83) | #2A2412 / #F4E9C8 (12.75) | Disclaimer band only (spec: amber warning style). Bottom border 2px `--warn-edge` = ink (light) / #F2B63A (dark). |
| `--stale` | `--status-partial` text on surface | same | "Outdated" tag. |
| `--focus` | = `--ink` | = `--ink` | Focus ring (3px solid, 2px offset, passes 3:1 on all surfaces: 16.76 / 14.69). |

Rule for light fills: **Medium chips and the CONDITIONAL GO stamp carry a 1.5px `--ink` border** so the component boundary meets 3:1 (WCAG 1.4.11) even though the fill alone does not. For consistency every status chip and the stamp use the same ink border (the stamp uses a 3px double border).

Forbidden: any gradient, `box-shadow` used for color/glow, hue outside this table, tinted-black (#0B0B0B/#111) as a "cool" black, purple/indigo/violet anywhere, opacity tricks that reduce text below the ratios above.

### 5.2 Typography

| Role | Family | Settings | Notes |
|---|---|---|---|
| Display and widget titles | **Archivo Variable** (`@fontsource-variable/archivo/wdth.css`, axes wght 100 to 900, wdth 62 to 125) | titles `wdth 112, wght 700`; wordmark and stamp `wdth 125, wght 800` | The wide, sturdy grotesque reads like transport and inspection signage. The width axis gives hierarchy from one family. |
| UI and body | Archivo Variable | `wdth 100, wght 400/500/600` | One family for text, so no pairing seams. |
| Code, config, file paths, IDs | **IBM Plex Mono** (`@fontsource/ibm-plex-mono` weights 400, 500, 600) | 13px, lh 1.6 | Used only for actual code/config/paths/IDs: the three mono textareas, code blocks, inline `code`, and Location cells. Not used for decorative labels. |

Why not Inter: it is the model default and carries no decision (sources 1, 3, 4). Why not Space Grotesk, Instrument Serif or Geist: named repeat offenders (source 1). Both families are self-hosted by Fontsource (no third-party font CDN), which keeps a strict CSP possible. `font-display: swap`. Fallback stack: `"Archivo Variable", system-ui, "Segoe UI", sans-serif` and `"IBM Plex Mono", ui-monospace, "Cascadia Mono", Consolas, monospace`.

Scale (rem; root 16px, never lock `html` font size, all sizes in rem so user zoom and text-size prefs work):

| Token | Size | Line height | Where |
|---|---|---|---|
| `--text-caption` | 0.75rem (12px) | 1.4 | counters, timestamps (always `--ink-3`) |
| `--text-small` | 0.8125rem (13px) | 1.45 | chips, helper and error text, disclaimer, code |
| `--text-body` | 0.9375rem (15px) | 1.55 | body, textareas, chat, markdown |
| `--text-title` | 1.0625rem (17px) | 1.25 | widget titles (`wdth 112, wght 700`) |
| `--text-md-h3` | 1.25rem (20px) | 1.25 | markdown "#" demoted to h3 (`wdth 112, wght 700`) |
| `--text-wordmark` | 1.25rem (20px) | 1 | "ShipSafe" (`wdth 125, wght 800`) |
| `--text-stamp` | 2.75rem (44px), 2rem below 640px | 1 | verdict stamp (`wdth 125, wght 800`) |

Rules: sentence/title case only; no tracking added except `+0.01em` on the stamp; body line length capped at `72ch` for prose and chat (tables and code are exempt); body weight 400, emphasis 600 (never 300 on small text); numbers in tables use `font-variant-numeric: tabular-nums`; no italics for decoration; no single-word accent color inside headings.

### 5.3 Spacing (4px base)

Tokens: `--space-1` 4, `-2` 8, `-3` 12, `-4` 16, `-5` 20, `-6` 24, `-8` 32, `-10` 40, `-14` 56, `-20` 80 (px). Tailwind `--spacing: 4px` so `p-4` = 16px.

### 5.4 Rhythm (deliberately not uniform)

| Relation | Value |
|---|---|
| Inside a field (label to control to helper) | 8 / 4 |
| Between input widgets (left column) | 32 (a ledger, tight and regular) |
| Widget padding (body) | 16 desktop, 12 below 640px |
| Between audit widgets (center) | 56 with a 2px ink rule at the top of each |
| Center column to chat zone | 80 plus a 2px dashed ink "tear line" |
| Page gutters | 16 (<768), 24 (768 to 1279), 40 (>=1280) |

The breaks (verdict widget structure, tear line, disclaimer band) are the RHYTHM-2 variation.

### 5.5 Radius, borders, elevation

| Token | Value | Applied to | Reason |
|---|---|---|---|
| `--radius-0` | 0 | panels, stamp, tables, banner, rules | Forms and documents are rectilinear. |
| `--radius-1` | 2px | chips and tags | Label-like, not pill-like. |
| `--radius-2` | 4px | buttons, inputs, textareas, dialogs | Small radius keeps affordance for controls. |

Borders: 1px `--rule-strong` for controls; 1px `--rule` hairline rules; 2px `--ink` widget top rules and zone separators; 3px double `--ink` stamp. **No box-shadow** except the open dialog (`0 8px 24px rgb(0 0 0 / 0.18)`, reason: it is the only element that must lift above the page; backdrop `rgb(15 18 20 / 0.55)`). The sticky rail is separated by a 1px `--ink` bottom border, not a shadow.

### 5.6 Layout metrics

Container `max-width: 105rem (1680px)`, centered, with the gutters above. Desktop grid (>=1024px): `grid-template-columns: minmax(22rem, 27rem) minmax(0, 1fr)`, column gap 32 (1024 to 1279) or 40 (>=1280), 1px `--rule` vertical divider. Below 1024px: single column in DOM order, content column `max-width: 48rem`, left-aligned (no centered hero). Breakpoints are Tailwind defaults: `sm 640`, `md 768`, `lg 1024`, `xl 1280`, `2xl 1536`. Use `min-h-[100dvh]`, never `h-screen`. z-index scale: rail 30, dialog uses the top layer (native `<dialog>`).

---

## 6. Layout

### 6.1 Desktop (>=1024px)

```
+-----------------------------------------------------------------------------+
| [1] Disclaimer  (warn band, full width, sticky)                             |
+-----------------------------------------------------------------------------+
| ShipSafe  Pre-deployment security gate | audits > verdict > fix-it | Samples|
|                                        |  4 of 6 inputs filled     | Theme  |
|                                        |                  [Run Full Audit]  |
+--------------------+--------------------------------------------------------+
| LEFT (inputs)      | CENTER (audit and output)                              |
| [2] Project Profile| ======== [8] Secrets Audit ========================== |
| [3] Tech Stack     |   header: status, reads-from chips, tally, Copy, Run   |
| [4] Deployment     |   markdown body                                        |
|     Context        | ======== [9] Dependency Audit ======================== |
| [5] Code Artifacts | ======== [10] HTTP Hardening Audit =================== |
| [6] Dependency     | ======== [11] Go/No-Go Verdict  [ NO-GO stamp ] ====== |
|     Manifest       | ======== [12] Fix-It Checklist ======================= |
| [7] HTTP and Server|                                                        |
|     Config         |                                                        |
+--------------------+--------------------------------------------------------+
- - - - - - - - - - - - - - - - (dashed tear line) - - - - - - - - - - - - - - -
| [13] Release Security Officer (full width)                                  |
|  verdict strip + Reset | transcript (role=log)                              |
|                        | composer + Send                                    |
+-----------------------------------------------------------------------------+
```

The numbers in brackets are for this brief only. The UI shows **no numeric widget indices** (numbering would be decoration; see source 5).

### 6.2 Tablet and mobile (<1024px)

Single column in the exact spec order: banner, toolbar, inputs (2 to 7), audits (8 to 12), chatbot (13). This matches the spec's mobile instruction and keeps DOM order equal to visual order. The toolbar shows wordmark, one status line, Samples, Theme and Run Full Audit; the pipeline rail collapses to the status line. At 320 CSS px nothing overflows horizontally (WCAG reflow); wide tables and code scroll inside their own keyboard-focusable regions.

### 6.3 Top rail (banner plus toolbar)

- DOM: `<header>` containing a visually hidden `<h1>ShipSafe</h1>` first (so heading order is valid), then the Disclaimer section, then the toolbar.
- Sticky: the whole header is `position: sticky; top: 0` at **>=768px**. Below 768px the Disclaimer scrolls with the page (static, first thing on the page, non-dismissible) and only the toolbar is sticky (48px). Reason in 15.4.
- Heights: banner is ~2 lines at 1440px (13px text, 14.83:1 on `--warn-bg`); toolbar 48px. `AppShell` measures the header with `ResizeObserver` and sets `--rail-h` via `style.setProperty` (CSSOM, CSP-safe). `html { scroll-padding-top: calc(var(--rail-h) + 16px) }` and every focusable element uses `scroll-margin-top` the same way, so focused controls are never hidden behind the rail (WCAG 2.4.11).
- The banner has no close button, no collapse, no "dismiss for session".

### 6.4 Region semantics

`header` (banner landmark) / `main` containing three `section`s with `aria-label`: "Project inputs", "Audit results" and the chat widget (`aria-labelledby` its title). Skip links (visible on focus, first in DOM): "Skip to project inputs", "Skip to audit results", "Skip to Release Security Officer". No footer (no content earns one).

---

## 7. Components

Every component below is typed, has no inline styles, and exposes states through attributes (`data-status`) so tests and CSS share one source.

| Component | Responsibility | Key props | States and notes |
|---|---|---|---|
| `AppShell` | 3-zone grid, header rail, measuring `--rail-h`, theme attribute, mounts `LiveAnnouncer`. Renders widgets by iterating the config in order and dispatching on `type`. | none | Never hardcodes a title. DOM order = spec order. |
| `TopRail` / `Toolbar` | Sticky header: wordmark (text only, see 15.31), product descriptor "Pre-deployment security gate" (>=768px), status line, `PipelineRail` (>=1024px), `SampleMenu`, `ThemeToggle`, `Run Full Audit`, persistent "Mock responses" tag when `VITE_API_MODE=mock`. | | Status line shows exactly one of: `Running audits (2 of 3)`, `N results outdated`, `N of 6 inputs filled`. Tag text: "Mock responses, no model attached". |
| `StaticTextWidget` | Renders Disclaimer. Title "Disclaimer" is an inline run-in `h2` (bold, 13px) followed by the frozen text. | `widget` | `role` none, it is a `section`. Leading glyph handling per 15.5. No actions. |
| `InputWidget` | `h2` containing `label` for the textarea; "Feeds" line (derived); textarea; footer with `n / max` counter and inline secret hint. | `widget` | `rows` 6 (prose) or 8 (code). `resize: vertical`, `max-height: 70dvh`. Code fields: `font-mono`, `wrap="off"`, `spellCheck=false`, `autoCapitalize=off`, `autoCorrect=off`. Placeholder is the frozen text. Counter turns `--status-partial` at 90%, error styled at limit. |
| `GenerationWidget` | Report section for widgets 8 to 12. Header (title, status chip, Outdated tag), "Reads from" chips, optional `FindingTally`, actions (Copy, Run/Run again/Retry/Stop), body by status. | `widget` | Status machine in 12. Body is `MarkdownView` or a state panel. Verdict widget swaps in `VerdictStamp` above the body. Fix-It widget enables interactive checkboxes. |
| `ChatWidget` | Release Security Officer. Info strip (parsed verdict, open blockers, readiness/stale, Reset conversation), transcript, composer. | `widget` | Readiness gate, auto opener, pending, failed-send, stale, sign-off record. See 8.5. |
| `VerdictBadge` | Parses the raw verdict output and returns `{verdict: 'GO' \| 'CONDITIONAL GO' \| 'NO-GO' \| 'UNRECOGNIZED'}`; renders a compact chip (used in chat strip and toolbar-free places). | `markdown` | Never defaults to GO. |
| `VerdictStamp` | Large stamp in the Verdict widget. Square, 3px double ink border, `--text-stamp` Archivo wdth 125 wght 800, glyph (check / half square / cross), parsed `Confidence` and blocker count beside it. | `verdict`, `confidence?`, `blockers?` | `role="group" aria-label="Verdict: No-Go"` style label built from value. Landing animation per section 11. Unrecognized: gray outline stamp reading "Verdict not recognized". |
| `MarkdownView` | Safe markdown renderer with the custom renderers below. Wrapped in an error boundary that falls back to `<pre>` raw text plus a notice. | `markdown`, `variant: 'report' \| 'chat'`, `taskList: 'readonly' \| 'interactive'` | Heading demotion (`#`>h3, `##`>h4, `###`>h5, rest h6). No raw HTML. Images are not rendered (alt text only). Links: `http(s)` only, `rel="noopener noreferrer nofollow"`, new tab, visible "(opens in new tab)" for screen readers. Strips Extended_Pictographic from headings and table cells for display (raw value untouched). |
| `ScrollableTable` | Wraps every markdown `table` in `div[role=region][tabindex=0][aria-label="<nearest heading> table, scrollable"]`; sticky first column not used (keeps it simple). | | `th scope=col`. Cells with a plain severity or status word become tags. |
| `SeverityTag` | Chip for Critical / High / Medium / Low / Info using 5.1, with a 4-segment bar glyph encoding level (Critical 4 filled, High 3, Medium 2, Low 1, Info 0 outlined). | `level` | Text label always present. |
| `StatusTag` | Pass / Partial / Fail / Not Provided / Unknown outlined chip with glyph. | `status` | Text always present. |
| `FindingTally` | Derived counts from the first table that has a "Severity" header: "2 Critical, 1 High, 2 Medium". | `markdown` | Renders nothing if the table cannot be parsed. Never estimates. |
| `CodeBlock` | Fenced code with Plex Mono, horizontal scroll (focusable), per-block Copy. | | Copy button label includes language. |
| `ReadsFromChips` | List of source widget titles for a generation widget, each a button that moves focus to that widget's heading. Shows each source's state (filled / empty, or ready / outdated / not run). | `title` | Derived from the graph. |
| `RunStatusLine` | Running text with elapsed seconds ("Running, 7 s"); announces start and finish through `LiveAnnouncer`, not per second. | | Reduced-motion safe (text only). |
| `StaleNotice` | "Outdated: Tech Stack changed after this ran." with `Refresh chain` action. | `changed[]` | |
| `ErrorPanel` | Title, plain-language cause, next action, Retry. | `error`, `onRetry` | `role="alert"` on first render only. |
| `EmptyState` | One sentence cause plus one next action. | | |
| `SecretScanDialog` | Native `<dialog>`: lists masked hits (input title, line, masked token, pattern name). Actions: "Go back and redact" (default focus), "Send anyway". | `hits`, `onResolve` | Escape = go back. Never shows more than 4 leading characters of a value. |
| `ConfirmDialog` | Generic confirm for empty-input run and Reset conversation. | | Default focus on the safe action. |
| `SignOffRecord` | Renders the RSO final sign-off as a printable record: fields in a ruled definition list, decision chip (APPROVED green, APPROVED WITH CONDITIONS amber, REJECTED red), Copy and Print buttons. | `markdown` | Falls back to normal markdown if unparsed. |
| `PipelineRail` | Three text segments "Audits", "Verdict", "Fix-It" with a state word each (waiting, running, done, outdated, failed). | | A real sequence, so ordered semantics are justified (`<ol>`). |
| `SampleMenu` | Disclosure button "Load sample" listing the three labeled mock scenarios. | | Loading a sample replaces all six inputs (confirm if any input is non-empty). |
| `ThemeToggle` | `button[aria-pressed]` labeled "Dark theme". | | Persists `shipsafe.theme` in localStorage; falls back silently if storage is blocked. |
| `Button` / `IconButton` / `Chip` / `CopyButton` | Primitives. | | Variants: `primary` (solid ink, used once: Run Full Audit), `secondary` (outlined), `quiet` (text). Icon-only buttons need `aria-label` (type-enforced). |
| `LiveAnnouncer` | One visually hidden `aria-live="polite"` region fed by `announce(msg)`. | | Used for run start/finish, copy success, sample loaded, errors summary. |
| `icons.tsx` | About 12 hand-drawn 16px line glyphs (play, stop, copy, check, cross, half, dash, alert-triangle outline, refresh, sun, moon, close). `aria-hidden`, `currentColor`, 1.5px stroke. | | No icon library. No sparkle, magic, robot, shield-with-check cliches. |

---

## 8. Frontend logic (applies to mock and real backend)

### 8.1 Types

```ts
type WidgetType = 'static' | 'input' | 'generation' | 'chatbot'
type Region = 'top' | 'left' | 'center' | 'bottom'
interface WidgetDef {
  id: string; order: number; title: string; type: WidgetType; region: Region
  placeholder?: string; content?: string; prompt?: string   // from src/config/text
  mono?: boolean; rows?: number; maxChars?: number
}
type RunStatus = 'idle' | 'queued' | 'running' | 'done' | 'error' | 'blocked'
interface ApiErrorView { kind: ApiErrorKind; message: string; retryAfterMs?: number }
interface WidgetState {
  value: string                         // input text or generated markdown
  status: RunStatus                     // inputs are always 'idle'
  error?: ApiErrorView
  startedAt?: number; finishedAt?: number
  basedOn?: Record<string, string>      // dependency title -> content hash at run time
}
type Store = Record<string /* title */, WidgetState>
```

Hash: `cyrb53` 53-bit string hash of the trimmed value (speed, not security). Whitespace-only differences at the ends do not count as changes.

### 8.2 Mention resolver (`domain/mentions.ts`)

- `resolvePrompt(template, valuesByTitle) -> string` does a **single pass** over the template with one compiled regex: `@(` + escaped titles sorted longest first, joined with `|` + `)(?![A-Za-z0-9_])`. The replacement callback returns the value; substituted text is never re-scanned. (The spec's sample loop re-scans substituted text, so a user pasting "@Tech Stack" into Code Artifacts would be rewritten. See 15.12.)
- Matching is case-sensitive and exact, including the `/` in `Go/No-Go Verdict` (titles are `RegExp`-escaped).
- Empty or whitespace-only value, and any generation widget that has not produced output, resolve to the literal `[NOT PROVIDED]` (spec 8.3 note).
- `extractMentions(template) -> string[]` returns titles in order of first appearance; used to derive the graph.
- `validateTemplate(template, titles)`: any `@` followed by a letter that is not the start of a known title throws `UnknownMentionError` (names the offending text and widget). Templates are frozen, so this runs in tests and once at startup in dev; in production a thrown error renders the widget's `ErrorPanel` ("This widget's prompt references an unknown widget.") and no request is sent (spec 7.2).
- Self-reference or cycles: `buildGraph()` (domain/graph.ts) runs Kahn's algorithm at module load; a cycle throws (spec 7.3). Test covers a synthetic cyclic config.

### 8.3 Planner and runner (`domain/planner.ts`, `domain/runner.ts`)

- `planRun(targets, state, {force})` is pure: returns `Wave[]` (arrays of widget titles) in topological order. `force=true` (Run Full Audit) includes all five generation widgets. `force=false` (single Run) includes the target plus any upstream generation widget whose status is `idle` or `error` (missing), but not upstream that is `done` (even if stale; see 15.8).
- `runner` executes waves with `Promise.allSettled`, concurrency cap 3 (the size of W1). Each request has its own `AbortController` stored in a `Map<title, AbortController>`; **single-flight per widget**: starting a run for a widget that is already `running` is a no-op.
- When a widget fails, its transitive dependents in the plan become `blocked` with cause "Waiting on <title>, which failed". Independent siblings in the same wave still finish.
- `stop(title)` aborts one request; `stopAll()` aborts every in-flight request and sets queued widgets back to their previous status. An aborted widget keeps its previous `value` and returns to `done` (if it had output) or `idle`; no error is shown.
- On success: `value`, `status='done'`, `finishedAt`, and `basedOn` (hash of each dependency's current value at the moment the request started) are written together in one store update.
- Every status change calls `announce()` once (not per tick).
- Entry points (`requestRun(targets, opts)`) pass through the **guards** in order: (1) all-inputs-empty guard, (2) secret guard (8.6), (3) empty-input confirm (Run Full Audit only). Guards are in the runner entry, not in buttons, because there are three callers (toolbar, widget buttons, chat opener).

### 8.4 Stale detection (`domain/stale.ts`)

A pure selector, memoized per store snapshot:

```
isStale(w) = w.status === 'done' && (
  any dep d: hash(current(d).value) !== w.basedOn[d]
  || any dep d that is a generation widget && isStale(d)
)
changedDeps(w) = the deps that satisfy either condition (shown in StaleNotice)
```

Reverting an edit back to the original text clears staleness (hash equality). Staleness propagates down the chain, so editing Tech Stack outdates all five audits and the chat. Stale results stay readable (tag and notice, never hidden). `Refresh chain` = `requestRun([w], {cascade: 'stale-and-missing'})`, which includes stale and missing ancestors.

### 8.5 Chat session (`state/store.ts`, `ChatWidget`)

- `chat: { messages: ChatMessage[], status: 'locked'|'ready'|'opening'|'idle'|'pending'|'error', basedOn?: Record<string,string> }`; `ChatMessage = { id, role: 'user'|'assistant', text, at, hidden?: boolean, failed?: boolean }`.
- **Locked** until Go/No-Go Verdict and Fix-It Checklist are both `done` (any staleness allowed, see stale rule below). Locked state shows the `EmptyState` described in 12 with a single action `Run missing steps` (opens the same guards).
- **Auto opener:** the first time the chat becomes `ready` with an empty transcript, the client sends a hidden user message `Begin` (not rendered) and renders the assistant reply. It fires once per session until Reset. While waiting: "The officer is reading the verdict and fix plan."
- Each call sends the persona **re-resolved from current store values** as `system`, plus the history (hidden `Begin` included) capped to the last 40 messages. The persona template is the frozen widget 13 prompt.
- Stale rule: if Verdict or Fix-It (or Project Profile, Tech Stack, Deployment Context) hash differs from `chat.basedOn` captured when the conversation began, show a `StaleNotice` above the composer: "Results changed after this review started. Reset the conversation to review against the latest verdict." The conversation is not auto-reset.
- Composer: Enter sends, Shift+Enter inserts a newline, helper text states this. Message required (trim), max 2,000 characters, shown count after 1,500. Send is `aria-disabled` while pending. Stop button aborts the pending request and removes the pending placeholder.
- Failed send: the user message stays with a "Not delivered" mark and a `Retry` button; the assistant placeholder is removed.
- `Reset conversation` (ConfirmDialog, default focus Cancel) clears messages, aborts in-flight, re-arms the opener.
- Transcript is `role="log" aria-live="polite" aria-relevant="additions"`; the first assistant message of a turn is announced once (no streaming).
- Quick reply: when the transcript is exactly the opener, one button "Yes, start the review" sends that text. No other canned replies.
- An assistant message containing `RELEASE SECURITY SIGN-OFF` renders as `SignOffRecord`.

### 8.6 Secret guard (`domain/secrets.ts`)

Scans only text that is about to leave the client: input values referenced by the prompt being sent. Runs live (debounced 400 ms) for the inline hint, and authoritatively at run time.

| Pattern name | Regex (JavaScript syntax) |
|---|---|
| Stripe live secret | `sk_live_[A-Za-z0-9]{10,}` |
| Stripe restricted | `rk_live_[A-Za-z0-9]{10,}` |
| AWS access key id | `\b(AKIA\|ASIA)[0-9A-Z]{16}\b` |
| GitHub token | `\bgh[pousr]_[A-Za-z0-9]{30,}\b` |
| Slack token | `\bxox[abprs]-[A-Za-z0-9-]{10,}` |
| Google API key | `\bAIza[0-9A-Za-z_-]{35}\b` |
| Private key block | `-----BEGIN (RSA \|EC \|OPENSSH \|DSA \|PGP )?PRIVATE KEY( BLOCK)?-----` |
| JWT (three base64url parts) | `\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}` |
| URL with credentials | `\b[a-z][a-z0-9+.-]*://[^\s:/@]+:[^\s@/]{3,}@` |
| Generic assignment (case-insensitive, `i` flag) | `\b(secret\|token\|api[_-]?key\|password\|passwd)\b\s*[:=]\s*['"]?[A-Za-z0-9/+_=-]{20,}` |

False-positive control: a match is ignored when the matched text (or its line) contains `REDACTED`, `EXAMPLE`, `PLACEHOLDER`, `your_`, `<...>`, `xxxx`, `****`, or is all one repeated character. The spec's own `sk_live_REDACTED` therefore never triggers. A hit exposes `{ field, line, pattern, masked }` where `masked` = first 4 characters + `****` (spec masking rule). Raw matched text is never stored in state, logged, or rendered.

Flow: Run requested, scan inputs the plan will send; no hits, proceed. Hits, open `SecretScanDialog`. "Go back and redact" cancels and focuses the first offending textarea. "Send anyway" records an acknowledgement keyed by `hash(field + pattern + masked + line)` for this session so the same hits do not re-prompt on later runs. New or changed hits prompt again.

### 8.7 Output parsing (all fail soft)

| Parser | Input | Output | Failure behavior |
|---|---|---|---|
| `parseVerdict` | verdict markdown | `GO` / `CONDITIONAL GO` / `NO-GO` / `UNRECOGNIZED` | First line matching `^#\s*\S*\s*VERDICT:\s*\[?\s*(CONDITIONAL GO\|NO-GO\|GO)\s*\]?\s*$` (alternation order matters; also tolerates the leading emoji code point U+1F6A6). Anything else, including the unfilled template `[GO / CONDITIONAL GO / NO-GO]`, is `UNRECOGNIZED`. **Never defaults to GO.** Raw markdown still renders. |
| `parseConfidence` | `## Confidence` section | `Low` / `Medium` / `High` / none | Omitted if absent. |
| `parseBlockers` | `## Release Blockers` list | integer or `0` when the section says "None" | Unparsed returns `null`; the UI shows "Open blockers: not available", never a guess. |
| `parseTally` | first table with a column whose header matches /severity/i | counts per level | `null`, widget shows no tally. |
| `parseSignOff` | assistant message | `{ project, date, decision, verified[], unverified[], conditions[] }` | `null` renders as plain markdown. Decision regex alternation: `APPROVED WITH CONDITIONS\|APPROVED\|REJECTED`, longest first. |

### 8.8 Fix-It checklist interactivity

Task list items in the Fix-It Checklist output render as real checkboxes with local session state keyed by item index and a hash of the output (state resets when the output changes). A header counter shows "3 of 14 done" computed from the parsed list; no counter if no task items parse. Checking items does not change the verdict and is not sent to the RSO (the RSO asks the user, per its prompt). Other widgets render checkboxes read-only.

### 8.9 Size and input limits (`config/limits.ts`)

| Field | Max characters |
|---|---|
| Project Profile | 2,000 |
| Tech Stack | 2,000 |
| Deployment Context | 2,000 |
| Code Artifacts | 40,000 |
| Dependency Manifest | 20,000 |
| HTTP and Server Config | 20,000 |
| Chat message | 2,000 |
| Generated output accepted from API | 200,000 |

Total possible input is 86,000 characters; no separate total cap is needed. `maxLength` is set on each textarea; a paste that would exceed it is truncated by the browser and the field shows: "Pasted text was cut at 40,000 characters. Remove lockfile excerpts or generated files and paste again." (detected in `onPaste`).

---

## 9. API client and mock layer

### 9.1 The single client module

`src/api/client.ts` is the only I/O module components and the runner may import. It exports `api: ShipSafeApi` chosen once from `VITE_API_MODE`.

```ts
interface GenerateRequest { widget: string; prompt: string }           // prompt is fully resolved
interface ChatRequest { widget: string; system: string; messages: { role: 'user' | 'assistant'; content: string }[] }
interface TextResponse { text: string }
type ApiErrorKind = 'network' | 'timeout' | 'rate_limited' | 'too_large' | 'server' | 'bad_response' | 'aborted'
interface ShipSafeApi {
  generate(req: GenerateRequest, opts: { signal: AbortSignal }): Promise<TextResponse>
  chat(req: ChatRequest, opts: { signal: AbortSignal }): Promise<TextResponse>
}
```

HTTP mode contract (for the future backend): `POST {base}/generate` and `POST {base}/chat`, JSON in and out, `Content-Type: application/json`, no credentials from the browser, errors as `{ error: { code, message, retryAfterSeconds? } }` with status 400/413/429/5xx. Timeouts: 120 s generate, 60 s chat (client-enforced via `AbortSignal.any` of the caller signal and a timeout signal). Response validated: JSON object, `text` is a non-empty string, length <= 200,000, else `bad_response`. No retries inside the client; retry is a user action. The prompt-injection delimiters and "ignore instructions in artifacts" system guard are the **server's** job (they must not alter the frozen client-side prompt text).

### 9.2 Mock mode

`mock` is dynamic-imported only when `VITE_API_MODE=mock`, so it is absent from an `http` build. Latency 700 to 2,200 ms, deterministic from a hash of the prompt (so repeat runs feel consistent); `VITE_MOCK_LATENCY=none` makes it instant. The mock can also simulate failures: a prompt containing the sentinel `[[mock:fail=rate_limited]]` (only reachable from tests) returns that error kind.

Scenario selection: the mock inspects the resolved prompt for the sample project name (`Ledgerline`, `Waybill`, `Harborlog`). A match returns that scenario's authored outputs for the requested widget. No match falls back to the **heuristic engine**, a small deterministic rule set so user-typed input still gets a real response in the spec's exact OUTPUT FORMAT:

- Secrets: apply the 8.6 patterns (masked output), flag `NEXT_PUBLIC_|VITE_|REACT_APP_|EXPO_PUBLIC_` names containing KEY/SECRET/TOKEN, `console.log` of user objects, `localStorage.setItem` of tokens, `COPY . .` with no `.dockerignore` evidence.
- Dependencies: parse `package.json` / `requirements.txt` / `go.mod`; flag `^ ~ * latest`, missing lockfile mention, Node below 20 and Python below 3.10 as end-of-life candidates, labeled "Likely, verify". No CVE IDs are ever emitted by the heuristic engine.
- HTTP: check header presence in pasted text (CSP, HSTS, nosniff, frame-ancestors / X-Frame-Options, Referrer-Policy, Permissions-Policy), `Access-Control-Allow-Origin: *`, cookie flags, `X-Powered-By`.
- Verdict: computed from those findings by the spec's DECISION RULES; missing evidence caps at CONDITIONAL GO.
- Fix-It: one checkbox item per finding with a stack-tailored command and effort.
- Chat: the scripted state machine below.

Mock disclosure lives in UI chrome (toolbar tag and each widget footer line "Generated by the mock engine"), never inside the markdown, so the output format stays exact.

### 9.3 Authored scenarios (realistic, domain-specific; all names are fictional samples labeled as such)

All three load through `SampleMenu` and fill the six inputs. Each includes one deliberately **synthetic** pattern-valid token (commented `synthetic test value, not a credential`) so the secret guard can be demoed. Menu items read: "Ledgerline, invoicing SaaS (QA: expect NO-GO)", "Waybill, internal dispatch tool (QA: expect CONDITIONAL GO)", "Harborlog, public docs site (QA: expect GO)".

**Ledgerline** (NO-GO). Profile: invoicing SaaS for freelancers, about 500 users, card payments via Stripe. Stack: Next.js 14.0.4, Node 18, Supabase, Clerk, Vercel, Stripe, OpenAI API. Context: Vercel, public, PII and payments, Clerk auth.

| ID | Severity | Location | Issue |
|---|---|---|---|
| S-01 | Critical | `lib/supabase.ts:4`, `.env.example` | Supabase `service_role` key exposed through `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` (masked `eyJh****`). Rotate. |
| S-02 | Critical | `docker-compose.yml:18` | Value shaped like a Stripe live secret (`sk_l****`) committed. Treat as compromised. |
| S-03 | High | `.env.example:7` | Default `JWT_SECRET=changeme`. |
| S-04 | Medium | `app/api/invoices/route.ts:41` | `console.log(user)` writes email and card last4 to logs. |
| S-05 | Medium | `Dockerfile:9` | `COPY . .` with no `.dockerignore` can bake `.env` into the image. |
| S-06 | Low | `app/pay/page.tsx:22` | Customer email sent in a URL query string. |
| S-07 | Info | `.gitignore` | `.env*.local` is ignored. |

Dependencies: Node 18 end-of-life (High); Next.js 14.0.4 historical middleware authorization-bypass class (Likely, verify); `jsonwebtoken` 8.5.1 older signature-validation issues (Likely, verify); `axios` 0.21.1 SSRF/ReDoS class (Likely, verify); `lodash ^4.17.15` prototype-pollution class and unpinned range; `lodahs` flagged as a possible typosquat of `lodash`; no lockfile in evidence (Fail). HTTP: no CSP (Fail), HSTS Partial, CORS `*` with credentials (Fail), `__session` cookie without SameSite (Partial), `X-Powered-By: Next.js` (Fail), no rate limiting on `/api/auth/login` (Fail), `GET /api/invoices/[id]` lacks an ownership check, an IDOR (Critical). Verdict: NO-GO, Confidence Medium, 5 release blockers. Fix-It: 14 items across three priorities with `gitleaks detect --source . --redact`, `npm audit --omit=dev`, `osv-scanner`, a `next.config.js` headers block, rotate-keys steps, and re-test commands.

**Waybill** (CONDITIONAL GO). Internal dispatch dashboard behind company SSO, Next.js 15, Postgres, no payments, PII limited to driver names. Evidence is complete but imperfect: CSP present with `'unsafe-inline'` (Partial), no rate limiting on an internal login (High, fix plan achievable), pinned dependencies with one outdated transitive risk, secrets clean. No Critical. Verdict CONDITIONAL GO, Confidence High, 0 blockers, 2 "Should Fix Before Launch".

**Harborlog** (GO). Public documentation site, Astro static build, Cloudflare Pages, no PII, no auth. Full headers (strict CSP without unsafe-inline, HSTS preload, nosniff, frame-ancestors none), lockfile and pinned versions, only Info and Low findings. Verdict GO, Confidence High, blockers None.

**RSO chat script (mock).** Opener: "Current verdict: NO-GO. 5 release blockers are open. Do you want to start the sign-off review?" Then exactly one question per turn walking the spec's checklist (blockers resolved, secrets rotated, dependencies patched/verified, headers deployed, HTTPS enforced, auth and access control tested, rate limiting, logging/monitoring, backups and rollback, incident contact, production env-var check). "Done" answers get "How did you verify that?" and a request for evidence ("paste the header scan output, not the key"). A pasted key-shaped string triggers: "That looks like a real credential. Rotate it now, then continue." While any blocker is open or unverified the officer refuses sign-off and names exactly what is needed. Replies stay under 150 words. When every item is verified the mock emits a `RELEASE SECURITY SIGN-OFF` block in the spec's format.

---

## 10. Error handling

Fatal means the operation cannot succeed without a code or config change. Recoverable means retry or user action can fix it. "Logged" means `console` only, never containing prompt text, input values or output text (only widget title, error kind, HTTP status).

| Operation | Failure | Class | What the caller / user gets | Logged |
|---|---|---|---|---|
| `generate` | `network` (fetch rejects) | Recoverable | Widget `ErrorPanel`: "Could not reach the ShipSafe server. Check your connection, then retry." Retry button. Dependents `blocked`. | dev: `warn` kind |
| `generate` | `timeout` (120 s) | Recoverable | "The audit took longer than 2 minutes and was stopped. Retry, or shorten Code Artifacts." | dev: `warn` |
| `generate` | `rate_limited` (429) | Recoverable | "Too many requests. You can retry in {n} s." Retry disabled until the countdown ends (from `Retry-After`, default 30 s). | dev: `warn` |
| `generate` | `too_large` (413) | Recoverable | "The server rejected this input as too large. Reduce {largest field} and retry." Normally prevented client-side. | `warn` |
| `generate` | `server` (5xx) | Recoverable | "The audit service failed on its side. Retry in a moment." | `error` (kind, status) |
| `generate` | `bad_response` | Recoverable | "The service returned an unusable answer. Retry." | `error` |
| `generate` | `aborted` | n/a | Silent. Widget returns to previous state. | none |
| Prompt build | Unknown `@` mention | Fatal (bug) | Widget `ErrorPanel`: "This widget's prompt references an unknown widget. This is a ShipSafe bug." No request is sent. | `error` (widget title) |
| Graph init | Cycle | Fatal (bug) | App shows a full-page error: "ShipSafe cannot start: the widget dependency graph has a cycle." | `error` |
| Runner | One W1 widget fails | Recoverable | Siblings finish; Verdict and Fix-It show `blocked` with the failed title. After retry succeeds, the chain continues only if the run was a full audit still in progress; otherwise the user presses Run. | |
| Secret guard | Hits found | Recoverable | `SecretScanDialog`. | none |
| Empty inputs | All six blank | Recoverable | Run buttons `aria-disabled` with `aria-describedby`: "Add at least one input to run an audit." | none |
| Empty inputs | Some blank | Recoverable | Confirm (Run Full Audit): "3 inputs are empty: Code Artifacts, Dependency Manifest, HTTP and Server Config. Those areas will be reported as not provided." Single-widget Run: inline notice, proceeds. | none |
| `chat` | Any `ApiErrorKind` | Recoverable | User message marked "Not delivered" with Retry. `rate_limited` shows the countdown. | as above |
| Parsers | No match | n/a | Degrade to raw markdown (8.7). | none |
| `MarkdownView` | Render throws | Recoverable | Error boundary: raw `<pre>` plus "This output could not be formatted. Showing raw text." | `error` (widget title) |
| Clipboard | `writeText` rejects | Recoverable | Inline text next to the button: "Copy failed. Select the text and copy it manually." | none |
| Theme storage | localStorage blocked | Recoverable | Silent; theme works for this page load only. | none |
| Sample load | Invalid id | Fatal (bug) | Ignored; id is a TypeScript union so this cannot occur from UI. | `error` |

### 10.1 Input validation

| Input | Required | Type / limits | On failure |
|---|---|---|---|
| Six input widgets | No (spec Req 3.3) | string, max per 8.9, NUL characters removed on change | Counter and cut-off message; never blocks typing before the limit. |
| Chat message | Yes | string, trimmed non-empty, max 2,000 | Send does nothing; inline error "Write a message before sending." linked with `aria-describedby`, `aria-invalid`. |
| Theme | No | `'light' \| 'dark'` | Unknown stored value ignored. |
| Sample id | n/a | union of three ids | n/a |
| API response | n/a | JSON object, `text` string 1 to 200,000 chars | `bad_response`. |
| Markdown output | n/a | untrusted | Rendered through the safe pipeline only (see 10.2). |

### 10.2 Invariants and owning layer

| Invariant | Owner | Why there |
|---|---|---|
| Titles, placeholders, prompts, order, regions are exact | `config` + spec-conformance test | One place; generated from the spec; fails the build if drifted. |
| `@` resolution is exact, single-pass, case-sensitive | `domain/mentions.ts` | Pure function, unit-testable; UI cannot bypass it. |
| Graph is acyclic and equals the spec matrix | `domain/graph.ts` + test | Derived from prompts, so it cannot disagree with them. |
| Nothing leaves without secret scan and confirmation | `runner.requestRun` entry | Three callers share it; a button-level check would be bypassable. |
| Only one in-flight request per widget | `runner` | Owns the AbortController map. |
| Stale state is correct and transitive | `domain/stale.ts` (pure selector) | UI only displays it. |
| Verdict never defaults to GO | `domain/verdict.ts` | Safety default lives next to the parser. |
| Model output is never executed or injected as HTML; no images; safe links | `MarkdownView` + lint rules | Single render path. |
| No API key or secret in the client bundle | `api/client.ts` + env test | The client has no credential concept. |
| User input is never persisted | state layer (no storage writes except theme) + test | Privacy promise of the product. |

---

## 11. Motion (dial MOTION 1)

Principle: motion confirms a change the user caused or a state the system entered. No ambient motion. No scroll-linked effects. All keyframes and transitions beyond color/opacity are declared **only** inside `@media (prefers-reduced-motion: no-preference)`; the default (reduced) experience has no animation at all.

| Where | Effect | Duration / easing | Reason |
|---|---|---|---|
| Hover / press on buttons, chips, links | background and color change only | 120 ms, `cubic-bezier(0.2, 0, 0, 1)` | Affordance. |
| Widget status change (idle to running to done) | status chip color/text swap; body fades from opacity 0 to 1 | 180 ms | Shows what changed. |
| Output reveal | `grid-template-rows: 0fr to 1fr` reveal | 180 ms | Avoids a hard jump in a long page. |
| Running indicator | 2px indeterminate bar at the widget top (transform only). Under reduced motion: no bar, the text "Running, 7 s" carries the state. | 1.4 s linear loop **only while a request is in flight** | Visibility of system status; stops with the request. |
| **Verdict stamp landing (the one orchestrated moment)** | scale 1.05 to 1 and opacity 0.6 to 1, once, first reveal per run | 220 ms | Marks the decision. Disabled under reduced motion (stamp simply appears). |
| Dialog open | opacity only | 120 ms | |

Forbidden: infinite decorative loops, parallax, scroll-reveal, hover lifts, bounces, springs on layout, typewriter effects, animated gradients, blur transitions. Layout properties (`height`, `width`, `top`) are never animated except the grid-rows reveal. `scroll-behavior: smooth` only inside the no-preference query. Test: Playwright emulates `reduce` and asserts `getAnimations()` is empty on the page.

---

## 12. States and microcopy

Voice: plain, direct, sentence case, active voice. Say what happened and what to do next (sources 5, 10). No "Oops", "Sorry", "Please", "Invalid", no exclamation marks, no em dashes, no emoji. An action keeps the same name throughout ("Run" becomes "Run again", the live message says "Secrets Audit finished").

### 12.1 Generation widget state machine

`idle` > `queued` > `running` > `done` | `error`; `blocked` when an upstream failed; `done` + stale = Outdated tag.

| State | Header chip | Body |
|---|---|---|
| idle, ready | "Not run" | Compact (about 72px): "Reads {n} of {m} inputs. Run it here, or run the full audit." If inputs are missing: "Code Artifacts is empty. The audit will mark secrets as not provided." |
| idle, upstream audit missing (Verdict, Fix-It) | "Not run" | "Needs Secrets Audit, Dependency Audit and HTTP Hardening Audit first. Running this will run them." |
| queued | "Queued" | "Waiting for {titles} to finish." |
| running | "Running" | `RunStatusLine` ("Running, 7 s") plus Stop. Previous output (if any) stays visible dimmed with "Replacing the previous result." |
| done | "Ready" | Markdown output. Footer: "Generated {hh:mm}. AI-assisted, confirm with the tools listed under Verify With / Re-test." (wording varies by widget; only where the output itself names tools). |
| done, stale | "Ready" + "Outdated" | `StaleNotice` above output: "Tech Stack changed after this ran. Refresh chain." Output stays readable. |
| error | "Failed" | `ErrorPanel` from section 10, Retry. |
| blocked | "Blocked" | "Secrets Audit failed, so this cannot run. Retry Secrets Audit." |

### 12.2 Other empty / loading / error states

| Surface | Copy and action |
|---|---|
| Chat locked | "The officer starts after the verdict and fix plan exist. Run the missing steps to begin." Action: `Run missing steps`. |
| Chat opening | "The officer is reading the verdict and fix plan." |
| Chat ready, transcript empty (before opener returns) | covered by opening state |
| Chat error | "The Release Security Officer could not answer. Retry." |
| First load, inputs empty | Toolbar status: "0 of 6 inputs filled". Textarea placeholders are the frozen spec text. |
| Secret hint (inline, `role=status`) | "Possible secret on line 14 (AKIA****). Replace it with a placeholder such as AKIA_REDACTED." |
| Secret dialog | Title "Possible real secrets found". Body: "ShipSafe sends this text to a model service. Replace real credentials with placeholders first." Buttons: "Go back and redact" (default), "Send anyway". |
| Empty-input confirm | See section 10. Buttons: "Run anyway", "Go back". |
| Sample replace confirm | "Loading a sample replaces your current inputs. Load sample" / "Keep my inputs". |
| Copy success | `LiveAnnouncer`: "Copied Secrets Audit." Button label swaps to "Copied" for 2 s. |
| Leave page (production build only) | Native `beforeunload` prompt when any input is non-empty or any output exists, because nothing is saved. |

---

## 13. Page-by-page, region-by-region detail

### 13.1 Disclaimer band (widget 1)

Full width, `--warn-bg`, 2px bottom border, content max-width equals the container. Layout: run-in bold "Disclaimer" followed by the frozen text, 13px, left aligned, one block. Text selectable. Contrast 14.83:1 light and 12.75:1 dark. The frozen string is rendered intact in the DOM (see 15.5 for the leading glyph).

### 13.2 Toolbar

Left: wordmark (Archivo 125/800, 20px) preceded by a 14px solid ink square (a plain geometric placeholder, not a designed logo; see 15.31), then descriptor "Pre-deployment security gate" in `--ink-3`. Center (>=1024): `PipelineRail`. Right: Load sample, Dark theme, **Run Full Audit** (the only primary button; label becomes "Re-run full audit" once results exist; "Stop" replaces it while a run is active).

### 13.3 Left column (inputs)

Six `InputWidget`s separated by 32px with a hairline rule under each footer. Each: title (17px/700, wdth 112) as `h2 > label`; muted "Feeds Secrets Audit, HTTP Hardening Audit" line derived from the graph; textarea (raised fill, 1px `--rule-strong`, 4px radius, 12px padding); footer with counter on the right and hint/error on the left. Textareas:

| Widget | Rows | Font | Wrap |
|---|---|---|---|
| Project Profile, Tech Stack, Deployment Context | 6 | Archivo 15px | soft wrap |
| Code Artifacts, Dependency Manifest, HTTP and Server Config | 8 | Plex Mono 13px | `wrap="off"`, horizontal scroll inside |

Beneath Code Artifacts the helper line reads: "Redact real secrets before pasting." (single line, `--ink-3`, not part of the frozen placeholder).

### 13.4 Center column (audits)

Five `GenerationWidget`s as one continuous report: each starts with a 2px ink rule, 56px apart, no card background (body sits on `--surface`, the column background). Header row: title (17px/700), status chip, Outdated tag, then right-aligned actions. Under it: Reads-from chips (outlined, rectangular), then the tally (Secrets Audit and Dependency Audit and HTTP Hardening Audit only, when parsed).

- **Go/No-Go Verdict**: structurally different. `VerdictStamp` sits at the top-left of the body at 44px; to its right a ruled two-line block: "Confidence: High", "Open release blockers: 5" (both parsed, omitted if unparsed). The `# VERDICT: ...` heading line is not rendered again below the stamp (the stamp is its accessible equivalent); the rest of the markdown follows. Raw output remains intact for Copy and for `@Go/No-Go Verdict` resolution.
- **Fix-It Checklist**: checklist counter in the header; priority sections as markdown headings; interactive checkboxes (44px hit area on coarse pointers via padding on the label).

### 13.5 Chat zone (widget 13)

Preceded by an 80px gap and a 2px dashed ink tear line. Desktop: two columns, left 18rem info strip (parsed verdict chip, "Open release blockers: N" or "not available", readiness/stale state, Copy sign-off when present, Reset conversation), right the transcript and composer. Mobile: strip on top, transcript, composer sticky to the bottom of the section only (not the viewport). Transcript: min-height 20rem, max-height `min(70dvh, 40rem)`, internal scroll with `tabindex="0"` and a name. Messages are a ledger, not bubbles: speaker label ("Officer" / "You") in 600 weight, local time in caption size, body below, 16px between entries, 1px hairline between turns, left aligned, `max-width: 72ch`.

---

## 14. Accessibility (WCAG 2.2 AA target)

Full conformance requires manual testing with assistive technologies and expert review; the items below are the engineering requirements and automated/manual checks that support it, not a certification.

1. **Semantics.** Native elements first: `button`, `textarea`, `label`, `dialog`, `table`, `ol`. No div-buttons. One `h1` (visually hidden), thirteen `h2` widget titles in spec order, markdown headings demoted below h2. No other `h2` while dialogs are closed (dialogs mount only when open).
2. **Landmarks and skip links** as in 6.4.
3. **Keyboard.** Everything reachable with Tab in visual order; no positive `tabindex`; no keyboard traps; Enter/Space activate buttons; Escape closes dialogs and the Samples disclosure and returns focus to the trigger; scrollable regions (tables, code, transcript) have `tabindex=0` and an accessible name. Chat: Enter sends, Shift+Enter newline, stated in helper text. Focus is never moved automatically on run completion (announce instead).
4. **Focus visible and not obscured.** `:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px }` on every focusable element, never removed. `scroll-padding-top` / `scroll-margin-top` tied to `--rail-h` (WCAG 2.4.7, 2.4.11).
5. **Contrast.** All text pairs in 5.1 pass 4.5:1; large text and UI components 3:1. Placeholder text passes 4.5:1. Disabled controls use `aria-disabled` with `--ink-3` text and a dashed border (still readable).
6. **Not color alone (1.4.1).** Verdict, severity, pass/fail all combine label text and a distinct glyph/shape. The stamp reads its value in text.
7. **Target size (2.5.8).** Minimum 24x24 CSS px everywhere; 36px height for fine pointers; 44x44 for `pointer: coarse` (buttons, checkboxes, chips that are buttons).
8. **Reflow and spacing (1.4.10, 1.4.12).** Works at 320 CSS px and 400% zoom with no two-dimensional page scroll (tables and code scroll in their own regions). No fixed heights on text containers; text-spacing overrides do not clip.
9. **Forms.** Every input has a persistent visible label (the widget title). Errors identified in text, linked via `aria-describedby`, `aria-invalid` set, with a suggestion (3.3.1, 3.3.3). No re-entry of data (3.3.7).
10. **Status messages (4.1.3).** One polite live region for run start/finish, copy, sample load and errors; the chat transcript is its own `role=log`. Per-second timer text is `aria-hidden` to avoid chatter; start and finish are announced.
11. **Dialogs.** Native `<dialog>` with `showModal()` (focus trapped, inert background, Escape closes), labelled by its title, initial focus on the safe action, focus returns to the trigger.
12. **Tables.** `th scope="col"`; region wrapper named from the nearest heading; wide tables scroll horizontally.
13. **Links.** Distinguishable by underline (not color alone), `rel` set, opening in a new tab is announced in text.
14. **Motion.** Section 11. No flashing content.
15. **Forced colors.** `@media (forced-colors: active)` maps borders to `CanvasText`, chips and the stamp keep a visible border and their text label, focus ring uses `Highlight`. (Relevant on Windows.)
16. **Language and metadata.** `<html lang="en">`, `<title>ShipSafe | Pre-deployment security gate</title>`, `<meta name="color-scheme" content="light dark">`.
17. **Native resize handle** on textareas is a user-agent control (exempt from 2.5.7 dragging); vertical only.
18. **Automated gates.** `vitest-axe` on every component state; `@axe-core/playwright` on the full app in light, dark, and reduced-motion, 1280px and 320px. Zero serious or critical violations. Manual: keyboard-only walkthrough and one NVDA pass on the verdict, a table and the chat before release.

---

## 15. Resolved ambiguities

Each item: the spec gap or conflict, the decision, why. No spec requirement is dropped; where the spec offers "or", both paths are covered or the chosen path satisfies the requirement as written.

1. **Framework.** Spec: "SPA (mis. React/Next.js)". Decision: Vite + React + TypeScript SPA. Why: no server exists; static SPA is simpler to harden; backend is a separate service behind one client (section 4).
2. **No backend yet.** Decision: typed mock behind `api/client.ts`; swap by `VITE_API_MODE=http`. The `@` resolver, graph, runner and stale logic live in the frontend regardless (spec 8.3 to 8.4 already place them client-side). Why: the user asked for the frontend now.
3. **"Center" with only two named columns.** The layout diagram shows left and center only. Decision: two-column grid (inputs, audits) plus the bottom zone; no right column. Why: matches the diagram; adding a column would fragment the audit tables.
4. **"Disclaimer always visible on top" (Req 1.2).** Decision: non-dismissible, never collapsed; sticky at >=768px; at <768px it is the first element and scrolls away, while the toolbar stays sticky. Why: the text is ~395 characters; sticky on a 360px phone would consume about a fifth of the screen. A secondary reminder "Redact real secrets before pasting." sits under Code Artifacts, and the secret-scan dialog repeats the warning at the moment of risk.
5. **Emoji in frozen text.** The Disclaimer begins with a warning-sign emoji and the verdict format contains a traffic-light emoji (U+1F6A6). Decision: data is stored and compared byte-exact. For display, `StaticTextWidget` wraps the leading glyph in a `hidden` span (text content unchanged, so exact-match tests pass) and draws the outline alert-triangle icon instead; the verdict heading is replaced by the stamp, and `MarkdownView` strips pictographs from headings and table cells for display only. Copy and `@` resolution always use the raw value. Why: the spec requires exact text, the anti-slop rule forbids decorative emoji; the DOM text stays exact while the visual is consistent.
6. **Verdict output format.** Spec fixes `# <emoji> VERDICT: [GO / CONDITIONAL GO / NO-GO]` (model output, not UI). Decision: parse it tolerantly (8.7), render a stamp, keep raw markdown. Unparseable shows "Verdict not recognized", never green.
7. **Empty inputs (Req 3.3 offers "run anyway" or "warn").** Decision: both. All six empty: Run is disabled with a stated reason. Some empty: Run Full Audit asks to confirm and lists the empty inputs; single Run proceeds with an inline notice. Missing areas become `[NOT PROVIDED]` and the model says "Not enough information".
8. **Dependencies not run (Req 4.2 "run first or notify").** Decision: run missing (idle/error) upstream automatically and say so in the status text. Stale-but-done upstream is not re-run silently (token cost); the result is flagged Outdated with a one-click `Refresh chain`. Why: spec 8.4.2 says "if dependencies do not exist yet, run them".
9. **What "stale" means (spec 8.4.3, 8.4.4).** Decision: hash snapshot per dependency at run time plus transitive propagation; revert-to-original clears it (8.4). Chat uses the same rule with a banner, not auto-reset.
10. **Chat opener "triggered automatically".** Decision: fires once automatically when chat becomes ready (verdict and fix plan done), via a hidden `Begin` message; Reset re-arms it. Until ready, the chat shows a locked state with one action. Why: spec 8.5 requires the officer to open with verdict and blocker count; locked state avoids a meaningless call with `[NOT PROVIDED]` verdict.
11. **Chat reply length (<150 words).** Enforced by the persona prompt only; UI never truncates. The composer is limited to 2,000 characters.
12. **Resolver correctness.** The spec's sample loop (`split/join` per title) re-scans substituted content, so user text containing "@Tech Stack" would be rewritten and a model output containing "@Secrets Audit" could be replaced. Decision: single-pass regex over the template only (8.2). Boundary rule `(?![A-Za-z0-9_])` after the title prevents partial matches. Unknown mentions are caught at template validation (Req 7.2); cycles at graph build (Req 7.3). Prompts are frozen and not user-editable, so users cannot author mentions.
13. **Title vs id.** `Go/No-Go Verdict` contains `/`. Decision: ids and anchors use slugs; titles only for display and resolution.
14. **Missing value token.** Spec says "sebaiknya" `[NOT PROVIDED]`. Decision: mandatory, exactly that literal, also for outputs not yet generated.
15. **Textarea height "6 to 8 lines min".** Decision: 6 rows for the three prose inputs, 8 for the three code inputs, so every field meets the range and code gets more room.
16. **"Resizable".** Decision: `resize: vertical` only. Horizontal resize can break the grid; wide content scrolls inside the field.
17. **Monospace.** Only the three named widgets (and code/paths in outputs) use Plex Mono, as the spec lists.
18. **Size limits.** Spec says "mis. per field dan total". Decision: the table in 8.9; total is implicitly 86,000.
19. **Secret detection: "blokir/konfirmasi".** Decision: confirm dialog with safe default, session-scoped acknowledgement, placeholders like `sk_live_REDACTED` never trigger (8.6). Not a hard block, because false positives are inevitable and the user owns the decision.
20. **Prompt-injection delimiters (spec 8.7).** Belong to the server system message so the frozen client prompts stay byte-identical. The frontend renders output as untrusted (no HTML, no images, safe links).
21. **Persistence.** Inputs and outputs are never written to localStorage/sessionStorage/IndexedDB (the spec itself lists localStorage for sensitive data as a finding). Only the theme preference is stored. In production builds a native leave-page prompt protects unsaved work.
22. **Theme.** Spec asks for a light/dark theme (task 16). Decision: light default following `prefers-color-scheme`, explicit toggle, both fully contrast-checked. Not permanently dark.
23. **Markdown details.** Tables scroll horizontally in a focusable region (spec); no raw HTML; images not rendered (prevents data-exfiltration beacons from model output); `#` demoted so the page outline stays valid; severity and status words become tags only when a cell contains exactly that word.
24. **Copy and Reset.** Copy on all five generation widgets and on sign-off (spec 8.6 lists Copy for GenerationWidget); Reset conversation with confirm (spec 8.5).
25. **"Run Full Audit".** Decision: always regenerates all five, W1 in parallel, then Verdict, then Fix-It. Label changes to "Re-run full audit" after a run. A Stop control is added (not in spec) for cost control.
26. **Failure mid-pipeline.** Siblings finish, dependents become `blocked` with a named cause, retry is per widget (section 10).
27. **Streaming.** Not used. Streaming markdown tables reflow and re-announce badly; a single JSON response keeps the contract simple. Revisit with the real backend.
28. **UI language.** UI strings are English because every frozen placeholder, prompt and output format is English. The spec document is Indonesian; this brief is English. i18n is out of scope.
29. **Navigation.** One page, no routes, no navbar links. Only skip links exist, each with a real target. Satisfies "no dead navigation".
30. **Mobile order.** Single column in spec order: inputs, audits, chatbot, with the banner and toolbar first.
31. **Logo.** No logo asset was provided. Decision: text wordmark "ShipSafe" with a plain solid square as an honest geometric placeholder. Replaceable by dropping in an SVG later.
32. **Fix-It checkboxes.** Spec output includes "a checkbox" per item. Decision: interactive, session-only, reset when the output changes; not fed to the RSO.
33. **Security headers on ShipSafe itself.** `vite preview` and a documented host config emit: `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`, `Strict-Transport-Security: max-age=63072000; includeSubDomains`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, `Cache-Control: no-store` for `index.html`. The dev server uses a relaxed CSP (HMR needs inline style and websockets). Design constraints that make this possible: no inline scripts or `<style>` tags, the theme init script is an external file, CSSOM style writes only (no `style=""` attributes in markup), `connect-src` gains the API origin in `http` mode. Final deployment host is not chosen here; the header set above is the requirement.
34. **Heading levels.** Widget titles are `h2`. The brand `h1` is visually hidden and first so the outline is valid without reordering DOM.
35. **Print.** Only the sign-off record has a print stylesheet; everything else is `display: none` in print for that case. A full-report PDF export is out of scope.

---

## 16. Decision log (R-31: every major visual decision has a reason)

| Decision | Reason |
|---|---|
| Achromatic ink-on-paper UI, chroma only for state | The spec's required status colors would otherwise compete with a brand hue; the stamp becomes the one moment of color. |
| Archivo wdth axis + Plex Mono | Signage-like sturdiness fits a gate/inspection product; one family avoids pairing seams; mono only for real code. |
| Light default, true dark theme | Users scan long tables in daylight; dark is offered, not forced; both contrast-checked. |
| 0 / 2 / 4px radii | Document and form language; controls keep a hint of softness for affordance. |
| No shadows, 2px ink rules | Hierarchy by structure, not elevation. Only the dialog lifts. |
| Continuous ruled report instead of cards | The five audits are one argument that ends in the verdict; cards would flatten that. |
| Stamp with double border | The product's whole output is a decision; the stamp is the identity motif and the focal point. |
| Severity bar glyph (4 segments) | Encodes level without relying on hue; domain-specific, not decorative. |
| Dashed tear line before chat | Marks the change from "evidence" to "sign-off" once; used nowhere else. |
| Ledger-style chat (no bubbles) | Reads like an inspection log; avoids the default chat-app look. |
| Reads-from chips as buttons | Makes the dependency graph visible and navigable (recognition over recall). |
| No numbering, no eyebrows, no stat row, no footer | None of them encode real information here. |
| Mock tag in the toolbar | Honest about unreal data. |
| Primary button used once | Keeps one clear focal action per screen. |

---

## 17. Testing strategy

Unit (pure, fast, Vitest): `mentions` (single pass, `/` title, empty to `[NOT PROVIDED]`, user content containing `@Tech Stack` not re-substituted, unknown mention error, boundary), `graph` (derived equals spec matrix, topological waves, cycle detection with a synthetic config), `planner` (force vs missing, stale not auto-run), `stale` (edit, revert, transitive), `runner` (W1 concurrency 3, failure blocks dependents only, abort keeps prior output, single-flight, guards order), `secrets` (each pattern, `sk_live_REDACTED` ignored, masking never reveals more than 4 chars, ack keys), `verdict`/`findings`/`signoff` parsers (all three verdicts, emoji present/absent, bracketed/unbracketed, unfilled template, garbage, "APPROVED WITH CONDITIONS" before "APPROVED"), `limits`, `hash`, `config` (spec-conformance: 13 widgets, order, titles, placeholders, prompts, persona, Disclaimer all strictly equal to `../shipsafe-spec.md`), mock engine (every scenario returns every required heading from each widget's OUTPUT FORMAT, no emitted CVE ids in heuristic mode, masked secrets only).

Component (Testing Library + vitest-axe): each widget in every state of 12.1; `MarkdownView` safety (script tag, raw HTML, `javascript:` link, image beacon, table scroll region, heading demotion); `VerdictStamp` for three verdicts plus unrecognized; dialogs (focus in, Escape, focus return); `InputWidget` limit and paste behavior; `ChatWidget` locked/opening/ready/pending/failed/stale/sign-off; DOM order test: the thirteen `h2` titles appear in spec order.

Integration (App with mock, zero latency): load Ledgerline, run full audit, verdict is NO-GO, chat opens with the blocker count, edit Tech Stack, all five audits and chat show Outdated, revert, they clear; secret dialog appears for the synthetic token; empty-input confirm lists correct fields.

E2E (Playwright + axe, once): keyboard-only run through the whole flow; 320px reflow with no horizontal page scroll; reduced-motion emulation yields zero running animations; light and dark; forced-colors emulation; `curl -I` style header check against `vite preview` using ShipSafe's own rules; screenshots at 1440, 768, 360 for the single batched visual review.

Not unit-testable and therefore manual: real model behavior (one question per turn, refusal rules), screen reader pronunciation, true print output.

---

## 18. Acceptance checklist for the implementer (maps to spec section 10)

- [ ] Exactly 13 widgets, titles and order identical to the spec; conformance test green.
- [ ] Placeholders, prompts, persona and Disclaimer byte-identical (generated by the extract script).
- [ ] Every `@` mention resolves, including `@Go/No-Go Verdict`; unknown mention and cycle tests green.
- [ ] Layout: inputs 2 to 7 left, audits 8 to 12 center, chat bottom full width, Disclaimer banner on top; mobile stacks in that order.
- [ ] Verdict stamp colors: GO green, CONDITIONAL GO amber, NO-GO red; severity colors Critical red, High orange, Medium yellow, Low blue, Info gray; each also has text and a shape.
- [ ] Textareas: 6 or 8 rows min, vertical resize, mono for widgets 5 to 7.
- [ ] Output rendered as safe markdown with scrollable tables.
- [ ] Secret guard, size limits, stale detection, topological runner, Stop/Retry, Copy, Reset all working against the mock.
- [ ] Chat: locked state, auto opener, one question per turn (mock), no sign-off while blockers open (mock), sign-off record renders.
- [ ] Empty, loading, running, stale, blocked and error states exist for every generation widget and the chat, with the specified copy.
- [ ] Light and dark themes pass the contrast table; focus ring visible; keyboard-only complete; reduced motion honored; forced colors readable.
- [ ] No gradients, glow, glass, emoji icons, pills, colored card borders, stat rows, fake metrics, em dashes, `indigo/purple/violet` classes, Inter.
- [ ] `npm run typecheck; npm run lint; npm run test; npm run build` all pass on PowerShell.
- [ ] ShipSafe's own `vite preview` headers pass its own HTTP hardening checklist.

---

## 19. Implementation order (handoff)

1. Scaffold Vite + React + TS, install pinned deps with `--save-exact`, Tailwind v4 plugin, tokens, fonts, lint rules, test setup.
2. `extract-spec-text.mjs`, `widgets.config.ts`, conformance test.
3. Domain layer with tests: mentions, graph, planner, stale, secrets, parsers, hash.
4. Store, runner, API client with mock engine and three scenarios.
5. UI primitives and icons; `AppShell`, rail, skip links, theme.
6. Widgets: Static, Input, Generation (+ MarkdownView, tags, tally), Verdict stamp, Chat, SignOffRecord, dialogs.
7. States, motion, forced-colors and print CSS.
8. Integration and a11y tests; one batched visual review at desktop and mobile; fix in one pass; stop.
