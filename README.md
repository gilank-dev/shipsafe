# ShipSafe: Pre-Deployment Security Auditor for Web Apps & Vibe-Coded Projects

> **ShipSafe** is an automated pre-deployment security auditor designed specifically for rapid-prototype and AI-assisted web applications. It accepts a project ZIP archive (≤10MB), scans configuration and source files using static AST/regex heuristics coupled with AI reasoning, flags critical security gaps (misconfigured CORS, public API keys, missing RLS, open debug endpoints, unsafe headers), and generates exact, actionable remediation prompts tailored for popular AI coding agents (Cursor, Claude Code, GitHub Copilot, Windsurf).

---

## 1. System Architecture (3-Tier Production Setup)

```
┌────────────────────────────────────────────────────────┐
│                   TIER 1: FRONTEND                     │
│                Deployed on Vercel Edge                 │
│   • React 19 + TypeScript + Vite + Tailwind CSS v4     │
│   • Client-side Magic Byte & Zip-Slip Pre-validation   │
│   • Local Secret Masking & Agent Prompt Formatter      │
│   • Anti-Slop Design System (Archivo + IBM Plex Mono)  │
└──────────────┬──────────────────────────┬──────────────┘
               │                          │
        Direct Audit (REST)         Auth & Sync (RLS)
               │                          │
               ▼                          ▼
┌───────────────────────────────┐  ┌──────────────────────────────┐
│       TIER 2: BACKEND & AI    │  │  TIER 3: DATABASE & AUTH     │
│       CentOS 9 Stream VPS     │  │       Supabase Cloud         │
│     (213.163.197.214:23010)   │  │                              │
│ • Express + TypeScript        │  │ • Postgres Database          │
│ • Zip-Bomb & Traversal Guards │  │ • Row Level Security (RLS)   │
│ • Static Rule Engine (AST)    │  │ • Supabase Auth (Email / OIDC│
│ • 9Router AI Gateway          │  │ • Cascade Deletion Policies  │
│   (Model: hermes-agent)       │  └──────────────────────────────┘
│ • Systemd Daemon (Active)     │
└──────────────┬────────────────┘
               │ (Optional Webhook Integration)
               ▼
┌───────────────────────────────┐
│     n8n ORCHESTRATION         │
│   Visual Webhook Pipeline     │
│   (n8n/shipsafe-workflow.json)│
└───────────────────────────────┘
```

---

## 2. Live VPS Deployment Status

The backend API and AI pipeline are active and running as a persistent daemon on the VPS:

- **Host**: `213.163.197.214`
- **Port**: `23010` (Open public tenant port)
- **Base URL**: `http://213.163.197.214:23010`
- **Health Check**: `GET http://213.163.197.214:23010/api/health`
- **Queue Status**: `GET http://213.163.197.214:23010/api/queue` (Concurrency limit: max 3 concurrent tasks)
- **AI Health Check**: `GET http://213.163.197.214:23010/api/ai/health`
- **Audit Endpoint**: `POST http://213.163.197.214:23010/api/audit` (multipart/form-data)
- **Prompt Synthesis**: `POST http://213.163.197.214:23010/api/audit/:id/prompts`
- **Systemd Service**: `systemctl --user status shipsafe-api` on VPS user `tugaspai`
- **Concurrency & Anti-Overload**: Dibatasi maksimal 3 audit bersamaan secara real-time. Permintaan tambahan dimasukkan ke antrean FIFO otomatis (kapasitas 25 antrean, timeout 60 detik) untuk menjamin kestabilan VPS.


---

## 3. Directory Structure

```
KIRO TEST/
├── backend/                  # Tier 2: Express + TypeScript API Engine
│   ├── src/
│   │   ├── audit/            # Static rules & security auditor engine
│   │   ├── config/           # Environment and service port configuration
│   │   ├── guards/           # Zip-Slip, Zip-Bomb, and Magic Byte guards
│   │   ├── routes/           # REST endpoints (/audit, /health, /ai)
│   │   ├── services/         # 9Router AI client & prompt synthesizer
│   │   └── utils/            # Secret maskers & temp directory cleaners
│   ├── dist/                 # Compiled JavaScript running on VPS
│   ├── .env.example          # Environment variables template
│   └── package.json
├── frontend/                 # Tier 1: React 19 + Vite + Tailwind CSS v4
│   ├── src/
│   │   ├── api/              # HTTP client to VPS backend + mock fallback
│   │   ├── components/       # Anti-Slop UI components (WCAG AA compliant)
│   │   ├── domain/           # Validation, secret masking, sample data
│   │   ├── lib/              # Supabase client integration
│   │   ├── state/            # Zustand global state store
│   │   └── styles/           # Design tokens, typography, and markdown styles
│   ├── dist/                 # Production build ready for Vercel
│   ├── .env.example          # Frontend environment variables template
│   └── DESIGN.md             # Anti-Slop design guidelines and typography spec
├── supabase/                 # Tier 3: Supabase Database Schema & Auth Setup
│   ├── schema.sql            # PostgreSQL DDL, tables, indexes, and RLS policies
│   └── README.md             # Supabase setup guide
├── n8n/                      # Optional Visual Automation Flow
│   ├── shipsafe-workflow.json# Importable JSON workflow for n8n
│   └── README.md             # Setup guide for n8n webhook pipeline
├── shipsafe-spec.md          # Comprehensive specification document
└── README.md                 # Project documentation (this file)
```

---

## 4. Quickstart: Running Locally

