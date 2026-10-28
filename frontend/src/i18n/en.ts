import type { LandingContentSchema } from './types'

export const enContent: LandingContentSchema = {
  nav: {
    brand: {
      name: 'ShipSafe',
      desk: '// CUSTOMS DESK',
      versionBadge: 'v2.4-STABLE',
      monogram: 'SS',
    },
    links: {
      console: 'Console',
      howItWorks: 'How It Works',
      mcp: 'MCP Server',
      cli: 'CLI Tool',
      threatMatrix: '10 Vectors',
      comparison: 'Comparison',
      limitations: 'Limitations',
      pricing: 'Pricing',
      faq: 'FAQ',
      documentation: 'Docs',
    },
    language: {
      toggleAria: 'Switch language to Bahasa Indonesia',
      currentLabel: 'English',
      switchLabel: 'Switch to ID',
      en: 'EN',
      id: 'ID',
    },
    auth: {
      signIn: 'Sign In / Register',
      signOut: 'Sign Out',
      guestClearance: 'Guest Clearance',
    },
    cta: {
      launchConsole: 'Launch Console',
      launchConsoleAria: 'Launch security audit console',
    },
  },

  hero: {
    eyebrow: {
      tag: '// PRE-DEPLOYMENT GATEKEEPER',
      separator: '|',
      subtitle: 'Automated AST & Regex Security Barrier',
    },
    headline: {
      prefix: 'The Customs Desk for',
      highlight: 'Vibe-Coded Web Apps.',
      suffix: 'Inspect before you ship.',
    },
    reassurance:
      'Built for developers prompting at the speed of thought. Catch leaked service keys, unauthenticated API routes, broken RLS, and prompt injection surfaces in 3 seconds before pushing to production.',
    cta: {
      primary: 'Launch Console',
      shortcut: '⌘K',
      secondary: 'Explore Ecosystem',
      dropHint: 'or drop ZIP / repo URL',
    },
    cliBar: {
      command: 'npx @lankdev/shipsafe-cli scan .',
      copyLabel: 'Copy',
      copiedLabel: 'Copied',
      hint: 'Runs locally in ephemeral memory with zero configuration required.',
    },
  },

  pillars: {
    header: {
      eyebrow: 'THREE ENTRY POINTS',
      title: 'Guarding Your Workflow at Every Stage',
      subtitle:
        'Whether you audit in your browser, trigger scans from terminal hooks, or let AI coding agents self-heal vulnerabilities via MCP.',
    },
    console: {
      tag: 'PILLAR 01 // CONSOLE',
      title: 'Web Audit Console',
      description:
        'Upload a ZIP archive or import any public GitHub repository. Get instantaneous AST analysis, risk scoring, and official customs docket clearance stamps directly in your browser.',
      action: 'Launch Console ->',
    },
    mcp: {
      tag: 'PILLAR 02 // MCP',
      title: 'Autonomous Agent Bridge',
      description:
        'Connect ShipSafe directly to Cursor, Claude Desktop, Windsurf, OpenCode, and Hermes via standard stdio JSON-RPC 2.0. Allow coding agents to audit and remediate findings autonomously.',
      action: 'Explore MCP Setup ->',
    },
    cli: {
      tag: 'PILLAR 03 // CLI',
      title: 'Pre-Commit & CI Gatekeeper',
      description:
        'Audit code locally in milliseconds or install a 1-click git hook that blocks vulnerable commits. Emits OASIS standard SARIF 2.1.0 telemetry for native GitHub Code Scanning integration.',
      action: 'Inspect CLI Specs ->',
    },
  },

  telemetry: {
    window: {
      title: 'telemetry // repo-vibe-saas.bundle.zip (4.8MB)',
      statusActive: 'SCANNING ACTIVE',
      dotsAria: 'Terminal window controls',
    },
    tabs: {
      report: 'Inspection Report',
      prompt: '1-Click Agent Prompt',
    },
    reportLogs: {
      parsing: '[00:01.04] AST parsing 42 source files... OK (0.8s)',
      finding1:
        '[00:01.88] Vector 01: Secrets Scan - [FAIL] Stripe live key exposed in src/config/stripe.ts:8',
      finding2:
        '[00:02.12] Vector 04: Broken Access Control - [FAIL] Public endpoint lacks session RLS guard in app/api/invoices/[id]/route.ts:19',
      finding3:
        '[00:02.89] Vector 07: Prompt Injection Surface - [WARN] Raw unsanitized query passed into OpenAI prompt in lib/agent.ts:42',
      summary: 'Verdict: 2 critical findings, 1 warning detected',
      statusBadge: 'Action Required',
    },
    promptSnippet: {
      badge: 'TAILORED REMEDIATION PROMPT FOR CLAUDE CODE / CURSOR',
      targetAgent: 'Claude Code & Cursor',
      content: `Fix critical vulnerability F-001 in \`src/config/stripe.ts\` (line 8):
1. Remove hardcoded Stripe live key \`sk_live_****\`.
2. Load secret securely via \`process.env.STRIPE_SECRET_KEY\`.
3. Add null check validation and throw meaningful ConfigurationError if missing.
4. Verify fix by executing: \`npm run test && npm run build\`.`,
      copyAria: 'Copy tailored remediation prompt',
    },
  },

  howItWorks: {
    header: {
      tag: 'THE 3-SECOND PROTOCOL',
      title: 'Zero Setup. Immediate Perimeter Clearance.',
      subtitle:
        'Traditional security tools demand hours of fragile YAML setup before scanning a single line. ShipSafe eliminates friction across three straightforward steps.',
    },
    steps: {
      step1: {
        number: '01',
        title: 'Drop Code or Declare Repo',
        subtitle: 'Zero YAML Daemons',
        description:
          'No 200-line config files or daemon installations. Drag and drop a local ZIP file (up to 10MB), paste a public GitHub repository link, or execute `npx @lankdev/shipsafe-cli scan .` directly from your terminal.',
      },
      step2: {
        number: '02',
        title: '3-Second Ephemeral AST Scan',
        subtitle: 'Isolated RAM Sandbox',
        description:
          'Your codebase is parsed into an abstract syntax tree and audited against 10 critical security vectors inside an ephemeral sandbox. Code is treated purely as data, never executed, and immediately expunged from memory.',
      },
      step3: {
        number: '03',
        title: 'Customs Clearance & 1-Click Fixes',
        subtitle: 'Actionable AI Prompts',
        description:
          'Receive an unambiguous Customs Docket verdict stamp (Approved for Ship or Quarantined). If vulnerabilities are detected, get line-specific remediation prompts tailored for Cursor, Claude Code, and Windsurf.',
      },
    },
  },

  comparison: {
    header: {
      tag: 'ARCHITECTURAL COMPARISON',
      title: 'Why ShipSafe Fits the Vibe-Coding Era',
      subtitle:
        'See how ShipSafe compares with legacy enterprise vulnerability scanners and traditional linters when shipping software at AI speed.',
    },
    columns: {
      metric: 'Capability / Metric',
      shipsafe: 'ShipSafe Customs Desk',
      legacySast: 'Legacy Enterprise SAST (SonarQube, Snyk)',
      linters: 'Standard Linters (ESLint, Prettier)',
    },
    rows: [
      {
        metric: 'Setup & Configuration Time',
        shipsafe: '3 seconds, zero configuration required',
        legacySast: '2 to 5 days of complex YAML pipeline setup',
        linters: '15 to 30 minutes of rule adjustments',
      },
      {
        metric: 'AI Agent Remediation Prompts',
        shipsafe: '1-Click prompts tailored for Cursor, Claude, Copilot, Windsurf',
        legacySast: 'Abstract CVE codes and 80-page static PDF audits',
        linters: 'Basic syntax error messages without security context',
      },
      {
        metric: 'Vibe-Coding Threat Specialization',
        shipsafe: 'Deep coverage for leaked LLM keys, broken RLS, and prompt injections',
        legacySast: 'Heavy focus on legacy monolithic Java/C++ CVE catalogs',
        linters: 'Limited strictly to formatting style and syntax validity',
      },
      {
        metric: 'Data Privacy & Source Code Retention',
        shipsafe: 'Zero-Persistence: ephemeral RAM sandbox, immediate deletion',
        legacySast: 'Source code indexed and permanently stored on remote servers',
        linters: 'Local file execution only',
      },
      {
        metric: 'Scan Velocity & Feedback Loop',
        shipsafe: '2 to 4 seconds end-to-end',
        legacySast: '5 to 25 minutes inside continuous integration pipelines',
        linters: 'Sub-second, but zero security architecture reasoning',
      },
      {
        metric: 'Pre-Commit & CI Enforcement',
        shipsafe: 'Automated git hook installer with deterministic exit codes & SARIF 2.1.0',
        legacySast: 'Complex external webhooks and server agents required',
        linters: 'Basic exit codes without risk prioritization',
      },
    ],
  },

  threatMatrix: {
    header: {
      tag: 'COMPREHENSIVE COVERAGE',
      title: '10 Critical Threat Vectors Audited',
      subtitle:
        'ShipSafe inspects the full surface of modern AI-generated codebases against the 10 most damaging vibe-coding security pitfalls:',
    },
    vectors: [
      {
        id: '01',
        name: 'SQL Injection',
        techDescription:
          'Raw SQL string concatenation and unescaped template literal interpolations in database queries and ORMs.',
        consequence:
          'Full database compromise, unauthorized extraction of sensitive user records, and catastrophic customer data leakage.',
      },
      {
        id: '02',
        name: 'Cross-Site Scripting (XSS)',
        techDescription:
          'Unescaped HTML injections via innerHTML, dangerouslySetInnerHTML, or unvalidated document.write calls.',
        consequence:
          'Session token hijacking, account takeover, and execution of malicious payload scripts in end-user browsers.',
      },
      {
        id: '03',
        name: 'DDoS & ReDoS',
        techDescription:
          'Endpoints missing rate limiting middleware coupled with catastrophic polynomial or exponential regex backtracking.',
        consequence:
          'Application downtime, server CPU starvation, third-party API quota exhaustion, and runaway cloud infrastructure bills.',
      },
      {
        id: '04',
        name: 'Brute Force & Timing Attacks',
        techDescription:
          'Plaintext string equality comparisons for secrets without constant-time equality guards (crypto.timingSafeEqual).',
        consequence:
          'Cryptographic secret deduction via side-channel timing analysis and successful automated credential brute-forcing.',
      },
      {
        id: '05',
        name: 'Malware & Upload Web Shells',
        techDescription:
          'Unvalidated multi-part file uploads allowing executable extensions (PHP/JSP/Node) and hidden web shell payloads.',
        consequence:
          'Permanent server takeover, persistent unauthorized access, and root access exploitation by hostile actors.',
      },
      {
        id: '06',
        name: 'MitM & Broken TLS',
        techDescription:
          'Insecure HTTPS configurations such as rejectUnauthorized: false, plaintext credential transmission, and missing secure cookie attributes.',
        consequence:
          'Man-in-the-middle network interception, plaintext token harvesting over public Wi-Fi, and session impersonation.',
      },
      {
        id: '07',
        name: 'Phishing & Open Redirect',
        techDescription:
          'Unvalidated external redirect query parameters and missing HTTP security headers (X-Frame-Options, Content-Security-Policy).',
        consequence:
          'Weaponization of your official domain for phishing credential theft and clickjacking UI overlays.',
      },
      {
        id: '08',
        name: 'Defacement Risks',
        techDescription:
          'Unprotected public administrative endpoints or CMS routes allowing unauthenticated modification of templates or static webroot assets.',
        consequence:
          'Public website defacement, destruction of corporate reputation, and immediate loss of commercial credibility.',
      },
      {
        id: '09',
        name: 'LFI / RFI & SSRF',
        techDescription:
          'Path traversal vulnerabilities in filesystem calls (fs.readFile) and unbounded remote fetch queries (fetch(req.query.url)).',
        consequence:
          'Extraction of confidential server files (.env, /etc/passwd) and unauthorized querying of cloud metadata services (169.254.169.254).',
      },
      {
        id: '10',
        name: 'Zero-Day Dynamic Code Execution',
        techDescription:
          'Dynamic code evaluation patterns (eval(), new Function(), execSync(), and vulnerable prototype pollution vectors).',
        consequence:
          'Immediate Remote Code Execution (RCE) granting attackers arbitrary command execution capability inside your backend runtime.',
      },
    ],
    guarantees: {
      sandbox: {
        title: 'Ephemeral Sandbox Processing',
        description:
          'Raw source code is extracted strictly to an isolated temporary sandbox directory. Once analysis finishes, the directory is immediately wiped from memory. Your proprietary code is never persisted, never indexed, and never used to train machine learning models.',
      },
      multiAgent: {
        title: 'Multi-Agent Prompt Formatter',
        description:
          'Instead of leaving you with abstract CVE codes, ShipSafe formats exact, line-specific remediation prompts tailored for Cursor, Claude Code, GitHub Copilot, and Windsurf with self-contained reproduction and verification instructions.',
      },
    },
  },

  limitations: {
    header: {
      title: 'WHAT SHIPSAFE DOES NOT DO',
      subtitle:
        'We believe in honest developer tooling without misleading security marketing. Please note our deliberate engineering boundaries:',
    },
    items: {
      archiveLimit: {
        title: '10MB Archive Upper Limit',
        description:
          'Engineered specifically for web applications, frontend single-page apps, and microservice APIs. It is not designed to ingest multi-gigabyte monolithic repositories or binary video and dataset assets.',
      },
      staticOnly: {
        title: 'Purely Static AST Analysis',
        description:
          'ShipSafe scans configurations and AST structures statically. It does not spin up runtime containers, execute fuzzing network probes, or inspect dynamic heap memory allocations.',
      },
      notPentest: {
        title: 'Not a Human Pentest Replacement',
        description:
          'Eliminates 95% of common vibe-coding blunders (leaked keys, missing CORS/RLS, unauthenticated routes), but does not replace a manual $25,000 SOC2 compliance human penetration audit.',
      },
    },
  },

  pricing: {
    header: {
      tag: 'DEVELOPER PRICING',
      title: 'Simple, Predictable Security Pricing',
      subtitle:
        'Start auditing code for free. Upgrade when you need team collaboration, priority queues, and official compliance certificates.',
    },
    tiers: {
      community: {
        name: 'Community',
        price: '$0',
        period: 'Free Forever',
        description:
          'For individual developers, hobbyists, and open-source vibe coders inspecting public or local prototypes.',
        features: [
          '3 web console scans per day',
          'Unlimited scans via local Terminal CLI',
          'All 10 threat vectors covered',
          '1-Click AI agent remediation prompts',
          'Maximum archive upload size: 10MB',
          'Community Discord & GitHub support',
        ],
        cta: 'Start Free Now',
      },
      pro: {
        badge: 'MOST POPULAR',
        name: 'Pro Builder',
        price: '$12',
        period: 'per month / Rp 120.000',
        description:
          'For indie hackers, solo founders, and freelance engineers shipping production web applications to customers.',
        features: [
          'Unlimited web console & CLI audits',
          'Priority queue bypass processing',
          'Persistent audit history saved in Supabase',
          'Official Security Clearance Certificate (PDF)',
          'Native MCP Server access for Cursor & Claude',
          'Priority email & direct maintainer support',
        ],
        cta: 'Upgrade to Pro',
      },
      enterprise: {
        name: 'Enterprise',
        price: 'Custom',
        period: 'Bespoke Agreement',
        description:
          'For fast engineering teams, software agencies, and organizations requiring custom AST rules and dedicated SLAs.',
        features: [
          'On-premises Docker self-hosted deployment',
          'Custom organizational AST & regex rulesets',
          'Private GitHub pull request bot integration',
          'Team seat management & multi-tenant RLS',
          'BCA, Mandiri, and Corporate Bank Transfer invoices',
          'Dedicated Slack/WhatsApp channel & 99.9% uptime SLA',
        ],
        cta: 'Contact Sales',
      },
    },
    guarantee:
      '14-day money-back guarantee on all paid plans. Zero code retention policy applies to all tiers.',
  },

  support: {
    title: 'Need Custom Audit Rules or Dedicated Guidance?',
    subtitle:
      'Connect directly with the creator of ShipSafe. Get assistance on integrating custom regex rulesets, configuring CI/CD pipelines, or auditing specialized web architectures.',
    badge: '● MAINTAINER ONLINE // AVERAGE RESPONSE TIME < 15 MINUTES',
    whatsapp: {
      label: 'Talk on WhatsApp',
      url: 'https://wa.me/6285156559384?text=Halo%20Admin%20ShipSafe%2C%20saya%20tertarik%20konsultasi%20keamanan%20proyek%20saya',
      aria: 'Open WhatsApp chat with maintainer',
    },
    telegram: {
      label: 'Talk on Telegram',
      url: 'https://t.me/gilankdev',
      aria: 'Open Telegram chat with maintainer',
    },
  },

  faq: {
    header: {
      tag: 'DOCUMENTATION & ANSWERS',
      title: 'Frequently Asked Questions',
    },
    items: [
      {
        id: 'faq-legacy-comparison',
        question: 'How does ShipSafe differ from legacy scanners like Snyk or SonarQube?',
        answer:
          'Traditional enterprise scanners are engineered for slow, monolithic waterfall development cycles and require extensive, fragile YAML configurations. ShipSafe is designed specifically for the AI vibe-coding era: instant 3-second in-memory AST scans, targeted focus on modern LLM hallucination risks (exposed secrets, missing database RLS, and prompt injection surfaces), and direct 1-click remediation prompts ready to paste back into Cursor, Claude Code, or Windsurf.',
      },
      {
        id: 'faq-privacy-retention',
        question: 'Do you upload or store my proprietary source code?',
        answer:
          'Never. ShipSafe strictly enforces an ephemeral Zero-Persistence architecture. ZIP archives are extracted exclusively to an isolated temporary sandbox directory in RAM, analyzed by our deterministic AST engine, and immediately purged upon completion. We never index your code, never retain repository files, and never use user submissions to train machine learning models.',
      },
      {
        id: 'faq-mcp-integration',
        question: 'How do I connect ShipSafe to Cursor or Claude Desktop via MCP?',
        answer:
          'ShipSafe provides an official Model Context Protocol (MCP) server package (@lankdev/shipsafe-mcp) communicating over standard stdio JSON-RPC 2.0. Simply add our package to your editor config file (.cursor/mcp.json or claude_desktop_config.json). Once enabled, your AI coding agent can autonomously invoke audit_codebase, read the threat matrix, and apply patches in an automated self-healing loop.',
      },
      {
        id: 'faq-offline-airgap',
        question: 'Can ShipSafe run completely offline in an air-gapped terminal environment?',
        answer:
          'Yes. By executing our lightweight terminal CLI (npx @lankdev/shipsafe-cli scan .), directory parsing and .gitignore evaluation happen entirely on your workstation. When pointed to a local or self-hosted instance of the ShipSafe backend engine, your codebase never leaves your local network, making it compliant with air-gapped enterprise environments.',
      },
      {
        id: 'faq-false-positives',
        question: 'What happens if a false positive or non-applicable rule is reported?',
        answer:
          'Every vulnerability finding is tagged with an objective confidence level (Confirmed, Likely verify, or Not enough information) accompanied by an explicit verification command (such as npm audit or a test curl probe). If an identified pattern represents an intended architectural choice in your project, you can safely disregard it or adjust severity thresholds without interrupting your deployment pipeline.',
      },
    ],
  },

  footer: {
    gateway: {
      title: 'SHIPSAFE SECURITY GATEWAY',
      badge: 'ALL SYSTEMS OPERATIONAL',
      description:
        'Pre-Deployment Security Gatekeeper for Web Applications & Vibe-Coded Projects.',
    },
    links: {
      console: 'Enter Console ->',
      github: 'GitHub Repo',
      docs: 'Documentation',
      mcp: 'MCP Server',
      cli: 'Terminal CLI',
      privacy: 'Privacy Protocol',
      terms: 'Terms of Clearance',
    },
    compliance: 'GDPR ZERO-PERSISTENCE COMPLIANT • WCAG 2.1 AA ACCESSIBLE • NO CODE RETENTION',
    copyright: `© ${new Date().getFullYear()} ShipSafe. Built by LankDev & AI Agents.`,
  },
}
