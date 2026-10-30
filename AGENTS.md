# Repository Guidelines

## Project Overview
**ShipSafe** is a pre-deployment security auditor for web apps and vibe-coded projects. It accepts a ZIP archive (≤10MB), performs static AST/regex scans coupled with AI reasoning against 10 threat vectors, and generates actionable remediation prompts for AI coding agents (Cursor, Claude Code, GitHub Copilot, Windsurf).

**Production**: `https://shipsafe.lankdev.my.id` | **Architecture**: 3-Tier (Frontend on Vercel, Backend on VPS, Database/Auth on Supabase)

---

## Documentation Files
| File | Purpose |
|------|---------|
| `README.md` | Main project docs with architecture, quickstart, deployment guide |
| `DOCUMENTATION.md` | Indonesian-language official specification & release notes |
| `SPEC_LANDING_MCP_CLI.md` | Master specification for Landing Page, MCP Server, and CLI |
| `MCP.md` & `docs/mcp.md` | Comprehensive MCP Server documentation & client integration guide |
| `implementation_plan.md` | Formal architecture plan & system roadmap |
| `PRESENTATION.md` | 3-min demo script, jury Q&A prep, slide-by-slide narration |
| `SECURITY.md` | Security disclosure and credential rotation policy |
| `shipsafe-spec.md` | Comprehensive v3 specification baseline |
| `supabase/README.md` | Database schema, RLS policies, Supabase setup guide |
| `frontend/DESIGN.md` | Anti-Slop design guidelines (referenced in README) |

---

## Directory Structure
```
ShipSafe/
├── frontend/              # Web Client: React 19 + Vite + Tailwind v4
│   ├── src/
│   │   ├── components/    # UI components (landing/, ui/, dialogs/, submission/, report/, run/, shell/, markdown/)
│   │   ├── api/           # HTTP client + mock fallback
│   │   ├── domain/        # Validation, secret masking, samples
│   │   ├── lib/           # Supabase client & API integrations
│   │   ├── state/         # Zustand stores
│   │   └── styles/        # Design tokens (tokens.css), markdown.css
│   ├── package.json       # Scripts: dev, build, preview, typecheck, lint, test
│   ├── vite.config.ts
│   ├── vercel.json
│   └── .env.example
├── backend/               # Core Engine API: Express + TypeScript (VPS CentOS 9)
│   ├── src/
│   │   ├── security/      # auth-guard, turnstile, secret-scanner, repo-importer, zip-guard
│   │   ├── engine/        # queue, prompts, rules-scanner, ai-client, report-builder
│   │   └── server.ts      # Entry point
│   ├── package.json       # Scripts: build, start, dev, test
│   └── .env.example
├── mcp/                   # ShipSafe MCP Server: stdio JSON-RPC 2.0
│   ├── src/
│   │   └── index.ts       # 4 tools: audit_codebase, get_threat_matrix, get_remediation_prompt, verify_fix
│   ├── dist/              # Compiled bundle (node dist/index.js)
│   ├── package.json       # @lankdev/shipsafe-mcp
│   └── tsconfig.json
├── cli/                   # ShipSafe CLI: Terminal Pre-Commit & CI Gatekeeper
│   ├── src/               # CLI commands, AST scanner runner, ASCII scorecard formatter
│   ├── package.json       # @lankdev/shipsafe-cli
│   └── tsconfig.json
├── supabase/              # Database & Auth: PostgreSQL + RLS policies
│   ├── schema.sql         # DDL: audits, findings tables with RLS
│   └── config.toml
├── testsprite-plans/      # TestSprite test plans (JSON)
└── PRESENTASI/            # Presentation assets & decks
```

---

## Build & Test Commands

### Frontend (`cd frontend`)
```bash
npm install          # Install deps
npm run dev          # Dev server at localhost:5173
npm run build        # Production build → dist/
npm run preview      # Preview production build
npm run typecheck    # tsc -b
npm run lint         # eslint .
npm run test         # vitest run
npm run test:watch   # vitest watch mode
```

### Backend (`cd backend`)
```bash
npm install          # Install deps
npm run build        # tsc → dist/
npm start            # node dist/server.js (production)
npm run dev          # ts-node src/server.ts (development)
npm test             # vitest run
```

### MCP Server (`cd mcp`)
```bash
npm install          # Install deps
npm run build        # tsc → dist/index.js
npm start            # node dist/index.js (stdio JSON-RPC)
```

### CLI (`cd cli`)
```bash
npm install          # Install deps
npm run build        # tsc → dist/index.js
npm link             # link binary 'shipsafe' locally
shipsafe scan .      # audit local folder (anonymous)
shipsafe scan . --agent=cursor   # tailored AI prompt generation (cursor, claude, copilot, windsurf)
shipsafe login --token=sk_...    # link CLI to Supabase user account
shipsafe whoami      # inspect identity & token status
shipsafe diff <base> [target]    # re-audit fix verification
```

### Key Environment Variables
**Frontend** (`.env`): `VITE_API_MODE` (mock|http), `VITE_API_BASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_CLOUDFLARE_TURNSTILE_SITE_KEY`

