import { describe, it, expect } from 'vitest';
import { isOriginAllowed, getAllowedOrigins } from './cors-guard';

describe('CORS Guard Module', () => {
  it('allows non-browser requests (empty origin)', () => {
    expect(isOriginAllowed(undefined)).toBe(true);
    expect(isOriginAllowed('')).toBe(true);
  });

  it('allows default Whitelisted domain origins', () => {
    expect(isOriginAllowed('http://localhost:5173')).toBe(true);
    expect(isOriginAllowed('http://localhost:3000')).toBe(true);
    expect(isOriginAllowed('https://shipsafe.lankdev.my.id')).toBe(true);
    expect(isOriginAllowed('https://shipsafe-pi.vercel.app')).toBe(true);
    expect(isOriginAllowed('https://shipsafe-lankdev.vercel.app')).toBe(true);
  });

  it('allows trusted project domain regex origins', () => {
    expect(isOriginAllowed('https://shipsafe-preview-123.vercel.app')).toBe(true);
    expect(isOriginAllowed('https://shipsafe-v4.lankdev.my.id')).toBe(true);
    expect(isOriginAllowed('https://demo.shipsafe.lankdev.my.id')).toBe(true);
  });

  it('rejects untrusted third-party origins', () => {
    expect(isOriginAllowed('https://evil-attacker.com')).toBe(false);
    expect(isOriginAllowed('https://malicious-app.vercel.app')).toBe(false);
    expect(isOriginAllowed('https://random-site.org')).toBe(false);
  });
});
