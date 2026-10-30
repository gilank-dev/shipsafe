-- ==============================================================================
-- ShipSafe v4.0 Super Admin Mission Control, Quota RPC, & Tier Gatekeeper Migration
-- File: supabase/migrations/20261029_shipsafe_v4_superadmin_and_tiers.sql
-- Idempotent PostgreSQL DDL & RPC functions for Supabase
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ENUMS
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

-- 2. ORGANIZATIONS TABLE
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    owner_id UUID NOT NULL,
    max_seats INT NOT NULL DEFAULT 5, -- Default: 1 Owner + 4 Members
    whitelabel_org_name TEXT,
    whitelabel_logo_url TEXT,
    custom_prompt_rules TEXT,
    api_key_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. USER PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.user_profiles (
    user_id UUID PRIMARY KEY,
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

-- 4. ORGANIZATION INVITES TABLE
CREATE TABLE IF NOT EXISTS public.organization_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    invited_by UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    accepted_at TIMESTAMPTZ
);

-- 5. REDEMPTION CODES / VOUCHERS TABLE
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

-- 6. SCAN TELEMETRY LOGS (Real-Time Zero-Persistence Telemetry)
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

-- 7. ADMIN AUDIT LOGS (Immutable Administrative Trail)
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_email TEXT NOT NULL,
    target_email TEXT,
    action_type TEXT NOT NULL,
    diff JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. INDEXES
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_org_id ON public.user_profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_tier ON public.user_profiles(tier);
CREATE INDEX IF NOT EXISTS idx_redemption_codes_active ON public.redemption_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_scan_telemetry_time ON public.scan_telemetry_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_admin_logs_time ON public.admin_audit_logs(created_at DESC);

-- 9. STRICT SUPER ADMIN WHITELIST TRIGGER
-- Enforces that is_super_admin is STRICTLY restricted to the whitelisted emails:
-- ('hi@lankdev.my.id', 'gilankdev@gmail.com', 'gilankdev@gmai.com', 'ghilankputraramadhan@gmail.com')
CREATE OR REPLACE FUNCTION public.enforce_super_admin_whitelist()
RETURNS TRIGGER AS $$
DECLARE
    v_whitelisted BOOLEAN := FALSE;
    v_clean_email TEXT := LOWER(TRIM(NEW.email));
BEGIN
    IF v_clean_email IN (
        'hi@lankdev.my.id',
        'gilankdev@gmail.com',
        'gilankdev@gmai.com',
        'ghilankputraramadhan@gmail.com'
    ) THEN
        v_whitelisted := TRUE;
    END IF;

    IF v_whitelisted THEN
        NEW.is_super_admin := TRUE;
        NEW.tier := 'enterprise';
        NEW.account_status := 'active';
    ELSE
        NEW.is_super_admin := FALSE;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_super_admin ON public.user_profiles;
CREATE TRIGGER trg_enforce_super_admin
    BEFORE INSERT OR UPDATE OF email, is_super_admin, tier ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_super_admin_whitelist();

-- 10. ATOMIC QUOTA CONSUMPTION RPC
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
BEGIN
    SELECT * INTO v_profile
    FROM public.user_profiles
    WHERE user_id = target_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        INSERT INTO public.user_profiles (user_id, email, full_name, tier, audits_used, billing_cycle_start, updated_at)
        VALUES (target_user_id, 'user@shipsafe.dev', 'ShipSafe User', 'free', 0, v_now, v_now)
        RETURNING * INTO v_profile;
    END IF;

    IF v_profile.account_status = 'suspended' THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'code', 'ACCOUNT_SUSPENDED',
            'suspended', true,
            'message', 'Account is suspended. Contact security operations at 082124153732.'
        );
    END IF;

    IF v_profile.organization_id IS NOT NULL THEN
        v_effective_tier := 'enterprise';
    ELSE
        v_effective_tier := v_profile.tier;
    END IF;

    v_used := v_profile.audits_used;
    v_cycle_start := v_profile.billing_cycle_start;

    -- Lazy monthly reset
    IF v_now >= (v_cycle_start + INTERVAL '1 month') THEN
        v_used := 0;
        v_cycle_start := v_now;
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

    v_reset_date := v_cycle_start + INTERVAL '1 month';

    IF v_used < v_limit THEN
        v_used := v_used + 1;

        UPDATE public.user_profiles
        SET audits_used = v_used,
            billing_cycle_start = v_cycle_start,
            last_audit_at = v_now,
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
            'message', 'Monthly audit quota exceeded for tier ' || UPPER(v_effective_tier::text) || ' (' || v_used || '/' || v_limit || ').'
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. ATOMIC QUOTA REFUND RPC
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

        RETURN jsonb_build_object('success', true, 'refunded', true);
    END IF;

    RETURN jsonb_build_object('success', false, 'refunded', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. ATOMIC VOUCHER REDEMPTION RPC
CREATE OR REPLACE FUNCTION public.redeem_voucher_code(
    code_input TEXT,
    target_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_voucher RECORD;
    v_user RECORD;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_clean_code TEXT := UPPER(TRIM(code_input));
BEGIN
    SELECT * INTO v_user
    FROM public.user_profiles
    WHERE user_id = target_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'User account not found.');
    END IF;

    SELECT * INTO v_voucher
    FROM public.redemption_codes
    WHERE code = v_clean_code
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid voucher code.');
    END IF;

    IF NOT v_voucher.is_active THEN
        RETURN jsonb_build_object('success', false, 'message', 'This voucher code has been deactivated.');
    END IF;

    IF v_voucher.expires_at IS NOT NULL AND v_now > v_voucher.expires_at THEN
        RETURN jsonb_build_object('success', false, 'message', 'This voucher code has expired.');
    END IF;

    IF v_voucher.uses >= v_voucher.max_uses THEN
        RETURN jsonb_build_object('success', false, 'message', 'Voucher maximum redemption limit reached.');
    END IF;

    IF v_user.email = ANY(v_voucher.redeemed_by) THEN
        RETURN jsonb_build_object('success', false, 'message', 'You have already redeemed this voucher code.');
    END IF;

    -- Apply Grant
    IF v_voucher.grant_type = 'pro_monthly' THEN
        UPDATE public.user_profiles
        SET tier = 'pro',
            billing_cycle_start = v_now,
            updated_at = v_now
        WHERE user_id = target_user_id;
    ELSIF v_voucher.grant_type = 'enterprise_monthly' THEN
        UPDATE public.user_profiles
        SET tier = 'enterprise',
            billing_cycle_start = v_now,
            updated_at = v_now
        WHERE user_id = target_user_id;
    ELSIF v_voucher.grant_type = 'bonus_quota' THEN
        UPDATE public.user_profiles
        SET custom_quota_limit = COALESCE(custom_quota_limit, 3) + COALESCE(v_voucher.bonus_audits, 10),
            updated_at = v_now
        WHERE user_id = target_user_id;
    END IF;

    -- Update Voucher ledger
    UPDATE public.redemption_codes
    SET uses = uses + 1,
        redeemed_by = array_append(redeemed_by, v_user.email)
    WHERE code = v_clean_code;

    RETURN jsonb_build_object(
        'success', true,
        'grant_type', v_voucher.grant_type,
        'message', 'Voucher redeemed successfully. Your subscription tier and quota have been updated.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
