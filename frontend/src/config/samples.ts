export type SampleId = 'ledgerline' | 'waybill' | 'harborlog'

export interface SampleInfo {
  id: SampleId
  /** Menu label. Samples are fictional projects and are labeled as samples. */
  label: string
  /** What the demo shows, so a tester knows what to expect. */
  note: string
  fileName: string
}

export const SAMPLES: readonly SampleInfo[] = [
  {
    id: 'ledgerline',
    label: 'Ledgerline, invoicing SaaS',
    note: 'Next.js, Supabase, Stripe. Expect critical findings and secrets to rotate.',
    fileName: 'ledgerline-sample.zip',
  },
  {
    id: 'waybill',
    label: 'Waybill, internal dispatch tool',
    note: 'Behind company SSO. Expect no critical findings.',
    fileName: 'waybill-sample.zip',
  },
  {
    id: 'harborlog',
    label: 'Harborlog, public docs site',
    note: 'Static Astro site. Expect Low and Info findings only.',
    fileName: 'harborlog-sample.zip',
  },
]
