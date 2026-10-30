import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  validateEnv,
  enforceEnv,
  PROD_REQUIRED_VARS,
  PROD_RECOMMENDED_VARS,
} from './env-validation';

describe('env-validation', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const fullEnv = (): NodeJS.ProcessEnv => ({
    NODE_ENV: 'production',
    SUPABASE_URL: 'https://okbryysoxihmamujoipb.supabase.co',
    SUPABASE_ANON_KEY: 'anon-key-value',
    SUPABASE_SERVICE_ROLE_KEY: 'service-key-value',
    CLI_TOKEN_SECRET: 'cli-secret-value-long-enough',
  });

  describe('validateEnv', () => {
    it('passes clean (no errors) when all required vars are present, with only recommended-var warnings', () => {
      const result = validateEnv(fullEnv());
      expect(result.errors).toEqual([]);
      expect(result.warnings).toHaveLength(PROD_RECOMMENDED_VARS.length);
    });

    it('flags every missing required var', () => {
      const env = fullEnv();
      delete env.SUPABASE_SERVICE_ROLE_KEY;
      const result = validateEnv(env);
      expect(result.errors).toContain('SUPABASE_SERVICE_ROLE_KEY is required but missing');
      expect(result.errors).toHaveLength(1);
    });

    it('rejects placeholder values for required vars', () => {
      const env = { ...fullEnv(), SUPABASE_URL: 'https://your-project-ref.supabase.co' };
      const result = validateEnv(env);
      expect(result.errors).toContain('SUPABASE_URL is set to a placeholder value');
    });

    it('treats blank-string required vars as missing', () => {
      const env = { ...fullEnv(), CLI_TOKEN_SECRET: '   ' };
      const result = validateEnv(env);
      expect(result.errors).toContain('CLI_TOKEN_SECRET is required but missing');
    });

    it('warns (not errors) for missing recommended vars', () => {
      const env = fullEnv();
      delete env.AI_API_KEY;
      const result = validateEnv(env);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toContain('AI_API_KEY is not set (related feature will be degraded)');
    });

    it('documents every required var name so drift is visible', () => {
      expect(PROD_REQUIRED_VARS).toContain('SUPABASE_URL');
      expect(PROD_REQUIRED_VARS).toContain('SUPABASE_SERVICE_ROLE_KEY');
      expect(PROD_RECOMMENDED_VARS).toContain('TURNSTILE_SECRET');
    });
  });

  describe('enforceEnv', () => {
    it('throws in production when required vars are missing', () => {
      const logger = { warn: vi.fn(), error: vi.fn() };
      const env = fullEnv();
      delete env.CLI_TOKEN_SECRET;
      expect(() => enforceEnv(env, logger)).toThrow(/Refusing to start/);
      expect(logger.error).toHaveBeenCalled();
    });

    it('does not throw in production when config is complete', () => {
      const logger = { warn: vi.fn(), error: vi.fn() };
      expect(() => enforceEnv(fullEnv(), logger)).not.toThrow();
    });

    it('only warns (never throws) in non-production even with a broken config', () => {
      const logger = { warn: vi.fn(), error: vi.fn() };
      const emptyEnv: NodeJS.ProcessEnv = { NODE_ENV: 'test' };
      expect(() => enforceEnv(emptyEnv, logger)).not.toThrow();
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('treats NODE_ENV=development as non-blocking', () => {
      const logger = { warn: vi.fn(), error: vi.fn() };
      const env: NodeJS.ProcessEnv = { NODE_ENV: 'development' };
      expect(() => enforceEnv(env, logger)).not.toThrow();
      expect(logger.warn).toHaveBeenCalled();
    });
  });
});
