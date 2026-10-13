import type { ProjectContext } from '../../domain/types'
import type { SampleId } from '../../config/samples'
import { SAMPLES } from '../../config/samples'
import { buildZipFile, type BuildEntry } from './zip-build'

// Sample projects are fictional and in memory only. File bodies are short structural stand-ins:
// the mock engine reads entry names, never contents, and no sample file contains a credential.
interface SampleDef {
  context: ProjectContext
  entries: BuildEntry[]
}

const stub = (name: string, content: string): BuildEntry => ({ name, content })

const DEFS: Record<SampleId, SampleDef> = {
  ledgerline: {
    context: {
      description:
        'Ledgerline is an invoicing app for freelancers, about 500 active users. Users sign in with Clerk, store customers and invoices in Supabase, and pay platform fees by card through Stripe. The Next.js 14 app runs on Vercel and sends reminder emails through a Docker worker on a small VPS. We use the OpenAI API to draft invoice notes. Customer names, emails and card last4 are stored.',
      deployTarget: 'Vercel',
      handlesPII: true,
      handlesPayments: true,
    },
    entries: [
      stub(
        'package.json',
        '{\n  "name": "ledgerline",\n  "dependencies": {\n    "next": "14.0.4",\n    "react": "18.2.0",\n    "@clerk/nextjs": "4.29.3",\n    "@supabase/supabase-js": "2.39.0",\n    "stripe": "14.10.0",\n    "jsonwebtoken": "8.5.1",\n    "axios": "0.21.1",\n    "lodash": "^4.17.15",\n    "lodahs": "^1.0.0"\n  }\n}\n',
      ),
      stub('Dockerfile', 'FROM node:18-alpine\nWORKDIR /app\nCOPY . .\nRUN npm install\nCMD ["npm", "start"]\n'),
      stub('docker-compose.yml', 'services:\n  worker:\n    build: .\n    env_file: .env\n'),
      stub('next.config.js', '/** @type {import("next").NextConfig} */\nmodule.exports = { poweredByHeader: true }\n'),
      stub('middleware.ts', 'export { default } from "@clerk/nextjs/middleware"\n'),
      stub('lib/supabase.ts', '// Supabase browser and server client factories\n'),
      stub('app/api/invoices/route.ts', '// List and create invoices\n'),
      stub('app/api/invoices/[id]/route.ts', '// Read one invoice\n'),
      stub('app/api/auth/login/route.ts', '// Session login endpoint\n'),
      stub('app/pay/page.tsx', '// Payment page\n'),
      stub('.env.example', 'NEXT_PUBLIC_SUPABASE_URL=\nSTRIPE_SECRET_KEY=\nJWT_SECRET=\n'),
      stub('.gitignore', '.next\nnode_modules\n.env*.local\n'),
      stub('node_modules/next/package.json', '{}'),
      stub('public/logo.png', ''),
    ],
  },
  waybill: {
    context: {
      description:
        'Waybill is the internal dispatch dashboard for our regional delivery team, used by about 60 dispatchers and drivers behind company SSO. Next.js 15 with a Postgres database. It stores driver names and shift schedules, no payments. Deployed on a single VPS behind Nginx.',
      deployTarget: 'Docker or VPS',
      handlesPII: true,
      handlesPayments: false,
    },
    entries: [
      stub(
        'package.json',
        '{\n  "name": "waybill",\n  "dependencies": {\n    "next": "15.1.3",\n    "pg": "^8.11.0",\n    "next-auth": "4.24.5"\n  }\n}\n',
      ),
      stub('package-lock.json', '{}'),
      stub('Dockerfile', 'FROM node:22-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nCMD ["npm", "start"]\n'),
      stub('.dockerignore', 'node_modules\n.env\n.git\n'),
      stub('next.config.mjs', 'export default {}\n'),
      stub('nginx.conf', 'server { listen 443 ssl; }\n'),
      stub('app/api/session/route.ts', '// SSO callback and session\n'),
      stub('app/api/dispatch/route.ts', '// Dispatch board data\n'),
      stub('.gitignore', '.next\nnode_modules\n.env\n'),
    ],
  },
  harborlog: {
    context: {
      description:
        'Harborlog is the public documentation site for our open-source logging library. It is a static Astro build deployed to Cloudflare Pages. No accounts, no forms, no analytics cookies, and no personal data.',
      deployTarget: 'Other',
      handlesPII: false,
      handlesPayments: false,
    },
    entries: [
      stub(
        'package.json',
        '{\n  "name": "harborlog-docs",\n  "dependencies": {\n    "astro": "5.1.1"\n  }\n}\n',
      ),
      stub('package-lock.json', '{}'),
      stub('astro.config.mjs', 'export default {}\n'),
      stub('public/_headers', '/*\n  X-Content-Type-Options: nosniff\n'),
      stub('src/pages/index.astro', '---\n---\n<h1>Harborlog</h1>\n'),
      stub('src/pages/guide.md', '# Guide\n'),
      stub('.gitignore', 'dist\nnode_modules\n'),
    ],
  },
}

export function buildSample(id: SampleId): { file: File; context: ProjectContext } {
  const def = DEFS[id]
  const info = SAMPLES.find((s) => s.id === id)
  return { file: buildZipFile(info?.fileName ?? `${id}-sample.zip`, def.entries), context: { ...def.context } }
}
