-- ==============================================================================
-- ShipSafe v4.0 RBAC, Organizations, Atomic Quota & Admin Ledger Migration
-- Idempotent PostgreSQL Migration for Supabase
-- ==============================================================================

-- 1. Custom Types & Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

-- 2. Organizations Table
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

-- 3. User Profiles Table (Extended with Quota, Tier & Org Link)
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

-- 4. Organization Invites Table
CREATE TABLE IF NOT EXISTS public.organization_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    invited_by UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    accepted_at TIMESTAMPTZ
);

-- 5. Admin Audit Logs
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID NOT NULL,
    target_user_id UUID,
    action TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. Indexes for High-Concurrency Performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_org_id ON public.user_profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_tier ON public.user_profiles(tier);
CREATE INDEX IF NOT EXISTS idx_org_invites_org ON public.organization_invites(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_invites_email ON public.organization_invites(email);
CREATE INDEX IF NOT EXISTS idx_admin_logs_actor ON public.admin_audit_logs(actor_id);

-- 7. Row Level Security (RLS)
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Organization RLS Policies
DROP POLICY IF EXISTS "Members can view their own organization" ON public.organizations;
CREATE POLICY "Members can view their own organization" ON public.organizations
    FOR SELECT USING (
        id IN (SELECT organization_id FROM public.user_profiles WHERE user_id = auth.uid())
        OR owner_id = auth.uid()
        OR (SELECT is_super_admin FROM public.user_profiles WHERE user_id = auth.uid()) = TRUE
    );

DROP POLICY IF EXISTS "Owners and admins can update their organization" ON public.organizations;
CREATE POLICY "Owners and admins can update their organization" ON public.organizations
    FOR UPDATE USING (
        owner_id = auth.uid()
        OR (SELECT is_super_admin FROM public.user_profiles WHERE user_id = auth.uid()) = TRUE
    );

-- User Profiles RLS Policies
DROP POLICY IF EXISTS "Users can view their own profile or team profiles" ON public.user_profiles;
CREATE POLICY "Users can view their own profile or team profiles" ON public.user_profiles
    FOR SELECT USING (
        user_id = auth.uid()
        OR organization_id IN (SELECT organization_id FROM public.user_profiles WHERE user_id = auth.uid())
        OR (SELECT is_super_admin FROM public.user_profiles WHERE user_id = auth.uid()) = TRUE
    );

DROP POLICY IF EXISTS "Users can update their own profile name" ON public.user_profiles;
CREATE POLICY "Users can update their own profile name" ON public.user_profiles
    FOR UPDATE USING (
        user_id = auth.uid()
        OR (SELECT is_super_admin FROM public.user_profiles WHERE user_id = auth.uid()) = TRUE
    );

-- 8. Atomic Quota Consumption RPC with FOR UPDATE Row-Level Locking
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

    -- A. Suspension Check
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

    -- B. Organization Inheritance: Members inherit Enterprise tier
    IF v_profile.organization_id IS NOT NULL THEN
        v_effective_tier := 'enterprise';
    ELSE
        v_effective_tier := v_profile.tier;
    END IF;

    v_used := v_profile.audits_used;
    v_cycle_start := v_profile.billing_cycle_start;

    -- C. Lazy Monthly Reset
    IF v_now >= (v_cycle_start + INTERVAL '1 month') THEN
        v_used := 0;
        v_cycle_start := v_now;
    END IF;

    -- D. Resolve Limit
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

    -- E. Quota Evaluation
    IF v_used < v_limit THEN
        v_allowed := TRUE;
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
        v_remaining := 0;

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

-- 9. Atomic Quota Refund RPC
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
