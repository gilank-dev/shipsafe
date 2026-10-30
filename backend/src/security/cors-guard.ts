import cors from 'cors';
import { Request, Response, NextFunction } from 'express';

const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'https://shipsafe-pi.vercel.app',
  'https://shipsafe-lankdev.vercel.app',
  'https://shipsafe.lankdev.my.id',
  'https://nusa-bench.vercel.app',
];

export function getAllowedOrigins(): string[] {
  const rawCorsOrigin = process.env.CORS_ORIGIN;
  if (!rawCorsOrigin) {
    return defaultAllowedOrigins;
  }
  return rawCorsOrigin.split(',').map((s) => s.trim()).filter(Boolean);
}

export function isOriginAllowed(origin: string | undefined): boolean {
  // Non-browser requests (e.g. server-side proxy, curl, CLI, automated testing)
  if (!origin) return true;

  const allowedOrigins = getAllowedOrigins();

  // 1. Direct whitelist match
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  // 2. Strict project domain regex matching (shipsafe*.vercel.app, shipsafe*.lankdev.my.id, *.shipsafe.lankdev.my.id)
  const trustedRegexes = [
    /^https:\/\/shipsafe[a-zA-Z0-9-]*\.vercel\.app$/,
    /^https:\/\/shipsafe[a-zA-Z0-9-]*\.lankdev\.my\.id$/,
    /^https:\/\/[a-zA-Z0-9-]+\.shipsafe\.lankdev\.my\.id$/,
  ];

  return trustedRegexes.some((regex) => regex.test(origin));
}

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS_NOT_ALLOWED: Origin ${origin} not allowed by whitelist`));
    }
  },
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-CLI-Version',
    'x-admin-email',
    'x-user-email',
    'apikey',
  ],
  exposedHeaders: ['Content-Disposition', 'X-File-Name', 'X-Repo-Owner', 'X-Repo-Name', 'X-Repo-Size'],
});

// Express error wrapper for CORS errors to return HTTP 403 Forbidden with clean JSON
export function corsErrorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string' && err.message.startsWith('CORS_NOT_ALLOWED')) {
    return res.status(403).json({
      error: {
        code: 'cors_not_allowed',
        message: 'Origin not allowed by CORS security whitelist.',
      },
    });
  }
  next(err);
}
