-- ==============================================================================
-- ShipSafe - RBAC, Enterprise Teams & Super Admin Architecture
-- Migration: shipsafe_rbac_and_admin.sql
-- ==============================================================================

-- 1. ENUM: subscription_tier
DO $$ BEGIN
    CREATE TYPE subscription_tier AS ENUM ('free', 'pro', 'enterprise');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. TABLE: organizations
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    max_seats INT NOT NULL DEFAULT 5, -- Default 5 seats (1 Owner + 4 members). Configurable by Super Admin.
    whitelabel_company_name TEXT,
    whitelabel_logo_url TEXT,
    api_key_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.organizations IS 'Enterprise Organizations with shared benefits and white-label branding.';
COMMENT ON COLUMN public.organizations.max_seats IS 'Total seats allowed in this organization (Owner + Members).';

-- 3. TABLE: user_profiles
CREATE TABLE IF NOT EXISTS public.user_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    tier subscription_tier NOT NULL DEFAULT 'free',
    is_super_admin BOOLEAN NOT NULL DEFAULT false,
    account_status TEXT NOT NULL DEFAULT 'active' CHECK (account_status IN ('active', 'suspended')),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    org_role TEXT CHECK (org_role IN ('owner', 'member')),
    audits_used INT NOT NULL DEFAULT 0 CHECK (audits_used >= 0),
    custom_quota_limit INT, -- If NULL, use tier default (Free=3, Pro=50, Enterprise=999999)
    billing_cycle_start TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    personal_api_key TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.user_profiles IS 'Unified profile, RBAC, quota tracking, and organization affiliation.';

-- 4. TABLE: organization_invites
CREATE TABLE IF NOT EXISTS public.organization_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.organization_invites IS 'Pending and accepted team invites for Enterprise organizations.';

-- 5. INDEXES
CREATE INDEX IF NOT EXISTS idx_user_profiles_org ON public.user_profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_tier ON public.user_profiles(tier);
CREATE INDEX IF NOT EXISTS idx_org_invites_email ON public.organization_invites(email);
CREATE INDEX IF NOT EXISTS idx_org_invites_org ON public.organization_invites(organization_id);

-- 6. TRIGGER: Auto-provision user_profiles and Auto-link pending invites on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger AS $$
DECLARE
    v_invite RECORD;
    v_is_super BOOLEAN := false;
    v_email TEXT;
    v_name TEXT;
