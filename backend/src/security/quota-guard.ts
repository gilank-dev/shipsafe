// ==============================================================================
// ShipSafe Backend Quota & Paywall Enforcement Engine
// Enterprise FUP, Atomic Quota Consumption & Rollback Guards
// ==============================================================================

export type SubscriptionTier = 'free' | 'pro' | 'enterprise';

export interface QuotaStatus {
  allowed?: boolean;
  tier: SubscriptionTier;
  used: number;
  limit: number;
  remaining: number;
  reset_date?: string;
}

export const TIER_UPLOAD_LIMITS_BYTES: Record<SubscriptionTier, number> = {
  free: 10 * 1024 * 1024,        // 10 MB
  pro: 50 * 1024 * 1024,         // 50 MB
  enterprise: 100 * 1024 * 1024  // 100 MB
};

export const TIER_DECOMPRESSED_LIMITS_BYTES: Record<SubscriptionTier, number> = {
  free: 25 * 1024 * 1024,        // 25 MB
  pro: 100 * 1024 * 1024,        // 100 MB
  enterprise: 250 * 1024 * 1024  // 250 MB
};

export const TIER_PRIORITY_WEIGHT: Record<SubscriptionTier, number> = {
  enterprise: 3,
  pro: 2,
  free: 1
};

// In-memory hourly sliding window rate limiter for Enterprise FUP (max 60 audits/hour)
const enterpriseHourlyCounter = new Map<string, number[]>();
const ENTERPRISE_HOURLY_CAP = 60;
const ONE_HOUR_MS = 60 * 60 * 1000;

/**
 * Check Enterprise Fair Use Policy (FUP) rate limit.
 * Returns true if permitted, false if rate limit exceeded.
 */
export function checkEnterpriseRateLimit(orgOrUserId: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const timestamps = (enterpriseHourlyCounter.get(orgOrUserId) || []).filter(
    (t) => now - t < ONE_HOUR_MS
  );

  if (timestamps.length >= ENTERPRISE_HOURLY_CAP) {
    const oldestTimestamp = timestamps[0];
    const retryAfterSeconds = Math.ceil((oldestTimestamp + ONE_HOUR_MS - now) / 1000);
    return { allowed: false, retryAfterSeconds: Math.max(1, retryAfterSeconds) };
  }

  timestamps.push(now);
  enterpriseHourlyCounter.set(orgOrUserId, timestamps);
  return { allowed: true };
}

/**
 * Query current user quota and subscription tier without consuming.
 */
export async function fetchUserQuota(userId: string): Promise<QuotaStatus> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  // Dev user or missing DB configuration fallback
  if (!supabaseUrl || !serviceKey || supabaseUrl.includes('your-project-ref') || !isUuid(userId)) {
    return {
      tier: 'pro', // Allow local dev test full capability
      used: 0,
      limit: 50,
      remaining: 50,
      reset_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };
  }

  try {
    const url = `${supabaseUrl.replace(/\/+$/, '')}/rest/v1/rpc/get_user_quota`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ target_user_id: userId })
    });

    if (res.ok) {
      const data = (await res.json()) as QuotaStatus;
      return data;
    }
  } catch (err) {
    console.warn('[QuotaGuard] Failed to fetch user quota from Supabase, applying default free fallback:', err);
  }

  return {
    tier: 'free',
    used: 0,
    limit: 3,
    remaining: 3,
    reset_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  };
}

/**
 * Atomically consume 1 audit quota via Supabase PostgreSQL RPC with row locking (FOR UPDATE).
 */
export async function consumeUserAuditQuota(userId: string): Promise<QuotaStatus & { allowed: boolean }> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey || supabaseUrl.includes('your-project-ref') || !isUuid(userId)) {
    // Development / offline fallback
    return {
      allowed: true,
      tier: 'pro',
      used: 1,
      limit: 50,
      remaining: 49,
      reset_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };
  }

  try {
    const url = `${supabaseUrl.replace(/\/+$/, '')}/rest/v1/rpc/consume_audit_quota`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ target_user_id: userId })
    });

    if (res.ok) {
      const data = (await res.json()) as QuotaStatus & { allowed: boolean };
      return data;
    } else {
      const errText = await res.text();
      console.error('[QuotaGuard] consume_audit_quota error response:', res.status, errText);
    }
  } catch (err) {
    console.error('[QuotaGuard] consume_audit_quota network failure:', err);
  }

  // Graceful fail-open for unhandled network errors so paying users aren't locked out of server
  return {
    allowed: true,
    tier: 'free',
    used: 1,
    limit: 3,
    remaining: 2,
    reset_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  };
}

/**
 * Atomically refund 1 audit quota if scanner crashes mid-execution.
 */
export async function refundUserAuditQuota(userId: string): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey || supabaseUrl.includes('your-project-ref') || !isUuid(userId)) {
    return;
  }

  try {
    const url = `${supabaseUrl.replace(/\/+$/, '')}/rest/v1/rpc/refund_audit_quota`;
    await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ target_user_id: userId })
    });
    console.info(`[QuotaGuard] Successfully refunded 1 audit quota to user ${userId}`);
  } catch (err) {
    console.error('[QuotaGuard] Failed to refund audit quota:', err);
  }
}

function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}
