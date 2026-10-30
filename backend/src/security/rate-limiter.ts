import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

function clientIpKey(req: { headers: { [key: string]: unknown }; ip?: string; socket?: { remoteAddress?: string } }): string {
  // Behind Cloudflare/Vercel proxies req.ip can collapse all traffic into one
  // bucket, so derive the client IP deterministically from proxied headers.
  const cf = req.headers['cf-connecting-ip'];
  if (typeof cf === 'string' && cf.trim()) return cf.trim();
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.trim()) return xff.split(',')[0].trim();
  return req.ip && typeof req.ip === 'string' ? ipKeyGenerator(req.ip) : 'unknown';
}

/**
 * Global API Limiter
 * Limits incoming HTTP requests to 120 per minute per IP address.
 */
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'test' ? 10000 : 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: clientIpKey,
  handler: (_req, res) => {
    res.status(429).json({
      error: {
        code: 'rate_limit_exceeded',
        message: 'Too many requests from this IP. Please slow down and try again later.',
      },
    });
  },
});

/**
 * Audit Scan Limiter
 * Protects AST and AI worker queues against automated spam / DDoS.
 * Max 15 scan uploads per 5 minutes per IP.
 */
export const auditLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: process.env.NODE_ENV === 'test' ? 10000 : 15,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: clientIpKey,
  handler: (_req, res) => {
    res.status(429).json({
      error: {
        code: 'rate_limit_exceeded',
        message: 'Security scan rate limit reached (max 15 scans per 5 minutes). Please wait before uploading another project.',
      },
    });
  },
});

/**
 * Auth & Voucher Redemption Limiter
 * Protects login and voucher redemption against brute-force attacks.
 * Max 15 attempts per 10 minutes per IP.
 */
export const authVoucherLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: process.env.NODE_ENV === 'test' ? 10000 : 15,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: clientIpKey,
  handler: (_req, res) => {
    res.status(429).json({
      error: {
        code: 'rate_limit_exceeded',
        message: 'Too many authentication or redemption attempts. Please wait 10 minutes before retrying.',
      },
    });
  },
});