**Backend** (`.env`): `PORT=23010`, `CORS_ORIGIN`, `MAX_ZIP_SIZE_MB=10`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL=hermes-agent`, `TURNSTILE_SECRET`

---

## Automation & CI/CD
- **GitHub Actions**: `.github/workflows/shipsafe-gatekeeper.yml` runs automated SARIF 2.1.0 security scans on push/PR and uploads findings to GitHub Code Scanning.
- **Git Pre-Commit Hook**: `cli/scripts/install-hook.js` for one-command installation of local commit barrier.
- **Systemd service** on VPS: `shipsafe-api` (runs as user `tugaspai` on port 23010)
- **Vercel** auto-deploy for frontend (configured via `vercel.json`)

---

## Testing
- **Frontend**: Vitest + React Testing Library + axe-core (accessibility)
  - Unit: `ErrorBoundary.test.tsx`, `TurnstileWidget.test.tsx`, `AuthModal.test.tsx`, `HistoryModal.test.tsx`, `SubmissionPanel.test.tsx`, `UploadDropzone.test.tsx`, `ErrorPanel.test.tsx`
  - E2E-ish: `repo-import.test.tsx`, `not-found.test.tsx`, `dashboard.test.tsx`, `responsive.test.tsx`
- **Backend**: Vitest
  - Unit: `auth-guard.test.ts`, `turnstile.test.ts`, `secret-scanner.test.ts`, `repo-importer.test.ts`, `zip-guard.test.ts`, `queue.test.ts`
- **Mock engine**: `frontend/src/api/mock/` (heuristics, prompts, sample-zips for offline testing)

---

## Key Implementation Details

### Security Architecture
- **Zero-Persistence**: ZIP extracted to isolated `/tmp/shipsafe-*`, wiped in `finally { cleanupTempDir() }`
- **Magic Byte Validation**: `PK\x03\x04` before processing
- **Zip-Slip Guard**: Rejects `..`, absolute paths, drive letters
- **Zip-Bomb Guard**: 100MB decompressed, 100:1 ratio, 5000 entries, 32 depth
- **Secret Masking**: 4-char prefix + `****` before LLM/rendering
- **Anti-Prompt-Injection**: Artifact delimiters + explicit ignore instructions
- **No Code Execution**: Source parsed as data only, never executed

### 10 Threat Vectors Audited
1. SQL Injection (template literal concatenation)
2. XSS (unescaped `dangerouslySetInnerHTML`, `innerHTML`, `document.write`)
3. DDoS (missing rate limiting, ReDoS patterns)
4. Brute Force (plaintext password compare, no timing protection)
5. Malware/Upload Web Shell (PHP/Node shell signatures, unvalidated uploads)
6. MitM (`rejectUnauthorized: false`, plaintext HTTP credentials, missing cookie flags)
7. Phishing (Open Redirect, Clickjacking via missing `X-Frame-Options`/CSP)
8. Defacement (unauthenticated template/webroot modification)
9. LFI/RFI/SSRF (path traversal in `fs.readFile`, `fetch(req.query.url)`)
10. Zero-Day (`eval()`, `new Function()`, prototype pollution)

### Auth & Data Flow
- **Primary Auth Engine**: Supabase Auth handles user registration, login, and session tokens.
- **Optional Auth**: Anonymous users can audit; logged-in users get history persisted to Supabase
- **JWT Verification**: Backend validates Supabase JWT via `SUPABASE_JWT_SECRET` / Supabase Auth
- **Super Admin Whitelist**: High-privilege ledger and system administrative actions are strictly limited to `hi@lankdev.my.id`, `gilankdev@gmail.com`, `ghilankputraramadhan@gmail.com`
- **RLS**: Full multi-tenant isolation on `audits` and `findings` tables
- **Service Role**: Backend uses `SUPABASE_SERVICE_ROLE_KEY` for server-side writes

### Official Support & Maintainer Contacts
- **WhatsApp Lead**: [+62 821-2415-3732](https://wa.me/6282124153732) (`082124153732`)
- **Direct Email**: [gilankdev@gmail.com](mailto:gilankdev@gmail.com)
- **Production URL**: [https://shipsafe.lankdev.my.id](https://shipsafe.lankdev.my.id)

---

## Coding Standards
- **TypeScript strict mode** (both frontend/backend)
- **ESLint** (frontend) with React hooks plugin
- **No .cursor/.vscode** configs found
- **No CONTRIBUTING.md** or `CODEOWNERS`
- **Design System**: Anti-Slop (Archivo + IBM Plex Mono), WCAG AA contrast, no em-dashes, no purple gradients
- **State Management**: Zustand (`frontend/src/state/`)
- **API Client**: Custom HTTP wrapper with mock fallback (`frontend/src/api/`)

---

## Known Issues / Spec Deviations
From `.kiro/specs/shipsafe/requirements.md`:
- Backend CORS currently `origin: '*'` — **must be strict whitelist** (Req 18)
- Frontend uses Vite+React, spec mentions Next.js — framework is design-phase decision
- Spec values marked "mis." (example) are adopted as configurable defaults

---

## Agent Guidance
- **Never commit `.env` files** — all env files in `.gitignore`
- **Never fabricate findings** — locations, CVEs, versions must be real or "Not enough information"
- **Dependency findings** must include "Likely, verify" label + verification command (`npm audit`, `pip-audit`, `OSV-Scanner`)
- **Secret masking is idempotent** — double masking = single masking
- **All 5 agent prompt formats** (Generic, Cursor, Claude Code, Copilot, Windsurf) must be generated per finding
- **Frontend tests** use `axe-core` for accessibility; ensure WCAG AA compliance
- **Backend ZIP processing** is synchronous with 120s timeout; uses `adm-zip` library