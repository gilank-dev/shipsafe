-- ==============================================================================
-- ShipSafe v4.0 Database Schema & Row Level Security (RLS) Hardening Migration
-- File: supabase/migrations/20261029_shipsafe_v4_database_rls_hardening.sql
-- Idempotent PostgreSQL Migration for Supabase
-- ==============================================================================

-- 1. Ensure Required Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Ensure Types
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_tier') THEN
        CREATE TYPE subscription_tier AS ENUM ('free', 'pro', 'enterprise');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_status') THEN
        CREATE TYPE account_status AS ENUM ('active', 'suspended');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'org_role') THEN
        CREATE TYPE org_role AS ENUM ('owner', 'member');
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 3. ENSURE ALL TABLES EXIST WITH APPROPRIATE COLUMNS
-- ------------------------------------------------------------------------------

-- audits
CREATE TABLE IF NOT EXISTS public.audits (
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

-- findings
CREATE TABLE IF NOT EXISTS public.findings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_id UUID NOT NULL REFERENCES public.audits(id) ON DELETE CASCADE,
    finding_code TEXT NOT NULL,
    title TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('Critical', 'High', 'Medium', 'Low', 'Info')),
    area TEXT NOT NULL CHECK (area IN ('Secrets', 'Dependencies', 'HTTP', 'Code')),
    location JSONB,
    what TEXT NOT NULL,
    why TEXT NOT NULL,
    recommended_fix TEXT NOT NULL,
    verify_with TEXT,
    remediation_prompt TEXT NOT NULL,
    confidence TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- audit_diffs
CREATE TABLE IF NOT EXISTS public.audit_diffs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    base_audit_id UUID NOT NULL REFERENCES public.audits(id) ON DELETE CASCADE,
    target_audit_id UUID NOT NULL REFERENCES public.audits(id) ON DELETE CASCADE,
    score_before NUMERIC(3,1) NOT NULL,
    score_after NUMERIC(3,1) NOT NULL,
    score_delta NUMERIC(3,1) NOT NULL,
    resolved_findings JSONB NOT NULL DEFAULT '[]'::jsonb,
    persistent_findings JSONB NOT NULL DEFAULT '[]'::jsonb,
    regressed_findings JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- cli_tokens
CREATE TABLE IF NOT EXISTS public.cli_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    token_preview TEXT NOT NULL,
    label TEXT NOT NULL DEFAULT 'Default CLI Token',
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- user_quotas
CREATE TABLE IF NOT EXISTS public.user_quotas (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tier subscription_tier NOT NULL DEFAULT 'free',
    audits_used INT NOT NULL DEFAULT 0 CHECK (audits_used >= 0),
    billing_cycle_start TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- organizations
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    max_seats INT NOT NULL DEFAULT 5,
    whitelabel_company_name TEXT,
    whitelabel_org_name TEXT,
    whitelabel_logo_url TEXT,
    custom_prompt_rules TEXT,
    api_key_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Backward compatibility column alias
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'organizations' AND column_name = 'whitelabel_company_name') THEN
        ALTER TABLE public.organizations ADD COLUMN whitelabel_company_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'organizations' AND column_name = 'whitelabel_org_name') THEN
        ALTER TABLE public.organizations ADD COLUMN whitelabel_org_name TEXT;
    END IF;
END $$;

-- user_profiles
CREATE TABLE IF NOT EXISTS public.user_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    tier subscription_tier NOT NULL DEFAULT 'free',
    is_super_admin BOOLEAN NOT NULL DEFAULT FALSE,
    account_status account_status NOT NULL DEFAULT 'active',
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    org_role org_role DEFAULT NULL,
    audits_used INT NOT NULL DEFAULT 0,
    custom_quota_limit INT DEFAULT NULL,
    billing_cycle_start TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    last_audit_at TIMESTAMPTZ DEFAULT NULL,
    personal_api_key TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- organization_invites
CREATE TABLE IF NOT EXISTS public.organization_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    accepted_at TIMESTAMPTZ
);

