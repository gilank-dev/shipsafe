# ShipSafe: Spesifikasi Lengkap Aplikasi (v3 — 3-Tier: Vercel + VPS + Supabase)

> Dokumen ini adalah sumber utama untuk di-rewrite di Kiro (bisa dipecah menjadi `requirements.md`, `design.md`, dan `tasks.md`, atau dipakai sebagai satu steering/spec file).
> **Versi 3** mengubah arsitektur menjadi tiga lapis: **Frontend di Vercel**, **Backend + proses AI di VPS**, **Database + Auth di Supabase**. Alur input tetap **upload ZIP**. Chatbot sign-off & verdict Go/No-Go tetap **dihapus** (dari v2). Output utama tetap **Full Report** + **prompt remediation per masalah untuk coding agent**.

---

## 0. Keputusan Arsitektur (Default — koreksi bila perlu)

Keputusan berikut diambil sebagai default yang masuk akal; tandai di sini bila ingin diubah.

1. **Backend VPS: Node.js + TypeScript** (satu bahasa dengan frontend; tipe & schema Zod bisa dibagi antar lapis).
2. **Login: OPSIONAL.** Pengguna boleh mengaudit tanpa akun. Login (via Supabase Auth) hanya untuk menyimpan & melihat riwayat audit.
3. **Penyimpanan report: YA (bila login).** Hasil report disimpan ke Supabase Postgres. **Isi ZIP mentah TIDAK PERNAH disimpan permanen** — diproses lalu dihapus total. Pengguna anonim: report hanya ada di sesi browser, tidak disimpan.

---

## 1. Ringkasan Produk

**Nama aplikasi:** ShipSafe

**Deskripsi:** Pre-deployment security auditor untuk aplikasi web modern dan proyek vibe-coded. Pengguna meng-upload **satu file ZIP** berisi codebase/platform mereka (maks. 10 MB). ShipSafe lalu:

1. Mengekstrak dan memindai isi proyek dengan aman (di VPS).
2. Menjalankan audit keamanan berbantuan AI (secrets, dependencies, HTTP/server hardening, code security).
3. Menghasilkan **Full Report**: tiap masalah dijelaskan — **apa masalahnya, di mana lokasinya (file + baris bila ada), kenapa berbahaya, severity**.
4. Untuk **setiap masalah**, menghasilkan **prompt siap-tempel** untuk coding agent pengguna (Cursor, Claude Code, GitHub Copilot, Windsurf, Generic).

**Prinsip utama:**

- AI-assisted review, **bukan** pengganti scanner otomatis atau pentest profesional.
- Secret asli yang terlanjur ter-upload **dideteksi & di-masking otomatis**; pengguna diperingatkan merotasinya.
- Tidak ada fabrikasi: temuan, CVE ID, lokasi file, dan versi tidak boleh dikarang.
- Pemrosesan ZIP harus **aman**: tahan zip-bomb, path traversal (zip-slip), symlink jahat, prompt injection dari isi file; **kode dari ZIP tidak pernah dieksekusi**.
- Isi ZIP mentah tidak disimpan permanen.

---

## 2. Arsitektur 3-Tier (Inti v3)

```
┌──────────────────────┐     ┌──────────────────────────┐     ┌──────────────────────┐
│  FRONTEND (Vercel)   │     │  BACKEND + AI (VPS)      │     │  SUPABASE            │
│                      │     │                          │     │                      │
│  Next.js + TS UI     │──1─▶│  POST /api/audit         │──4─▶│  Postgres (audits,   │
│  Upload ZIP          │     │  - verifikasi JWT        │     │   findings)          │
│  Report + Prompt     │◀─3──│  - validasi + extract    │◀────│  Auth (opsional)     │
│  Supabase Auth (UI)  │     │  - mask secret           │     │  RLS per-user        │
│                      │──2─▶│  - panggil LLM (Claude)  │     │                      │
│                      │     │  - build report + prompt │     │                      │
└──────────────────────┘     └──────────────────────────┘     └──────────────────────┘
   (login via Supabase)        (proses berat, no timeout)        (data + identitas)

 1 = upload ZIP (multipart) + Authorization: Bearer <supabase JWT bila login>
 2 = backend memverifikasi JWT ke Supabase (bila ada); anonim tetap boleh
 3 = report terstruktur (JSON) + prompt per temuan dikirim balik ke UI
 4 = bila login: simpan report ke Supabase; isi ZIP mentah TIDAK disimpan
```

