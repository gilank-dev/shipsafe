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

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      if (typeof window !== 'undefined') {
        window.history.pushState(null, '', `#${id}`)
      }
    }
  }

  return (
    <div className="min-h-[100dvh] bg-[#FAFAFA] dark:bg-[#090A0B] text-[#18181B] dark:text-[#F4F4F5] font-sans antialiased selection:bg-[#18181B] selection:text-white dark:selection:bg-white dark:selection:text-black transition-colors duration-200">
      {/* 1. TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-40 border-b border-[#E4E4E7]/80 dark:border-[#27272A]/80 bg-[#FAFAFA]/85 dark:bg-[#090A0B]/85 backdrop-blur-md transition-colors duration-200">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-7 items-center justify-center rounded-md bg-[#18181B] dark:bg-white text-white dark:text-[#18181B] font-mono text-[11px] font-bold tracking-tight shadow-xs">
              SS
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold tracking-tight text-base text-neutral-900 dark:text-neutral-100">
                ShipSafe
              </span>
              <span className="font-mono text-xs text-neutral-400 dark:text-neutral-500 font-normal">
                // CUSTOMS DESK
              </span>
            </div>
          </div>

          <nav className="hidden items-center gap-6 text-sm text-neutral-600 dark:text-neutral-400 font-medium md:flex">
            <button
              type="button"
              onClick={onLaunchConsole}
              className="hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer"
            >
              Console
            </button>
            <a
              href="#mcp"
              onClick={(e) => {
                e.preventDefault()
                scrollToSection('mcp')
              }}
              className="hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer"
            >
              MCP
            </a>
            <a
              href="#cli"
              onClick={(e) => {
                e.preventDefault()
                scrollToSection('cli')
              }}
              className="hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer"
            >
              CLI
            </a>
            <a
              href="#threat-matrix"
              onClick={(e) => {
                e.preventDefault()
                scrollToSection('threat-matrix')
              }}
              className="hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer"
            >
              10 Vectors
            </a>
            <a
              href="#faq"
              onClick={(e) => {
                e.preventDefault()
                scrollToSection('faq')
              }}
              className="hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer"
            >
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            {user ? (
              <div className="flex items-center gap-2">
                <span className="hidden font-mono text-xs text-neutral-600 dark:text-neutral-400 sm:inline truncate max-w-[130px]">
                  {user.email || user.fullName}
                </span>
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  className="text-xs px-2.5 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer font-medium"
                >
                  Keluar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="text-xs px-3 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all cursor-pointer font-medium"
              >
                Login / Daftar
              </button>
            )}
            <button
              type="button"
              onClick={onLaunchConsole}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-md bg-[#18181B] dark:bg-white text-white dark:text-[#18181B] px-3.5 py-1.5 text-xs font-medium hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all shadow-xs active:scale-98 cursor-pointer"
            >
              <span>Launch Console</span>
              <span aria-hidden="true">&rarr;</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        {/* 2. HERO SECTION */}
        <section className="pt-20 pb-20 sm:pt-28 sm:pb-24">
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-semibold tracking-tight leading-[1.06] max-w-4xl text-neutral-900 dark:text-neutral-50 mb-6">
            The Customs Desk for <br className="hidden sm:inline" />
            <span className="text-neutral-400 dark:text-neutral-500 font-normal">
              Vibe-Coded Web Apps.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl leading-relaxed mb-10 font-normal">
            Built for developers prompting at the speed of thought. Catch leaked service keys, unauthenticated API routes, broken RLS, and prompt injection surfaces in <strong>3 seconds</strong> before pushing to production.
          </p>

          <div className="flex flex-wrap items-center gap-3 mb-10">
            <button
              type="button"
              onClick={onLaunchConsole}
              className="flex items-center gap-2 rounded-md bg-[#18181B] dark:bg-white text-white dark:text-[#18181B] px-4 py-2.5 text-sm font-medium hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all shadow-xs active:scale-98 cursor-pointer"
            >
              <span>Launch Console</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.2 rounded border border-neutral-700 dark:border-neutral-300 bg-neutral-800 dark:bg-neutral-100 text-[10px] font-mono text-neutral-300 dark:text-neutral-700">
                ⌘K
              </kbd>
            </button>
            <a
              href="#mcp"
              onClick={(e) => {
                e.preventDefault()
                scrollToSection('mcp')
              }}
              className="flex items-center gap-1.5 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-2.5 text-sm font-medium text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all shadow-xs"
            >
              <span>Explore Ecosystem</span>
              <span aria-hidden="true">&darr;</span>
            </a>
          </div>

          {/* Quick CLI Copy Strip */}
          <div className="mb-14">
            <div className="flex items-center justify-between rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3.5 py-2 font-mono text-xs sm:w-80 shadow-xs">
              <span className="text-neutral-800 dark:text-neutral-200 truncate">npx @shipsafe/cli scan .</span>
              <button
                type="button"
                onClick={handleCopyCli}
                className="ml-2 font-mono text-[10px] font-medium uppercase px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors cursor-pointer"
              >
                {copiedCli ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Clean Bento Pillars Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
            <button
              type="button"
              onClick={onLaunchConsole}
              className="group rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#121316] p-6 text-left cursor-pointer transition-all hover:border-neutral-300 dark:hover:border-neutral-700 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-neutral-400 dark:text-neutral-500 font-mono mb-4">
                  <span>PILLAR 01 // CONSOLE</span>
                  <span className="transition-transform group-hover:translate-x-0.5">&rarr;</span>
                </div>
                <div className="text-base font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight mb-2">
                  Launch Web Audit
                </div>
                <div className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed font-normal">
                  Upload ZIP archive or import GitHub repository for 3-second AST analysis and official customs verdict stamp.
                </div>
              </div>
            </button>

            <a
              href="#mcp"
              onClick={(e) => {
                e.preventDefault()
                scrollToSection('mcp')
              }}
              className="group rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#121316] p-6 transition-all hover:border-neutral-300 dark:hover:border-neutral-700 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between font-mono text-xs text-neutral-400 dark:text-neutral-500 mb-4">
                  <span>PILLAR 02 // MCP</span>
                </div>
                <div className="font-semibold text-base text-neutral-900 dark:text-neutral-100 tracking-tight mb-2">
                  Autonomous Agent Bridge
                </div>
                <div className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed font-normal">
                  Connect Cursor, Claude Desktop, Windsurf, and Hermes via standard stdio JSON-RPC 2.0 tools.
                </div>
              </div>
            </a>

            <a
              href="#cli"
              onClick={(e) => {
                e.preventDefault()
                scrollToSection('cli')
              }}
              className="group rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#121316] p-6 transition-all hover:border-neutral-300 dark:hover:border-neutral-700 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between font-mono text-xs text-neutral-400 dark:text-neutral-500 mb-4">
                  <span>PILLAR 03 // CLI</span>
                </div>
                <div className="font-semibold text-base text-neutral-900 dark:text-neutral-100 tracking-tight mb-2">
                  Pre-Commit Gatekeeper
                </div>
                <div className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed font-normal">
                  Audit locally with zero dependencies or install a 1-click git hook that blocks vulnerable commits.
                </div>
              </div>
            </a>
          </div>

          {/* Interactive Inspection Telemetry (Faux-OS Window Chrome) */}
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#121316] shadow-[0_2px_12px_rgba(0,0,0,0.03)] overflow-hidden">
            <div className="flex flex-wrap items-center justify-between border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/50 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 mr-2">
                  <span className="size-2 rounded-full bg-neutral-300 dark:bg-neutral-700" />
                  <span className="size-2 rounded-full bg-neutral-300 dark:bg-neutral-700" />
                  <span className="size-2 rounded-full bg-neutral-300 dark:bg-neutral-700" />
                </div>
                <span className="font-mono text-xs text-neutral-600 dark:text-neutral-400">
                  telemetry // repo-vibe-saas.bundle.zip (4.8MB)
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveTab('report')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    activeTab === 'report'
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
                  }`}
                >
                  Inspection Report
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('prompt')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    activeTab === 'prompt'
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
                  }`}
                >
                  1-Click Agent Prompt
                </button>
              </div>
            </div>

            <div className="p-5 font-mono text-xs leading-relaxed overflow-x-auto">
              {activeTab === 'report' ? (
                <div className="space-y-2.5 text-neutral-600 dark:text-neutral-400">
                  <div className="text-neutral-500">
                    [00:01.04] AST parsing 42 source files... <span className="text-emerald-600 dark:text-emerald-400 font-medium">OK (0.8s)</span>
                  </div>
                  <div className="text-rose-600 dark:text-rose-400">
                    [00:01.88] Vector: Secrets Scan - [FAIL] Stripe live key exposed in <span className="underline">src/config/stripe.ts:8</span>
                  </div>
                  <div className="text-rose-600 dark:text-rose-400">
                    [00:02.12] Vector: Broken Access Control - [FAIL] Public endpoint lacks session RLS guard in <span className="underline">app/api/invoices/[id]/route.ts:19</span>
                  </div>
                  <div className="text-amber-600 dark:text-amber-400">
                    [00:02.89] Vector: Prompt Injection Surface - [WARN] Raw unsanitized query passed into OpenAI prompt in <span className="underline">lib/agent.ts:42</span>
                  </div>
                  <div className="pt-3 mt-3 border-t border-neutral-100 dark:border-neutral-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-neutral-800 dark:text-neutral-200">
                      Verdict: 2 critical findings, 1 warning detected
                    </span>
                    <span className="text-rose-600 dark:text-rose-400 text-xs font-medium">
                      Action Required
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 bg-neutral-50/70 dark:bg-neutral-900/40 p-4 rounded-lg border border-neutral-100 dark:border-neutral-800">
                  <div className="text-neutral-500 pb-2 border-b border-neutral-200/60 dark:border-neutral-800">
                    TAILORED REMEDIATION PROMPT FOR CLAUDE CODE / CURSOR
                  </div>
                  <pre className="text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap leading-relaxed">
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

        {/* 3. DEDICATED MCP SERVER SHOWCASE */}
        <section id="mcp" className="py-20 border-t border-neutral-200 dark:border-neutral-800 scroll-mt-20">
          <div className="max-w-3xl mb-12">
            <div className="text-xs font-mono text-neutral-400 dark:text-neutral-500 mb-2">
              PILLAR 02 // MODEL CONTEXT PROTOCOL
            </div>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 mb-3">
              Autonomous AI Agent Security Bridge
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed text-sm sm:text-base">
              Empower your coding agents (Cursor, Claude Desktop, Windsurf, OpenCode, Hermes) to execute AST security audits and fix findings autonomously via standard stdio JSON-RPC 2.0.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#121316] shadow-xs overflow-hidden">
              <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/50 px-4 py-2 font-mono text-xs">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setMcpTab('cursor')}
                    className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                      mcpTab === 'cursor'
                        ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-medium'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    Cursor
                  </button>
                  <button
                    type="button"
                    onClick={() => setMcpTab('claude')}
                    className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                      mcpTab === 'claude'
                        ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-medium'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    Claude Desktop
                  </button>
                  <button
                    type="button"
                    onClick={() => setMcpTab('windsurf')}
                    className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                      mcpTab === 'windsurf'
                        ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-medium'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    Windsurf
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyMcp(mcpConfigs[mcpTab])}
                  className="text-xs px-2.5 py-0.5 rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 transition-colors cursor-pointer font-mono"
                >
                  {copiedMcp ? 'Copied' : 'Copy'}
                </button>
              </div>

              <div className="p-4 font-mono text-xs overflow-x-auto">
                <pre className="text-neutral-800 dark:text-neutral-200 leading-relaxed whitespace-pre font-mono">
                  {mcpConfigs[mcpTab]}
                </pre>
              </div>

              <div className="border-t border-neutral-100 dark:border-neutral-800/80 px-4 py-2.5 text-xs text-neutral-500">
                Paste into your editor config file, restart the agent, and prompt: &quot;audit this repo with ShipSafe&quot;.
              </div>
            </div>

            <div className="lg:col-span-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#121316] p-6 flex flex-col justify-between shadow-xs">
              <div>
                <div className="font-mono text-xs text-neutral-400 dark:text-neutral-500 mb-2">
                  4 NATIVE MCP TOOLS
                </div>
                <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-4 tracking-tight">
                  Autonomous Tool Definitions
                </h3>
                <div className="space-y-2.5 font-mono text-xs">
                  <div className="rounded-lg border border-neutral-100 dark:border-neutral-800 p-2.5 bg-neutral-50/50 dark:bg-neutral-900/40">
                    <span className="font-medium text-neutral-900 dark:text-neutral-100">1. audit_codebase</span>
                    <p className="text-neutral-500 font-sans text-xs mt-0.5">Scans local directory path against 10 critical web threat vectors.</p>
                  </div>
                  <div className="rounded-lg border border-neutral-100 dark:border-neutral-800 p-2.5 bg-neutral-50/50 dark:bg-neutral-900/40">
                    <span className="font-medium text-neutral-900 dark:text-neutral-100">2. get_threat_matrix</span>
                    <p className="text-neutral-500 font-sans text-xs mt-0.5">Returns matrix status (Secure, Warning, Vulnerable) per vector.</p>
                  </div>
                  <div className="rounded-lg border border-neutral-100 dark:border-neutral-800 p-2.5 bg-neutral-50/50 dark:bg-neutral-900/40">
                    <span className="font-medium text-neutral-900 dark:text-neutral-100">3. get_remediation_prompt</span>
                    <p className="text-neutral-500 font-sans text-xs mt-0.5">Generates agent-tailored instructions ready to paste or run.</p>
                  </div>
                  <div className="rounded-lg border border-neutral-100 dark:border-neutral-800 p-2.5 bg-neutral-50/50 dark:bg-neutral-900/40">
                    <span className="font-medium text-neutral-900 dark:text-neutral-100">4. verify_fix</span>
                    <p className="text-neutral-500 font-sans text-xs mt-0.5">Validates if the vulnerability was resolved without regressions.</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-neutral-100 dark:border-neutral-800/80 font-mono text-xs text-neutral-400">
                Protocol: JSON-RPC 2.0 Stdio
              </div>
            </div>
          </div>
        </section>

        {/* 4. DEDICATED TERMINAL CLI SHOWCASE */}
        <section id="cli" className="py-20 border-t border-neutral-200 dark:border-neutral-800 scroll-mt-20">
          <div className="max-w-3xl mb-12">
            <div className="text-xs font-mono text-neutral-400 dark:text-neutral-500 mb-2">
              PILLAR 03 // PRE-COMMIT &amp; CI/CD BARRIER
            </div>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 mb-3">
              ShipSafe Terminal CLI &amp; Git Hook
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed text-sm sm:text-base">
              Block dangerous commits locally before code ever leaves your machine. Generates OASIS standard SARIF 2.1.0 for GitHub Code Scanning.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 space-y-4">
              <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#121316] p-5 shadow-xs">
                <div className="font-mono text-xs text-neutral-400 mb-2">QUICKSTART 01: AUDIT CURRENT DIRECTORY</div>
                <div className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-900 p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 font-mono text-xs">
                  <code className="text-neutral-900 dark:text-neutral-100 font-medium">npx @shipsafe/cli scan .</code>
                  <button
                    type="button"
                    onClick={handleCopyCli}
                    className="px-2 py-0.5 rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-[10px] font-mono hover:border-neutral-400 transition-colors cursor-pointer"
                  >
                    {copiedCli ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="text-xs text-neutral-500 mt-2.5 leading-relaxed font-sans">
                  Parses <code className="text-neutral-700 dark:text-neutral-300 font-mono">.gitignore</code> automatically and outputs Customs Docket ASCII table.
                </p>
              </div>

              <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#121316] p-5 shadow-xs">
                <div className="font-mono text-xs text-neutral-400 mb-2">QUICKSTART 02: ONE-CLICK PRE-COMMIT HOOK</div>
                <div className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-900 p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 font-mono text-xs">
                  <code className="text-neutral-900 dark:text-neutral-100 font-medium">node cli/scripts/install-hook.js --install</code>
                  <button
                    type="button"
                    onClick={handleCopyHook}
                    className="px-2 py-0.5 rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-[10px] font-mono hover:border-neutral-400 transition-colors cursor-pointer"
                  >
                    {copiedHook ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="text-xs text-neutral-500 mt-2.5 leading-relaxed font-sans">
                  Installs local git pre-commit barrier hook that blocks any commit containing <span className="text-rose-600 dark:text-rose-400 font-medium">CRITICAL</span> or <span className="text-rose-600 dark:text-rose-400 font-medium">HIGH</span> vulnerabilities.
                </p>
              </div>

              <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#121316] p-4 font-mono text-xs shadow-xs">
                <div className="text-neutral-400 mb-2 font-medium">DETERMINISTIC EXIT CODES</div>
                <div className="text-neutral-600 dark:text-neutral-400 space-y-1">
                  <div className="flex items-center gap-2">
                    <code className="text-emerald-600 dark:text-emerald-400 font-semibold">0</code>
                    <span>Scan passed cleanly (clean ship verdict)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="text-rose-600 dark:text-rose-400 font-semibold">1</code>
                    <span>Security threshold breached (commit / CI pipeline blocked)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="text-neutral-500 font-semibold">2</code>
                    <span>Runtime error or invalid arguments</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#121316] p-4 font-mono text-xs flex flex-col justify-between shadow-xs">
              <div className="rounded-lg border border-neutral-100 dark:border-neutral-800 bg-[#FAFAFA] dark:bg-neutral-950 p-4 text-neutral-800 dark:text-neutral-200 overflow-x-auto">
                <pre className="text-[11px] leading-relaxed">
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
              <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800/80 text-neutral-400">
                GitHub Action: .github/workflows/shipsafe-gatekeeper.yml
              </div>
            </div>
          </div>
        </section>

        {/* 5. 10 THREAT VECTORS AUDITED */}
        <section id="threat-matrix" className="py-20 border-t border-neutral-200 dark:border-neutral-800 scroll-mt-20">
          <div className="max-w-3xl mb-12">
            <div className="text-xs font-mono text-neutral-400 dark:text-neutral-500 mb-2">
              COMPREHENSIVE COVERAGE
            </div>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 mb-3">
              10 Critical Threat Vectors Audited
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed text-sm sm:text-base">
              ShipSafe inspects the full surface of modern AI-generated codebases against the 10 most common vibe-coding security pitfalls:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 mb-12">
            {[
              { name: 'SQL Injection', desc: 'Raw SQL concatenation & template literal injection in ORM/DB' },
              { name: 'Cross-Site Scripting (XSS)', desc: 'Unescaped innerHTML, dangerouslySetInnerHTML, document.write' },
              { name: 'DDoS & ReDoS', desc: 'Missing rate limiters and vulnerable exponential regex loops' },
              { name: 'Brute Force & Timing', desc: 'Plaintext string password compare without timing-safe equality' },
              { name: 'Malware & Web Shell', desc: 'Dangerous PHP/Node shell signatures and unvalidated file uploads' },
              { name: 'MitM & Broken TLS', desc: 'rejectUnauthorized: false, plaintext credentials, missing secure cookies' },
              { name: 'Phishing & Open Redirect', desc: 'Unvalidated redirect parameters and clickjacking missing X-Frame' },
              { name: 'Defacement Risks', desc: 'Unauthenticated template or webroot modification vulnerabilities' },
              { name: 'LFI / RFI & SSRF', desc: 'Path traversal in fs.readFile and unvalidated fetch(req.query.url)' },
              { name: 'Zero-Day Dynamic Exec', desc: 'eval(), new Function(), prototype pollution, execSync calls' },
            ].map((v) => (
              <div
                key={v.name}
                className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#121316] p-4 flex flex-col justify-between transition-colors shadow-xs hover:border-neutral-300 dark:hover:border-neutral-700"
              >
                <div>
                  <div className="font-medium text-sm text-neutral-900 dark:text-neutral-100 mb-1.5 leading-snug">
                    {v.name}
                  </div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">{v.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#121316] p-6 shadow-xs">
              <h3 className="text-lg font-semibold mb-2 text-neutral-900 dark:text-neutral-100 tracking-tight">
                Ephemeral Sandbox Processing
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed font-normal">
                Raw source code is extracted strictly to an isolated temporary sandbox directory. Once analysis finishes, the directory is immediately wiped from memory. Your proprietary code is never persisted, never indexed, and never used to train machine learning models.
              </p>
            </div>

            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#121316] p-6 shadow-xs">
              <h3 className="text-lg font-semibold mb-2 text-neutral-900 dark:text-neutral-100 tracking-tight">
                Multi-Agent Prompt Formatter
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed font-normal">
                Instead of leaving you with abstract CVE codes, ShipSafe formats exact, line-specific remediation prompts tailored for <strong>Cursor, Claude Code, GitHub Copilot, and Windsurf</strong> with self-contained reproduction and verification instructions.
              </p>
            </div>
          </div>
        </section>

        {/* 6. RADICAL TRANSPARENCY & BOUNDARIES */}
        <section id="limitations" className="py-20 border-t border-neutral-200 dark:border-neutral-800 scroll-mt-20">
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#121316] p-8 sm:p-10 shadow-xs">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-3 text-neutral-900 dark:text-neutral-100">
              What ShipSafe Does Not Do
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-2xl mb-8 leading-relaxed font-normal">
              We believe in honest developer tooling without misleading security marketing. Please note the deliberate engineering boundaries:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-xl border border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/60 dark:bg-neutral-900/40 p-5">
                <div className="font-semibold text-sm mb-1.5 text-neutral-900 dark:text-neutral-100 tracking-tight">
                  10MB Archive Upper Limit
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed font-normal">
                  Engineered specifically for web applications, frontend single-page apps, and microservice APIs. It is not designed to ingest multi-gigabyte monolithic repositories or binary assets.
                </p>
              </div>

              <div className="rounded-xl border border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/60 dark:bg-neutral-900/40 p-5">
                <div className="font-semibold text-sm mb-1.5 text-neutral-900 dark:text-neutral-100 tracking-tight">
                  Purely Static AST Analysis
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed font-normal">
                  ShipSafe scans configurations and AST structures statically. It does not spin up runtime containers, execute fuzzing network probes, or inspect dynamic heap memory allocations.
                </p>
              </div>

              <div className="rounded-xl border border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/60 dark:bg-neutral-900/40 p-5">
                <div className="font-semibold text-sm mb-1.5 text-neutral-900 dark:text-neutral-100 tracking-tight">
                  Not a Human Pentest Replacement
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed font-normal">
                  Eliminates 95% of common vibe-coding blunders (leaked keys, missing CORS/RLS, unauthed routes), but does not replace a manual $25,000 SOC2 compliance human penetration audit.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 7. DIRECT DEVELOPER ASSISTANCE */}
        <section id="developer-support" className="py-16 border-t border-neutral-200 dark:border-neutral-800 scroll-mt-20">
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#121316] p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 shadow-xs">
            <div>
              <h3 className="text-xl sm:text-2xl font-semibold mb-2 text-neutral-900 dark:text-neutral-100 tracking-tight">
                Need Custom Audit Rules or Dedicated Guidance?
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 max-w-2xl leading-relaxed font-normal">
                Connect directly with the creator of ShipSafe. Get assistance on integrating custom regex rulesets, configuring CI/CD pipelines, or auditing specialized web architectures.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <a
                href="https://wa.me/6285156559384?text=Halo%20Admin%20ShipSafe%2C%20saya%20tertarik%20konsultasi%20keamanan%20proyek%20saya"
                target="_blank"
                rel="noreferrer"
                className="rounded-lg bg-[#18181B] dark:bg-white text-white dark:text-[#18181B] text-xs font-medium px-4 py-2.5 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all inline-flex items-center gap-2 shadow-xs active:scale-98"
              >
                <svg className="size-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.698c.969.586 1.761.884 2.796.885h.005c3.179 0 5.767-2.587 5.768-5.766 0-3.18-2.588-5.769-5.773-5.772zm3.374 8.211c-.147.418-.749.775-1.042.825-.294.05-.67.07-1.085-.064-.265-.086-.607-.207-1.053-.401-1.895-.824-3.128-2.739-3.223-2.865-.094-.125-.769-1.023-.769-1.95 0-.927.487-1.383.66-1.573.174-.189.38-.237.507-.237.127 0 .253.002.364.007.118.005.276-.045.432.329.162.391.554 1.349.602 1.448.048.099.08.214.016.34-.063.125-.095.203-.189.314-.095.111-.2.247-.286.332-.095.095-.195.198-.084.388.111.19.493.813 1.057 1.316.726.647 1.339.848 1.53.943.19.095.302.079.414-.048.111-.126.475-.554.602-.744.126-.19.253-.158.428-.095.174.064 1.109.523 1.3.618.19.095.317.143.364.222.048.079.048.459-.099.877z" />
                </svg>
                <span>Talk on WhatsApp</span>
              </a>
              <a
                href="https://t.me/gilankdev"
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 text-xs font-medium px-4 py-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all inline-flex items-center gap-2 shadow-xs active:scale-98"
              >
                <svg className="size-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                </svg>
                <span>Talk on Telegram</span>
              </a>
            </div>
          </div>
        </section>

        {/* 8. INTERACTIVE FAQ ACCORDION */}
        <section id="faq" className="py-20 border-t border-neutral-200 dark:border-neutral-800 scroll-mt-20">
          <div className="max-w-3xl mb-12">
            <div className="text-xs font-mono text-neutral-400 dark:text-neutral-500 mb-2">
              DOCUMENTATION &amp; ANSWERS
            </div>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 mb-3">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
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
              <div key={idx} className="py-5">
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="flex w-full items-center justify-between text-left font-medium text-sm sm:text-base text-neutral-900 dark:text-neutral-100 cursor-pointer transition-colors hover:text-neutral-600 dark:hover:text-neutral-300"
                >
                  <span>{item.q}</span>
                  <span className="font-mono text-xs text-neutral-400 ml-4 shrink-0">
                    {openFaq === idx ? '−' : '+'}
                  </span>
                </button>
                {openFaq === idx && (
                  <div className="pt-3 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed font-normal">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* 9. MINIMAL TECHNICAL FOOTER */}
        <footer className="py-12 border-t border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500 font-mono">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-8">
            <div>
              <div className="font-semibold text-neutral-800 dark:text-neutral-200 text-xs mb-1">
                SHIPSAFE SECURITY GATEWAY
              </div>
              <div className="text-neutral-400 font-sans text-xs">
                Pre-Deployment Security Gatekeeper for Web Applications &amp; Vibe-Coded Projects.
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <button
                type="button"
                onClick={onLaunchConsole}
                className="text-neutral-800 dark:text-neutral-200 hover:underline cursor-pointer"
              >
                [ENTER CONSOLE &rarr;]
              </button>
              <a
                href="https://github.com/gilank-dev/shipsafe"
                target="_blank"
                rel="noreferrer"
                className="hover:text-neutral-800 dark:hover:text-neutral-200 hover:underline"
              >
                GITHUB REPO
              </a>
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px] text-neutral-400">
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
