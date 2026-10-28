# Security Policy & Credential Rotation Notice

## ⚠️ Mandatory Credential Rotation Notice

Because development or staging credentials were historically referenced in previous commits or project configurations, the following real secrets must be rotated directly within their respective provider dashboards:

1. **Supabase Anon Key** (`VITE_SUPABASE_ANON_KEY`)
   - Rotate in your Supabase Dashboard under `Project Settings > API > Project API Keys`.
2. **Cloudflare Turnstile Secret Key & Site Key** (`TURNSTILE_SECRET`, `CLOUDFLARE_TURNSTILE_SECRET_KEY`, `VITE_CLOUDFLARE_TURNSTILE_SITE_KEY`)
   - Rotate in your Cloudflare Dashboard under `Turnstile > Site Settings`.
3. **Clerk Publishable & Secret Keys** (`VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`)
   - Rotate in your Clerk Dashboard under `Configure > API Keys`.
4. **Vercel OIDC Token** (`VERCEL_OIDC_TOKEN`)
   - Re-issue or invalidate in your Vercel Project / Team Settings.

> [!IMPORTANT]
> - Never commit `.env` or `.env.*` files to Git. All environment files are strictly untracked and excluded via `.gitignore`.
> - Refer to `frontend/.env.example` and `backend/.env.example` for required variable names and placeholder templates.
> - Real values must only be injected via server environment variables, secure CI/CD secrets, or untracked local `.env` files.
