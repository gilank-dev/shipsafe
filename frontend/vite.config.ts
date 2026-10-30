import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Security headers served by `vite preview` so ShipSafe can be checked with its own rules
// (spec Requirement 9.3). The same set ships as public/_headers for static hosts.
const securityHeaders = {
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://va.vercel-scripts.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://api.dicebear.com https://ship-safe.lankdev.my.id; font-src 'self'; connect-src 'self' http://213.163.197.214:23010 https://*.supabase.co wss://*.supabase.co https://vitals.vercel-insights.com; frame-src 'self' https://challenges.cloudflare.com; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Cache-Control': 'no-store',
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:23010',
        changeOrigin: true,
      },
    },
  },
  preview: { headers: securityHeaders },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalized = id.replace(/\\/g, '/')
          if (normalized.includes('/src/components/admin/')) {
            return 'admin-dashboard'
          }
          if (normalized.includes('/node_modules/')) {
            if (
              normalized.includes('/react/') ||
              normalized.includes('/react-dom/') ||
              normalized.includes('/scheduler/')
            ) {
              return 'vendor-react'
            }
            if (normalized.includes('/lucide-react/')) {
              return 'vendor-lucide'
            }
            if (normalized.includes('/@supabase/')) {
              return 'vendor-supabase'
            }
            if (
              normalized.includes('/react-markdown/') ||
              normalized.includes('/remark-gfm/') ||
              normalized.includes('/micromark') ||
              normalized.includes('/unist') ||
              normalized.includes('/vfile') ||
              normalized.includes('/unified') ||
              normalized.includes('/mdast') ||
              normalized.includes('/bail') ||
              normalized.includes('/is-plain-obj') ||
              normalized.includes('/trough') ||
              normalized.includes('/decode-named-character-reference') ||
              normalized.includes('/character-entities') ||
              normalized.includes('/property-information') ||
              normalized.includes('/hast')
            ) {
              return 'vendor-markdown'
            }
            if (normalized.includes('/zustand/')) {
              return 'vendor-zustand'
            }
            if (normalized.includes('/@vercel/analytics/')) {
              return 'vendor-analytics'
            }
          }
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
