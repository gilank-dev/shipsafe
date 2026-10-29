import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Security headers served by `vite preview` so ShipSafe can be checked with its own rules
// (spec Requirement 9.3). The same set ships as public/_headers for static hosts.
const securityHeaders = {
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://*.clerk.accounts.dev https://*.clerk.com https://va.vercel-scripts.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://api.dicebear.com https://img.clerk.com https://*.clerk.accounts.dev https://ship-safe.lankdev.my.id; font-src 'self'; connect-src 'self' http://213.163.197.214:23010 https://*.supabase.co wss://*.supabase.co https://*.clerk.accounts.dev https://*.clerk.com https://vitals.vercel-insights.com; frame-src 'self' https://challenges.cloudflare.com https://*.clerk.accounts.dev; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Cache-Control': 'no-store',
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  preview: { headers: securityHeaders },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          markdown: ['react-markdown', 'remark-gfm'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['node_modules/**'],
    css: false,
    env: { VITE_API_MODE: 'mock', VITE_MOCK_LATENCY: 'none' },
  },
})