**Pembagian tanggung jawab:**

| Lapis | Tanggung jawab | Catatan |
|---|---|---|
| **Frontend (Vercel)** | UI upload, tampil report & prompt, auth UI (Supabase) | Tidak memproses ZIP, tidak memegang LLM key |
| **Backend (VPS)** | Validasi + ekstraksi ZIP aman, masking, panggilan LLM, susun report & prompt, verifikasi JWT | LLM API key hanya di sini. Proses berat → bebas timeout |
| **Supabase** | Postgres (riwayat audit), Auth, RLS | Isi ZIP mentah tidak masuk ke sini |

**Kenapa 3-tier:** proses ekstraksi ZIP + beberapa panggilan LLM itu berat & lama, tidak cocok dengan batas timeout serverless. VPS menghilangkan batas itu dan boleh ekstrak ke disk temp. Supabase memberi Auth + DB siap pakai.

---

## 3. Lingkup Audit

| Area | Fokus |
|---|---|
| **Secrets** | Hardcoded API key/token/password/private key/connection string; secret di client-side / public env prefix (NEXT_PUBLIC_, VITE_, REACT_APP_, EXPO_PUBLIC_); secret di config/CI/Docker; PII tersimpan tidak aman |
| **Dependencies** | Versi usang/EOL, kerentanan historis terkenal (label "Likely, verify"), versi tidak di-pin, lockfile hilang, install script berisiko, typosquatting, dependency tak perlu |
| **HTTP & Server Hardening** | CSP, HSTS, X-Content-Type-Options, X-Frame-Options/frame-ancestors, Referrer-Policy, Permissions-Policy, CORS, cookie flags, CSRF, rate limiting, info leakage |
| **Code Security** | Injection (SQLi, XSS, SSRF, path traversal, open redirect), broken access control/IDOR, auth & session handling, input validation, output encoding, admin route exposure, file upload |

---

## 4. Pemrosesan ZIP yang Aman (WAJIB — berjalan di VPS)

Isi ZIP adalah **data tak tepercaya**. Semua langkah di backend VPS.

### 4.1 Validasi Unggahan
1. Batas ukuran ZIP terkompresi: **10 MB**. Tolak sebelum membaca penuh bila melebihi.
2. Hanya terima ZIP valid: verifikasi *magic bytes* (`PK\x03\x04`), bukan sekadar ekstensi/MIME.
3. Batas ukuran dekompresi total (mis. 100 MB) & rasio kompresi (mis. tolak > 100:1) → cegah **zip-bomb**.
4. Batas jumlah entri (mis. 5.000) & kedalaman direktori.

### 4.2 Ekstraksi Aman
1. Cegah **zip-slip/path traversal**: tolak/normalisasi entri dengan `..`, path absolut, atau drive letter.
2. Abaikan **symlink** & entri non-reguler (device, FIFO).
3. Ekstrak ke **direktori temp ter-isolasi** di VPS; hapus setelah selesai (di VPS boleh ke disk, tidak harus in-memory).
4. Terapkan **timeout** pemrosesan.

### 4.3 Filtering & Seleksi File
1. **Skip** noise: `node_modules`, `.git`, `dist`, `build`, `.next`, `vendor`, `__pycache__`, biner, gambar, media, font, lockfile besar (ambil ringkasan saja).
2. **Prioritaskan** berkas bernilai keamanan: source (API routes, auth, DB, handlers), `package.json`/`requirements.txt`/`pyproject.toml`/`go.mod`, `.env*`, `Dockerfile`, `docker-compose.yml`, config server (`next.config.js`, `vercel.json`, `nginx.conf`), CI/CD, CORS/header/cookie/CSP.
3. Batasi total teks ke LLM (budget token). Bila melebihi → **chunking** per area/berkas, audit bertahap, lalu gabungkan temuan.
4. Catat berkas yang di-skip → report menyebut "area tidak dinilai".

