# ShipSafe Configuration Summary

## 1. Package.json Scripts and Dependencies

### Frontend (`frontend/package.json`)
- **Type**: module, private
- **Scripts**:
  - `dev`: `vite` — development server
  - `build`: `vite build` — production build
  - `preview`: `vite preview` — local preview of build
  - `typecheck`: `tsc -b` — TypeScript build check
  - `lint`: `eslint .` — ESLint
  - `test`: `vitest run` — run tests
  - `test:watch`: `vitest` — watch mode
- **Dependencies** (major):
  - `@clerk/clerk-react`: 5.61.10 — React authentication
  - `@fontsource-variable/archivo`: 5.3.0 — variable font source
  - `@fontsource/ibm-plex-mono`: 5.3.0 — monospace font source
  - `@supabase/supabase-js`: 2.117.3 — Supabase client
  - `@vercel/analytics`: 2.0.1 — Vercel analytics
  - `react`: 19.3.0 — UI library
  - `react-dom`: 19.3.0 — React DOM
  - `react-markdown`: 10.1.0 — Markdown rendering
  - `remark-gfm`: 4.0.1 — GFM support for remark
  - `zustand`: 5.0.15 — state management
- **DevDependencies** (major):
  - `@eslint/js`: 9.39.5 — ESLint core config
  - `@tailwindcss/vite`: 4.3.3 — Tailwind CSS Vite plugin
  - `@testing-library/dom`: 10.4.2 — DOM testing
  - `@testing-library/jest-dom`: 6.10.0 — Jest DOM matchers
  - `@testing-library/react`: 16.3.3 — React testing
  - `@testing-library/user-event`: 14.6.8 — user event simulation
  - `@types/node`: 24.19.2 — Node.js types
  - `@types/react`: 19.3.0 — React types
  - `@types/react-dom`: 19.3.0 — React DOM types
  - `@vitejs/plugin-react`: 5.2.0 — React plugin for Vite
  - `axe-core`: 4.14.0 — accessibility testing
  - `eslint`: 9.39.5 — linter
  - `eslint-plugin-react-hooks`: 7.1.1 — React hooks linting
  - `globals`: 16.5.0 — global variables
  - `jsdom`: 27.4.0 — DOM simulation
  - `tailwindcss`: 4.3.3 — CSS framework
  - `typescript`: 5.9.3 — TypeScript compiler
  - `typescript-eslint`: 8.71.2 — ESLint TypeScript plugin
  - `vite`: 7.3.7 — build/dev server
  - `vitest`: 4.1.11 — test runner
  - `vitest-axe`: 0.1.0 — axe integration for Vitest

### Backend (`backend/package.json`)
- **Name**: shipsafe-backend
- **Version**: 1.0.0
- **Description**: ShipSafe Pre-Deployment Security Auditor Backend API
- **Scripts**:
  - `build`: `tsc` — compile TypeScript
  - `start`: `node dist/server.js` — start compiled server
  - `dev`: `ts-node src/server.ts` — development with ts-node
  - `test`: `vitest run` — run tests
- **Dependencies** (major):
  - `@clerk/backend`: ^3.23.2 — Clerk server-side auth
  - `adm-zip`: 0.5.16 — ZIP archive reading
  - `cors`: 2.8.5 — CORS middleware
  - `dotenv`: 16.4.7 — environment variable loading
  - `express`: 4.21.2 — web framework
  - `helmet`: 8.0.0 — security headers
  - `multer`: 1.4.5-lts.1 — file upload handling
  - `zod`: 3.24.2 — schema validation
- **DevDependencies** (major):
  - `@types/adm-zip`: 0.5.7 — ZIP types
  - `@types/cors`: 2.8.17 — CORS types
  - `@types/express`: 4.17.21 — Express types
  - `@types/multer`: 1.4.12 — Multer types
  - `@types/node`: 22.13.9 — Node.js types
  - `ts-node`: 10.9.2 — TypeScript execution
  - `typescript`: 5.7.3 — TypeScript compiler
  - `vitest`: 3.0.7 — test runner

### CLI (`cli/package.json`)
- **Name**: `@shipsafe/cli`
- **Version**: 1.0.0
- **Description**: ShipSafe Pre-Deployment Security Gatekeeper CLI for CI/CD and Pre-Commit Hooks
- **Bin**: `shipsafe` -> `dist/index.js`
- **Scripts**:
  - `build`: `tsc` — compile TypeScript
  - `test`: `vitest run` — run unit tests
  - `scan`: `node dist/index.js scan .` — local scan
- **Dependencies**: `adm-zip` (for remote scanning)
- **DevDependencies**: `@types/adm-zip`, `@types/node`, `typescript`, `vitest`

