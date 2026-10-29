-- ==============================================================================
-- ShipSafe - Pre-Deployment Security Gatekeeper Database Schema
-- Supabase Postgres Schema with Row Level Security (RLS) & Performance Indexes
-- ==============================================================================

-- Enable UUID extension if not already available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. TABLE: audits
-- Menyimpan metadata eksekutif dari hasil pemindaian proyek.
-- Riwayat audit hanya disimpan bila pengguna terautentikasi (login).
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_name TEXT NOT NULL,
    summary TEXT NOT NULL,
    counts_by_severity JSONB NOT NULL,
    scorecard JSONB NOT NULL,
    secrets_to_rotate JSONB DEFAULT '[]'::jsonb,
    not_assessed JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

COMMENT ON TABLE audits IS 'Menyimpan riwayat laporan audit keamanan proyek ShipSafe per pengguna.';
COMMENT ON COLUMN audits.id IS 'ID unik audit (UUID v4).';
COMMENT ON COLUMN audits.user_id IS 'ID pengguna Supabase Auth pemilik audit (auth.users).';
COMMENT ON COLUMN audits.project_name IS 'Nama proyek atau nama file ZIP yang diaudit.';
COMMENT ON COLUMN audits.summary IS 'Executive summary hasil pemindaian.';
COMMENT ON COLUMN audits.counts_by_severity IS 'Distribusi jumlah temuan per tingkat keparahan {"Critical": 0, "High": 1, ...}.';
COMMENT ON COLUMN audits.scorecard IS 'Skor matriks per area (Secrets, Dependencies, HTTP, Code).';
COMMENT ON COLUMN audits.secrets_to_rotate IS 'Daftar rahasia/kredensial yang terdeteksi dan wajib dirotasi (nilai di-masking).';
COMMENT ON COLUMN audits.not_assessed IS 'Daftar berkas/area yang dilewati saat analisis (mis. binary, file > batas).';
COMMENT ON COLUMN audits.created_at IS 'Waktu pembuatan audit.';

-- ------------------------------------------------------------------------------
-- 2. TABLE: findings
-- Menyimpan detail setiap temuan kerentanan spesifik yang terhubung ke audit.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS findings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_id UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
    finding_code TEXT NOT NULL, -- F-001, F-002, dll.
    title TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('Critical', 'High', 'Medium', 'Low', 'Info')),
    area TEXT NOT NULL CHECK (area IN ('Secrets', 'Dependencies', 'HTTP', 'Code')),
    location JSONB, -- { "file": "src/api/auth.ts", "line": 42, "snippet": "..." }
    what TEXT NOT NULL,
    why TEXT NOT NULL,
    recommended_fix TEXT NOT NULL,
    verify_with TEXT,
    remediation_prompt TEXT NOT NULL,
    confidence TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

COMMENT ON TABLE findings IS 'Menyimpan detail temuan masalah keamanan individual untuk setiap audit.';
COMMENT ON COLUMN findings.id IS 'ID unik temuan.';
COMMENT ON COLUMN findings.audit_id IS 'Foreign key merujuk ke tabel audits.';
COMMENT ON COLUMN findings.finding_code IS 'Kode identifikasi temuan seperti F-001, F-002.';
COMMENT ON COLUMN findings.title IS 'Judul ringkas temuan kerentanan.';
COMMENT ON COLUMN findings.severity IS 'Tingkat keparahan (Critical, High, Medium, Low, Info).';
COMMENT ON COLUMN findings.area IS 'Area audit (Secrets, Dependencies, HTTP, Code).';
COMMENT ON COLUMN findings.location IS 'Informasi lokasi berkas, nomor baris, dan cuplikan kode dalam format JSON.';
COMMENT ON COLUMN findings.what IS 'Penjelasan detail apa masalah keamanan yang terdeteksi.';
COMMENT ON COLUMN findings.why IS 'Penjelasan mengapa masalah ini berbahaya dan risiko eksploitasinya.';
COMMENT ON COLUMN findings.recommended_fix IS 'Langkah perbaikan teknis yang direkomendasikan.';
COMMENT ON COLUMN findings.verify_with IS 'Perintah atau tool pengujian untuk memverifikasi perbaikan (mis. npm audit, curl).';
COMMENT ON COLUMN findings.remediation_prompt IS 'Prompt siap-tempel untuk coding assistant AI (Cursor, Claude Code, Windsurf, Copilot).';
COMMENT ON COLUMN findings.confidence IS 'Tingkat keyakinan deteksi (High, Medium, Low).';

