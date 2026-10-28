export type SupportedLanguage = 'en' | 'id'

export interface NavContent {
  brand: {
    name: string
    desk: string
    versionBadge: string
    monogram: string
  }
  links: {
    console: string
    howItWorks: string
    mcp: string
    cli: string
    threatMatrix: string
    comparison: string
    limitations: string
    pricing: string
    faq: string
    documentation: string
  }
  language: {
    toggleAria: string
    currentLabel: string
    switchLabel: string
    en: string
    id: string
  }
  auth: {
    signIn: string
    signOut: string
    guestClearance: string
  }
  cta: {
    launchConsole: string
    launchConsoleAria: string
  }
}

export interface HeroContent {
  eyebrow: {
    tag: string
    separator: string
    subtitle: string
  }
  headline: {
    prefix: string
    highlight: string
    suffix: string
  }
  reassurance: string
  cta: {
    primary: string
    shortcut: string
    secondary: string
    dropHint: string
  }
  cliBar: {
    command: string
    copyLabel: string
    copiedLabel: string
    hint: string
  }
}

export interface PillarItem {
  tag: string
  title: string
  description: string
  action: string
}

export interface PillarsContent {
  header: {
    eyebrow: string
    title: string
    subtitle: string
  }
  console: PillarItem
  mcp: PillarItem
  cli: PillarItem
}

export interface TelemetryContent {
  window: {
    title: string
    statusActive: string
    dotsAria: string
  }
  tabs: {
    report: string
    prompt: string
  }
  reportLogs: {
    parsing: string
    finding1: string
    finding2: string
    finding3: string
    summary: string
    statusBadge: string
  }
  promptSnippet: {
    badge: string
    targetAgent: string
    content: string
    copyAria: string
  }
}

export interface HowItWorksStep {
  number: string
  title: string
  subtitle: string
  description: string
}

export interface HowItWorksContent {
  header: {
    tag: string
    title: string
    subtitle: string
  }
  steps: {
    step1: HowItWorksStep
    step2: HowItWorksStep
    step3: HowItWorksStep
  }
}

export interface ComparisonRow {
  metric: string
  shipsafe: string
  legacySast: string
  linters: string
}

export interface ComparisonContent {
  header: {
    tag: string
    title: string
    subtitle: string
  }
  columns: {
    metric: string
    shipsafe: string
    legacySast: string
    linters: string
  }
  rows: ComparisonRow[]
}

export interface ThreatVector {
  id: string
  name: string
  techDescription: string
  consequence: string
}

export interface ThreatMatrixContent {
  header: {
    tag: string
    title: string
    subtitle: string
  }
  vectors: ThreatVector[]
  guarantees: {
    sandbox: {
      title: string
      description: string
    }
    multiAgent: {
      title: string
      description: string
    }
  }
}

export interface LimitationItem {
  title: string
  description: string
}

export interface LimitationsContent {
  header: {
    title: string
    subtitle: string
  }
  items: {
    archiveLimit: LimitationItem
    staticOnly: LimitationItem
    notPentest: LimitationItem
  }
}

export interface PricingTier {
  name: string
  badge?: string
  price: string
  period: string
  description: string
  features: string[]
  cta: string
}

export interface PricingContent {
  header: {
    tag: string
    title: string
    subtitle: string
  }
  tiers: {
    community: PricingTier
    pro: PricingTier
    enterprise: PricingTier
  }
  guarantee: string
}

export interface SupportContent {
  title: string
  subtitle: string
  badge: string
  whatsapp: {
    label: string
    url: string
    aria: string
  }
  telegram: {
    label: string
    url: string
    aria: string
  }
}

export interface FaqItem {
  id: string
  question: string
  answer: string
}

export interface FaqContent {
  header: {
    tag: string
    title: string
  }
  items: FaqItem[]
}

export interface FooterContent {
  gateway: {
    title: string
    badge: string
    description: string
  }
  links: {
    console: string
    github: string
    docs: string
    mcp: string
    cli: string
    privacy: string
    terms: string
  }
  compliance: string
  copyright: string
}

export interface LandingContentSchema {
  nav: NavContent
  hero: HeroContent
  pillars: PillarsContent
  telemetry: TelemetryContent
  howItWorks: HowItWorksContent
  comparison: ComparisonContent
  threatMatrix: ThreatMatrixContent
  limitations: LimitationsContent
  pricing: PricingContent
  support: SupportContent
  faq: FaqContent
  footer: FooterContent
}
