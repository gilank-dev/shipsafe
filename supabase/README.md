# 🛡️ ShipSafe - Supabase Database & Security Guide

Dokumen ini berisi panduan lengkap implementasi database PostgreSQL, Row Level Security (RLS), autentikasi Supabase, dan konfigurasi environment variable untuk **ShipSafe** (Frontend, Backend VPS, dan AI Gateway).

---

## 📋 Ikhtisar Arsitektur Data

ShipSafe menggunakan model autentikasi opsional:
1. **Pengguna Anonim**: Dapat mengunggah ZIP dan menjalankan pemindaian keamanan secara instan. Laporan hanya tersimpan dalam sesi lokal browser pengguna.
2. **Pengguna Terautentikasi (Login)**: Hasil audit dan seluruh temuan (*findings*) disimpan ke Supabase PostgreSQL dengan pengamanan ketat menggunakan Row Level Security (RLS). Pengguna dapat melihat dan mengelola riwayat audit masa lalu mereka kapan saja.
3. **Zero Retention Policy**: **Berkas ZIP mentah dan source code proyek TIDAK PERNAH disimpan permanen** ke Supabase maupun disk VPS. Hanya metadata hasil laporan (`audits`) dan temuan (`findings`) yang tersimpan.

---

## 🗄️ Struktur Database (`supabase/schema.sql`)

### 1. Tabel `audits`
Menyimpan ringkasan eksekutif laporan pemindaian proyek.
- `id` (UUID, Primary Key): ID unik audit.
- `user_id` (UUID, Foreign Key -> `auth.users(id)`): ID pemilik audit. Dihapus otomatis via `ON DELETE CASCADE` bila akun dihapus.
- `project_name` (TEXT): Nama proyek atau nama arsip ZIP.
- `summary` (TEXT): Ringkasan eksekutif risiko keamanan.
- `counts_by_severity` (JSONB): Distribusi jumlah temuan `{ "Critical": 0, "High": 2, ... }`.
- `scorecard` (JSONB): Matriks skor 0-10 per area (`Secrets`, `Dependencies`, `HTTP`, `Code`).
- `secrets_to_rotate` (JSONB): Kredensial terdeteksi yang harus dirotasi (nilai telah di-masking).
- `not_assessed` (JSONB): Berkas/cakupan yang dilewati selama audit.
- `created_at` (TIMESTAMPTZ): Timestamp pembuatan laporan.

### 2. Tabel `findings`
Menyimpan detail setiap kerentanan individual yang terhubung ke sebuah audit.
- `id` (UUID, Primary Key): ID unik temuan.
- `audit_id` (UUID, Foreign Key -> `audits(id)`): ID audit relasi (ON DELETE CASCADE).
- `finding_code` (TEXT): Kode referensi (misal `F-001`, `F-002`).
- `title` (TEXT): Judul masalah keamanan.
- `severity` (TEXT): `'Critical' | 'High' | 'Medium' | 'Low' | 'Info'`.
- `area` (TEXT): `'Secrets' | 'Dependencies' | 'HTTP' | 'Code'`.
- `location` (JSONB): `{ "file": "src/api.ts", "line": 42, "snippet": "..." }`.
- `what` (TEXT): Deskripsi masalah.
- `why` (TEXT): Dampak dan risiko eksploitasi.
- `recommended_fix` (TEXT): Panduan perbaikan teknis.
- `verify_with` (TEXT): Perintah verifikasi (misal `npm audit`, `trufflehog`).
- `remediation_prompt` (TEXT): Prompt siap pakai untuk AI coding agent (Cursor, Claude Code, Windsurf, Copilot).
- `confidence` (TEXT): Keyakinan deteksi.
- `created_at` (TIMESTAMPTZ): Timestamp pembuatan temuan.

