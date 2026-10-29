-- ==============================================================================
-- ShipSafe - Quota Engine & Tiered Subscription Architecture
-- Supabase / PostgreSQL Schema, RLS, Triggers & Atomic Quota RPCs
-- ==============================================================================

-- 1. ENUM: subscription_tier
DO $$ BEGIN
    CREATE TYPE subscription_tier AS ENUM ('free', 'pro', 'enterprise');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. TABLE: user_quotas
-- Stores user tier, audit consumption, and monthly billing cycle start.
CREATE TABLE IF NOT EXISTS user_quotas (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tier subscription_tier NOT NULL DEFAULT 'free',
    audits_used INT NOT NULL DEFAULT 0 CHECK (audits_used >= 0),
    billing_cycle_start TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE user_quotas IS 'Atomic quota and billing cycle tracker per user for ShipSafe.';
COMMENT ON COLUMN user_quotas.user_id IS 'Foreign key referencing auth.users.';
COMMENT ON COLUMN user_quotas.tier IS 'Current plan tier: free (3/mo), pro (50/mo), enterprise (unlimited/FUP).';
COMMENT ON COLUMN user_quotas.audits_used IS 'Number of audits consumed in the current 1-month billing cycle.';
COMMENT ON COLUMN user_quotas.billing_cycle_start IS 'Timestamp when current 1-month quota window started.';
COMMENT ON COLUMN user_quotas.updated_at IS 'Last modification timestamp.';

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_user_quotas_tier ON user_quotas(tier);

-- 4. ROW LEVEL SECURITY (RLS)
ALTER TABLE user_quotas ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read (SELECT) their own quota state.
-- Mutations are strictly handled via SECURITY DEFINER PostgreSQL RPCs or service_role.
DROP POLICY IF EXISTS "Users can view their own quota" ON user_quotas;
CREATE POLICY "Users can view their own quota"
    ON user_quotas
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- 5. TRIGGER ON USER SIGNUP (auth.users -> user_quotas)
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

-- 6. RPC: consume_audit_quota(target_user_id UUID)
-- Atomic row-locking (FOR UPDATE) audit quota consumer with Lazy Monthly Reset.
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
    -- Ensure row exists with row lock (FOR UPDATE)
    SELECT * INTO v_quota
    FROM public.user_quotas
    WHERE user_id = target_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        -- Auto-provision free tier row if missing
        INSERT INTO public.user_quotas (user_id, tier, audits_used, billing_cycle_start, updated_at)
        VALUES (target_user_id, 'free', 0, v_now, v_now)
        RETURNING * INTO v_quota;
    END IF;

    v_tier := v_quota.tier;
    v_used := v_quota.audits_used;
    v_cycle_start := v_quota.billing_cycle_start;

    -- Lazy Monthly Reset Check: If 1 month has elapsed since cycle start, reset audits_used to 0
    IF v_now >= (v_cycle_start + INTERVAL '1 month') THEN
        v_used := 0;
        v_cycle_start := v_now;
    END IF;

    -- Determine Quota Limits based on Tier
    CASE v_tier
        WHEN 'free' THEN v_limit := 3;
        WHEN 'pro' THEN v_limit := 50;
        WHEN 'enterprise' THEN v_limit := 999999; -- Subject to hourly FUP
        ELSE v_limit := 3;
    END CASE;

    v_reset_date := v_cycle_start + INTERVAL '1 month';

    -- Evaluate Quota Availability
    IF v_used < v_limit THEN
        v_allowed := TRUE;
        v_used := v_used + 1;

        -- Update row atomically
        UPDATE public.user_quotas
        SET audits_used = v_used,
            billing_cycle_start = v_cycle_start,
            updated_at = v_now
        WHERE user_id = target_user_id;
    ELSE
        v_allowed := FALSE;
        -- Update cycle start if reset occurred even if limit is reached
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

-- 7. RPC: refund_audit_quota(target_user_id UUID)
-- Decrements audits_used safely when scanner encounters internal sandbox crash.
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

-- 8. RPC: get_user_quota(target_user_id UUID)
-- Read-only / idempotent quota status retriever with lazy monthly reset calculation.
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
        -- Return default free tier structure
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
        
        -- Sync lazy reset in background
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

-- 9. PERMISSIONS
GRANT SELECT ON public.user_quotas TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_audit_quota(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.refund_audit_quota(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_quota(UUID) TO authenticated, service_role;