-- redemption_codes
CREATE TABLE IF NOT EXISTS public.redemption_codes (
    code TEXT PRIMARY KEY,
    grant_type TEXT NOT NULL CHECK (grant_type IN ('pro_monthly', 'enterprise_monthly', 'bonus_quota')),
    bonus_audits INT DEFAULT 0,
    max_uses INT NOT NULL DEFAULT 1,
    uses INT NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ,
    redeemed_by TEXT[] DEFAULT ARRAY[]::TEXT[],
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by TEXT NOT NULL DEFAULT 'admin',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- scan_telemetry_logs
CREATE TABLE IF NOT EXISTS public.scan_telemetry_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    user_email TEXT NOT NULL,
    channel TEXT NOT NULL CHECK (channel IN ('WEB', 'CLI', 'MCP')),
    zip_size_bytes BIGINT NOT NULL DEFAULT 0,
    duration_ms INT NOT NULL DEFAULT 0,
    findings_count INT NOT NULL DEFAULT 0,
    severity_counts JSONB NOT NULL DEFAULT '{"Critical":0,"High":0,"Medium":0,"Low":0,"Info":0}'::jsonb,
    security_gate_status TEXT NOT NULL DEFAULT 'OK_COMPLETED'
);

-- admin_audit_logs
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_email TEXT,
    actor_id UUID,
    target_email TEXT,
    target_user_id UUID,
    action TEXT,
    action_type TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    diff JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Backward compatibility: materialize union schema on pre-existing admin_audit_logs
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'admin_audit_logs' AND column_name = 'actor_id') THEN
        ALTER TABLE public.admin_audit_logs ADD COLUMN actor_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'admin_audit_logs' AND column_name = 'target_user_id') THEN
        ALTER TABLE public.admin_audit_logs ADD COLUMN target_user_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'admin_audit_logs' AND column_name = 'action') THEN
        ALTER TABLE public.admin_audit_logs ADD COLUMN action TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'admin_audit_logs' AND column_name = 'metadata') THEN
        ALTER TABLE public.admin_audit_logs ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 4. PERFORMANCE INDEXES
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_audits_user_created ON public.audits(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_findings_audit_severity ON public.findings(audit_id, severity);
CREATE INDEX IF NOT EXISTS idx_findings_audit_id ON public.findings(audit_id);
CREATE INDEX IF NOT EXISTS idx_audit_diffs_user ON public.audit_diffs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cli_tokens_user ON public.cli_tokens(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cli_tokens_hash ON public.cli_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_user_quotas_tier ON public.user_quotas(tier);
CREATE INDEX IF NOT EXISTS idx_organizations_owner ON public.organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_org ON public.user_profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_tier ON public.user_profiles(tier);
CREATE INDEX IF NOT EXISTS idx_org_invites_org ON public.organization_invites(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_invites_email ON public.organization_invites(email);
CREATE INDEX IF NOT EXISTS idx_redemption_codes_active ON public.redemption_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_scan_telemetry_time ON public.scan_telemetry_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_admin_logs_time ON public.admin_audit_logs(created_at DESC);

-- ------------------------------------------------------------------------------
-- 5. MANDATORY ROW LEVEL SECURITY ENFORCEMENT ON EVERY TABLE
-- ------------------------------------------------------------------------------
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_diffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cli_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redemption_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_telemetry_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 6. STRICT TENANT DATA ISOLATION RLS POLICIES
-- ------------------------------------------------------------------------------

-- Helper Function: Check if current caller is a Super Admin
CREATE OR REPLACE FUNCTION public.is_current_user_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE user_id = auth.uid() AND is_super_admin = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- A. Policy: audits
DROP POLICY IF EXISTS "Users can view their own audits" ON public.audits;
CREATE POLICY "Users can view their own audits" ON public.audits
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id OR public.is_current_user_super_admin());

DROP POLICY IF EXISTS "Users can insert their own audits" ON public.audits;
CREATE POLICY "Users can insert their own audits" ON public.audits
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own audits" ON public.audits;
CREATE POLICY "Users can update their own audits" ON public.audits
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own audits" ON public.audits;
CREATE POLICY "Users can delete their own audits" ON public.audits
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id OR public.is_current_user_super_admin());

-- B. Policy: findings
DROP POLICY IF EXISTS "Users can view findings for their own audits" ON public.findings;
CREATE POLICY "Users can view findings for their own audits" ON public.findings
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.audits
            WHERE audits.id = findings.audit_id
              AND (audits.user_id = auth.uid() OR public.is_current_user_super_admin())
        )
    );

DROP POLICY IF EXISTS "Users can insert findings for their own audits" ON public.findings;
CREATE POLICY "Users can insert findings for their own audits" ON public.findings
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.audits
            WHERE audits.id = findings.audit_id
              AND audits.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete findings for their own audits" ON public.findings;