BEGIN
    v_email := LOWER(TRIM(NEW.email));
    v_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(v_email, '@', 1));

    -- Initial Super Admin bootstrap for master maintenance account
    IF v_email IN ('gilankdev@gmail.com', 'developer@shipsafe.dev', 'admin@shipsafe.dev') THEN
        v_is_super := true;
    END IF;

    -- Check for any pending organization invite for this email
    SELECT * INTO v_invite
    FROM public.organization_invites
    WHERE LOWER(TRIM(email)) = v_email AND status = 'pending'
    ORDER BY created_at DESC
    LIMIT 1;

    IF FOUND THEN
        -- Auto-join Enterprise Organization as member
        INSERT INTO public.user_profiles (
            user_id, email, full_name, tier, is_super_admin, account_status,
            organization_id, org_role, audits_used, billing_cycle_start, updated_at
        )
        VALUES (
            NEW.id, v_email, v_name, 'enterprise', v_is_super, 'active',
            v_invite.organization_id, 'member', 0, timezone('utc'::text, now()), timezone('utc'::text, now())
        )
        ON CONFLICT (user_id) DO UPDATE SET
            organization_id = v_invite.organization_id,
            org_role = 'member',
            tier = 'enterprise',
            updated_at = timezone('utc'::text, now());

        UPDATE public.organization_invites
        SET status = 'accepted'
        WHERE id = v_invite.id;
    ELSE
        -- Standard Individual Free User
        INSERT INTO public.user_profiles (
            user_id, email, full_name, tier, is_super_admin, account_status,
            organization_id, org_role, audits_used, billing_cycle_start, updated_at
        )
        VALUES (
            NEW.id, v_email, v_name, CASE WHEN v_is_super THEN 'enterprise' ELSE 'free' END,
            v_is_super, 'active', NULL, NULL, 0, timezone('utc'::text, now()), timezone('utc'::text, now())
        )
        ON CONFLICT (user_id) DO UPDATE SET
            email = v_email,
            full_name = v_name,
            updated_at = timezone('utc'::text, now());
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- 7. ATOMIC RPC: consume_audit_quota(target_user_id UUID)
-- Enforces account suspension, Lazy Monthly Reset, Enterprise Org inheritance, and Custom Quota overrides.
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
        -- If profile not yet created, bootstrap free profile
        INSERT INTO public.user_profiles (user_id, email, full_name, tier, audits_used, billing_cycle_start, updated_at)
        VALUES (target_user_id, 'user@shipsafe.dev', 'ShipSafe User', 'free', 0, v_now, v_now)
        RETURNING * INTO v_profile;
    END IF;

    -- 1. Account Suspension Check
    IF v_profile.account_status = 'suspended' THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'suspended', true,
            'effective_tier', v_profile.tier,
            'used', v_profile.audits_used,
            'limit', 0,
            'remaining', 0,
            'message', 'Akun Anda sedang disuspensi. Hubungi admin di 082124153732 untuk bantuan.'
        );
    END IF;

    -- 2. Resolve Effective Tier: Members in an Organization inherit 'enterprise' benefits
    IF v_profile.organization_id IS NOT NULL THEN
        v_effective_tier := 'enterprise';
    ELSE
        v_effective_tier := v_profile.tier;
    END IF;

    v_used := v_profile.audits_used;
    v_cycle_start := v_profile.billing_cycle_start;

    -- 3. Lazy Monthly Reset Check
    IF v_now >= (v_cycle_start + INTERVAL '1 month') THEN
        v_used := 0;
        v_cycle_start := v_now;
    END IF;

    -- 4. Resolve Quota Limit: Check if custom limit was set by Super Admin
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

    -- 5. Quota Evaluation
    IF v_used < v_limit THEN
        v_allowed := TRUE;
        v_used := v_used + 1;

        UPDATE public.user_profiles
        SET audits_used = v_used,
            billing_cycle_start = v_cycle_start,
            updated_at = v_now
        WHERE user_id = target_user_id;
    ELSE
        v_allowed := FALSE;
        UPDATE public.user_profiles
        SET audits_used = v_used,
            billing_cycle_start = v_cycle_start,
            updated_at = v_now
        WHERE user_id = target_user_id;
    END IF;

    v_remaining := GREATEST(0, v_limit - v_used);

    RETURN jsonb_build_object(
        'allowed', v_allowed,
        'suspended', false,
        'effective_tier', v_effective_tier,
        'tier', v_profile.tier,
        'used', v_used,
        'limit', v_limit,
        'remaining', v_remaining,
        'reset_date', v_reset_date
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. ATOMIC RPC: refund_audit_quota(target_user_id UUID)
CREATE OR REPLACE FUNCTION public.refund_audit_quota(target_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_profile RECORD;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_effective_tier subscription_tier;
    v_used INT;
    v_limit INT;
    v_remaining INT;
    v_reset_date TIMESTAMPTZ;
BEGIN
    SELECT * INTO v_profile
    FROM public.user_profiles
    WHERE user_id = target_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('refunded', false, 'message', 'Profile not found');
    END IF;

    IF v_profile.organization_id IS NOT NULL THEN
        v_effective_tier := 'enterprise';
    ELSE
        v_effective_tier := v_profile.tier;
    END IF;

    v_used := GREATEST(0, v_profile.audits_used - 1);

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

    UPDATE public.user_profiles
    SET audits_used = v_used,
        updated_at = v_now
    WHERE user_id = target_user_id;

    v_remaining := GREATEST(0, v_limit - v_used);
    v_reset_date := v_profile.billing_cycle_start + INTERVAL '1 month';

    RETURN jsonb_build_object(
        'refunded', true,
        'effective_tier', v_effective_tier,
        'used', v_used,
        'limit', v_limit,
        'remaining', v_remaining,
        'reset_date', v_reset_date
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. READ RPC: get_user_quota(target_user_id UUID)
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

    -- Background lazy reset if expired
    IF v_now >= (v_cycle_start + INTERVAL '1 month') THEN
        v_used := 0;
        v_cycle_start := v_now;

        UPDATE public.user_profiles
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

-- 10. SUPER ADMIN RPC: admin_update_user
CREATE OR REPLACE FUNCTION public.admin_update_user(
    p_admin_id UUID,
    p_target_user_id UUID,
    p_new_tier subscription_tier DEFAULT NULL,
    p_new_status TEXT DEFAULT NULL,
    p_new_quota_limit INT DEFAULT NULL,
    p_reset_used BOOLEAN DEFAULT FALSE,
    p_make_super_admin BOOLEAN DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_admin RECORD;
BEGIN
    SELECT is_super_admin INTO v_admin
    FROM public.user_profiles
    WHERE user_id = p_admin_id;

    IF NOT FOUND OR v_admin.is_super_admin IS NOT TRUE THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Super Admin access required.');
    END IF;

    UPDATE public.user_profiles
    SET
        tier = COALESCE(p_new_tier, tier),
        account_status = COALESCE(p_new_status, account_status),
        custom_quota_limit = CASE WHEN p_new_quota_limit = -1 THEN NULL WHEN p_new_quota_limit IS NOT NULL THEN p_new_quota_limit ELSE custom_quota_limit END,
        audits_used = CASE WHEN p_reset_used THEN 0 ELSE audits_used END,
        is_super_admin = COALESCE(p_make_super_admin, is_super_admin),
        updated_at = timezone('utc'::text, now())
    WHERE user_id = p_target_user_id;

    RETURN jsonb_build_object('success', true, 'target_user_id', p_target_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. TEAM MANAGEMENT RPC: invite_organization_member
CREATE OR REPLACE FUNCTION public.invite_organization_member(
    p_requester_id UUID,
    p_org_id UUID,
    p_invite_email TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_org RECORD;
    v_requester RECORD;
    v_current_seats INT;
    v_clean_email TEXT;
    v_existing_user RECORD;
    v_new_invite_id UUID;
BEGIN
    v_clean_email := LOWER(TRIM(p_invite_email));

    SELECT * INTO v_requester
    FROM public.user_profiles
    WHERE user_id = p_requester_id;

    SELECT * INTO v_org
    FROM public.organizations
    WHERE id = p_org_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Organization tidak ditemukan.');
    END IF;

    -- Only Owner or Super Admin can invite
    IF v_org.owner_id != p_requester_id AND v_requester.is_super_admin IS NOT TRUE THEN
        RETURN jsonb_build_object('success', false, 'error', 'Hanya Owner atau Super Admin yang dapat mengundang anggota.');
    END IF;

    -- Count current members + accepted invites
    SELECT COUNT(*) INTO v_current_seats
    FROM public.user_profiles
    WHERE organization_id = p_org_id;

    IF v_current_seats >= v_org.max_seats THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', format('Batas kuota tim tercapai (%s/%s anggota). Hubungi admin untuk menambah seats.', v_current_seats, v_org.max_seats)
        );
    END IF;

    -- Check if user already exists
    SELECT * INTO v_existing_user
    FROM public.user_profiles
    WHERE LOWER(TRIM(email)) = v_clean_email;

    IF FOUND THEN
        -- Immediately assign to organization
        UPDATE public.user_profiles
        SET organization_id = p_org_id,
            org_role = 'member',
            tier = 'enterprise',
            updated_at = timezone('utc'::text, now())
        WHERE user_id = v_existing_user.user_id;

        RETURN jsonb_build_object(
            'success', true,
            'status', 'added_immediately',
            'email', v_clean_email,
            'message', 'Anggota berhasil ditambahkan ke tim Enterprise.'
        );
    ELSE
        -- Create pending invite
        INSERT INTO public.organization_invites (organization_id, email, invited_by, status)
        VALUES (p_org_id, v_clean_email, p_requester_id, 'pending')
        RETURNING id INTO v_new_invite_id;

        RETURN jsonb_build_object(
            'success', true,
            'status', 'invited',
            'invite_id', v_new_invite_id,
            'email', v_clean_email,
            'message', 'Undangan tim terkirim. Anggota akan otomatis tergabung saat mendaftar.'
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. TEAM MANAGEMENT RPC: remove_organization_member
CREATE OR REPLACE FUNCTION public.remove_organization_member(
    p_requester_id UUID,
    p_org_id UUID,
    p_target_member_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_org RECORD;
    v_requester RECORD;
BEGIN
    SELECT * INTO v_requester
    FROM public.user_profiles
    WHERE user_id = p_requester_id;

    SELECT * INTO v_org
    FROM public.organizations
    WHERE id = p_org_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Organization tidak ditemukan.');
    END IF;

    IF v_org.owner_id != p_requester_id AND v_requester.is_super_admin IS NOT TRUE THEN
        RETURN jsonb_build_object('success', false, 'error', 'Hanya Owner atau Super Admin yang dapat menghapus anggota.');
    END IF;

    IF v_org.owner_id = p_target_member_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Owner tidak dapat dihapus dari organisasinya sendiri.');
    END IF;

    -- Remove organization affiliation and revert to free tier
    UPDATE public.user_profiles
    SET organization_id = NULL,
        org_role = NULL,
        tier = 'free',
        updated_at = timezone('utc'::text, now())
    WHERE user_id = p_target_member_id AND organization_id = p_org_id;

    RETURN jsonb_build_object('success', true, 'message', 'Anggota berhasil dihapus dari tim.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;

-- Policy: user_profiles
DROP POLICY IF EXISTS "Users can read own profile and team members" ON public.user_profiles;
CREATE POLICY "Users can read own profile and team members"
    ON public.user_profiles
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = user_id
        OR is_super_admin = true
        OR (
            organization_id IS NOT NULL
            AND organization_id IN (
                SELECT organization_id FROM public.user_profiles WHERE user_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "Super admin can update all profiles" ON public.user_profiles;
CREATE POLICY "Super admin can update all profiles"
    ON public.user_profiles
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_id = auth.uid() AND is_super_admin = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_id = auth.uid() AND is_super_admin = true
        )
    );

-- Policy: organizations
DROP POLICY IF EXISTS "Users can read own organization or if super admin" ON public.organizations;
CREATE POLICY "Users can read own organization or if super admin"
    ON public.organizations
    FOR SELECT
    TO authenticated
    USING (
        owner_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_id = auth.uid()
              AND (is_super_admin = true OR organization_id = public.organizations.id)
        )
    );

DROP POLICY IF EXISTS "Owner or super admin can update organization" ON public.organizations;
CREATE POLICY "Owner or super admin can update organization"
    ON public.organizations
    FOR UPDATE
    TO authenticated
    USING (
        owner_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_id = auth.uid() AND is_super_admin = true
        )
    );

-- Policy: organization_invites
DROP POLICY IF EXISTS "Org members and super admin can view invites" ON public.organization_invites;
CREATE POLICY "Org members and super admin can view invites"
    ON public.organization_invites
    FOR SELECT
    TO authenticated
    USING (
        invited_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_id = auth.uid()
              AND (is_super_admin = true OR organization_id = public.organization_invites.organization_id)
        )
    );

-- 14. PERMISSIONS & GRANTS
GRANT SELECT ON public.organizations TO authenticated;
GRANT SELECT ON public.user_profiles TO authenticated;
GRANT SELECT ON public.organization_invites TO authenticated;

GRANT ALL ON public.organizations TO service_role;
GRANT ALL ON public.user_profiles TO service_role;
GRANT ALL ON public.organization_invites TO service_role;

GRANT EXECUTE ON FUNCTION public.consume_audit_quota(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.refund_audit_quota(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_quota(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_user(UUID, UUID, subscription_tier, TEXT, INT, BOOLEAN, BOOLEAN) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.invite_organization_member(UUID, UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.remove_organization_member(UUID, UUID, UUID) TO authenticated, service_role;