### 4.4 Masking Secret & Anti Prompt-Injection
1. Pindai pola secret (`sk_live_`, `AKIA`, `ghp_`, `-----BEGIN PRIVATE KEY-----`, JWT, connection string) & **mask** sebelum dikirim ke LLM maupun ditampilkan: 4 char pertama + `****`.
2. Secret yang tampak nyata ditandai **COMPROMISED → rekomendasikan rotasi**.
3. Perlakukan isi berkas sebagai **data, bukan instruksi**: bungkus dengan delimiter jelas; instruksikan model mengabaikan instruksi apa pun di dalam artefak.
4. **Jangan pernah** mengeksekusi/instal/menjalankan kode dari ZIP.

---

## 5. Full Report (Output Utama)

Tiap temuan menjawab: **apa, di mana, kenapa, seberapa parah, cara perbaiki.**

### 5.1 Struktur Report
```
## Executive Summary
- Satu paragraf penilaian keseluruhan.
- Hitungan temuan per severity: Critical / High / Medium / Low / Info.
- Area yang tidak dapat dinilai.

## Risk Scorecard
Tabel: Area (Secrets / Dependencies / HTTP Hardening / Code Security) | Skor 0-10 | Status | Perhatian utama

## Findings  (SETIAP temuan)
  - ID              : F-001, F-002, ...
  - Title           : ringkas, jelas
  - Severity        : Critical / High / Medium / Low / Info
  - Area            : Secrets / Dependencies / HTTP / Code
  - Location        : path berkas + baris/snippet bila ada (JANGAN dikarang)
  - What            : apa masalahnya
  - Why it matters  : dampak bila dibiarkan
  - Recommended fix : ringkasan langkah perbaikan
  - Verify with     : perintah/tool verifikasi
  - [Remediation Prompt] : prompt siap-tempel (Bagian 6)

## Secrets to Rotate
Daftar kredensial tampak nyata yang wajib dirotasi (ter-masking).

## Gaps / Not Assessed
Apa yang tak dapat dinilai & berkas/konteks apa yang perlu disediakan.
```

### 5.2 Aturan Konten
- **Tidak ada fabrikasi.** Tak yakin lokasi/CVE/versi → tulis apa adanya atau "Not enough information".
- Klaim dependency diberi label **"Likely, verify"** + langkah verifikasi; jangan menyatakan paket pasti aman.
- Secret tak pernah tampil penuh (4 char + `****`).
- Severity sesuai dampak nyata.

---

## 6. Prompt Remediation per Masalah (Fitur Inti)

Untuk **setiap temuan**, hasilkan **satu prompt mandiri** untuk ditempel ke coding agent pengguna.

### 6.1 Isi Setiap Prompt (self-contained)
1. **Peran & tujuan**: "Kamu security engineer. Perbaiki kerentanan berikut tanpa mengubah perilaku lain."
2. **Konteks masalah**: judul, area, severity, penjelasan singkat.
3. **Lokasi**: path berkas + baris/snippet relevan (dari temuan; tidak dikarang).
4. **Perilaku diharapkan setelah fix** + kriteria verifikasi.
5. **Batasan**: jangan hardcode secret baru, jangan ubah fitur lain, ikuti konvensi proyek, tambah test bila relevan.
6. **Catatan keamanan**: jangan tempel secret nyata; bila ada, rotasi.

> Prompt **tidak** memuat nilai secret nyata (pakai nama/placeholder).

### 6.2 Penyesuaian per Coding Agent
| Target | Penyesuaian |
|---|---|
| **Generic** | Netral, langkah jelas |
| **Cursor** | Gaya edit berbasis file, referensi `@file` |
| **Claude Code** | Berbasis tugas, boleh menyebut jalankan test/build untuk verifikasi |
| **GitHub Copilot** | Ringkas, inline/komentar + deskripsi perubahan |
| **Windsurf** | Mirip Cursor, berbasis workspace |

### 6.3 Ekspor
- **Copy Prompt** per temuan.
- **Copy All Prompts** (dipisah header per temuan) + unduh `.md`.

---