CREATE POLICY "Users can delete findings for their own audits" ON public.findings
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.audits
            WHERE audits.id = findings.audit_id
              AND (audits.user_id = auth.uid() OR public.is_current_user_super_admin())
        )
    );

-- Findings are immutable once created by the security engine: No UPDATE policy for authenticated clients.

-- C. Policy: audit_diffs (Hardened with Cross-Tenant Base/Target Audit Validation)
DROP POLICY IF EXISTS "Users can manage their own audit diffs" ON public.audit_diffs;
DROP POLICY IF EXISTS "Users can view their own audit diffs" ON public.audit_diffs;
CREATE POLICY "Users can view their own audit diffs" ON public.audit_diffs
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id OR public.is_current_user_super_admin());

DROP POLICY IF EXISTS "Users can insert their own audit diffs" ON public.audit_diffs;
CREATE POLICY "Users can insert their own audit diffs" ON public.audit_diffs
    FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (SELECT 1 FROM public.audits WHERE audits.id = audit_diffs.base_audit_id AND audits.user_id = auth.uid())
        AND EXISTS (SELECT 1 FROM public.audits WHERE audits.id = audit_diffs.target_audit_id AND audits.user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can delete their own audit diffs" ON public.audit_diffs;
CREATE POLICY "Users can delete their own audit diffs" ON public.audit_diffs
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id OR public.is_current_user_super_admin());

-- D. Policy: cli_tokens
DROP POLICY IF EXISTS "Users can manage their own CLI tokens" ON public.cli_tokens;
CREATE POLICY "Users can manage their own CLI tokens" ON public.cli_tokens
    FOR ALL TO authenticated
    USING (auth.uid() = user_id OR public.is_current_user_super_admin())
    WITH CHECK (auth.uid() = user_id);

-- E. Policy: user_quotas (Read-Only for Client; Mutations Strictly Handled by RPCs or service_role)
DROP POLICY IF EXISTS "Users can view their own quota" ON public.user_quotas;
CREATE POLICY "Users can view their own quota" ON public.user_quotas
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id OR public.is_current_user_super_admin());

-- F. Policy: organizations
DROP POLICY IF EXISTS "Members can view their own organization" ON public.organizations;
DROP POLICY IF EXISTS "Users can read own organization or if super admin" ON public.organizations;
CREATE POLICY "Members can view their own organization" ON public.organizations
    FOR SELECT TO authenticated
    USING (
        owner_id = auth.uid()
        OR id IN (SELECT organization_id FROM public.user_profiles WHERE user_id = auth.uid())
        OR public.is_current_user_super_admin()
    );

DROP POLICY IF EXISTS "Users can create their own organization" ON public.organizations;
CREATE POLICY "Users can create their own organization" ON public.organizations
    FOR INSERT TO authenticated
    WITH CHECK (
        owner_id = auth.uid()
        OR public.is_current_user_super_admin()
    );

DROP POLICY IF EXISTS "Owners and admins can update their organization" ON public.organizations;
DROP POLICY IF EXISTS "Owner or super admin can update organization" ON public.organizations;
CREATE POLICY "Owners and admins can update their organization" ON public.organizations
    FOR UPDATE TO authenticated
    USING (
        owner_id = auth.uid()
        OR public.is_current_user_super_admin()
    )
    WITH CHECK (
        owner_id = auth.uid()
        OR public.is_current_user_super_admin()
    );

DROP POLICY IF EXISTS "Owners and admins can delete their organization" ON public.organizations;
CREATE POLICY "Owners and admins can delete their organization" ON public.organizations
    FOR DELETE TO authenticated
    USING (
        owner_id = auth.uid()
        OR public.is_current_user_super_admin()
    );

-- G. Policy: user_profiles
DROP POLICY IF EXISTS "Users can view their own profile or team profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can read own profile and team members" ON public.user_profiles;
CREATE POLICY "Users can read own profile and team members" ON public.user_profiles
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid()
        OR organization_id IN (SELECT organization_id FROM public.user_profiles WHERE user_id = auth.uid())
        OR public.is_current_user_super_admin()
    );

DROP POLICY IF EXISTS "Users can update their own profile name" ON public.user_profiles;
DROP POLICY IF EXISTS "Super admin can update all profiles" ON public.user_profiles;
CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid() OR public.is_current_user_super_admin())
    WITH CHECK (user_id = auth.uid() OR public.is_current_user_super_admin());