### 3. Keamanan & Row Level Security (RLS)
- RLS diaktifkan (`ENABLE ROW LEVEL SECURITY`) pada seluruh tabel: `audits`, `findings`, `audit_diffs`, `cli_tokens`, `user_quotas`, `organizations`, `user_profiles`, `organization_invites`.
- **Isolasi Penuh Multi-tenant**: Pengguna hanya dapat melakukan `SELECT`, `INSERT`, `UPDATE`, dan `DELETE` pada baris miliknya (`auth.uid() = user_id`) dan relasi terverifikasi.
- **Validasi Cross-Tenant pada Diffs**: Tabel `audit_diffs` menerapkan verifikasi ketat bahwa `base_audit_id` dan `target_audit_id` wajib milik `auth.uid()`.
- **Proteksi Mutasi Profil**: Trigger `trg_protect_user_profile` mencegah pengguna biasa mengubah tier, status suspensi, kuota, atau hak Super Admin secara sepihak dari client.
- **Otorisasi RPC Kuota**:
  - `consume_audit_quota`: Dilindungi verifikasi kepemilikan tenant dan row locking (`FOR UPDATE`) dengan lazy monthly reset (1 bulan).
  - `get_user_quota`: Hanya mengembalikan data kuota milik pemanggil atau diizinkan jika pemanggil adalah Super Admin.
  - `refund_audit_quota`: **Dicabut sepenuhnya dari akses client/authenticated**, hanya dapat dieksekusi secara eksklusif oleh backend melalui `service_role`.
- **Service Role**: Backend VPS menggunakan `SUPABASE_SERVICE_ROLE_KEY` bila perlu melakukan persistensi langsung dari server dengan aman tanpa melanggar batasan pengguna anonim.

### 4. Indeks Kinerja
- `idx_audits_user_created`: Mempercepat query riwayat audit per pengguna (`user_id, created_at DESC`).
- `idx_findings_audit_severity`: Mempercepat query dan filter temuan berdasarkan audit dan tingkat keparahan (`audit_id, severity`).
- `idx_findings_audit_id`: Mengoptimalkan join antara `audits` dan `findings`.

---

## 🛠️ Langkah-langkah Setup di Supabase Dashboard