-- ------------------------------------------------------------------------------
-- 3. INDEXES
-- Optimalisasi query riwayat audit per user dan filter temuan per audit & severity.
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_audits_user_created 
    ON audits(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_findings_audit_severity 
    ON findings(audit_id, severity);

CREATE INDEX IF NOT EXISTS idx_findings_audit_id 
    ON findings(audit_id);

-- ------------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS)
-- Memastikan isolasi data multi-tenant: pengguna hanya dapat mengakses datanya sendiri.
-- ------------------------------------------------------------------------------
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE findings ENABLE ROW LEVEL SECURITY;

-- Policy: audits
-- Hanya pemilik (auth.uid() = user_id) yang dapat membaca riwayat auditnya
DROP POLICY IF EXISTS "Users can view their own audits" ON audits;
CREATE POLICY "Users can view their own audits"
    ON audits
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Pengguna terautentikasi dapat membuat riwayat audit miliknya
DROP POLICY IF EXISTS "Users can insert their own audits" ON audits;
CREATE POLICY "Users can insert their own audits"
    ON audits
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Pengguna dapat mengupdate audit miliknya jika diperlukan
DROP POLICY IF EXISTS "Users can update their own audits" ON audits;
CREATE POLICY "Users can update their own audits"
    ON audits
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Pengguna dapat menghapus riwayat audit miliknya (menghapus findings via CASCADE)
DROP POLICY IF EXISTS "Users can delete their own audits" ON audits;
CREATE POLICY "Users can delete their own audits"
    ON audits
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Policy: findings
-- Pengguna hanya dapat membaca temuan dari audit miliknya
DROP POLICY IF EXISTS "Users can view findings for their own audits" ON findings;
CREATE POLICY "Users can view findings for their own audits"
    ON findings
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM audits
            WHERE audits.id = findings.audit_id
              AND audits.user_id = auth.uid()
        )
    );

-- Pengguna dapat menyisipkan temuan ke audit miliknya
DROP POLICY IF EXISTS "Users can insert findings for their own audits" ON findings;
CREATE POLICY "Users can insert findings for their own audits"
    ON findings
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM audits
            WHERE audits.id = findings.audit_id
              AND audits.user_id = auth.uid()
        )
    );

-- Pengguna dapat menghapus temuan dari audit miliknya
DROP POLICY IF EXISTS "Users can delete findings for their own audits" ON findings;
CREATE POLICY "Users can delete findings for their own audits"
    ON findings
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM audits
            WHERE audits.id = findings.audit_id
              AND audits.user_id = auth.uid()
        )
    );

-- ------------------------------------------------------------------------------
-- 5. TABLE: audit_diffs
-- Menyimpan hasil komparasi audit (sebelum vs sesudah perbaikan kode/re-audit).
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_diffs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    base_audit_id UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
    target_audit_id UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
    score_before NUMERIC(3,1) NOT NULL,
    score_after NUMERIC(3,1) NOT NULL,
    score_delta NUMERIC(3,1) NOT NULL,
    resolved_findings JSONB NOT NULL DEFAULT '[]'::jsonb,
    persistent_findings JSONB NOT NULL DEFAULT '[]'::jsonb,
    regressed_findings JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE audit_diffs IS 'Menyimpan riwayat perbandingan audit sebelum dan sesudah remediasi kode.';

-- ------------------------------------------------------------------------------
-- 6. TABLE: cli_tokens
-- Menyimpan token akses developer untuk integrasi CLI & CI/CD Gatekeeper.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cli_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    token_preview TEXT NOT NULL,
    label TEXT NOT NULL DEFAULT 'Default CLI Token',
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE cli_tokens IS 'Menyimpan metadata token autentikasi CLI dan CI/CD.';

-- ------------------------------------------------------------------------------
-- 7. ADDITIONAL INDEXES
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_audit_diffs_user 
    ON audit_diffs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cli_tokens_user 
    ON cli_tokens(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cli_tokens_hash 
    ON cli_tokens(token_hash);

-- ------------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY (RLS) FOR NEW TABLES
-- ------------------------------------------------------------------------------
ALTER TABLE audit_diffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cli_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: audit_diffs
DROP POLICY IF EXISTS "Users can manage their own audit diffs" ON audit_diffs;
CREATE POLICY "Users can manage their own audit diffs"
    ON audit_diffs
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: cli_tokens
DROP POLICY IF EXISTS "Users can manage their own CLI tokens" ON cli_tokens;
CREATE POLICY "Users can manage their own CLI tokens"
    ON cli_tokens
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 9. GRANTS & PERMISSIONS
-- Memberikan akses tabel kepada peran authenticated dan service_role
-- ------------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON audits TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON findings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON audit_diffs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON cli_tokens TO authenticated;

GRANT ALL ON audits TO service_role;
GRANT ALL ON findings TO service_role;
GRANT ALL ON audit_diffs TO service_role;
GRANT ALL ON cli_tokens TO service_role;