## 7. Disclaimer (banner atas, selalu terlihat)
```
⚠️ ShipSafe is an AI-assisted review, not a replacement for automated scanners or a professional pentest. If your ZIP contains real secrets, they are auto-masked for processing — but you should rotate any exposed credentials immediately. Always confirm findings with tools like gitleaks, trufflehog, npm audit / pip-audit / OSV-Scanner, and securityheaders.com.
```

---

## 8. Requirements (Format Kiro `requirements.md`)

### Requirement 1: Disclaimer
**User Story:** Sebagai pengguna, saya ingin melihat peringatan keamanan sebelum meng-upload.
**Acceptance Criteria**
1. WHEN halaman dimuat THEN sistem SHALL menampilkan Disclaimer dengan teks persis Bagian 7.
2. WHILE pengguna di halaman THE sistem SHALL menjaga disclaimer tetap terlihat di atas.

### Requirement 2: Autentikasi (Opsional)
**User Story:** Sebagai pengguna, saya ingin bisa mencoba tanpa akun, dan login untuk menyimpan riwayat.
**Acceptance Criteria**
1. THE sistem SHALL mengizinkan audit tanpa login (anonim).
2. THE sistem SHALL menyediakan login/daftar via Supabase Auth (email/password dan/atau OAuth).
3. WHEN pengguna login THEN sistem SHALL menyertakan Supabase JWT pada permintaan ke backend.
4. THE backend SHALL memverifikasi JWT ke Supabase; permintaan anonim tetap dilayani tanpa riwayat.

### Requirement 3: Upload ZIP
**Acceptance Criteria**
1. THE frontend SHALL menerima satu berkas ZIP via drag-and-drop atau file picker.
2. IF ukuran > 10 MB THEN sistem SHALL menolak dengan pesan jelas sebelum kirim.
3. IF bukan ZIP valid (magic bytes dicek di backend) THEN sistem SHALL menolak dengan pesan jelas.
4. WHEN upload berjalan THEN sistem SHALL menampilkan progres (upload → scanning → auditing → report).

### Requirement 4: Pemrosesan Aman (Backend VPS)
**Acceptance Criteria**
1. THE backend SHALL mencegah zip-slip/path traversal saat ekstraksi.
2. THE backend SHALL menolak zip-bomb (batas ukuran dekompresi, rasio, jumlah entri, kedalaman).
3. THE backend SHALL mengabaikan symlink & entri non-reguler.
4. THE backend SHALL TIDAK PERNAH mengeksekusi/instal/menjalankan kode dari ZIP.
5. THE backend SHALL memperlakukan isi berkas sebagai data & menolak instruksi tertanam (anti prompt-injection).
6. THE LLM API key SHALL hanya ada di backend VPS, tidak pernah di client.
7. THE backend SHALL menghapus direktori temp & buffer setelah proses (isi ZIP tidak disimpan permanen).

### Requirement 5: Seleksi & Masking
**Acceptance Criteria**
1. THE backend SHALL memfilter noise (node_modules, .git, biner) & memprioritaskan berkas bernilai keamanan.
2. THE backend SHALL mendeteksi & me-masking secret (4 char + `****`) sebelum ke LLM maupun ditampilkan.
3. THE backend SHALL mencatat berkas di-skip untuk bagian "Not Assessed".
4. IF konteks melebihi budget token THEN backend SHALL chunking lalu menggabungkan temuan.

### Requirement 6: Full Report
**Acceptance Criteria**
1. THE report SHALL berisi Executive Summary, Risk Scorecard, Findings, Secrets to Rotate, Gaps.
2. THE setiap temuan SHALL mencantumkan ID, Title, Severity, Area, Location, What, Why, Recommended fix, Verify with.
3. THE frontend SHALL merender markdown dengan aman (tanpa HTML mentah, anti-XSS).
4. THE sistem SHALL TIDAK mengarang lokasi/CVE/versi; ketidakpastian ditandai eksplisit.
5. THE klaim dependency SHALL diberi label "Likely, verify".

