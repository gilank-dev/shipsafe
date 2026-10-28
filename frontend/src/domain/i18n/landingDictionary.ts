/**
 * ShipSafe Bilingual Landing Page Content Dictionary (English & Indonesian)
 * Architecture standard: Monolithic Precision / Ink on Ruled Paper
 * Aesthetic: High-density monochrome with semantic status accents (no purple gradients, zero em-dashes).
 */

export type Language = 'en' | 'id'

export interface NavCopy {
  brandName: string
  tagline: string
  console: string
  howItWorks: string
  comparison: string
  threatMatrix: string
  pricing: string
  mcp: string
  cli: string
  faq: string
  login: string
  logout: string
  launchConsole: string
}

export interface HeroTrigger {
  title: string
  description: string
  risk: string
}

export interface HeroCopy {
  eyebrowBadge: string
  eyebrowSub: string
  headlineMain: string
  headlineHighlight: string
  subheadline: string
  triggersTitle: string
  triggers: HeroTrigger[]
  ctaPrimary: string
  ctaSecondary: string
  cliLabel: string
  copyButton: string
  copiedButton: string
}

export interface BentoPillar {
  pillarId: string
  title: string
  description: string
  actionLabel: string
}

export interface BentoPillarsCopy {
  pillars: BentoPillar[]
}

export interface TelemetryCopy {
  windowTitle: string
  reportTab: string
  promptTab: string
  astScanStatus: string
  findingSecrets: string
  findingAccessControl: string
  findingPromptInjection: string
  verdictSummary: string
  verdictBadge: string
  promptTitle: string
  promptSnippet: string
}

export interface HowItWorksStep {
  stepNumber: string
  title: string
  tagline: string
  description: string
  badge: string
}

export interface HowItWorksCopy {
  eyebrow: string
  title: string
  subtitle: string
  steps: HowItWorksStep[]
}

export interface ComparisonRow {
  feature: string
  shipsafe: string
  legacyEnterprise: string
  basicLinters: string
}

export interface ComparisonCopy {
  eyebrow: string
  title: string
  subtitle: string
  colFeature: string
  colShipSafe: string
  colLegacy: string
  colLinters: string
  rows: ComparisonRow[]
}

export interface ThreatVectorItem {
  id: string
  name: string
  description: string
}

export interface ThreatVectorsCopy {
  eyebrow: string
  title: string
  subtitle: string
  vectors: ThreatVectorItem[]
  sandboxGuaranteeTitle: string
  sandboxGuaranteeDesc: string
  promptFormatterTitle: string
  promptFormatterDesc: string
}

export interface LimitationItem {
  title: string
  description: string
}

export interface LimitationsCopy {
  eyebrow: string
  title: string
  subtitle: string
  items: LimitationItem[]
}

export interface PricingTier {
  id: string
  badge: string
  name: string
  price: string
  period: string
  description: string
  features: string[]
  cta: string
  isPopular?: boolean
}

export interface PricingCopy {
  eyebrow: string
  title: string
  subtitle: string
  tiers: PricingTier[]
  reassuranceNote: string
}

export interface ContactCopy {
  eyebrow: string
  title: string
  subtitle: string
  whatsappButton: string
  telegramButton: string
  statusBadge: string
}

export interface FaqItem {
  question: string
  answer: string
}

export interface FaqCopy {
  eyebrow: string
  title: string
  items: FaqItem[]
}

export interface FooterCopy {
  operationalBadge: string
  operationalText: string
  description: string
  consoleLink: string
  docsLink: string
  repoLink: string
  complianceNotice: string
  copyrightNotice: string
}

export interface LandingContentDictionary {
  nav: NavCopy
  hero: HeroCopy
  bentoPillars: BentoPillarsCopy
  telemetry: TelemetryCopy
  howItWorks: HowItWorksCopy
  comparison: ComparisonCopy
  threatVectors: ThreatVectorsCopy
  limitations: LimitationsCopy
  pricing: PricingCopy
  contact: ContactCopy
  faq: FaqCopy
  footer: FooterCopy
}

