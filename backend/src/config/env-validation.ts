// ==============================================================================
// ShipSafe Startup Environment Validation
// Fail-fast in production: the server MUST NOT boot with an incomplete config.
// In dev/test it degrades to warnings so local development stays frictionless.
// ==============================================================================

/**
 * Variables without which core security/audit features are degraded in ways
 * that are unacceptable to discover at runtime. All four are present on the
 * production VPS as of 2026-10-30.
 */
export const PROD_REQUIRED_VARS = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'CLI_TOKEN_SECRET',
] as const;

/**
 * Variables whose absence degrades specific features (captcha, AI reasoning,
 * strict CORS) but leaves the service bootable. Missing = warning only.
 */
export const PROD_RECOMMENDED_VARS = [
  'TURNSTILE_SECRET',
  'CLOUDFLARE_TURNSTILE_SECRET_KEY',
  'AI_BASE_URL',
  'AI_API_KEY',
  'AI_MODEL',
] as const;

export interface EnvValidationResult {
  /** Missing/invalid variables that make a production boot unsafe. */
  errors: string[];
  /** Variables whose absence degrades a feature but is bootable. */
  warnings: string[];
}

function isPlaceholder(value: string): boolean {
  return /your-project-ref|changeme|example\.com/i.test(value);
}

export function validateEnv(
  env: NodeJS.ProcessEnv = process.env
): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const name of PROD_REQUIRED_VARS) {
    const value = env[name];
    if (!value || value.trim() === '') {
      errors.push(`${name} is required but missing`);
    } else if (isPlaceholder(value)) {
      errors.push(`${name} is set to a placeholder value`);
    }
  }

  for (const name of PROD_RECOMMENDED_VARS) {
    if (!env[name] || env[name]!.trim() === '') {
      warnings.push(`${name} is not set (related feature will be degraded)`);
    }
  }

  return { errors, warnings };
}

/**
 * Production: throws on any blocking misconfiguration (fail-fast).
 * Development/test: logs warnings, never throws.
 */
export function enforceEnv(
  env: NodeJS.ProcessEnv = process.env,
  logger: Pick<Console, 'warn' | 'error'> = console
): void {
  const { errors, warnings } = validateEnv(env);

  for (const warning of warnings) {
    logger.warn(`[ShipSafe Env] ${warning}`);
  }

  if (env.NODE_ENV === 'production' && errors.length > 0) {
    for (const error of errors) {
      logger.error(`[ShipSafe Env] FATAL: ${error}`);
    }
    throw new Error(
      `Refusing to start in production with an unsafe configuration (${errors.length} error(s)). ` +
        'Fix the environment and try again.'
    );
  }
}
