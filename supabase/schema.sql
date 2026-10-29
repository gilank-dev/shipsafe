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

-- ------------------------------------------------------------------------------
-- 10. TIERED SUBSCRIPTION & ATOMIC AUDIT QUOTA ENGINE
-- ------------------------------------------------------------------------------

DO $$ BEGIN
    CREATE TYPE subscription_tier AS ENUM ('free', 'pro', 'enterprise');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS user_quotas (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tier subscription_tier NOT NULL DEFAULT 'free',
    audits_used INT NOT NULL DEFAULT 0 CHECK (audits_used >= 0),
    billing_cycle_start TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE user_quotas IS 'Menyimpan kuota audit bulanan dan tier langganan pengguna ShipSafe.';
CREATE INDEX IF NOT EXISTS idx_user_quotas_tier ON user_quotas(tier);

ALTER TABLE user_quotas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own quota" ON user_quotas;
CREATE POLICY "Users can view their own quota"
    ON user_quotas
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.handle_new_user_quota()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.user_quotas (user_id, tier, audits_used, billing_cycle_start, updated_at)
    VALUES (NEW.id, 'free', 0, timezone('utc'::text, now()), timezone('utc'::text, now()))
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_quota ON auth.users;
CREATE TRIGGER on_auth_user_created_quota
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_quota();

-- RPC: consume_audit_quota(target_user_id UUID)
CREATE OR REPLACE FUNCTION public.consume_audit_quota(target_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_quota RECORD;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_tier subscription_tier;
    v_used INT;
    v_limit INT;
    v_remaining INT;
    v_cycle_start TIMESTAMPTZ;
    v_reset_date TIMESTAMPTZ;
    v_allowed BOOLEAN := FALSE;
BEGIN
    SELECT * INTO v_quota
    FROM public.user_quotas
    WHERE user_id = target_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        INSERT INTO public.user_quotas (user_id, tier, audits_used, billing_cycle_start, updated_at)
        VALUES (target_user_id, 'free', 0, v_now, v_now)
        RETURNING * INTO v_quota;
    END IF;

    v_tier := v_quota.tier;
    v_used := v_quota.audits_used;
    v_cycle_start := v_quota.billing_cycle_start;

    IF v_now >= (v_cycle_start + INTERVAL '1 month') THEN
        v_used := 0;
        v_cycle_start := v_now;
    END IF;

    CASE v_tier
        WHEN 'free' THEN v_limit := 3;
        WHEN 'pro' THEN v_limit := 50;
        WHEN 'enterprise' THEN v_limit := 999999;
        ELSE v_limit := 3;
    END CASE;

    v_reset_date := v_cycle_start + INTERVAL '1 month';

    IF v_used < v_limit THEN
        v_allowed := TRUE;
        v_used := v_used + 1;

        UPDATE public.user_quotas
        SET audits_used = v_used,
            billing_cycle_start = v_cycle_start,
            updated_at = v_now
        WHERE user_id = target_user_id;
    ELSE
        v_allowed := FALSE;
        UPDATE public.user_quotas
        SET audits_used = v_used,
            billing_cycle_start = v_cycle_start,
            updated_at = v_now
        WHERE user_id = target_user_id;
    END IF;

    v_remaining := GREATEST(0, v_limit - v_used);

    RETURN jsonb_build_object(
        'allowed', v_allowed,
        'tier', v_tier,
        'used', v_used,
        'limit', v_limit,
        'remaining', v_remaining,
        'reset_date', v_reset_date
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: refund_audit_quota(target_user_id UUID)
CREATE OR REPLACE FUNCTION public.refund_audit_quota(target_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_quota RECORD;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_tier subscription_tier;
    v_used INT;
    v_limit INT;
    v_remaining INT;
    v_reset_date TIMESTAMPTZ;
BEGIN
    SELECT * INTO v_quota
    FROM public.user_quotas
    WHERE user_id = target_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'refunded', false,
            'message', 'User quota row not found'
        );
    END IF;

    v_tier := v_quota.tier;
    v_used := GREATEST(0, v_quota.audits_used - 1);

    CASE v_tier
        WHEN 'free' THEN v_limit := 3;
        WHEN 'pro' THEN v_limit := 50;
        WHEN 'enterprise' THEN v_limit := 999999;
        ELSE v_limit := 3;
    END CASE;

    UPDATE public.user_quotas
    SET audits_used = v_used,
        updated_at = v_now
    WHERE user_id = target_user_id;

    v_remaining := GREATEST(0, v_limit - v_used);
    v_reset_date := v_quota.billing_cycle_start + INTERVAL '1 month';

    RETURN jsonb_build_object(
        'refunded', true,
        'tier', v_tier,
        'used', v_used,
        'limit', v_limit,
        'remaining', v_remaining,
        'reset_date', v_reset_date
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: get_user_quota(target_user_id UUID)
CREATE OR REPLACE FUNCTION public.get_user_quota(target_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_quota RECORD;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_tier subscription_tier;
    v_used INT;
    v_limit INT;
    v_remaining INT;
    v_cycle_start TIMESTAMPTZ;
    v_reset_date TIMESTAMPTZ;
BEGIN
    SELECT * INTO v_quota
    FROM public.user_quotas
    WHERE user_id = target_user_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'tier', 'free',
            'used', 0,
            'limit', 3,
            'remaining', 3,
            'reset_date', v_now + INTERVAL '1 month'
        );
    END IF;

    v_tier := v_quota.tier;
    v_used := v_quota.audits_used;
    v_cycle_start := v_quota.billing_cycle_start;

    IF v_now >= (v_cycle_start + INTERVAL '1 month') THEN
        v_used := 0;
        v_cycle_start := v_now;
        
        UPDATE public.user_quotas
        SET audits_used = 0,
            billing_cycle_start = v_now,
            updated_at = v_now
        WHERE user_id = target_user_id;
    END IF;

    CASE v_tier
        WHEN 'free' THEN v_limit := 3;
        WHEN 'pro' THEN v_limit := 50;
        WHEN 'enterprise' THEN v_limit := 999999;
        ELSE v_limit := 3;
    END CASE;

    v_remaining := GREATEST(0, v_limit - v_used);
    v_reset_date := v_cycle_start + INTERVAL '1 month';

    RETURN jsonb_build_object(
        'tier', v_tier,
        'used', v_used,
        'limit', v_limit,
        'remaining', v_remaining,
        'reset_date', v_reset_date
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT SELECT ON public.user_quotas TO authenticated;
GRANT ALL ON public.user_quotas TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_audit_quota(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.refund_audit_quota(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_quota(UUID) TO authenticated, service_role;