export const landingDictionary: Record<Language, LandingContentDictionary> = {
  en: {
    nav: {
      brandName: 'ShipSafe',
      tagline: 'Security Gatekeeper',
      console: 'Console',
      howItWorks: 'How It Works',
      comparison: 'Comparison',
      threatMatrix: '10 Vectors',
      pricing: 'Pricing',
      mcp: 'MCP Server',
      cli: 'CLI Guide',
      faq: 'FAQ',
      login: 'Sign In / Register',
      logout: 'Sign Out',
      launchConsole: 'Launch Console',
    },
    hero: {
      eyebrowBadge: 'Pre-Deployment Security Gatekeeper',
      eyebrowSub: 'Automated AST & Regex Security Barrier',
      headlineMain: 'The Pre-Deployment Security Gatekeeper for',
      headlineHighlight: 'Vibe-Coded Web Apps.',
      subheadline:
        'Built for developers and founders shipping at the speed of thought. Catch leaked service keys, unauthenticated endpoints, exposed database tables, and prompt injection surfaces in 3 seconds before you push to production.',
      triggersTitle: 'Operational Peace of Mind: Prevent 4 Catastrophic Launch Failures',
      triggers: [
        {
          title: 'Stop Leaked Keys',
          description:
            'Catch exposed Stripe, OpenAI, and cloud credentials before scraping bots drain your balances overnight.',
          risk: 'Financial Loss',
        },
        {
          title: 'Prevent Public Database Breaches',
          description:
            'Detect missing Row Level Security (RLS) on Supabase and Postgres tables before customer data leaks across tenants.',
          risk: 'Data Compromise',
        },
        {
          title: 'Eliminate 5-Figure Bill Shocks',
          description:
            'Identify unauthenticated LLM endpoints and unthrottled loops before abusive automated scripts consume your API quotas.',
          risk: 'Unbounded Billing',
        },
        {
          title: 'Protect Your Launch Reputation',
          description:
            'Ship on Product Hunt and Twitter with verified security clearance instead of managing an emergency public incident.',
          risk: 'Brand Trust',
        },
      ],
      ctaPrimary: 'Launch Console',
      ctaSecondary: 'Explore Ecosystem',
      cliLabel: 'npx @lankdev/shipsafe-cli scan .',
      copyButton: 'Copy',
      copiedButton: 'Copied',
    },
    bentoPillars: {
      pillars: [
        {
          pillarId: 'Pillar 01: Web Console',
          title: 'Instant Web Audit',
          description:
            'Upload a ZIP archive or link a GitHub repository for a 3-second AST analysis and an authoritative security clearance verdict.',
          actionLabel: 'Launch Console',
        },
        {
          pillarId: 'Pillar 02: Model Context Protocol',
          title: 'Autonomous Agent Bridge',
          description:
            'Connect Cursor, Claude Desktop, Windsurf, and Hermes via native stdio JSON-RPC 2.0 tools for self-healing codebases.',
          actionLabel: 'Explore MCP',
        },
        {
          pillarId: 'Pillar 03: Terminal CLI & Git Hook',
          title: 'Pre-Commit Gatekeeper',
          description:
            'Audit locally with zero dependencies or install a 1-click git hook that blocks vulnerable commits before code leaves your machine.',
          actionLabel: 'Setup CLI Hook',
        },
      ],
    },
    telemetry: {
      windowTitle: 'Telemetry: repo-vibe-saas.bundle.zip (4.8MB)',
      reportTab: 'Inspection Report',
      promptTab: '1-Click Agent Prompt',
      astScanStatus: '[00:01.04] AST parsing 42 source files: OK (0.8s)',
      findingSecrets:
        '[00:01.88] Vector Secrets Scan: [FAIL] Stripe live key exposed in src/config/stripe.ts:8',
      findingAccessControl:
        '[00:02.12] Vector Broken Access Control: [FAIL] Public endpoint lacks session RLS guard in app/api/invoices/[id]/route.ts:19',
      findingPromptInjection:
        '[00:02.89] Vector Prompt Injection Surface: [WARN] Raw unsanitized query passed into OpenAI prompt in lib/agent.ts:42',
      verdictSummary: 'Verdict: 2 critical findings, 1 warning detected',
      verdictBadge: 'Action Required',
      promptTitle: 'TAILORED REMEDIATION PROMPT FOR CLAUDE CODE / CURSOR',
      promptSnippet: `Fix critical vulnerability F-001 in \`src/config/stripe.ts\` (line 8):
1. Remove hardcoded Stripe live key \`sk_live_****\`.
2. Load secret securely via \`process.env.STRIPE_SECRET_KEY\`.
3. Add null check validation and throw meaningful ConfigurationError if missing.
4. Verify fix by executing: \`npm run test && npm run build\`.`,
    },
    howItWorks: {
      eyebrow: 'WORKFLOW & VELOCITY',
      title: 'How ShipSafe Secures Your Code in 3 Seconds',
      subtitle:
        'Zero complex setup. Zero long-running background daemons. Go from uninspected codebase to verified clearance in three deterministic steps.',
      steps: [
        {
          stepNumber: '01',
          title: 'Ingest Codebase',
          tagline: 'Zero-Config Ingestion',
          description:
            'Drop your project ZIP archive into the web console, execute npx @lankdev/shipsafe-cli scan . in your terminal, or trigger audit_codebase directly inside Cursor and Claude Desktop.',
          badge: 'No YAML config required',
        },
        {
          stepNumber: '02',
          title: '3-Second In-Memory AST Scan',
          tagline: 'Isolated Ephemeral Sandbox',
          description:
            'The core engine parses Abstract Syntax Trees and evaluates regex signatures across 10 critical threat vectors inside isolated temporary RAM. Your code is never persisted to disk and never used to train AI models.',
          badge: 'Instant memory wipe upon completion',
        },
        {
          stepNumber: '03',
          title: 'Clear Verdict & Agent Prompts',
          tagline: 'Self-Healing Remediation',
          description:
            'Receive an authoritative security clearance status (Approved or Action Required). For every finding, copy an exact line-specific remediation prompt formatted specifically for your AI coding assistant to resolve the issue in 60 seconds.',
          badge: 'Tailored for 5 coding agents',
        },
      ],
    },
    comparison: {
      eyebrow: 'CATEGORY COMPARISON',
      title: 'Why ShipSafe Outperforms Legacy Scanners for Vibe Coders',
      subtitle:
        'Legacy enterprise suites were built for 6-month waterfall cycles with heavy CI/CD overhead. ShipSafe is engineered specifically for autonomous, high-velocity AI coding workflows.',
      colFeature: 'Architectural Criteria',
      colShipSafe: 'ShipSafe Gatekeeper',
      colLegacy: 'Legacy Suites (Snyk / SonarQube)',
      colLinters: 'Basic Linters (ESLint / Biome)',
      rows: [
        {
          feature: 'Target Code Architecture',
          shipsafe: 'AI-generated codebases, Next.js, Supabase, Stripe, and modern cloud stacks',
          legacyEnterprise: 'Legacy enterprise monorepos, Java/C#, compliance tracking',
          basicLinters: 'Syntax formatting, code style conventions, type check errors',
        },
        {
          feature: 'Setup Time & Overhead',
          shipsafe: '0 seconds: Run npx command or drop a ZIP without any config file',
          legacyEnterprise: 'Hours to days: Complex YAML pipelines, agent tokens, workspace webhooks',
          basicLinters: 'Minutes: Requires package installs and project-level config files',
        },
        {
          feature: 'Scan Latency',
          shipsafe: 'Under 3 seconds in isolated memory sandbox',
          legacyEnterprise: '5 to 15 minutes queued in remote enterprise CI pipelines',
          basicLinters: 'Sub-second, but inspects only AST syntax without security depth',
        },
        {
          feature: 'Actionable Remediation',
          shipsafe: '1-click prompts tailored for Cursor, Claude Code, Copilot, and Windsurf',
          legacyEnterprise: 'Cryptic CVE numbers and links to paid enterprise documentation',
          basicLinters: 'Inline red squiggly lines without automatic remediation logic',
        },
        {
          feature: 'Vibe-Coding Threat Coverage',
          shipsafe: 'Specialized: Missing RLS, client-side secret exposure, prompt injection',
          legacyEnterprise: 'General dependency vulnerabilities; often misses modern vibe-coding bugs',
          basicLinters: 'Zero security vulnerability coverage (lint rules only)',
        },
        {
          feature: 'Source Code Privacy',
          shipsafe: 'Zero-Persistence: In-memory RAM extraction with instant post-scan wipe',
          legacyEnterprise: 'Source code indexed, stored on remote vendor servers, and metadata tracked',
          basicLinters: 'Runs locally on workstation',
        },
        {
          feature: 'Pricing Accessibility',
          shipsafe: 'Free solo tier with transparent, predictable developer plans',
          legacyEnterprise: 'Aggressive sales walls starting at $100+ per seat each month',
          basicLinters: 'Open source / Free',
        },
      ],
    },
    threatVectors: {
      eyebrow: 'COMPREHENSIVE COVERAGE',
      title: '10 Critical Threat Vectors Audited',
      subtitle:
        'ShipSafe inspects the full surface of modern AI-generated codebases against the 10 most common vibe-coding security pitfalls:',
      vectors: [
        {
          id: '01',
          name: 'SQL Injection',
          description: 'Raw SQL concatenation & template literal injection in ORM and database queries',
        },
        {
          id: '02',
          name: 'Cross-Site Scripting (XSS)',
          description: 'Unescaped innerHTML, dangerouslySetInnerHTML, and raw document.write calls',
        },
        {
          id: '03',
          name: 'DDoS & ReDoS',
          description: 'Missing rate limiters and vulnerable exponential regular expression patterns',
        },
        {
          id: '04',
          name: 'Brute Force & Timing',
          description: 'Plaintext string password comparison without timing-safe equality checks',
        },
        {
          id: '05',
          name: 'Malware & Web Shell',
          description: 'Dangerous PHP/Node shell signatures and unvalidated binary file uploads',
        },
        {
          id: '06',
          name: 'MitM & Broken TLS',
          description: 'rejectUnauthorized: false, plaintext credentials, missing secure cookie flags',
        },
        {
          id: '07',
          name: 'Phishing & Open Redirect',
          description: 'Unvalidated redirect parameters and clickjacking missing X-Frame-Options/CSP',
        },
        {
          id: '08',
          name: 'Defacement Risks',
          description: 'Unauthenticated template or webroot modification vulnerabilities',
        },
        {
          id: '09',
          name: 'LFI / RFI & SSRF',
          description: 'Path traversal in fs.readFile and unvalidated fetch(req.query.url) calls',
        },
        {
          id: '10',
          name: 'Zero-Day Dynamic Exec',
          description: 'Dangerous dynamic evaluation via eval(), new Function(), prototype pollution, execSync',
        },
      ],
      sandboxGuaranteeTitle: 'Ephemeral Sandbox Processing',
      sandboxGuaranteeDesc:
        'Raw source code is extracted strictly to an isolated temporary sandbox directory. Once analysis finishes, the directory is immediately wiped from memory. Your proprietary code is never persisted, never indexed, and never used to train machine learning models.',
      promptFormatterTitle: 'Multi-Agent Prompt Formatter',
      promptFormatterDesc:
        'Instead of leaving you with abstract CVE codes, ShipSafe formats exact, line-specific remediation prompts tailored for Cursor, Claude Code, GitHub Copilot, and Windsurf with self-contained reproduction and verification instructions.',
    },
    limitations: {
      eyebrow: 'RADICAL TRANSPARENCY',
      title: 'What ShipSafe Does Not Do',
      subtitle:
        'We believe in honest developer tooling without misleading security marketing. Please note our deliberate engineering boundaries:',
      items: [
        {
          title: '10MB Archive Upper Limit',
          description:
            'Engineered specifically for web applications, frontend single-page apps, and microservice APIs. It is not designed to ingest multi-gigabyte monolithic repositories or binary assets.',
        },
        {
          title: 'Purely Static AST Analysis',
          description:
            'ShipSafe scans configurations and AST structures statically. It does not spin up runtime containers, execute fuzzing network probes, or inspect dynamic heap memory allocations.',
        },
        {
          title: 'AI-Assisted Gatekeeper, Not a Human Pentest',
          description:
            'Eliminates 95% of common vibe-coding oversights (leaked keys, missing CORS/RLS, unauthenticated routes), but does not replace a manual $25,000 SOC2 compliance human penetration audit.',
        },
      ],
    },
    pricing: {
      eyebrow: 'TRANSPARENT VALUE',
      title: 'Predictable, Developer-First Pricing',
      subtitle:
        'No hidden per-seat sales calls. Start free during development, upgrade when your project requires continuous team gatekeeping and audit persistence.',
      tiers: [
        {
          id: 'free',
          badge: 'COMMUNITY TIER',
          name: 'Free Solo',
          price: '$0',
          period: '/ forever',
          description:
            'Essential pre-deployment security barrier for solo vibe coders and open-source hobbyists.',
          features: [
            '5 web console audits per day',
            'Unlimited local audits via ShipSafe CLI',
            'All 10 critical web threat vectors inspected',
            '1-click remediation prompts for AI agents',
            'Up to 10MB archive upload limit',
            'Zero-Persistence ephemeral RAM sandbox',
          ],
          cta: 'Start Auditing Free',
          isPopular: false,
        },
        {
          id: 'pro',
          badge: 'MOST POPULAR',
          name: 'Pro Team',
          price: '$19',
          period: '/ month',
          description:
            'For indie founders and fast teams shipping production SaaS with zero tolerance for leaked keys or broken RLS.',
          features: [
            'Everything in Free Solo, plus:',
            'Unlimited web console and CLI audits',
            'Supabase audit history & multi-tenant logs',
            'Full MCP Server integration (Cursor, Windsurf, Claude)',
            'Official exportable PDF Security Clearance certificates',
            'Bypass audit queue with priority server allocation',
            'Git pre-commit hook auto-block barrier',
          ],
          cta: 'Upgrade to Pro',
          isPopular: true,
        },
        {
          id: 'enterprise',
          badge: 'CUSTOM INFRASTRUCTURE',
          name: 'Enterprise Custom',
          price: 'Bespoke',
          period: '/ organization',
          description:
            'For organizations requiring air-gapped on-premises deployments, custom audit rule tailoring, and strict SLA compliance.',
          features: [
            'Everything in Pro Team, plus:',
            'Self-hosted Docker container for air-gapped environments',
            'Custom regex and AST rule tailored to internal frameworks',
            'Private GitHub App pull-request blocking bot',
            'Dedicated WhatsApp / Telegram escalation hotline',
            'Formal Indonesian enterprise tax invoice & bank transfer',
            'Custom SLA and security architecture review session',
          ],
          cta: 'Contact Maintainer',
          isPopular: false,
        },
      ],
      reassuranceNote:
        'Need custom payment methods, local bank transfer (BCA/Mandiri/QRIS), or customized security policies? We respond within 15 minutes.',
    },
    contact: {
      eyebrow: 'DIRECT ENGINEERING ACCESS',
      title: 'Need Custom Audit Rules or Dedicated Guidance?',
      subtitle:
        'Connect directly with the creator of ShipSafe. Get hands-on guidance on custom AST rulesets, CI/CD pipeline automation, or auditing bespoke fullstack architectures.',
      whatsappButton: 'Talk on WhatsApp',
      telegramButton: 'Talk on Telegram',
      statusBadge: 'Admin Online: Average response under 15 minutes',
    },
    faq: {
      eyebrow: 'DOCUMENTATION & ANSWERS',
      title: 'Frequently Asked Questions',
      items: [
        {
          question: 'How does ShipSafe differ from legacy scanners like Snyk or SonarQube?',
          answer:
            'Traditional enterprise suites are designed for lengthy release cycles, requiring complex YAML pipelines and returning vague CVE codes. ShipSafe is built specifically for vibe coders: instant 3-second AST analysis, laser focus on AI pitfalls like leaked keys and missing RLS, and exact 1-click remediation prompts ready to paste back into Cursor or Claude Code.',
        },
        {
          question: 'Do you retain, upload, or train AI models on my source code?',
          answer:
            'Never. ShipSafe enforces a strict Zero-Persistence architecture. Your ZIP archive is extracted inside an isolated temporary RAM directory, inspected by deterministic AST rules, and completely destroyed the moment the report is generated. We never index your code, never store archives, and never train AI models on user submissions.',
        },
        {
          question: 'How do I integrate the ShipSafe MCP server into my coding environment?',
          answer:
            'You simply register @lankdev/shipsafe-mcp in your editor configuration (Cursor, Windsurf, or Claude Desktop). Your AI coding assistant gains immediate access to tools like audit_codebase and get_remediation_prompt, enabling an autonomous audit-and-fix feedback loop directly inside your conversation.',
        },
        {
          question: 'Can I run ShipSafe completely offline in an air-gapped environment?',
          answer:
            'Yes. By using the ShipSafe CLI (npx @lankdev/shipsafe-cli scan .) coupled with an on-premises backend container, all AST parsing and pattern matching execute locally on your physical machine or private runner with zero external network dependencies.',
        },
        {
          question: 'How does ShipSafe prevent false positives from halting deployments?',
          answer:
            'Every finding is paired with an explicit confidence rating (Confirmed, Likely verify, or Not enough info) and a deterministic verification command (such as npm audit, curl header check, or test suite execution). You always have the context needed to confirm or dismiss an alert before blocking a build.',
        },
        {
          question: 'Can I use ShipSafe for commercial client projects or startup teams?',
          answer:
            'Yes. The Free Solo tier covers individual development workflows. For commercial teams and agencies needing audit trail persistence, team dashboards, and automated CI/CD PR gatekeeping, the Pro Team tier and Enterprise options offer complete commercial peace of mind.',
        },
      ],
    },
    footer: {
      operationalBadge: 'SHIPSAFE SECURITY GATEWAY',
      operationalText: 'ALL SYSTEMS OPERATIONAL',
      description: 'Pre-Deployment Security Gatekeeper for Web Applications & Vibe-Coded Projects.',
      consoleLink: '[ENTER CONSOLE ->]',
      docsLink: 'DOCUMENTATION',
      repoLink: 'GITHUB REPO',
      complianceNotice: 'GDPR ZERO-PERSISTENCE COMPLIANT • WCAG 2.1 AA ACCESSIBLE • NO CODE RETENTION',
      copyrightNotice: `© ${new Date().getFullYear()} ShipSafe. Built by LankDev & AI Agents.`,
    },
  },
  id: {
    nav: {
      brandName: 'ShipSafe',
      tagline: 'Gerbang Keamanan Kode',
      console: 'Konsol Web',
      howItWorks: 'Cara Kerja',
      comparison: 'Perbandingan',
      threatMatrix: '10 Vektor Ancaman',
      pricing: 'Harga',
      mcp: 'Server MCP',
      cli: 'Panduan CLI',
      faq: 'Tanya Jawab',
      login: 'Masuk / Daftar',
      logout: 'Keluar',
      launchConsole: 'Buka Konsol',
    },
    hero: {
      eyebrowBadge: 'Gerbang Keamanan Pra-Deploy',
      eyebrowSub: 'Barikade Keamanan AST & Regex Otomatis',
      headlineMain: 'Gerbang Keamanan Pra-Deploy untuk',
      headlineHighlight: 'Aplikasi Web Vibe-Coding.',
      subheadline:
        'Dibuat khusus untuk developer dan founder yang membangun aplikasi secepat prompt AI. Tangkap kebocoran service key, endpoint tanpa autentikasi, tabel database terekspos, dan celah prompt injection dalam 3 detik sebelum kode meluncur ke produksi.',
      triggersTitle: 'Ketenangan Operasional: Tangkal 4 Risiko Fatal Sebelum Terlambat',
      triggers: [
        {
          title: 'Cegah Kebocoran Kunci Rahasia',
          description:
            'Amankan kunci Stripe, OpenAI, dan kredensial cloud sebelum bot perayap publik menguras saldo dan kuota Anda.',
          risk: 'Kerugian Finansial',
        },
        {
          title: 'Tangkal Kebocoran Data Publik',
          description:
            'Deteksi ketiadaan Row Level Security (RLS) pada tabel Supabase dan Postgres sebelum data antar-tenant bocor ke publik.',
          risk: 'Kompromi Data',
        },
        {
          title: 'Hindari Ledakan Tagihan API',
          description:
            'Temukan endpoint LLM terbuka tanpa batas pemanggilan sebelum skrip bot otomatis membengkakkan tagihan hingga puluhan juta rupiah.',
          risk: 'Tagihan Membengkak',
        },
        {
          title: 'Jaga Reputasi Peluncuran',
          description:
            'Rilis produk Anda di Product Hunt dan Twitter dengan stempel keamanan terverifikasi, bukan panik menghadapi insiden darurat.',
          risk: 'Kepercayaan Brand',
        },
      ],
      ctaPrimary: 'Buka Konsol Audit',
      ctaSecondary: 'Jelajahi Ekosistem',
      cliLabel: 'npx @lankdev/shipsafe-cli scan .',
      copyButton: 'Salin',
      copiedButton: 'Tersalin',
    },
    bentoPillars: {
      pillars: [
        {
          pillarId: 'Pilar 01: Konsol Web',
          title: 'Audit Web Seketika',
          description:
            'Unggah arsip ZIP atau masukkan tautan repositori GitHub untuk analisis AST 3 detik di memori dengan stempel kelayakan keamanan resmi.',
          actionLabel: 'Buka Konsol',
        },
        {
          pillarId: 'Pilar 02: Server MCP',
          title: 'Jembatan AI Agent Otonom',
          description:
            'Hubungkan Cursor, Claude Desktop, Windsurf, dan Hermes melalui tool standar stdio JSON-RPC 2.0 untuk perbaikan kode mandiri.',
          actionLabel: 'Pelajari MCP',
        },
        {
          pillarId: 'Pilar 03: CLI Terminal & Git Hook',
          title: 'Penjaga Pre-Commit Lokal',
          description:
            'Audit kode secara lokal tanpa dependensi atau pasang git hook 1-klik yang memblokir commit berbahaya sebelum keluar dari laptop.',
          actionLabel: 'Pasang Git Hook',
        },
      ],
    },
    telemetry: {
      windowTitle: 'Telemetri: repo-vibe-saas.bundle.zip (4.8MB)',
      reportTab: 'Laporan Inspeksi',
      promptTab: 'Prompt Remediasi AI',
      astScanStatus: '[00:01.04] Parsing AST 42 berkas kode sumber: OK (0.8s)',
      findingSecrets:
        '[00:01.88] Vektor Pemindaian Kunci Rahasia: [GAGAL] Live key Stripe terekspos di src/config/stripe.ts:8',
      findingAccessControl:
        '[00:02.12] Vektor Kontrol Akses Terbuka: [GAGAL] Endpoint publik tanpa proteksi sesi RLS di app/api/invoices/[id]/route.ts:19',
      findingPromptInjection:
        '[00:02.89] Vektor Celah Prompt Injection: [PERINGATAN] Kueri pengguna tanpa sanitasi masuk ke prompt OpenAI di lib/agent.ts:42',
      verdictSummary: 'Keputusan: 2 temuan kritis, 1 peringatan terdeteksi',
      verdictBadge: 'Tindakan Diperlukan',
      promptTitle: 'PROMPT REMEDIASI KHUSUS UNTUK CLAUDE CODE / CURSOR',
      promptSnippet: `Perbaiki kerentanan kritis F-001 pada \`src/config/stripe.ts\` (baris 8):
1. Hapus secret key Stripe hardcoded \`sk_live_****\`.
2. Muat kredensial secara aman via \`process.env.STRIPE_SECRET_KEY\`.
3. Tambahkan validasi null-check dan lempar ConfigurationError jika variabel tidak ditemukan.
4. Verifikasi perbaikan dengan menjalankan: \`npm run test && npm run build\`.`,
    },
    howItWorks: {
      eyebrow: 'ALUR KERJA & KECEPATAN',
      title: 'Cara ShipSafe Mengamankan Kode Anda dalam 3 Detik',
      subtitle:
        'Tanpa konfigurasi rumit. Tanpa proses background daemon yang membebani sistem. Dari pengiriman kode hingga stempel kelayakan resmi dalam tiga langkah deterministik.',
      steps: [
        {
          stepNumber: '01',
          title: 'Kirimkan Basis Kode',
          tagline: 'Ingesti Tanpa Konfigurasi',
          description:
            'Tarik dan lepas arsip ZIP proyek ke konsol web, jalankan npx @lankdev/shipsafe-cli scan . di terminal Anda, atau panggil fungsi audit_codebase langsung dari Cursor dan Claude Desktop.',
          badge: 'Tanpa konfigurasi YAML',
        },
        {
          stepNumber: '02',
          title: 'Pemindaian AST 3 Detik di Memori',
          tagline: 'Sandbox Ephemeral Terisolasi',
          description:
            'Mesin utama membedah Abstract Syntax Tree dan pola regex pada 10 vektor ancaman modern di dalam RAM sementara yang terisolasi. Kode Anda tidak pernah disimpan permanen dan tidak pernah digunakan untuk melatih model AI.',
          badge: 'Pembersihan memori seketika selesai',
        },
        {
          stepNumber: '03',
          title: 'Stempel Putusan & Prompt AI',
          tagline: 'Remediasi Mandiri Seketika',
          description:
            'Terima status resmi Kelayakan Keamanan (Passed atau Action Required). Untuk setiap temuan, salin prompt perbaikan presisi per-baris yang dirancang khusus bagi asisten koding AI Anda agar celah tuntas diperbaiki dalam 60 detik.',
          badge: 'Diformat untuk 5 coding agent',
        },
      ],
    },
    comparison: {
      eyebrow: 'PERBANDINGAN KATEGORI',
      title: 'Mengapa ShipSafe Lebih Unggul untuk Pengembang Vibe-Coding',
      subtitle:
        'Alat audit enterprise konvensional dibangun untuk siklus rilis korporat bulanan yang sarat konfigurasi CI/CD. ShipSafe dirancang khusus untuk kecepatan dan presisi workflow koding berbasis AI.',
      colFeature: 'Kriteria Arsitektur',
      colShipSafe: 'ShipSafe Gatekeeper',
      colLegacy: 'Alat Enterprise Lawas (Snyk / SonarQube)',
      colLinters: 'Linter Standar (ESLint / Biome)',
      rows: [
        {
          feature: 'Target Arsitektur Kode',
          shipsafe: 'Aplikasi berbasis AI, Next.js, Supabase, Stripe, dan arsitektur cloud modern',
          legacyEnterprise: 'Monorepo korporat lawas, Java/C#, pelaporan kepatuhan kaku',
          basicLinters: 'Format penulisan sintaks, kerapian kode, peringatan tipe data',
        },
        {
          feature: 'Waktu Setup & Konfigurasi',
          shipsafe: '0 detik: Jalankan perintah npx atau unggah ZIP tanpa file konfigurasi',
          legacyEnterprise: 'Berjam-jam hingga harian: Ratusan baris YAML CI/CD dan token agen',
          basicLinters: 'Menit: Perlu instalasi dependensi dan file konfigurasi lokal di setiap repo',
        },
        {
          feature: 'Kecepatan Pemindaian',
          shipsafe: 'Di bawah 3 detik di dalam sandbox memori terisolasi',
          legacyEnterprise: '5 hingga 15 menit mengantre pada pipeline CI/CD jarak jauh',
          basicLinters: 'Sangat cepat, namun hanya memverifikasi gaya tanpa kedalaman keamanan',
        },
        {
          feature: 'Bentuk Rekomendasi Solusi',
          shipsafe: 'Prompt 1-klik yang diformat presisi untuk Cursor, Claude Code, Copilot, dan Windsurf',
          legacyEnterprise: 'Nomor kode CVE abstrak dan tautan dokumentasi berbayar',
          basicLinters: 'Garis bawah merah di editor tanpa arahan perbaikan arsitektural',
        },
        {
          feature: 'Cakupan Ancaman Era AI',
          shipsafe: 'Spesialis: Kebocoran kunci di client, ketiadaan RLS, celah prompt injection',
          legacyEnterprise: 'Database CVE dependensi umum; kerap melewatkan celah logika AI',
          basicLinters: 'Tidak ada analisis kerentanan keamanan siber',
        },
        {
          feature: 'Privasi & Retensi Kode Sumber',
          shipsafe: 'Zero-Persistence: Ekstraksi RAM sementara dengan pembersihan tuntas seketika',
          legacyEnterprise: 'Kode diindeks, disimpan di server vendor luar, dan metadata dicatat',
          basicLinters: 'Berjalan lokal di komputer pengembang',
        },
        {
          feature: 'Transparansi Biaya',
          shipsafe: 'Tingkat gratis selamanya dengan paket tim yang terjangkau dan transparan',
          legacyEnterprise: 'Penjualan korporat tertutup mulai dari ratusan dolar per pengguna per bulan',
          basicLinters: 'Sumber terbuka / Gratis',
        },
      ],
    },
    threatVectors: {
      eyebrow: 'CAKUPAN MENYELURUH',
      title: '10 Vektor Ancaman Kritis yang Diaudit',
      subtitle:
        'ShipSafe memeriksa seluruh permukaan aplikasi web buatan AI terhadap 10 celah keamanan paling sering terjadi:',
      vectors: [
        {
          id: '01',
          name: 'SQL Injection',
          description: 'Penggabungan SQL mentah & injeksi template literal pada kueri ORM dan database',
        },
        {
          id: '02',
          name: 'Cross-Site Scripting (XSS)',
          description: 'Penggunaan innerHTML, dangerouslySetInnerHTML, dan document.write tanpa sanitasi',
        },
        {
          id: '03',
          name: 'DDoS & ReDoS',
          description: 'Ketiadaan pembatas laju trafik (rate limit) dan pola regex eksponensial yang rentan',
        },
        {
          id: '04',
          name: 'Brute Force & Timing Attack',
          description: 'Komparasi password teks polos tanpa proteksi perbandingan waktu konstan',
        },
        {
          id: '05',
          name: 'Malware & Web Shell',
          description: 'Pola signature web shell PHP/Node berbahaya dan unggahan berkas tanpa validasi',
        },
        {
          id: '06',
          name: 'MitM & Broken TLS',
          description: 'rejectUnauthorized: false, pengiriman kredensial teks polos, kuki tanpa flag Secure',
        },
        {
          id: '07',
          name: 'Phishing & Open Redirect',
          description: 'Parameter redirect tanpa validasi whitelist dan absennya header anti-clickjacking',
        },
        {
          id: '08',
          name: 'Defacement Risks',
          description: 'Celah modifikasi berkas webroot atau template publik tanpa verifikasi hak akses',
        },
        {
          id: '09',
          name: 'LFI / RFI & SSRF',
          description: 'Path traversal pada fs.readFile dan permintaan fetch ke URL eksternal bebas',
        },
        {
          id: '10',
          name: 'Zero-Day Dynamic Exec',
          description: 'Eksekusi kode dinamis via eval(), new Function(), prototype pollution, execSync',
        },
      ],
      sandboxGuaranteeTitle: 'Pemrosesan Sandbox Ephemeral',
      sandboxGuaranteeDesc:
        'Kode sumber diekstrak khusus ke dalam direktori sandbox sementara yang terisolasi. Begitu audit selesai, folder langsung dimusnahkan seketika dari memori. Kode Anda tidak pernah disimpan permanen, tidak diindeks, dan tidak digunakan untuk melatih kecerdasan buatan.',
      promptFormatterTitle: 'Pemformat Prompt Multi-Agent',
      promptFormatterDesc:
        'Alih-alih membingungkan Anda dengan kode CVE yang abstrak, ShipSafe menyusun prompt perbaikan presisi per-baris untuk Cursor, Claude Code, GitHub Copilot, dan Windsurf lengkap dengan panduan verifikasi mandiri.',
    },
    limitations: {
      eyebrow: 'TRANSPARANSI TOTAL',
      title: 'Batasan Jujur: Hal yang Tidak Dilakukan ShipSafe',
      subtitle:
        'Kami percaya pada transparansi teknis tanpa klaim keamanan yang berlebihan. Harap perhatikan batasan teknis berikut:',
      items: [
        {
          title: 'Batas Ukuran Arsip 10 MB',
          description:
            'Dirancang spesifik untuk aplikasi web, frontend modern, dan layanan mikro API. Tidak ditujukan untuk monorepo raksasa berisi aset video atau biner berukuran gigabyte.',
        },
        {
          title: 'Murni Analisis Statis AST (SAST)',
          description:
            'ShipSafe memindai struktur AST dan pola konfigurasi secara statis. Alat ini tidak menyalakan kontainer runtime, tidak melakukan uji penetrasi jaringan aktif, dan tidak memantau alokasi memori heap dinamis.',
        },
        {
          title: 'Penjaga Berbantuan AI, Bukan Pengganti Pentester Manual',
          description:
            'Mengeliminasi 95% kelalaian keamanan umum vibe-coding (kunci bocor, rute tanpa proteksi, RLS bolong), namun tidak menggantikan uji penetrasi manual sertifikasi SOC2 atau ISO 27001 bernilai puluhan juta rupiah.',
        },
      ],
    },
    pricing: {
      eyebrow: 'HARGA TRANSPARAN',
      title: 'Biaya Terjangkau, Dibuat untuk Pengembang',
      subtitle:
        'Tanpa panggilan sales tersembunyi. Mulai gratis selama masa eksplorasi dan pembuatan prototipe, tingkatkan saat proyek membutuhkan penjaga keamanan tim yang konsisten.',
      tiers: [
        {
          id: 'free',
          badge: 'GRATIS SELAMANYA',
          name: 'Free Solo',
          price: 'Rp 0',
          period: '/ selamanya',
          description:
            'Barikade keamanan pra-deploy esensial untuk developer mandiri dan proyek eksplorasi.',
          features: [
            '5 audit konsol web per hari',
            'Audit lokal tanpa batas via ShipSafe CLI',
            'Seluruh 10 vektor ancaman kritis diperiksa',
            'Prompt perbaikan 1-klik untuk AI agent',
            'Batas ukuran arsip hingga 10 MB',
            'Sandbox RAM ephemeral tanpa retensi kode',
          ],
          cta: 'Mulai Audit Gratis',
          isPopular: false,
        },
        {
          id: 'pro',
          badge: 'PALING POPULER',
          name: 'Pro Team',
          price: 'Rp 190.000',
          period: '/ bulan',
          description:
            'Untuk indie founder dan tim gesit yang merilis produk SaaS ke publik tanpa toleransi kebocoran kunci atau celah database.',
          features: [
            'Semua fitur pada paket Free Solo, ditambah:',
            'Audit konsol web dan CLI tanpa batas kuota',
            'Penyimpanan riwayat audit & log di Supabase',
            'Integrasi penuh ShipSafe MCP Server (Cursor, Claude, Windsurf)',
            'Ekspor sertifikat resmi kelayakan keamanan format PDF',
            'Antrean prioritas server tanpa waktu tunggu',
            'Hook pre-commit git pemblokir commit berbahaya',
          ],
          cta: 'Tingkatkan ke Pro',
          isPopular: true,
        },
        {
          id: 'enterprise',
          badge: 'INFRASTRUKTUR KHUSUS',
          name: 'Enterprise Custom',
          price: 'Kustom',
          period: '/ organisasi',
          description:
            'Untuk organisasi yang memerlukan instalasi kontainer tertutup on-premises, kustomisasi aturan audit, dan jaminan SLA ketat.',
          features: [
            'Semua fitur pada paket Pro Team, ditambah:',
            'Kontainer Docker mandiri untuk jaringan tertutup (air-gapped)',
            'Aturan regex dan AST khusus disesuaikan dengan arsitektur internal',
            'Bot privat GitHub App untuk pemblokiran otomatis Pull Request',
            'Hotline eskalasi langsung ke maintainer via WhatsApp / Telegram',
            'Faktur pajak resmi perusahaan dan pembayaran transfer bank lokal',
            'Jaminan SLA serta sesi peninjauan arsitektur keamanan berkala',
          ],
          cta: 'Hubungi Pengembang',
          isPopular: false,
        },
      ],
      reassuranceNote:
        'Butuh metode pembayaran transfer bank lokal (BCA/Mandiri/QRIS), faktur pajak perusahaan, atau aturan audit khusus? Kami merespons dalam 15 menit.',
    },
    contact: {
      eyebrow: 'AKSES TEKNIS LANGSUNG',
      title: 'Butuh Aturan Audit Khusus atau Konsultasi Keamanan?',
      subtitle:
        'Terhubung langsung dengan kreator inti ShipSafe. Dapatkan panduan integrasi aturan AST khusus, otomatisasi pipeline CI/CD, atau audit arsitektur fullstack spesifik.',
      whatsappButton: 'Konsultasi via WhatsApp',
      telegramButton: 'Diskusi via Telegram',
      statusBadge: 'Pengembang Online: Rata-rata respon di bawah 15 menit',
    },
    faq: {
      eyebrow: 'DOKUMENTASI & JAWABAN',
      title: 'Pertanyaan yang Sering Diajukan',
      items: [
        {
          question: 'Apa perbedaan utama ShipSafe dibanding alat lama seperti Snyk atau SonarQube?',
          answer:
            'Alat enterprise konvensional dirancang untuk siklus rilis yang lambat, membutuhkan konfigurasi pipeline YAML yang rumit, dan hanya memberi nomor CVE abstrak. ShipSafe dibuat khusus untuk era vibe-coding: audit kilat 3 detik, fokus pada kelalaian umum AI seperti kunci bocor dan RLS hilang, serta menyediakan prompt perbaikan 1-klik yang siap ditempelkan langsung ke Cursor atau Claude Code.',
        },
        {
          question: 'Apakah kode sumber saya disimpan, diintip, atau digunakan untuk melatih model AI?',
          answer:
            'Sama sekali tidak. ShipSafe menerapkan arsitektur Zero-Persistence yang ketat. Berkas ZIP diekstrak ke dalam folder memori RAM sementara yang terisolasi, diperiksa menggunakan aturan AST deterministik, dan langsung dimusnahkan seketika laporan selesai. Kami tidak pernah mengindeks kode Anda, tidak menyimpan arsip, dan tidak pernah menggunakan kiriman pengguna untuk melatih AI.',
        },
        {
          question: 'Bagaimana cara mengintegrasikan ShipSafe MCP server ke editor saya?',
          answer:
            'Cukup tambahkan paket @lankdev/shipsafe-mcp ke konfigurasi editor Anda (Cursor, Windsurf, atau Claude Desktop). Asisten koding AI Anda dapat langsung memanggil tool seperti audit_codebase dan get_remediation_prompt untuk mendeteksi serta memperbaiki celah keamanan secara mandiri dalam percakapan.',
        },
        {
          question: 'Bisakah ShipSafe dijalankan offline tanpa koneksi internet sama sekali?',
          answer:
            'Ya. Menggunakan ShipSafe CLI (npx @lankdev/shipsafe-cli scan .) yang dihubungkan ke backend lokal mandiri, seluruh proses parsing AST dan pencocokan pola berjalan langsung di komputer Anda tanpa memerlukan dependensi jaringan keluar.',
        },
        {
          question: 'Bagaimana ShipSafe menangani false positive agar tidak menghambat rilis?',
          answer:
            'Setiap temuan dilengkapi tingkat kepastian yang jelas (Confirmed, Likely verify, atau Not enough info) serta perintah verifikasi deterministik (seperti npm audit atau pengujian curl). Anda selalu memegang kendali penuh untuk memverifikasi atau mengabaikan temuan secara objektif sebelum memblokir proses rilis.',
        },
        {
          question: 'Bolehkah ShipSafe digunakan untuk proyek klien komersial atau tim rintisan?',
          answer:
            'Tentu saja. Paket Free Solo dapat digunakan bebas untuk kebutuhan pengembang individu. Untuk tim komersial dan agensi yang membutuhkan rekam jejak audit tersimpan, dasbor tim, dan penjaga Pull Request di CI/CD, paket Pro Team dan Enterprise siap memberikan ketenangan operasional penuh.',
        },
      ],
    },
    footer: {
      operationalBadge: 'GERBANG KEAMANAN SHIPSAFE',
      operationalText: 'SELURUH SISTEM OPERASIONAL',
      description: 'Gerbang Keamanan Pra-Deploy untuk Aplikasi Web & Proyek Vibe-Coding.',
      consoleLink: '[BUKA KONSOL ->]',
      docsLink: 'DOKUMENTASI',
      repoLink: 'REPOSITORI GITHUB',
      complianceNotice: 'KEPATUHAN GDPR ZERO-PERSISTENCE • AKSESIBEL WCAG 2.1 AA • TANPA RETENSI KODE',
      copyrightNotice: `© ${new Date().getFullYear()} ShipSafe. Dikembangkan oleh LankDev & AI Agents.`,
    },
  },
}
