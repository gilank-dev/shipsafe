import { SAMPLES, type SampleId, type SampleInfo } from '../config/samples'
import type { ProjectContext } from './types'

export interface SampleProjectConfig {
  id: SampleId
  info: SampleInfo
  context: ProjectContext
}

export const SAMPLE_PROJECTS: readonly SampleProjectConfig[] = [
  {
    id: 'ledgerline',
    info: SAMPLES[0]!,
    context: {
      description:
        'Ledgerline is an invoicing app for freelancers, about 500 active users. Users sign in with Clerk, store customers and invoices in Supabase, and pay platform fees by card through Stripe. The Next.js 14 app runs on Vercel and sends reminder emails through a Docker worker on a small VPS. We use the OpenAI API to draft invoice notes. Customer names, emails and card last4 are stored.',
      deployTarget: 'Vercel',
      handlesPII: true,
      handlesPayments: true,
    },
  },
  {
    id: 'waybill',
    info: SAMPLES[1]!,
    context: {
      description:
        'Waybill is the internal dispatch dashboard for our regional delivery team, used by about 60 dispatchers and drivers behind company SSO. Next.js 15 with a Postgres database. It stores driver names and shift schedules, no payments. Deployed on a single VPS behind Nginx.',
      deployTarget: 'Docker or VPS',
      handlesPII: true,
      handlesPayments: false,
    },
  },
  {
    id: 'harborlog',
    info: SAMPLES[2]!,
    context: {
      description:
        'Harborlog is the public documentation and marketing site for an open-source container monitor. Static Astro site deployed on Cloudflare Pages. No user accounts, no database, no customer data. Contact form is handled by an external form provider.',
      deployTarget: 'Static / Cloudflare Pages',
      handlesPII: false,
      handlesPayments: false,
    },
  },
]

export function getSampleById(id: SampleId): SampleProjectConfig | undefined {
  return SAMPLE_PROJECTS.find((p) => p.id === id)
}
