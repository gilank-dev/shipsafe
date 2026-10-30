# Security Policy & Credential Rotation Notice

## ⚠️ Mandatory Credential Rotation Notice

Because development or staging credentials were historically referenced in previous commits or project configurations, the following real secrets must be rotated directly within their respective provider dashboards:

1. **Supabase Anon Key** (`VITE_SUPABASE_ANON_KEY`)
   - Rotate in your Supabase Dashboard under `Project Settings > API > Project API Keys`.
2. **Supabase Service Role & JWT Secrets** (`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`)
   - Rotate in your Supabase Dashboard under `Project Settings > API > JWT Secret` (and revoke any historical third-party keys).
3. **Cloudflare Turnstile Secret Key & Site Key** (`TURNSTILE_SECRET`, `CLOUDFLARE_TURNSTILE_SECRET_KEY`, `VITE_CLOUDFLARE_TURNSTILE_SITE_KEY`)
   - Rotate in your Cloudflare Dashboard under `Turnstile > Site Settings`.
4. **Vercel OIDC Token** (`VERCEL_OIDC_TOKEN`)
   - Re-issue or invalidate in your Vercel Project / Team Settings.

> [!IMPORTANT]
> - **Primary Authentication Engine**: Supabase Auth serves as the primary authentication and session provider.
> - Never commit `.env` or `.env.*` files to Git. All environment files are strictly untracked and excluded via `.gitignore`.
> - Refer to `frontend/.env.example` and `backend/.env.example` for required variable names and placeholder templates.
> - Real values must only be injected via server environment variables, secure CI/CD secrets, or untracked local `.env` files.

---

## 🛡️ Super Admin Clearance & System Whitelist

ShipSafe enforces strict administrative isolation. Only the verified Super Admin email whitelist is granted access to high-clearance system ledgers and organization management:

- `hi@lankdev.my.id`
- `gilankdev@gmail.com`
- `ghilankputraramadhan@gmail.com`

---

## 🚨 Security Vulnerability Disclosure & Direct Contacts

If you discover a security vulnerability or security bypass within ShipSafe, please disclose it directly via our official channels:

- **WhatsApp Lead**: [+62 821-2415-3732](https://wa.me/6282124153732) (`082124153732`)
- **Direct Email**: [gilankdev@gmail.com](mailto:gilankdev@gmail.com)
- **Official Security Gateway**: [https://shipsafe.lankdev.my.id](https://shipsafe.lankdev.my.id)
