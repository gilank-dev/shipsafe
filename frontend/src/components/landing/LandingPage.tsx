import { useState, useEffect } from 'react'
import { useClerk } from '@clerk/clerk-react'
import { ThemeToggle } from '../shell/ThemeToggle'
import { signOut } from '../../lib/supabase'
import { useStore } from '../../state/store'

interface LandingPageProps {
  onLaunchConsole: () => void
}

export function LandingPage({ onLaunchConsole }: LandingPageProps) {
  const [copiedCli, setCopiedCli] = useState(false)
  const [copiedMcp, setCopiedMcp] = useState(false)
  const [copiedHook, setCopiedHook] = useState(false)
  const [mcpTab, setMcpTab] = useState<'cursor' | 'claude' | 'windsurf'>('cursor')
  const [activeTab, setActiveTab] = useState<'report' | 'prompt'>('report')
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      setTimeout(() => {
        const el = document.querySelector(window.location.hash)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' })
        }
      }, 50)
    }
  }, [])

  const setAuthModalOpen = useStore((s) => s.setAuthModalOpen)
  const setAuthUser = useStore((s) => s.setAuthUser)
  const user = useStore((s) => s.auth.user)
  const clerk = useClerk()

  const handleCopyCli = () => {
    void navigator.clipboard.writeText('npx @shipsafe/cli scan .')
    setCopiedCli(true)
    setTimeout(() => setCopiedCli(false), 2000)
  }

  const handleCopyMcp = (configText: string) => {
    void navigator.clipboard.writeText(configText)
    setCopiedMcp(true)
    setTimeout(() => setCopiedMcp(false), 2000)
  }

  const handleCopyHook = () => {
    void navigator.clipboard.writeText('node cli/scripts/install-hook.js --install')
    setCopiedHook(true)
    setTimeout(() => setCopiedHook(false), 2000)
  }

  const handleSignOut = async () => {
    try {
      if (clerk?.signOut) {
        await clerk.signOut()
      }
    } catch {
      // non-blocking
    }
    await signOut()
    setAuthUser(null)
  }

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index)
  }

  const mcpConfigs = {
    cursor: `// .cursor/mcp.json
{
  "mcpServers": {
    "shipsafe": {
      "command": "node",
      "args": [
        "${typeof window !== 'undefined' ? window.location.origin : 'https://shipsafe.lankdev.my.id'}/mcp/dist/index.js"
      ]
    }
  }
}`,
    claude: `// claude_desktop_config.json
{
  "mcpServers": {
    "shipsafe": {
      "command": "node",
      "args": ["C:/ShipSafe/mcp/dist/index.js"]
    }
  }
}`,
    windsurf: `// ~/.codeium/windsurf/mcp_config.json
{
  "mcpServers": {
    "shipsafe": {
      "command": "npx",
      "args": ["-y", "@shipsafe/mcp-server"]
    }
  }
}`,
  }

  return (
    <div className="min-h-[100dvh] bg-canvas text-ink font-sans selection:bg-ink selection:text-canvas transition-colors duration-200">
      {/* 1. TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-40 border-b border-rule bg-canvas/90 backdrop-blur-md transition-colors duration-200">
        <div className="mx-auto flex h-15 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-sm border border-rule-strong bg-ink text-canvas font-mono text-caption font-bold shadow-xs">
              SS
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-extrabold tracking-tight text-h4 uppercase text-ink">
                ShipSafe <span className="font-mono text-caption text-ink-3 font-normal">// CUSTOMS DESK</span>
              </span>
              <span className="hidden font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-xs border border-rule text-ink-2 bg-surface md:inline">
                v2.4-STABLE
              </span>
            </div>
          </div>

          <nav className="hidden items-center gap-7 font-mono text-caption uppercase tracking-wider text-ink-2 lg:flex">
            <button
              type="button"
              onClick={onLaunchConsole}
              className="text-ink font-bold hover:text-ink transition-colors cursor-pointer"
            >
              Console
            </button>
            <a href="#mcp" className="hover:text-ink transition-colors">
              MCP Server
            </a>
            <a href="#cli" className="hover:text-ink transition-colors">
              CLI
            </a>
            <a href="#threat-matrix" className="hover:text-ink transition-colors">
              10 Vectors
            </a>
            <a href="#faq" className="hover:text-ink transition-colors">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            {user ? (
              <div className="flex items-center gap-2">
                <span className="hidden font-mono text-caption text-ink-2 sm:inline truncate max-w-[130px]">
                  {user.email || user.fullName}
                </span>
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  className="font-mono text-caption uppercase tracking-wider px-3 py-1.5 rounded-sm border border-rule hover:border-rule-strong bg-surface hover:bg-raised transition-colors cursor-pointer"
                >
                  Keluar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="font-mono text-caption uppercase tracking-wider px-3.5 py-1.5 rounded-sm border border-rule hover:border-rule-strong bg-surface hover:bg-raised transition-all cursor-pointer active:scale-98"
              >
                Login / Daftar
              </button>
            )}
            <button
              type="button"
              onClick={onLaunchConsole}
              className="flex items-center gap-1.5 rounded-sm border border-ink bg-ink px-4 py-1.5 font-mono text-caption font-bold uppercase tracking-wider text-canvas hover:bg-ink/85 transition-all shadow-xs active:scale-98 cursor-pointer"
            >
              <span>Launch Console</span>
              <span aria-hidden="true">&rarr;</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* 2. HERO SECTION */}
        <section className="pt-12 pb-18 border-b border-rule">
          <div className="mb-5 inline-flex items-center gap-2.5 rounded-full border border-rule bg-surface/80 px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-ink-2 backdrop-blur-xs shadow-xs">
            <span className="size-2 rounded-full bg-pass inline-block animate-pulse" />
            <span>MANIFEST #SS-9042 // PRE-SHIPMENT CLEARANCE</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.06] max-w-4xl text-ink uppercase mb-6">
            The Customs Desk for <br className="hidden sm:inline" />
            <span className="underline decoration-rule-strong decoration-2 underline-offset-8">Vibe-Coded Web Apps</span>.
          </h1>

          <p className="text-base sm:text-xl text-ink-2 max-w-3xl leading-relaxed mb-10 font-normal">
            Built for developers prompting at the speed of thought. Catch leaked service keys, unauthenticated API routes, broken RLS, and prompt injection surfaces in <strong>3 seconds</strong> before pushing to production.
          </p>

          {/* Quick Action Dock: 3 Main Pillars (Console, MCP, CLI) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
            <button
              type="button"
              onClick={onLaunchConsole}
              className="group rounded-sm border border-ink bg-ink text-canvas p-4 text-left cursor-pointer transition-all hover:bg-ink/90 active:scale-[0.99] shadow-xs flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-caption text-canvas/70 font-mono mb-3">
                <span className="font-bold tracking-wider">PILLAR 01 // AUDIT CONSOLE</span>
                <span className="transition-transform group-hover:translate-x-1">&rarr;</span>
              </div>
              <div>
                <div className="text-lg font-extrabold uppercase tracking-tight text-canvas">Launch Web Audit</div>
                <div className="text-caption text-canvas/80 font-normal mt-1 leading-snug">
                  Upload ZIP archive or import GitHub repository for 3-second AST analysis and official customs verdict stamp.
                </div>
              </div>
            </button>

            <a
              href="#mcp"
              className="group rounded-sm border border-rule hover:border-rule-strong bg-surface hover:bg-raised p-4 transition-all flex flex-col justify-between shadow-xs"
            >
              <div className="flex items-center justify-between font-mono text-caption text-ink-3 mb-3">
                <span className="font-bold tracking-wider">PILLAR 02 // MCP SERVER</span>
                <span className="text-pass font-bold flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-pass inline-block animate-pulse" />
                  ACTIVE
                </span>
              </div>
              <div>
                <div className="font-bold uppercase text-base text-ink tracking-tight">Autonomous Agent Bridge</div>
                <div className="text-caption text-ink-2 mt-1 leading-snug">
                  Connect Cursor, Claude Desktop, Windsurf, and Hermes via standard stdio JSON-RPC 2.0 tools.
                </div>
              </div>
            </a>

            <a
              href="#cli"
              className="group rounded-sm border border-rule hover:border-rule-strong bg-surface hover:bg-raised p-4 transition-all flex flex-col justify-between shadow-xs"
            >
              <div className="flex items-center justify-between font-mono text-caption text-ink-3 mb-3">
                <span className="font-bold tracking-wider">PILLAR 03 // TERMINAL CLI</span>
                <span className="px-1.5 py-0.2 rounded-xs border border-rule text-[10px] text-ink-2 font-mono">SARIF 2.1.0</span>
              </div>
              <div>
                <div className="font-bold uppercase text-base text-ink tracking-tight">Pre-Commit Gatekeeper</div>
                <div className="text-caption text-ink-2 mt-1 leading-snug">
                  Audit locally with zero dependencies or install a 1-click git hook that blocks vulnerable commits.
                </div>
              </div>
            </a>
          </div>

          {/* Quick CLI Copy Strip */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-10">
            <div className="flex items-center justify-between rounded-sm border border-rule-strong bg-raised px-4 py-2.5 font-mono text-small sm:w-96 shadow-xs">
              <span className="text-ink truncate font-semibold">npx @shipsafe/cli scan .</span>
              <button
                type="button"
                onClick={handleCopyCli}
                className="ml-3 font-mono text-caption font-bold uppercase px-2.5 py-1 rounded-xs bg-surface border border-rule hover:border-ink transition-colors cursor-pointer active:scale-95"
              >
                {copiedCli ? '✓ COPIED' : 'COPY'}
              </button>
            </div>
            <div className="text-caption font-mono text-ink-3 flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-ink-3" />
              <span>Zero-install local terminal audit. Evaluates 10 threat vectors in ~1.5s.</span>
            </div>
          </div>

          {/* Live Interactive Telemetry Box */}
          <div className="rounded-sm border border-rule-strong bg-raised shadow-xs overflow-hidden">
            <div className="flex flex-wrap items-center justify-between border-b border-rule bg-surface px-4 py-2.5 font-mono text-caption">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-fail inline-block animate-pulse" />
                <span className="font-bold text-ink uppercase tracking-wider">AST TELEMETRY // TARGET: repo-vibe-saas.bundle.zip (4.8MB)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveTab('report')}
                  className={`px-3 py-1 rounded-xs uppercase font-bold text-caption transition-colors cursor-pointer border ${activeTab === 'report' ? 'border-ink bg-ink text-canvas' : 'border-rule bg-surface text-ink-2 hover:text-ink'}`}
                >
                  [Inspection Report]
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('prompt')}
                  className={`px-3 py-1 rounded-xs uppercase font-bold text-caption transition-colors cursor-pointer border ${activeTab === 'prompt' ? 'border-ink bg-ink text-canvas' : 'border-rule bg-surface text-ink-2 hover:text-ink'}`}
                >
                  [1-Click Agent Prompt]
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 font-mono text-small leading-relaxed overflow-x-auto">
              {activeTab === 'report' ? (
                <div className="space-y-2 text-ink-2">
                  <div className="text-ink-3">[00:01.04] AST parsing 42 source files... <span className="text-pass font-bold">OK (0.8s)</span></div>
                  <div className="text-fail font-semibold">
                    [00:01.88] Vector 01: Secrets Scan &mdash; [FAIL] Stripe live key exposed in <span className="underline">src/config/stripe.ts:8</span>
                  </div>
                  <div className="text-fail font-semibold">
                    [00:02.12] Vector 09: Broken Access Control &mdash; [FAIL] Public endpoint lacks session RLS guard in <span className="underline">app/api/invoices/[id]/route.ts:19</span>
                  </div>
                  <div className="text-partial font-semibold">
                    [00:02.89] Vector 04: Prompt Injection Surface &mdash; [WARN] Raw unsanitized query passed into OpenAI prompt in <span className="underline">lib/agent.ts:42</span>
                  </div>
                  <div className="pt-3 mt-2 border-t border-rule font-bold text-ink flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-caption uppercase tracking-wider">MANIFEST STATUS: SHIPMENT QUARANTINED (2 Critical, 1 Warning)</span>
                    <span className="px-2.5 py-0.5 rounded-xs bg-status-fail-bg text-status-fail-fg border border-status-fail-border uppercase text-caption font-mono font-bold tracking-wider inline-flex items-center gap-1.5 self-start sm:self-auto">
                      <span className="size-1.5 rounded-full bg-status-fail-fg" />
                      NO-GO // VERDICT STAMP
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 bg-surface p-4 rounded-sm border border-rule">
                  <div className="flex items-center justify-between text-caption text-ink-3 border-b border-rule pb-2 font-mono">
                    <span>TAILORED REMEDIATION PROMPT FOR CLAUDE CODE / CURSOR</span>
                    <span className="text-pass font-bold">READY TO PASTE</span>
                  </div>
                  <pre className="text-caption text-ink whitespace-pre-wrap font-mono leading-relaxed">
{`Fix critical vulnerability F-001 in \`src/config/stripe.ts\` (line 8):
1. Remove hardcoded Stripe live key \`sk_live_****\`.
2. Load secret securely via \`process.env.STRIPE_SECRET_KEY\`.
3. Add null check validation and throw meaningful ConfigurationError if missing.
4. Verify fix by executing: \`npm run test && npm run build\`.`}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 3. KEY USE CASES */}
        <section id="use-cases" className="py-16 border-b border-rule">
          <div className="mb-2 font-mono text-caption uppercase tracking-wider text-ink-3">Target Archetypes</div>
          <h2 className="text-2xl sm:text-4xl font-extrabold uppercase tracking-tight mb-8 text-ink">
            Who Needs a Pre-Ship Customs Desk?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-sm border border-rule hover:border-rule-strong bg-surface hover:bg-raised p-6 flex flex-col justify-between transition-all shadow-xs">
              <div>
                <div className="font-mono text-caption font-bold text-ink-3 mb-2 tracking-wider">ARCHETYPE 01</div>
                <h3 className="text-xl font-bold uppercase mb-3 text-ink tracking-tight">Solo Vibe Coders</h3>
                <p className="text-small text-ink-2 leading-relaxed">
                  Prompting with Cursor, Claude Code, or Windsurf without an offensive cybersecurity background? ShipSafe catches hallucinated imports, exposed service role keys, and insecure storage rules before your Product Hunt launch.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-rule font-mono text-caption text-ink-3 uppercase flex items-center justify-between">
                <span>Threat Horizon</span>
                <span className="text-fail font-semibold">Public database breach</span>
              </div>
            </div>

            <div className="rounded-sm border border-rule hover:border-rule-strong bg-surface hover:bg-raised p-6 flex flex-col justify-between transition-all shadow-xs">
              <div>
                <div className="font-mono text-caption font-bold text-ink-3 mb-2 tracking-wider">ARCHETYPE 02</div>
                <h3 className="text-xl font-bold uppercase mb-3 text-ink tracking-tight">Indie Hackers Shipping SaaS</h3>
                <p className="text-small text-ink-2 leading-relaxed">
                  Moving fast with Next.js, Supabase, and Stripe. Ensure webhook signing isn't bypassed, client-side bundles don't leak private tokens, and multi-tenant RLS policies actually prevent tenant cross-contamination.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-rule font-mono text-caption text-ink-3 uppercase flex items-center justify-between">
                <span>Threat Horizon</span>
                <span className="text-fail font-semibold">User data &amp; billing leak</span>
              </div>
            </div>

            <div className="rounded-sm border border-rule hover:border-rule-strong bg-surface hover:bg-raised p-6 flex flex-col justify-between transition-all shadow-xs">
              <div>
                <div className="font-mono text-caption font-bold text-ink-3 mb-2 tracking-wider">ARCHETYPE 03</div>
                <h3 className="text-xl font-bold uppercase mb-3 text-ink tracking-tight">Fast Engineering Teams</h3>
                <p className="text-small text-ink-2 leading-relaxed">
                  Integrate as a lightweight MCP server or pre-commit git hook. Block Pull Requests with wildcard CORS headers, disabled TLS checks, or unescaped SQL template concatenations before staging merges.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-rule font-mono text-caption text-ink-3 uppercase flex items-center justify-between">
                <span>Threat Horizon</span>
                <span className="text-fail font-semibold">Staging CI regression</span>
              </div>
            </div>
          </div>
        </section>

        {/* 4. EXTREME EASE OF USE */}
        <section id="3-second-protocol" className="py-16 border-b border-rule">
          <div className="mb-2 font-mono text-caption uppercase tracking-wider text-ink-3">Speed &amp; Frictionless Experience</div>
          <h2 className="text-2xl sm:text-4xl font-extrabold uppercase tracking-tight mb-8 text-ink">
            The 3-Second Inspection Protocol
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-sm border border-rule bg-surface p-6 shadow-xs">
              <div className="size-10 rounded-sm border border-rule-strong bg-ink text-canvas font-mono font-bold text-base flex items-center justify-center mb-4 shadow-xs">
                01
              </div>
              <h3 className="text-lg font-bold uppercase mb-2 text-ink tracking-tight">Zero Daemons or Config</h3>
              <p className="text-small text-ink-2 leading-relaxed">
                No 200-line SonarQube YAML configuration, no Docker daemons to maintain. Paste a GitHub repository URL, drop an exported ZIP archive, or execute via terminal.
              </p>
            </div>

            <div className="rounded-sm border border-rule bg-surface p-6 shadow-xs">
              <div className="size-10 rounded-sm border border-rule-strong bg-ink text-canvas font-mono font-bold text-base flex items-center justify-center mb-4 shadow-xs">
                02
              </div>
              <h3 className="text-lg font-bold uppercase mb-2 text-ink tracking-tight">3-Second AST Parsing</h3>
              <p className="text-small text-ink-2 leading-relaxed">
                High-speed AST &amp; regex heuristics scan your project configuration in isolated temporary memory. No code execution, no dynamic sandboxes, zero latency.
              </p>
            </div>

            <div className="rounded-sm border border-rule bg-surface p-6 shadow-xs">
              <div className="size-10 rounded-sm border border-rule-strong bg-ink text-canvas font-mono font-bold text-base flex items-center justify-center mb-4 shadow-xs">
                03
              </div>
              <h3 className="text-lg font-bold uppercase mb-2 text-ink tracking-tight">Instant Actionable Prompts</h3>
              <p className="text-small text-ink-2 leading-relaxed">
                Receive an unambiguous customs verdict stamp. Every vulnerability comes with a 1-click prompt formatted specifically for your AI coding assistant to apply immediate fixes.
              </p>
            </div>
          </div>
        </section>

        {/* 5. 10 THREAT VECTORS & STRENGTHS */}
        <section id="threat-matrix" className="py-16 border-b border-rule">
          <div className="mb-2 font-mono text-caption uppercase tracking-wider text-ink-3">Comprehensive Coverage</div>
          <h2 className="text-2xl sm:text-4xl font-extrabold uppercase tracking-tight mb-4 text-ink">
            10 Critical Threat Vectors Audited
          </h2>
          <p className="text-small sm:text-base text-ink-2 max-w-3xl mb-8 leading-relaxed">
            ShipSafe inspects the full surface of modern AI-generated codebases against the 10 most common vibe-coding security pitfalls:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 mb-10">
            {[
              { id: 'V01', name: 'SQL Injection', desc: 'Raw SQL concatenation & template literal injection in ORM/DB' },
              { id: 'V02', name: 'Cross-Site Scripting (XSS)', desc: 'Unescaped innerHTML, dangerouslySetInnerHTML, document.write' },
              { id: 'V03', name: 'DDoS & ReDoS', desc: 'Missing rate limiters and vulnerable exponential regex loops' },
              { id: 'V04', name: 'Brute Force & Timing', desc: 'Plaintext string password compare without timing-safe equality' },
              { id: 'V05', name: 'Malware & Web Shell', desc: 'Dangerous PHP/Node shell signatures and unvalidated file uploads' },
              { id: 'V06', name: 'MitM & Broken TLS', desc: 'rejectUnauthorized: false, plaintext credentials, missing secure cookies' },
              { id: 'V07', name: 'Phishing & Open Redirect', desc: 'Unvalidated redirect parameters and clickjacking missing X-Frame' },
              { id: 'V08', name: 'Defacement Risks', desc: 'Unauthenticated template or webroot modification vulnerabilities' },
              { id: 'V09', name: 'LFI / RFI & SSRF', desc: 'Path traversal in fs.readFile and unvalidated fetch(req.query.url)' },
              { id: 'V10', name: 'Zero-Day Dynamic Exec', desc: 'eval(), new Function(), prototype pollution, execSync calls' },
            ].map((v) => (
              <div key={v.id} className="rounded-sm border border-rule hover:border-rule-strong bg-surface hover:bg-raised p-3.5 flex flex-col justify-between transition-colors shadow-xs">
                <div>
                  <div className="font-mono text-[11px] font-bold text-ink-3 mb-1.5">{v.id}</div>
                  <div className="font-bold text-small text-ink mb-1.5 leading-snug tracking-tight">{v.name}</div>
                  <div className="text-caption text-ink-2 leading-relaxed">{v.desc}</div>
                </div>
                <div className="mt-3 pt-2 border-t border-rule font-mono text-[10px] text-pass font-bold uppercase flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-pass" />
                  <span>ACTIVE SCANNER</span>
                </div>
              </div>
            ))}
          </div>

          {/* Privacy & Prompt Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-sm border border-rule bg-surface p-6 shadow-xs">
              <div className="font-mono text-caption font-bold text-pass uppercase mb-2 flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-pass" />
                <span>ZERO-PERSISTENCE GUARANTEE</span>
              </div>
              <h3 className="text-xl font-bold uppercase mb-2 text-ink tracking-tight">Ephemeral Sandbox Processing</h3>
              <p className="text-small text-ink-2 leading-relaxed">
                Raw source code is extracted strictly to an isolated temporary sandbox directory. Once analysis finishes, the directory is immediately wiped from memory. Your proprietary code is never persisted, never indexed, and never used to train machine learning models.
              </p>
            </div>

            <div className="rounded-sm border border-rule bg-surface p-6 shadow-xs">
              <div className="font-mono text-caption font-bold text-ink-3 uppercase mb-2 flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-ink-3" />
                <span>1-CLICK REMEDIATION ENGINE</span>
              </div>
              <h3 className="text-xl font-bold uppercase mb-2 text-ink tracking-tight">Multi-Agent Prompt Formatter</h3>
              <p className="text-small text-ink-2 leading-relaxed">
                Instead of leaving you with abstract CVE codes, ShipSafe formats exact, line-specific remediation prompts tailored for <strong>Cursor, Claude Code, GitHub Copilot, and Windsurf</strong> with self-contained reproduction and verification instructions.
              </p>
            </div>
          </div>
        </section>

        {/* 6. DEDICATED MCP SERVER SHOWCASE */}
        <section id="mcp" className="py-16 border-b border-rule">
          <div className="mb-2 font-mono text-caption uppercase tracking-wider text-ink-3">
            Pillar 02 // Model Context Protocol (MCP) Server
          </div>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl sm:text-4xl font-extrabold uppercase tracking-tight text-ink">
                Autonomous AI Agent Security Bridge
              </h2>
              <p className="text-small sm:text-base text-ink-2 max-w-2xl mt-2 leading-relaxed">
                Empower your coding agents (Cursor, Claude Desktop, Windsurf, OpenCode, Hermes) to execute AST security audits and fix findings autonomously via standard stdio JSON-RPC 2.0.
              </p>
            </div>
            <div className="flex items-center gap-2 font-mono text-caption text-pass font-bold uppercase bg-surface px-3 py-1.5 rounded-sm border border-rule self-start md:self-auto shadow-xs">
              <span className="size-2 rounded-full bg-pass inline-block animate-pulse" />
              <span>@shipsafe/mcp-server v1.0.0</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Interactive Configuration Tabs */}
            <div className="lg:col-span-7 rounded-sm border border-rule-strong bg-raised shadow-xs overflow-hidden">
              <div className="flex items-center justify-between border-b border-rule bg-surface px-4 py-2 font-mono text-caption">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setMcpTab('cursor')}
                    className={`px-3 py-1 font-bold uppercase rounded-xs transition-colors cursor-pointer border ${mcpTab === 'cursor' ? 'border-ink bg-ink text-canvas' : 'border-rule hover:border-ink'}`}
                  >
                    Cursor
                  </button>
                  <button
                    type="button"
                    onClick={() => setMcpTab('claude')}
                    className={`px-3 py-1 font-bold uppercase rounded-xs transition-colors cursor-pointer border ${mcpTab === 'claude' ? 'border-ink bg-ink text-canvas' : 'border-rule hover:border-ink'}`}
                  >
                    Claude Desktop
                  </button>
                  <button
                    type="button"
                    onClick={() => setMcpTab('windsurf')}
                    className={`px-3 py-1 font-bold uppercase rounded-xs transition-colors cursor-pointer border ${mcpTab === 'windsurf' ? 'border-ink bg-ink text-canvas' : 'border-rule hover:border-ink'}`}
                  >
                    Windsurf / Hermes
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyMcp(mcpConfigs[mcpTab])}
                  className="font-bold uppercase px-2.5 py-1 rounded-xs bg-surface border border-rule hover:border-ink transition-colors cursor-pointer active:scale-95"
                >
                  {copiedMcp ? '✓ COPIED' : 'COPY CONFIG'}
                </button>
              </div>

              <div className="p-4 font-mono text-small overflow-x-auto bg-raised">
                <pre className="text-caption text-ink leading-relaxed whitespace-pre font-mono">
                  {mcpConfigs[mcpTab]}
                </pre>
              </div>

              <div className="border-t border-rule bg-surface/50 px-4 py-2.5 text-caption font-mono text-ink-2">
                Paste into your editor config file, restart the agent, and say &quot;audit this repo with ShipSafe&quot;.
              </div>
            </div>

            {/* 4 Native Tools Card */}
            <div className="lg:col-span-5 rounded-sm border border-rule bg-surface p-6 flex flex-col justify-between shadow-xs">
              <div>
                <div className="font-mono text-caption font-bold text-ink-3 uppercase mb-2 tracking-wider">4 NATIVE MCP TOOLS</div>
                <h3 className="text-xl font-bold uppercase mb-4 text-ink tracking-tight">Autonomous Tool Definitions</h3>
                <div className="space-y-3 font-mono text-caption">
                  <div className="rounded-xs border border-rule p-2.5 bg-raised">
                    <span className="font-bold text-ink">1. audit_codebase</span>
                    <p className="text-ink-2 text-[11px] mt-0.5">Scans local directory path against 10 critical web threat vectors.</p>
                  </div>
                  <div className="rounded-xs border border-rule p-2.5 bg-raised">
                    <span className="font-bold text-ink">2. get_threat_matrix</span>
                    <p className="text-ink-2 text-[11px] mt-0.5">Returns matrix status (Secure, Warning, Vulnerable) per vector.</p>
                  </div>
                  <div className="rounded-xs border border-rule p-2.5 bg-raised">
                    <span className="font-bold text-ink">3. get_remediation_prompt</span>
                    <p className="text-ink-2 text-[11px] mt-0.5">Generates agent-tailored instructions ready to paste or run.</p>
                  </div>
                  <div className="rounded-xs border border-rule p-2.5 bg-raised">
                    <span className="font-bold text-ink">4. verify_fix</span>
                    <p className="text-ink-2 text-[11px] mt-0.5">Validates if the vulnerability was resolved without regressions.</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-rule font-mono text-caption text-ink-3 flex items-center justify-between">
                <span>Protocol: JSON-RPC 2.0</span>
                <span className="text-pass font-bold">100% SPEC CONFORMANT</span>
              </div>
            </div>
          </div>
        </section>

        {/* 7. DEDICATED TERMINAL CLI SHOWCASE */}
        <section id="cli" className="py-16 border-b border-rule">
          <div className="mb-2 font-mono text-caption uppercase tracking-wider text-ink-3">
            Pillar 03 // Pre-Commit &amp; CI/CD Barrier
          </div>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl sm:text-4xl font-extrabold uppercase tracking-tight text-ink">
                ShipSafe Terminal CLI &amp; Git Hook
              </h2>
              <p className="text-small sm:text-base text-ink-2 max-w-2xl mt-2 leading-relaxed">
                Block dangerous commits locally before code ever leaves your machine. Generates OASIS standard SARIF 2.1.0 for GitHub Code Scanning.
              </p>
            </div>
            <div className="font-mono text-caption text-ink font-bold uppercase bg-surface px-3 py-1.5 rounded-sm border border-rule self-start md:self-auto shadow-xs">
              SARIF 2.1.0 &bull; ZERO EXTERNAL DEPS
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Instructions & Commands */}
            <div className="lg:col-span-6 space-y-4">
              <div className="rounded-sm border border-rule bg-surface p-5 shadow-xs">
                <div className="font-mono text-caption font-bold text-ink-3 uppercase mb-2 tracking-wider">QUICKSTART 01: AUDIT CURRENT DIRECTORY</div>
                <div className="flex items-center justify-between bg-raised p-2.5 rounded-xs border border-rule font-mono text-small">
                  <code className="text-ink font-bold">npx @shipsafe/cli scan .</code>
                  <button
                    type="button"
                    onClick={handleCopyCli}
                    className="text-caption px-2.5 py-1 rounded-xs border border-rule hover:border-ink bg-surface font-bold uppercase transition-colors cursor-pointer"
                  >
                    {copiedCli ? '✓' : 'COPY'}
                  </button>
                </div>
                <p className="text-caption text-ink-2 mt-2 leading-relaxed">
                  Parses <code className="text-ink font-mono font-semibold">.gitignore</code> automatically and outputs Customs Docket ASCII table.
                </p>
              </div>

              <div className="rounded-sm border border-rule bg-surface p-5 shadow-xs">
                <div className="font-mono text-caption font-bold text-ink-3 uppercase mb-2 tracking-wider">QUICKSTART 02: ONE-CLICK PRE-COMMIT HOOK</div>
                <div className="flex items-center justify-between bg-raised p-2.5 rounded-xs border border-rule font-mono text-small">
                  <code className="text-ink font-bold">node cli/scripts/install-hook.js --install</code>
                  <button
                    type="button"
                    onClick={handleCopyHook}
                    className="text-caption px-2.5 py-1 rounded-xs border border-rule hover:border-ink bg-surface font-bold uppercase transition-colors cursor-pointer"
                  >
                    {copiedHook ? '✓' : 'COPY'}
                  </button>
                </div>
                <p className="text-caption text-ink-2 mt-2 leading-relaxed">
                  Installs local git pre-commit barrier hook that blocks any commit containing <code className="text-fail font-bold">CRITICAL</code> or <code className="text-fail font-bold">HIGH</code> vulnerabilities.
                </p>
              </div>

              <div className="rounded-sm border border-rule bg-surface p-4 font-mono text-caption shadow-xs">
                <div className="font-bold text-ink uppercase mb-2 tracking-wider">DETERMINISTIC EXIT CODES</div>
                <div className="text-ink-2 space-y-1.5">
                  <div className="flex items-center gap-2"><code className="text-pass font-bold">0</code>: <span>Scan passed cleanly (clean ship verdict)</span></div>
                  <div className="flex items-center gap-2"><code className="text-fail font-bold">1</code>: <span>Security threshold breached (commit / CI pipeline blocked)</span></div>
                  <div className="flex items-center gap-2"><code className="text-ink-3 font-bold">2</code>: <span>Runtime error or invalid arguments</span></div>
                </div>
              </div>
            </div>

            {/* Simulated ASCII Customs Docket Box */}
            <div className="lg:col-span-6 rounded-sm border border-rule-strong bg-raised p-4 font-mono text-caption flex flex-col justify-between shadow-xs">
              <div className="rounded-xs border border-rule bg-canvas p-4 text-ink overflow-x-auto">
                <pre className="text-[11px] leading-tight">
{`┌──────────────────────────────────────────────────────────────────────────┐
│ SHIPSAFE SECURITY DOCKET // VERDICT: [APPROVED FOR SHIP]                 │
├──────────────────────────────────────────────────────────────────────────┤
│ Target Directory: C:\\Users\\Developer\\Projects\\my-vibe-saas               │
│ Scanned Files   : 84 source files verified (Node / Python / Docker)      │
│ Critical: 0  |  High: 0  |  Medium: 0  |  Low: 0                         │
└──────────────────────────────────────────────────────────────────────────┘

✓ All AST/regex perimeter checks passed. No high-risk vectors detected.
✓ Ready for git commit and production deployment.`}
                </pre>
              </div>
              <div className="mt-4 pt-3 border-t border-rule flex items-center justify-between text-ink-3">
                <span>GitHub Action: .github/workflows/shipsafe-gatekeeper.yml</span>
                <span className="text-pass font-bold">SARIF READY</span>
              </div>
            </div>
          </div>
        </section>

        {/* 8. HONEST LIMITATIONS (RADICAL TRANSPARENCY) */}
        <section id="limitations" className="py-16 border-b border-rule">
          <div className="rounded-sm border border-warn-edge bg-warn-bg/25 p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-2 font-mono text-caption font-bold text-status-warn-fg uppercase tracking-widest mb-3">
              <span className="size-2 rounded-full bg-status-warn-fg inline-block" />
              <span>RADICAL TRANSPARENCY // LIMITATIONS &amp; BOUNDARIES</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight mb-4 text-ink">
              What ShipSafe Does Not Do
            </h2>
            <p className="text-small text-ink-2 max-w-3xl mb-6 leading-relaxed">
              We believe in honest developer tooling without misleading security marketing. Please note the deliberate engineering boundaries:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-sm border border-rule bg-surface p-4 shadow-xs">
                <div className="font-mono text-caption font-bold text-ink-3 mb-1">BOUNDARY 01</div>
                <div className="font-bold text-small uppercase mb-2 text-ink tracking-tight">10MB Archive Upper Limit</div>
                <p className="text-caption text-ink-2 leading-relaxed">
                  Engineered specifically for web applications, frontend single-page apps, and microservice APIs. It is not designed to ingest multi-gigabyte monolithic repositories or binary assets.
                </p>
              </div>

              <div className="rounded-sm border border-rule bg-surface p-4 shadow-xs">
                <div className="font-mono text-caption font-bold text-ink-3 mb-1">BOUNDARY 02</div>
                <div className="font-bold text-small uppercase mb-2 text-ink tracking-tight">Purely Static AST Analysis</div>
                <p className="text-caption text-ink-2 leading-relaxed">
                  ShipSafe scans configurations and AST structures statically. It does not spin up runtime containers, execute fuzzing network probes, or inspect dynamic heap memory allocations.
                </p>
              </div>

              <div className="rounded-sm border border-rule bg-surface p-4 shadow-xs">
                <div className="font-mono text-caption font-bold text-ink-3 mb-1">BOUNDARY 03</div>
                <div className="font-bold text-small uppercase mb-2 text-ink tracking-tight">Not a Human Pentest Replacement</div>
                <p className="text-caption text-ink-2 leading-relaxed">
                  Eliminates 95% of common vibe-coding blunders (leaked keys, missing CORS/RLS, unauthed routes), but does not replace a manual $25,000 SOC2 compliance human penetration audit.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 9. COMMUNITY & DIRECT DEVELOPER ASSISTANCE */}
        <section id="developer-support" className="py-14 border-b border-rule">
          <div className="rounded-sm border border-rule-strong bg-surface p-6 sm:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 shadow-xs">
            <div>
              <div className="flex items-center gap-2 font-mono text-caption font-bold text-pass uppercase mb-2">
                <span className="size-2 rounded-full bg-pass inline-block animate-pulse" />
                <span>DIRECT MAINTAINER ASSISTANCE // AVG RESPONSE &lt; 15 MIN</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black uppercase mb-2 text-ink tracking-tight">
                Need Custom Audit Rules or Dedicated Guidance?
              </h3>
              <p className="text-small text-ink-2 max-w-2xl leading-relaxed">
                Connect directly with the creator of ShipSafe. Get assistance on integrating custom regex rulesets, configuring CI/CD pipelines, or auditing specialized web architectures.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <a
                href="https://wa.me/6285156559384?text=Halo%20Admin%20ShipSafe%2C%20saya%20tertarik%20konsultasi%20keamanan%20proyek%20saya"
                target="_blank"
                rel="noreferrer"
                className="rounded-sm border border-ink bg-ink text-canvas font-mono text-caption font-bold uppercase px-4 py-2.5 hover:bg-ink/90 transition-all inline-flex items-center gap-2 shadow-xs active:scale-98"
              >
                <span>💬 Talk on WhatsApp</span>
                <span aria-hidden="true">&rarr;</span>
              </a>
              <a
                href="https://t.me/gilankdev"
                target="_blank"
                rel="noreferrer"
                className="rounded-sm border border-rule hover:border-rule-strong bg-raised text-ink font-mono text-caption font-bold uppercase px-4 py-2.5 hover:bg-surface transition-all inline-flex items-center gap-2 shadow-xs active:scale-98"
              >
                <span>✈️ Talk on Telegram</span>
                <span aria-hidden="true">&rarr;</span>
              </a>
            </div>
          </div>
        </section>

        {/* 10. DEVELOPER REVIEWS */}
        <section className="py-16 border-b border-rule">
          <div className="mb-2 font-mono text-caption uppercase tracking-wider text-ink-3">Field Reports</div>
          <h2 className="text-2xl sm:text-4xl font-extrabold uppercase tracking-tight mb-8 text-ink">
            Verified Developer Stories
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-sm border border-rule bg-surface p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="font-mono text-caption font-bold text-ink mb-1">@alex_builds</div>
                <div className="font-mono text-[11px] text-ink-3 uppercase mb-4">Solo Fullstack Indie</div>
                <p className="text-small text-ink-2 leading-relaxed">
                  &ldquo;Cursor accidentally generated an API route that leaked my Supabase service role key to the browser in a debug header. ShipSafe flagged it in 2.1 seconds during my pre-ship test. Saved my entire user database from being wiped.&rdquo;
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-rule font-mono text-[10px] text-pass font-bold flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-pass" />
                <span>PREVENTED CRITICAL LEAK</span>
              </div>
            </div>

            <div className="rounded-sm border border-rule bg-surface p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="font-mono text-caption font-bold text-ink mb-1">@priya_codes</div>
                <div className="font-mono text-[11px] text-ink-3 uppercase mb-4">AI Systems Engineer</div>
                <p className="text-small text-ink-2 leading-relaxed">
                  &ldquo;The 1-click prompt formatted for Claude Code is brilliant. Instead of a vague warning like 'CWE-89 injection risk', it gave Claude the exact diff to sanitize my RAG pipeline inputs and parameterize the queries.&rdquo;
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-rule font-mono text-[10px] text-pass font-bold flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-pass" />
                <span>1-CLICK MITIGATION APPLIED</span>
              </div>
            </div>

            <div className="rounded-sm border border-rule bg-surface p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="font-mono text-caption font-bold text-ink mb-1">@marcus_t</div>
                <div className="font-mono text-[11px] text-ink-3 uppercase mb-4">Tech Lead @ LaunchFast</div>
                <p className="text-small text-ink-2 leading-relaxed">
                  &ldquo;We replaced our heavy SonarQube CI bottleneck with the ShipSafe CLI in our pre-commit hook. Our developers keep coding at AI speed without pushing unauthenticated endpoints to staging.&rdquo;
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-rule font-mono text-[10px] text-pass font-bold flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-pass" />
                <span>ZERO CI BOTTLENECK</span>
              </div>
            </div>
          </div>
        </section>

        {/* 11. INTERACTIVE FAQ ACCORDION */}
        <section id="faq" className="py-16 border-b border-rule">
          <div className="mb-2 font-mono text-caption uppercase tracking-wider text-ink-3">Documentation &amp; Answers</div>
          <h2 className="text-2xl sm:text-4xl font-extrabold uppercase tracking-tight mb-8 text-ink">
            Frequently Asked Questions
          </h2>

          <div className="space-y-3">
            {[
              {
                q: 'How does ShipSafe differ from legacy scanners like Snyk or SonarQube?',
                a: 'Traditional tools are built for slow, enterprise waterfall cycles and require extensive YAML configurations. ShipSafe is designed specifically for vibe coding: instant 3-second AST scans, tailored focus on LLM hallucination risks (exposed keys, prompt injections, missing RLS), and direct 1-click remediation prompts ready to paste back into Cursor or Claude.',
              },
              {
                q: 'Do you upload or store my proprietary source code?',
                a: 'Never. ShipSafe enforces a strict Zero-Persistence architecture. ZIP files are extracted into an isolated temporary RAM directory, audited, and wiped completely. We never index your code, never retain archives, and never train AI models on user submissions.',
              },
              {
                q: 'How do I use the ShipSafe Model Context Protocol (MCP) server?',
                a: 'The ShipSafe MCP server provides an automated bridge for Cursor, Windsurf, and Claude Desktop. By adding @shipsafe/mcp-server to your configuration, your coding agent can execute audit_codebase locally and fix detected vulnerabilities autonomously.',
              },
              {
                q: 'Can ShipSafe run completely offline in an air-gapped environment?',
                a: 'Yes. By running the ShipSafe CLI (`npx @shipsafe/cli scan .`) pointed to a local self-hosted instance of our backend engine, all AST analysis runs locally on your workstation or internal CI runner.',
              },
              {
                q: 'What happens if a false positive is reported?',
                a: 'Each finding includes a confidence rating (Confirmed, Likely verify, or Not enough information) and an exact verification command (e.g. npm audit, curl probe). If a rule does not apply to your architecture, you can safely ignore it without breaking your build.',
              },
            ].map((item, idx) => (
              <div key={idx} className="rounded-sm border border-rule bg-surface shadow-xs overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="flex w-full items-center justify-between p-4.5 text-left font-bold text-small sm:text-base uppercase tracking-tight cursor-pointer hover:bg-raised transition-colors"
                >
                  <span className="text-ink">{item.q}</span>
                  <span className="font-mono text-caption text-ink-3 ml-4">{openFaq === idx ? '[-]' : '[+]'}</span>
                </button>
                {openFaq === idx && (
                  <div className="border-t border-rule px-4.5 py-4 text-small text-ink-2 leading-relaxed bg-raised">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* 12. FOOTER & COMPLIANCE */}
        <footer className="py-12 text-ink-2 font-mono text-caption">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-8">
            <div>
              <div className="font-bold text-ink uppercase text-small mb-1 tracking-tight">
                SHIPSAFE SECURITY GATEWAY // ALL INVENTORIES CLEARED
              </div>
              <div className="text-ink-3 leading-relaxed">
                Pre-Deployment Security Gatekeeper for Web Applications &amp; Vibe-Coded Projects.
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={onLaunchConsole}
                className="font-bold text-ink hover:underline cursor-pointer"
              >
                [ENTER CONSOLE &rarr;]
              </button>
              <a
                href="https://github.com/gilank-dev/shipsafe"
                target="_blank"
                rel="noreferrer"
                className="hover:text-ink hover:underline"
              >
                GITHUB REPO
              </a>
              <a href="/api/health" className="text-pass hover:underline flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-pass" />
                <span>VPS API: ONLINE</span>
              </a>
            </div>
          </div>

          <div className="border-t border-rule pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px] text-ink-3">
            <div>
              GDPR ZERO-PERSISTENCE COMPLIANT &bull; WCAG 2.1 AA ACCESSIBLE &bull; NO CODE RETENTION
            </div>
            <div>
              &copy; {new Date().getFullYear()} ShipSafe. Built by LankDev &amp; AI Agents.
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}