### Langkah 1: Buat Proyek Baru
1. Kunjungi [Supabase Dashboard](https://supabase.com/dashboard) dan klik **New Project**.
2. Masukkan nama proyek (misal `ShipSafe-Production` atau `ShipSafe-Dev`).
3. Pilih wilayah (region) terdekat (misal `Singapore (ap-southeast-1)` atau `Frankfurt (eu-central-1)` sesuai lokasi target VPS).
4. Buat kata sandi database yang kuat dan simpan di password manager.

### Langkah 2: Jalankan Skema Database

> [!IMPORTANT]
> **Sumber kebenaran skema adalah folder [`supabase/migrations/`](./migrations)** — BUKAN `schema.sql` (file itu hanyalah snapshot legacy yang tidak lagi dirawat).
> Semua perubahan skema wajib masuk sebagai file migration baru.

Aturan wajib migration:
1. **Penamaan**: `<timestamp-14-digit>_<nama>.sql` (contoh: `20261029000003_shipsafe_v4_database_rls_hardening.sql`).
2. **Versi unik**: Supabase CLI mem-parsing versi HANYA dari digit di depan nama file. Dua file dengan digit depan sama akan **collision** dan gagal push. Gunakan timestamp 14-digit yang unik.
3. **Idempoten**: selalu gunakan `CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS`, dan `ADD COLUMN` kondisional — migration bisa di-re-run tanpa merusak data.
4. **Verifikasi otomatis**: CI (`.github/workflows/ci.yml`, job `migration-gate`) meng-apply seluruh migration ke Postgres bersih pada setiap push/PR dan menolak merge jika ada versi duplikat, tabel hilang, atau skema final menyimpang.

Cara apply ke produksi:
```bash
cd supabase
supabase db push --dry-run   # selalu lihat plan dulu
supabase db push             # baru apply
```
Jika history remote tidak sinkron dengan lokal, gunakan `supabase migration repair --status reverted|applied <version>` — JANGAN pernah mengedit history secara manual di database.

### Langkah 3: Konfigurasi Supabase Auth
1. Buka menu **Authentication** > **Providers**.
2. **Email Provider**:
   - Aktifkan toggle **Enable Email provider**.
   - Untuk tahap testing/prototipe cepat, Anda dapat menonaktifkan **Confirm email** (agar pengguna bisa langsung login setelah registrasi). Untuk production, disarankan tetap mengaktifkan konfirmasi email atau menghubungkan SMTP kustom (Resend/SendGrid).
3. **OAuth Providers (Opsional, sangat disarankan untuk developer tools)**:
   - Aktifkan **GitHub** provider:
     - Daftarkan OAuth App baru di GitHub Settings (`Developer settings` > `OAuth Apps`).
     - Masukkan Authorization callback URL dari Supabase ke GitHub App: `https://<project-ref>.supabase.co/auth/v1/callback`.
     - Masukkan `Client ID` dan `Client Secret` dari GitHub ke Supabase.
4. **URL Configuration (Redirect URLs)**:
   - Masuk ke **Authentication** > **URL Configuration**.
   - Atur **Site URL**:
     - Development: `http://localhost:5173`
     - Production: `https://shipsafe.vercel.app` (atau domain frontend Anda)
   - Tambahkan **Redirect URLs**:
     - `http://localhost:5173/**`
     - `http://localhost:5173/auth/callback`
     - `https://shipsafe.vercel.app/**`
     - `https://shipsafe.vercel.app/auth/callback`

### Langkah 4: Ambil API Keys
1. Buka **Project Settings** (ikon gerigi) > **API**.
2. Catat nilai-nilai berikut:
   - **Project URL**: `https://xxxxxxxxxxxxxxxx.supabase.co`
   - **anon public API key**: `eyJhbGciOiJI...` (digunakan pada Frontend)
   - **service_role secret API key**: `eyJhbGciOiJI...` (digunakan secara rahasia pada Backend VPS)
   - **JWT Secret**: Tersedia di bagian *JWT Settings* bila backend melakukan verifikasi JWT offline.

---

## ⚙️ Konfigurasi Environment Variables

### 1. Frontend (`frontend/.env`)
Konfigurasi antarmuka pengguna berbasis Vite/React:

```env
# Mode API: 'mock' untuk pengujian lokal tanpa backend, 'http' untuk integrasi penuh
VITE_API_MODE=http
VITE_API_BASE_URL=http://localhost:23010/api

# Latensi mock (hanya jika VITE_API_MODE=mock): 'normal' atau 'none'
VITE_MOCK_LATENCY=normal

# Supabase Auth & Client
VITE_SUPABASE_URL=https://<YOUR-PROJECT-REF>.supabase.co
VITE_SUPABASE_ANON_KEY=<YOUR-SUPABASE-ANON-KEY>
```

> [!NOTE]
> Pada deployment production di Vercel, ubah `VITE_API_BASE_URL` ke alamat backend VPS publik Anda, misalnya: `http://213.163.197.214:23010/api` atau domain HTTPS yang diarahkan ke backend (reverse proxy Caddy/Nginx).

---

### 2. Backend VPS (`backend/.env` atau `/home/tugaspai/shipsafe-api/.env`)
Konfigurasi runtime backend Express/Node.js di VPS:

```env
# Server Runtime
PORT=23010
NODE_ENV=production
CORS_ORIGIN=http://localhost:5173,https://shipsafe.vercel.app

# Batasan Keamanan Upload
MAX_ZIP_SIZE_MB=10

# Supabase Integration (Server-Side)
SUPABASE_URL=https://<YOUR-PROJECT-REF>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<YOUR-SUPABASE-SERVICE-ROLE-KEY>
SUPABASE_JWT_SECRET=<YOUR-SUPABASE-JWT-SECRET>

# AI API Gateway & LLM Engine
AI_BASE_URL=<YOUR-AI-GATEWAY-URL>
AI_API_KEY=<YOUR-AI-API-KEY>
AI_MODEL=hermes-agent
```

---

## 🔒 Best Practices Keamanan

1. **JANGAN PERNAH membocorkan `service_role` key**:
   - `SUPABASE_SERVICE_ROLE_KEY` memiliki hak akses tak terbatas dan mem-bypass RLS. Kunci ini **hanya boleh ada di VPS backend** dan tidak boleh di-commit ke Git atau dimasukkan ke berkas frontend.
2. **Validasi JWT di Backend**:
   - Ketika frontend mengirim header `Authorization: Bearer <supabase_jwt>`, backend memvalidasi token tersebut melalui library `@supabase/supabase-js` atau `jsonwebtoken` menggunakan `SUPABASE_JWT_SECRET`.
3. **Penyimpanan Bebas Data Mentah**:
   - Hanya objek JSON terstruktur (`audits` dan `findings`) yang disimpan.
   - Semua secret yang terdeteksi sebelum disimpan atau dikirim ke UI wajib melewati fungsi masking (`first 4 chars + ****`).