### MCP Server (`mcp/package.json`)
- **Name**: `@shipsafe/mcp-server`
- **Version**: 1.0.0
- **Description**: ShipSafe Model Context Protocol (MCP) Server for Cursor, Claude Desktop, Windsurf, OpenCode, and Hermes
- **Bin**: `shipsafe-mcp` -> `dist/index.js`
- **Scripts**:
  - `build`: `tsc` — compile TypeScript
  - `start`: `node dist/index.js` — start stdio JSON-RPC server
  - `test`: `vitest run` — run unit tests
- **DevDependencies**: `@types/node`, `typescript`, `vitest`

---

## 2. Build Tool
- **Frontend**: **Vite** 7.3.7 (`frontend/vite.config.ts`)
  - Plugins: `@vitejs/plugin-react`, `@tailwindcss/vite`
  - `defineConfig` with `preview.headers` for security headers
  - `rollupOptions.output.manualChunks` for vendor chunking (react, react-dom, markdown, supabase)
  - Test config: jsdom environment, vitest setup, css: false, mock env vars
- **Backend**: **TypeScript Compiler (tsc)**
  - `backend/package.json` scripts use `tsc` for build
  - `backend/tsconfig.json` targets ES2022, CommonJS module, outDir ./dist
  - No bundler mentioned; likely Node.js native ES module or CommonJS

---

## 3. Linter/Formatter Configs
- **Frontend ESLint** (`frontend/eslint.config.js`):
  - Flat config format (ESLint v9)
  - Ignores: `dist`, `node_modules`, `coverage`
  - Files: `**/*.{ts,tsx}`
  - Extends: `js.configs.recommended`, `...tseslint.configs.recommended`, `reactHooks.configs.flat.recommended`
  - Language: ECMAScript 2022, browser globals
  - **Key security rules**:
    - `no-restricted-syntax`: forbids `dangerouslySetInnerHTML` in JSX attributes; raw HTML in markdown via `rehype-raw` is forbidden
    - `no-restricted-imports`: forbids `rehype-raw` and `**/api/mock/**` / `**/mock/*` imports (must go through `src/api/client.ts`)
  - Separate rules for `scripts/`, `eslint.config.js`, `vite.config.ts` (Node globals)
- **No Prettier config found** in project root or directories (`.prettierrc*`, `prettier.config*` not present)
- **Backend**: Uses `tsc` for type checking; ESLint not configured separately in repo (likely runs via `tsc` or project-level config)

---

## 4. TypeScript Config
- **Frontend**:
  - `frontend/tsconfig.app.json`: App-focused config
    - target: ES2022, useDefineForClassFields, lib: ES2023/DOM/DOM.Iterable
    - module: ESNext, bundler resolution
    - verbatimModuleSyntax: true (strict)
    - noEmit: true (type-check only)
    - strict mode: unused locals/parameters, fallthrough cases, etc.
  - `frontend/tsconfig.json`: File references
    - references: `tsconfig.app.json` and `tsconfig.node.json`
  - `frontend/tsconfig.node.json`: Node config
    - target: ES2022, lib: ES2023
    - types: [node]
    - include: `vite.config.ts`
- **Backend**:
  - `backend/tsconfig.json`:
    - target: ES2022, module: CommonJS
    - moduleResolution: node
    - outDir: ./dist, rootDir: ./src
    - strict: true, esModuleInterop: true, skipLibCheck: true
    - forceConsistentCasingInFileNames: true, resolveJsonModule: true
    - include: `src/**/*`, exclude: `node_modules`, `dist`, `**/*.test.ts`

---

## 5. CI/CD Configs
- **GitHub Actions** (`.github/workflows/shipsafe-gatekeeper.yml`):
  - Automated PR and push gatekeeper
  - Runs `@shipsafe/cli` producing SARIF 2.1.0 output
  - Uploads security findings to GitHub Code Scanning via `github/codeql-action/upload-sarif@v3`
  - Supports optional remote audit via ShipSafe VPS engine
- **Pre-Commit Hook** (`cli/scripts/install-hook.js`):
  - Git pre-commit barrier script with interactive/CLI installer (`--install`, `--uninstall`, `--dry-run`)
- **Vercel** (`frontend/vercel.json`):
  - `$schema`: vercel openapi schema
  - `framework`: `vite`
  - `buildCommand`: `npm run build`
  - `outputDirectory`: `dist`
  - **Rewrites** (API proxy to VPS at `http://213.163.197.214:23010`):
    - `/api/audit` → `http://213.163.197.214:23010/api/audit`
    - `/api/audit/:path*` → `http://213.163.197.214:23010/api/audit/:path*`
    - `/api/health` → `http://213.163.197.214:23010/api/health`
    - `/api/queue` → `http://213.163.197.214:23010/api/queue`
    - `/api/ai/:path*` → `http://213.163.197.214:23010/api/ai/:path*`
    - `/api/import-repo` → `http://213.163.197.214:23010/api/import-repo`
    - `/.*)` → `/index.html` (SPA fallback)
  - **Headers** on all routes:
    - `X-Content-Type-Options: nosniff`
    - `X-Frame-Options: DENY`
    - `Referrer-Policy: strict-origin-when-cross-origin`