-- Privilege Escalation Guard on user_profiles UPDATE
CREATE OR REPLACE FUNCTION public.protect_user_profile_privileged_fields()
RETURNS TRIGGER AS $$
DECLARE
    v_is_super BOOLEAN := FALSE;
BEGIN
    -- service_role key can update any field
    IF current_setting('request.jwt.claim.role', true) = 'service_role' OR auth.role() = 'service_role' THEN
        RETURN NEW;
    END IF;

    -- Check if current user is verified Super Admin
    SELECT is_super_admin INTO v_is_super
    FROM public.user_profiles
    WHERE user_id = auth.uid();

    IF v_is_super IS TRUE THEN
        RETURN NEW;
    END IF;

    -- Non-superadmin users CANNOT modify privileged columns
    IF NEW.tier IS DISTINCT FROM OLD.tier THEN
        RAISE EXCEPTION 'Privilege violation: cannot modify subscription tier directly.';
    END IF;
    IF NEW.audits_used IS DISTINCT FROM OLD.audits_used THEN
        RAISE EXCEPTION 'Privilege violation: cannot modify audits_used directly.';
    END IF;
    IF NEW.custom_quota_limit IS DISTINCT FROM OLD.custom_quota_limit THEN
        RAISE EXCEPTION 'Privilege violation: cannot modify custom_quota_limit directly.';
    END IF;
    IF NEW.is_super_admin IS DISTINCT FROM OLD.is_super_admin THEN
        RAISE EXCEPTION 'Privilege violation: cannot modify is_super_admin directly.';
    END IF;
    IF NEW.account_status IS DISTINCT FROM OLD.account_status THEN
        RAISE EXCEPTION 'Privilege violation: cannot modify account_status directly.';
    END IF;
    IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
        RAISE EXCEPTION 'Privilege violation: organization assignment must occur through team invite acceptance.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_user_profile ON public.user_profiles;
CREATE TRIGGER trg_protect_user_profile
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_user_profile_privileged_fields();

-- H. Policy: organization_invites
DROP POLICY IF EXISTS "Org members and super admin can view invites" ON public.organization_invites;
CREATE POLICY "Org members and super admin can view invites" ON public.organization_invites
    FOR SELECT TO authenticated
    USING (
        invited_by = auth.uid()
        OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
        OR organization_id IN (SELECT organization_id FROM public.user_profiles WHERE user_id = auth.uid())
        OR public.is_current_user_super_admin()
    );

DROP POLICY IF EXISTS "Org owners can manage invites" ON public.organization_invites;
CREATE POLICY "Org owners can manage invites" ON public.organization_invites
    FOR INSERT TO authenticated
    WITH CHECK (
        invited_by = auth.uid()
        AND (
            EXISTS (SELECT 1 FROM public.organizations WHERE id = organization_invites.organization_id AND owner_id = auth.uid())
            OR public.is_current_user_super_admin()
        )
    );

-- I. Policy: redemption_codes (Voucher Security - Restricted from Public/Anon Reading)
DROP POLICY IF EXISTS "Admins can view vouchers" ON public.redemption_codes;
CREATE POLICY "Admins can view vouchers" ON public.redemption_codes
    FOR ALL TO authenticated
    USING (public.is_current_user_super_admin())
    WITH CHECK (public.is_current_user_super_admin());

-- J. Policy: scan_telemetry_logs
DROP POLICY IF EXISTS "Admins can view telemetry" ON public.scan_telemetry_logs;
CREATE POLICY "Admins can view telemetry" ON public.scan_telemetry_logs
    FOR SELECT TO authenticated
    USING (public.is_current_user_super_admin());

-- K. Policy: admin_audit_logs
DROP POLICY IF EXISTS "Admins can view admin logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can view admin logs" ON public.admin_audit_logs
    FOR SELECT TO authenticated
    USING (public.is_current_user_super_admin());

-- ------------------------------------------------------------------------------
-- 7. HARDENED ATOMIC QUOTA RPCs (ROW-LEVEL LOCKING & CALLER AUTHORIZATION)
-- ------------------------------------------------------------------------------