### Requirement 7: Prompt Remediation
**Acceptance Criteria**
1. WHEN report selesai THEN sistem SHALL menghasilkan satu prompt remediation per temuan.
2. THE prompt SHALL self-contained (peran, konteks, lokasi, hasil diharapkan, batasan, catatan keamanan).
3. THE prompt SHALL TIDAK menyertakan nilai secret nyata.
4. THE sistem SHALL menyesuaikan format prompt sesuai target coding agent (Generic/Cursor/Claude Code/Copilot/Windsurf).
5. THE sistem SHALL menyediakan Copy per prompt dan Copy All / unduh `.md`.

### Requirement 8: Riwayat Audit (bila login)
**Acceptance Criteria**
1. WHEN pengguna login & audit selesai THEN sistem SHALL menyimpan report ke Supabase (bukan isi ZIP mentah).
2. THE sistem SHALL menerapkan RLS: pengguna hanya melihat audit miliknya.
3. THE pengguna SHALL dapat melihat daftar & membuka report lamanya.
4. THE pengguna anonim SHALL mendapat report hanya di sesi browser (tidak tersimpan).

### Requirement 9: Keamanan Aplikasi ShipSafe Sendiri
**Acceptance Criteria**
1. THE backend SHALL menerapkan rate limiting pada endpoint audit.
2. THE backend SHALL menerapkan CORS ketat (whitelist domain frontend Vercel, bukan wildcard).
3. THE frontend & backend SHALL menerapkan header keamanan (CSP, HSTS, dll).
4. THE sistem SHALL membatasi ukuran & timeout untuk mencegah abuse.
5. THE sistem SHALL TIDAK menyimpan isi ZIP mentah secara permanen.

---

## 9. Design (Format Kiro `design.md`)

### 9.1 Tech Stack (Konkret)

**Frontend — Vercel**
- Next.js (App Router) + TypeScript, React 18
- Tailwind CSS + shadcn/ui + lucide-react
- Zustand (state, tanpa persistensi lokal sensitif)
- react-markdown + remark-gfm + rehype-sanitize (render report aman)
- `@supabase/supabase-js` (auth UI + ambil JWT)
- Memanggil backend VPS via HTTPS