### 4.1 Prerequisites
- Node.js 20+ installed
- npm or pnpm installed

### 4.2 Running Frontend
```bash
cd frontend
npm install
npm run dev
```
The frontend starts at `http://localhost:5173`. By default, it communicates with the live VPS backend at `http://213.163.197.214:23010`.

### 4.3 Running Backend Locally (Optional)
```bash
cd backend
npm install
npm run build
npm start
```
The backend starts at `http://localhost:23010`.

---

## 5. Deployment Guide

### 5.1 Deploying Frontend to Vercel
You can deploy the frontend directly to Vercel using either the Vercel CLI or by linking your GitHub repository:

#### Method A: Using Vercel CLI
```bash
cd frontend
npx vercel
```
1. Set the Root Directory to `frontend`.
2. Framework Preset: `Vite`.
3. Build Command: `npm run build`.
4. Output Directory: `dist`.
5. Environment Variables:
   - `VITE_API_BASE_URL`: `http://213.163.197.214:23010`
   - `VITE_API_MODE`: `http`
   - `VITE_SUPABASE_URL`: `<your-supabase-url>`
   - `VITE_SUPABASE_ANON_KEY`: `<your-supabase-anon-key>`

#### Method B: Git Integration on Vercel Dashboard
1. Import repository on [vercel.com](https://vercel.com).
2. Set Root Directory to `frontend`.
3. Add the environment variables listed above.
4. Click **Deploy**.

---

### 5.2 Supabase Database Setup
1. Log in to your [Supabase Dashboard](https://supabase.com).
2. Create a new project or select an existing one.
3. Open the **SQL Editor**.
4. Paste the contents of `supabase/schema.sql` and execute the script.
5. In **Project Settings -> API**, copy your **Project URL** and **anon public key**.
6. Set these values in `frontend/.env`:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

---

### 5.3 n8n Workflow Import (Optional)
1. Open your n8n workspace.
2. Select **Workflows -> Import from File**.
3. Select `n8n/shipsafe-workflow.json`.
4. Configure the Webhook node and activate the workflow.

---

## 6. Security Guarantees & Anti-Slop Compliance

- **Zero-Persistence Policy**: Raw ZIP files and extracted source trees are never stored permanently. They are written to isolated `/tmp/shipsafe-*` directories and wiped immediately via `finally { cleanupTempDir() }` after processing.
- **Code Execution Ban**: Source code is strictly parsed statically (AST/regex) and analyzed via LLM prompt reasoning. Code is **never executed**, compiled, or required.
- **10-Threat Security Vector Evaluation**:
  1. **SQL Injection (SQLi)**: Deteksi dinamis query concatenation / interpolasi template literal.
  2. **Cross-Site Scripting (XSS)**: Deteksi unescaped markup insertion via `dangerouslySetInnerHTML`, `innerHTML`, `document.write`.
  3. **Distributed Denial-of-Service (DDoS)**: Pengecekan ketiadaan rate limiting global dan ekspresi reguler bencana backtracking (ReDoS).
  4. **Brute Force & Credential Timing**: Deteksi plaintext password comparison dan ketiadaan proteksi timing attack.
  5. **Malware & Upload Web Shell**: Signature detector untuk PHP/Node web shells (`c99`, `r57`, `b374k`, `eval(base64_decode)`, `child_process.exec`) serta unvalidated file upload handler.
  6. **Man-in-the-Middle (MitM)**: Deteksi sertifikat TLS dimatikan (`rejectUnauthorized: false`), plaintext `http://` credentials, dan missing cookie security.
  7. **Phishing & Social Engineering**: Deteksi Open Redirect (`res.redirect(req.query.url)`) dan Clickjacking (missing `X-Frame-Options` / CSP `frame-ancestors`).
  8. **Website Defacement Risk**: Deteksi modifikasi tanpa autentikasi terhadap file template dan direktori webroot publik (`public/index.html`).
  9. **Local & Remote File Inclusion (LFI/RFI)**: Deteksi path traversal pada operasi baca file (`fs.readFile`) dan SSRF pada pemanggilan URL eksternal (`fetch(req.query.url)`).
  10. **Zero-Day & Dynamic Code Execution**: Deteksi `eval()`, `new Function()`, dan prototype pollution pada object merging.
- **Concurrency Queue Limiter (Maks 3 Slot)**: Menjamin maksimal 3 audit bersamaan aktif di VPS. Permintaan ke-4 ke atas masuk antrean FIFO otomatis (kapasitas 25, timeout 60s) agar VPS tidak jebol.
- **Zip-Slip & Path Traversal Guard**: Prevents extraction outside the target directory by rejecting any entry containing `..` or absolute paths.
- **Zip-Bomb Guard**: Enforces strict limits: max 10MB compressed archive, max 100MB uncompressed footprint, max 100:1 compression ratio, max 5,000 files.
- **Secret Redaction**: Detected live API keys (`sk_live_`, `AKIA*`, GitHub tokens, private keys) are automatically masked to `4 prefix chars + ****` before rendering in any report or remediation prompt.
- **Anti-Slop Design**: Built without AI clichés: no generic purple gradient backgrounds, no em-dashes (`—`), strict WCAG AA contrast, and typography paired using Archivo (body/headings) and IBM Plex Mono (code/locations).

---

## 7. License & Credits

ShipSafe is designed for builders, vibe-coders, and development teams who need safety verification before shipping to production. Built with precision and strict evidence-first engineering.