- **Supabase** (`supabase/config.toml`): Local development configuration
  - project_id: `KIRO_TEST`
  - API port: 54321, DB port: 54322
  - TLS disabled locally
  - Pool mode: transaction

---

## 6. Environment Variable Patterns (.env)
- **Root `.env.example`** (template for all folders):
  - Frontend vars: `VITE_API_MODE`, `VITE_API_BASE_URL`, `VITE_MOCK_LATENCY`
  - Clerk: `VITE_CLERK_PUBLISHABLE_KEY`
  - Supabase: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
  - Turnstile: `VITE_TURNSTILE_ENABLED`, `VITE_CLOUDFLARE_TURNSTILE_SITE_KEY`
  - Backend vars: `PORT`, `NODE_ENV`, `CORS_ORIGIN`, `MAX_ZIP_SIZE_MB`
  - Clerk secret: `CLERK_SECRET_KEY`, `AUTH_TEST_BYPASS`
  - Supabase server: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`
  - AI gateway: `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`
  - Turnstile backend: `TURNSTILE_ENABLED`, `TURNSTILE_SECRET`, `CLOUDFLARE_TURNSTILE_SECRET_KEY`, `TURNSTILE_EXPECTED_ACTION`, `TURNSTILE_HOSTNAMES`
- **Frontend `.env.example`**:
  - `VITE_API_MODE=http` (mock or http)
  - `VITE_API_BASE_URL=/api`
  - `VITE_MOCK_LATENCY=normal`
  - `VITE_CLERK_PUBLISHABLE_KEY=pk_test_placeholder_clerk_publishable_key`
  - `VITE_SUPABASE_URL=https://your-project-ref.supabase.co`
  - `VITE_SUPABASE_ANON_KEY=your-supabase-anon-key-here`
  - `VITE_TURNSTILE_ENABLED=true`
  - `VITE_CLOUDFLARE_TURNSTILE_SITE_KEY=1x00000000000000000000BB`
- **Backend `.env.example`**:
  - `PORT=23010`
  - `NODE_ENV=development`
  - `CORS_ORIGIN=http://localhost:5173,https://ship-safe.lankdev.my.id,https://shipsafe-lankdev.vercel.app`
  - `MAX_ZIP_SIZE_MB=10`
  - `CLERK_SECRET_KEY=sk_test_placeholder_clerk_secret_key`
  - `AUTH_TEST_BYPASS=false`
  - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`
  - `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`
  - Turnstile: `TURNSTILE_ENABLED`, `TURNSTILE_SECRET`, `CLOUDFLARE_TURNSTILE_SECRET_KEY`, `TURNSTILE_EXPECTED_ACTION`, `TURNSTILE_HOSTNAMES`

**Key patterns**:
- Frontend vars prefixed with `VITE_` (Vite requirement)
- `VITE_API_MODE` controls mock vs real API mode
- `VITE_MOCK_LATENCY` controls test latency
- Backend uses plain env vars (no VITE_ prefix)
- CORS origin list specific domains (no wildcard)
- Turnstile keys separated between frontend (site key) and backend (secret key)

---

## 7. Docker or Container Configs
- **No Dockerfile** found in repository
- **No docker-compose.yml** found
- **No `.dockerignore`** found
- **Design spec mentions Docker**: `frontend-design-review.json` and `shipsafe-spec.md` reference Docker for VPS deployment:
  - "Docker untuk deploy reproducible" (Indonesian for "Docker for reproducible deployment")
  - Backend VPS runs Node.js + TypeScript
  - Spec mentions "Docker untuk deploy reproducible" under backend tech stack
- **Supabase** has local dev config: `supabase/config.toml`
  - Local DB/API ports (54321/54322)
  - TLS disabled for local development
  - Project ID: `KIRO_TEST`
- **Vercel** provides cloud deployment (no self-managed containers needed for frontend)

---

## Additional Notes
- **.gitignore** patterns protect `.env` files and environment secrets
- No monorepo setup; frontend and backend are separate `package.json` directories
- Project architecture: 3-tier (Frontend Vercel → Backend VPS → Supabase)
- Build output: frontend `dist/`, backend `dist/server.js`
- TypeScript strict mode enabled throughout
- ESLint flat config with security-focused rules
- No CI/CD pipelines defined in repo (likely manual or external)