-- RPC: consume_audit_quota(target_user_id UUID)
CREATE OR REPLACE FUNCTION public.consume_audit_quota(target_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_profile RECORD;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_effective_tier subscription_tier;
    v_used INT;
    v_limit INT;
    v_remaining INT;
    v_cycle_start TIMESTAMPTZ;
    v_reset_date TIMESTAMPTZ;
    v_allowed BOOLEAN := FALSE;
BEGIN
    -- Security Check: When called by authenticated user, must be consuming their own quota
    IF auth.role() = 'authenticated' AND auth.uid() IS NOT NULL AND auth.uid() <> target_user_id THEN
        IF NOT public.is_current_user_super_admin() THEN
            RETURN jsonb_build_object(
                'allowed', false,
                'code', 'UNAUTHORIZED_QUOTA_CONSUMPTION',
                'message', 'Access denied: cannot consume audit quota on behalf of another user account.'
            );
        END IF;
    END IF;

    -- Row-Level Lock: FOR UPDATE prevents concurrent double-consumption
    SELECT * INTO v_profile
    FROM public.user_profiles
    WHERE user_id = target_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        -- Auto bootstrap profile if record not present
        INSERT INTO public.user_profiles (user_id, email, full_name, tier, audits_used, billing_cycle_start, updated_at)
        VALUES (target_user_id, 'user@shipsafe.dev', 'ShipSafe User', 'free', 0, v_now, v_now)
        RETURNING * INTO v_profile;
    END IF;

    -- Suspension Check
    IF v_profile.account_status = 'suspended' THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'code', 'ACCOUNT_SUSPENDED',
            'suspended', true,
            'effective_tier', v_profile.tier,
            'used', v_profile.audits_used,
            'limit', 0,
            'remaining', 0,
            'message', 'Akun Anda sedang disuspensi. Hubungi admin di 082124153732 untuk bantuan.'
        );
    END IF;

    -- Organization Benefits Inheritance: Team members inherit Enterprise tier
    IF v_profile.organization_id IS NOT NULL THEN
        v_effective_tier := 'enterprise';
    ELSE
        v_effective_tier := v_profile.tier;
    END IF;

    v_used := v_profile.audits_used;
    v_cycle_start := v_profile.billing_cycle_start;

    -- Lazy Monthly Cycle Reset Check (1 month interval rollover)
    IF v_now >= (v_cycle_start + INTERVAL '1 month') THEN
        v_used := 0;
        v_cycle_start := v_now;
    END IF;

    -- Resolve Tier Limit
    IF v_profile.custom_quota_limit IS NOT NULL AND v_profile.custom_quota_limit > 0 THEN
        v_limit := v_profile.custom_quota_limit;
    ELSE
        CASE v_effective_tier
            WHEN 'free' THEN v_limit := 3;
            WHEN 'pro' THEN v_limit := 50;
            WHEN 'enterprise' THEN v_limit := 999999;
            ELSE v_limit := 3;
        END CASE;
    END IF;

    v_reset_date := v_cycle_start + INTERVAL '1 month';

    IF v_used < v_limit THEN
        v_allowed := TRUE;
        v_used := v_used + 1;

        UPDATE public.user_profiles
        SET audits_used = v_used,
            billing_cycle_start = v_cycle_start,
            last_audit_at = v_now,
            updated_at = v_now
        WHERE user_id = target_user_id;

        -- Keep user_quotas synchronized for backward compatibility
        UPDATE public.user_quotas
        SET audits_used = v_used,
            billing_cycle_start = v_cycle_start,
            updated_at = v_now
        WHERE user_id = target_user_id;

        v_remaining := GREATEST(0, v_limit - v_used);

        RETURN jsonb_build_object(
            'allowed', true,
            'tier', v_effective_tier,
            'used', v_used,
            'limit', v_limit,
            'remaining', v_remaining,
            'reset_date', v_reset_date
        );
    ELSE
        RETURN jsonb_build_object(
            'allowed', false,
            'code', 'QUOTA_EXCEEDED',
            'tier', v_effective_tier,
            'used', v_used,
            'limit', v_limit,
            'remaining', 0,
            'reset_date', v_reset_date,
            'message', 'Batas kuota audit bulanan untuk paket ' || UPPER(v_effective_tier::text) || ' telah tercapai (' || v_used || '/' || v_limit || ').'
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: refund_audit_quota(target_user_id UUID)
-- CRITICAL SECURITY HARDENING: refund_audit_quota is strictly restricted to service_role!
CREATE OR REPLACE FUNCTION public.refund_audit_quota(target_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_used INT;
BEGIN
    SELECT audits_used INTO v_used
    FROM public.user_profiles
    WHERE user_id = target_user_id
    FOR UPDATE;

    IF FOUND AND v_used > 0 THEN
        UPDATE public.user_profiles
        SET audits_used = GREATEST(0, audits_used - 1),
            updated_at = timezone('utc'::text, now())
        WHERE user_id = target_user_id;

        UPDATE public.user_quotas
        SET audits_used = GREATEST(0, audits_used - 1),
            updated_at = timezone('utc'::text, now())
        WHERE user_id = target_user_id;

        RETURN jsonb_build_object('success', true, 'refunded', true);
    END IF;

    RETURN jsonb_build_object('success', false, 'refunded', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: get_user_quota(target_user_id UUID)
CREATE OR REPLACE FUNCTION public.get_user_quota(target_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_profile RECORD;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_effective_tier subscription_tier;
    v_used INT;
    v_limit INT;
    v_remaining INT;
    v_cycle_start TIMESTAMPTZ;
    v_reset_date TIMESTAMPTZ;
BEGIN
    -- Security Check: Authenticated users can only read their own quota
    IF auth.role() = 'authenticated' AND auth.uid() IS NOT NULL AND auth.uid() <> target_user_id THEN
        IF NOT public.is_current_user_super_admin() THEN
            RETURN jsonb_build_object(
                'error', 'UNAUTHORIZED',
                'message', 'Access denied: cannot view quota metadata for other users.'
            );
        END IF;
    END IF;

    SELECT * INTO v_profile
    FROM public.user_profiles
    WHERE user_id = target_user_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'effective_tier', 'free',
            'tier', 'free',
            'used', 0,
            'limit', 3,
            'remaining', 3,
            'reset_date', v_now + INTERVAL '1 month',
            'suspended', false,
            'is_super_admin', false
        );
    END IF;

    IF v_profile.organization_id IS NOT NULL THEN
        v_effective_tier := 'enterprise';
    ELSE
        v_effective_tier := v_profile.tier;
    END IF;

    v_used := v_profile.audits_used;
    v_cycle_start := v_profile.billing_cycle_start;

    -- Background lazy reset if cycle passed
    IF v_now >= (v_cycle_start + INTERVAL '1 month') THEN
        v_used := 0;
        v_cycle_start := v_now;

        UPDATE public.user_profiles
        SET audits_used = 0,
            billing_cycle_start = v_now,
            updated_at = v_now
        WHERE user_id = target_user_id;

        UPDATE public.user_quotas
        SET audits_used = 0,
            billing_cycle_start = v_now,
            updated_at = v_now
        WHERE user_id = target_user_id;
    END IF;

    IF v_profile.custom_quota_limit IS NOT NULL AND v_profile.custom_quota_limit > 0 THEN
        v_limit := v_profile.custom_quota_limit;
    ELSE
        CASE v_effective_tier
            WHEN 'free' THEN v_limit := 3;
            WHEN 'pro' THEN v_limit := 50;
            WHEN 'enterprise' THEN v_limit := 999999;
            ELSE v_limit := 3;
        END CASE;
    END IF;

    v_remaining := GREATEST(0, v_limit - v_used);
    v_reset_date := v_cycle_start + INTERVAL '1 month';

    RETURN jsonb_build_object(
        'effective_tier', v_effective_tier,
        'tier', v_profile.tier,
        'used', v_used,
        'limit', v_limit,
        'remaining', v_remaining,
        'reset_date', v_reset_date,
        'suspended', (v_profile.account_status = 'suspended'),
        'is_super_admin', v_profile.is_super_admin,
        'organization_id', v_profile.organization_id,
        'org_role', v_profile.org_role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 8. PERMISSIONS & GRANTS MANAGEMENT
-- ------------------------------------------------------------------------------

-- Client Authenticated Permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audits TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.findings TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.audit_diffs TO authenticated;
GRANT ALL ON public.cli_tokens TO authenticated;
GRANT SELECT ON public.user_quotas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT SELECT, UPDATE ON public.user_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_invites TO authenticated;

-- Service Role (Full Backend Access)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- RPC Execution Grants
GRANT EXECUTE ON FUNCTION public.consume_audit_quota(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_quota(UUID) TO authenticated, service_role;

-- CRITICAL: REVOKE refund_audit_quota FROM CLIENTS (Only Backend Service Role May Refund Quota)
REVOKE ALL ON FUNCTION public.refund_audit_quota(UUID) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.refund_audit_quota(UUID) TO service_role;