**Backend + AI — VPS**
- Node.js + TypeScript (Fastify atau Express)
- Ekstraksi ZIP ke **disk temp sandbox** + guard (zip-slip, zip-bomb, symlink, kedalaman)
- LLM via Vercel AI SDK (`ai` + `@ai-sdk/anthropic`), model **Claude** (konteks panjang)
- Zod untuk validasi output LLM → `AuditReport` + validasi input
- Verifikasi Supabase JWT (`@supabase/supabase-js` / verifikasi JWKS)
- Nginx reverse proxy + HTTPS (Caddy/Let's Encrypt)
- Docker untuk deploy reproducible
- Rate limiting (in-memory untuk MVP, siap upgrade Redis)

**Database + Auth — Supabase**
- Postgres: tabel `audits` (id, user_id, created_at, summary, counts, scorecard, report_json), `findings` (opsional dinormalisasi) — simpan report, **bukan** isi ZIP
- Auth: email/password dan/atau OAuth (Google/GitHub)
- Row Level Security per `user_id`

> Catatan: tipe TypeScript (`Finding`, `AuditReport`, dll) & Zod schema diletakkan di paket bersama agar dipakai frontend & backend.

### 9.2 Model Data
```ts
type Severity = "Critical" | "High" | "Medium" | "Low" | "Info";
type Area = "Secrets" | "Dependencies" | "HTTP" | "Code";
type AgentTarget = "Generic" | "Cursor" | "ClaudeCode" | "Copilot" | "Windsurf";

interface Finding {
  id: string;                 // F-001
  title: string;
  severity: Severity;
  area: Area;
  location?: { file: string; line?: number; snippet?: string };
  what: string;
  why: string;
  recommendedFix: string;
  verifyWith?: string;
  remediationPrompt: string;  // disesuaikan AgentTarget
}

interface AuditReport {
  id?: string;                // bila disimpan ke Supabase
  summary: string;
  countsBySeverity: Record<Severity, number>;
  scorecard: { area: Area; score: number; status: string; topConcern: string }[];
  findings: Finding[];
  secretsToRotate: string[];  // ter-masking
  notAssessed: string[];
  skippedFiles: string[];
  createdAt?: string;
}
```

### 9.3 Pipeline Backend (VPS)
```
receive ZIP (multipart, 10MB cap) + optional Supabase JWT
  → (bila JWT ada) verifikasi ke Supabase, ambil user_id
  → verify magic bytes + size
  → safe-extract (zip-slip guard, bomb guard, no symlink) ke temp sandbox di disk
  → walk & filter (prioritas vs skip-list) dengan budget token
  → scan & mask secrets
  → build LLM input (delimiter + instruksi anti-injection)
  → call LLM Claude (chunking bila perlu) → parse ke AuditReport (JSON, Zod)
  → generate remediationPrompt per finding (sesuai AgentTarget)
  → (bila login) simpan AuditReport ke Supabase (RLS)  // isi ZIP TIDAK disimpan
  → cleanup temp dir
  → return AuditReport
```

### 9.4 Komponen UI (Frontend)
| Komponen | Keterangan |
|---|---|
| `AppShell` | Layout, header, banner disclaimer, status auth |
| `DisclaimerBanner` | Peringatan (amber), selalu terlihat |
| `AuthControls` | Login/daftar/logout via Supabase (opsional) |
| `UploadDropzone` | Drag-and-drop ZIP, validasi klien (ukuran/ekstensi), progres |
| `ContextForm` | (Opsional) deskripsi proyek, target deployment, PII/payment |
| `AgentSelector` | Pilih target coding agent (memengaruhi format prompt) |
| `ReportView` | Executive summary, scorecard, daftar findings |
| `FindingCard` | Satu temuan: apa/di mana/kenapa/severity + Copy Prompt |
| `SeverityBadge` | Warna per severity (Critical merah … Info abu) |
| `PromptModal` | Prompt remediation + Copy |
| `MarkdownView` | Render markdown + tabel aman (react-markdown + remark-gfm + rehype-sanitize) |
| `HistoryList` | (Bila login) daftar audit lama dari Supabase |

### 9.5 Keamanan ShipSafe Sendiri
- Semua pemrosesan ZIP & LLM di backend VPS; tidak ada eksekusi kode dari ZIP.
- LLM API key hanya di env VPS; tidak pernah di client.
- CORS ketat di backend (whitelist domain Vercel).
- Verifikasi Supabase JWT di backend untuk operasi tersimpan; RLS di DB.
- Rate limiting + batas ukuran/timeout pada endpoint audit.
- Hapus temp dir & buffer setelah proses; isi ZIP tidak persisten.
- Sanitasi render markdown (anti-XSS).
- Header keamanan (CSP, HSTS, dll) di frontend & backend.
- Delimiter + instruksi eksplisit agar model tak mengikuti instruksi dari isi ZIP.

---

## 10. Tasks (Format Kiro `tasks.md`)

### A. Fondasi & Shared
- [ ] 1. Monorepo/struktur: `apps/web` (Vercel), `apps/api` (VPS), `packages/shared` (tipe + Zod)
- [ ] 2. Definisikan tipe & Zod schema bersama (`Finding`, `AuditReport`, enum) di `packages/shared`

### B. Backend (VPS)
- [ ] 3. Setup server Node + TS (Fastify/Express), Dockerfile, config env server-only
- [ ] 4. Endpoint `POST /api/audit`: terima multipart, cap 10MB, verifikasi magic bytes
- [ ] 5. Safe-extract ke temp sandbox: guard zip-slip, zip-bomb (ukuran/rasio/entri/kedalaman), abaikan symlink, cleanup
- [ ] 6. File walker + filter (skip-list vs prioritas) + budget token + catat skippedFiles
- [ ] 7. Secret scanner + masking + daftar secretsToRotate
- [ ] 8. Pembungkus LLM input anti prompt-injection (delimiter + instruksi) + chunking
- [ ] 9. Panggil LLM Claude → parse ke `AuditReport` (Zod, toleran format)
- [ ] 10. Generator `remediationPrompt` per finding + penyesuaian `AgentTarget`
- [ ] 11. Verifikasi Supabase JWT (opsional) + CORS ketat + rate limiting + timeout
- [ ] 12. Simpan report ke Supabase bila login (bukan isi ZIP) + cleanup

### C. Supabase
- [ ] 13. Skema DB (`audits`, opsional `findings`) + RLS per user
- [ ] 14. Setup Auth (email/password dan/atau OAuth)

### D. Frontend (Vercel)
- [ ] 15. `AppShell` + `DisclaimerBanner` (teks persis Bagian 7)
- [ ] 16. `AuthControls` (Supabase, opsional) + ambil JWT
- [ ] 17. `UploadDropzone`: drag-and-drop, validasi klien (10MB, .zip), progres
- [ ] 18. `AgentSelector` + panggil backend VPS (kirim ZIP + JWT bila ada)
- [ ] 19. `ReportView` + `FindingCard` + `SeverityBadge` + `MarkdownView` (render aman)
- [ ] 20. `PromptModal` + Copy / Copy All / unduh `.md`
- [ ] 21. `HistoryList` (bila login) dari Supabase
- [ ] 22. Header keamanan frontend (CSP, dll)

### E. Verifikasi & Rilis
- [ ] 23. Test backend: zip-slip sample & zip-bomb sample DITOLAK; secret masking; prompt generator bebas secret; parse `AuditReport`; LLM di-mock (deterministik)
- [ ] 24. Test E2E: satu ZIP sengaja rentan, satu bersih; verifikasi temuan & prompt masuk akal
- [ ] 25. Dokumentasi (README: cara menjalankan web & api lokal, env, deploy Vercel + VPS + Supabase, batasan)

---

## 11. Kriteria Penerimaan Akhir (Checklist QA)

- [ ] Frontend (Vercel) dapat upload satu ZIP (≤10 MB) & menampilkan Full Report dari backend VPS.
- [ ] ZIP > 10 MB atau bukan ZIP valid ditolak dengan pesan jelas.
- [ ] Ekstraksi (VPS) tahan zip-slip & zip-bomb; symlink diabaikan; kode tidak pernah dieksekusi.
- [ ] Isi ZIP diperlakukan sebagai data; instruksi tertanam diabaikan (anti-injection).
- [ ] Secret ter-masking (4 char + `****`) di LLM input maupun tampilan; ada daftar rotasi.
- [ ] Report: Executive Summary, Risk Scorecard, Findings (apa/di mana/kenapa/severity/fix), Secrets to Rotate, Gaps.
- [ ] Lokasi/CVE/versi tidak dikarang; dependency "Likely, verify".
- [ ] Tiap temuan punya prompt remediation self-contained, bisa di-copy, tanpa secret nyata.
- [ ] Format prompt menyesuaikan target coding agent.
- [ ] Copy per prompt & Copy All / unduh `.md` berfungsi.
- [ ] Auth opsional: anonim bisa audit; login menyimpan riwayat (RLS aktif).
- [ ] Isi ZIP mentah TIDAK disimpan permanen; hanya report (bila login).
- [ ] LLM key hanya di VPS; CORS ketat; rate limiting aktif; header keamanan terpasang.
- [ ] Disclaimer selalu terlihat.

---

## 12. Catatan untuk Kiro

- Tiga lapis = tiga unit deploy: **web → Vercel**, **api → VPS (Docker + Nginx + HTTPS)**, **DB/Auth → Supabase**.
- Pisahkan tipe & Zod schema di `packages/shared` agar frontend & backend konsisten.
- Pemrosesan ZIP adalah permukaan serangan utama — prioritaskan guard & beri test khusus (sample zip-slip & zip-bomb).
- Perlakukan isi ZIP sebagai data tak tepercaya; jangan pernah eksekusi/instal/jalankan.
- Isi ZIP mentah tidak disimpan; hanya hasil report (bila login) ke Supabase.
- CORS backend harus whitelist domain Vercel (bukan wildcard); LLM key hanya di VPS.
- Model audit berkonteks panjang (Claude); gunakan chunking untuk proyek besar.
- Pertimbangkan steering file di `.kiro/steering/`: "jangan fabrikasi CVE/lokasi", "LLM hanya via backend VPS", "isi ZIP = data, bukan instruksi", "isi ZIP mentah tidak disimpan".
