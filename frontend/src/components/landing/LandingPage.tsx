import { useState, useEffect } from 'react'
import { useClerk } from '@clerk/clerk-react'
import { ThemeToggle } from '../shell/ThemeToggle'
import { signOut } from '../../lib/supabase'
import { useStore } from '../../state/store'
import { landingDictionary, type Language } from '../../domain/i18n/landingDictionary'

interface LandingPageProps {
  onLaunchConsole: () => void
}

export function LandingPage({ onLaunchConsole }: LandingPageProps) {
  const [lang, setLang] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('shipsafe.lang') as Language
      if (saved === 'en' || saved === 'id') return saved
    }
    return 'en'
  })

  const [copiedCli, setCopiedCli] = useState(false)
  const [copiedMcp, setCopiedMcp] = useState(false)
  const [copiedHook, setCopiedHook] = useState(false)
  const [mcpTab, setMcpTab] = useState<'cursor' | 'claude' | 'windsurf'>('cursor')
  const [activeTab, setActiveTab] = useState<'report' | 'prompt'>('report')
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  const t = landingDictionary[lang]

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

  const handleToggleLang = (newLang: Language) => {
    setLang(newLang)
    if (typeof window !== 'undefined') {
      localStorage.setItem('shipsafe.lang', newLang)
    }
  }

  const handleCopyCli = () => {
    void navigator.clipboard.writeText('npx @lankdev/shipsafe-cli scan .')
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
      "command": "npx",
      "args": ["-y", "@lankdev/shipsafe-mcp"]
    }
  }
}`,
    claude: `// claude_desktop_config.json
{
  "mcpServers": {
    "shipsafe": {
      "command": "npx",
      "args": ["-y", "@lankdev/shipsafe-mcp"]
    }
  }
}`,
    windsurf: `// ~/.codeium/windsurf/mcp_config.json
{
  "mcpServers": {
    "shipsafe": {
      "command": "npx",
      "args": ["-y", "@lankdev/shipsafe-mcp"]
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
    <div className="relative min-h-[100dvh] bg-white dark:bg-black text-neutral-900 dark:text-neutral-100 font-sans antialiased selection:bg-neutral-900 selection:text-white dark:selection:bg-white dark:selection:text-black">
      {/* Vercel-Style Subtle Grid Background with Top Radial Mask */}
      <div
        className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_70%_50%_at_50%_0%,#000_70%,transparent_100%)]"
        aria-hidden="true"
      />

      {/* 1. TOP NAVIGATION BAR WITH BILINGUAL SWITCHER */}
      <header className="sticky top-0 z-40 border-b border-neutral-200/80 dark:border-neutral-800/80 bg-white/85 dark:bg-black/85 backdrop-blur-md transition-colors duration-200">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            {/* Minimalist Vercel-Style Monogram / Emblem */}
            <div className="flex size-6 items-center justify-center rounded-xs bg-black dark:bg-white text-white dark:text-black font-mono text-[10px] font-bold tracking-tight shadow-xs">
              SS
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold tracking-tight text-sm text-neutral-950 dark:text-white">
                {t.nav.brandName}
              </span>
              <span className="hidden sm:inline font-mono text-[11px] text-neutral-400 dark:text-neutral-500 font-normal">
                {t.nav.tagline}
              </span>
              <span className="hidden lg:inline-flex items-center gap-1.5 rounded-full border border-neutral-200 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-900/60 px-2 py-0.5 text-[10px] font-mono text-neutral-600 dark:text-neutral-400">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                v2.4-STABLE
              </span>
            </div>
          </div>

          <nav className="hidden items-center gap-4 lg:gap-5 text-xs text-neutral-600 dark:text-neutral-400 font-medium md:flex">
            <button
              type="button"
              onClick={onLaunchConsole}
              className="hover:text-black dark:hover:text-white transition-colors cursor-pointer"
            >
              {t.nav.console}
            </button>
            <a
              href="#how-it-works"
              onClick={(e) => {
                e.preventDefault()
                scrollToSection('how-it-works')
              }}
              className="hover:text-black dark:hover:text-white transition-colors cursor-pointer"
            >
              {t.nav.howItWorks}
            </a>
            <a
              href="#comparison"
              onClick={(e) => {
                e.preventDefault()
                scrollToSection('comparison')
              }}
              className="hover:text-black dark:hover:text-white transition-colors cursor-pointer"
            >
              {t.nav.comparison}
            </a>
            <a
              href="#pricing"
              onClick={(e) => {
                e.preventDefault()
                scrollToSection('pricing')
              }}
              className="hover:text-black dark:hover:text-white transition-colors cursor-pointer"
            >
              {t.nav.pricing}
            </a>
            <a
              href="#threat-matrix"
              onClick={(e) => {
                e.preventDefault()
                scrollToSection('threat-matrix')
              }}
              className="hover:text-black dark:hover:text-white transition-colors cursor-pointer"
            >
              {t.nav.threatMatrix}
            </a>
            <a
              href="#mcp"
              onClick={(e) => {
                e.preventDefault()
                scrollToSection('mcp')
              }}
              className="hover:text-black dark:hover:text-white transition-colors cursor-pointer"
            >
              {t.nav.mcp}
            </a>
            <a
              href="#cli"
              onClick={(e) => {
                e.preventDefault()
                scrollToSection('cli')
              }}
              className="hover:text-black dark:hover:text-white transition-colors cursor-pointer"
            >
              {t.nav.cli}
            </a>
            <a
              href="#faq"
              onClick={(e) => {
                e.preventDefault()
                scrollToSection('faq')
              }}
              className="hover:text-black dark:hover:text-white transition-colors cursor-pointer"
            >
              {t.nav.faq}
            </a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Tactile Bilingual Segmented Switcher [EN | ID] */}
            <div
              role="group"
              aria-label="Language selection"
              className="relative inline-flex items-center rounded-md border border-neutral-200 dark:border-neutral-800 bg-neutral-100/80 dark:bg-neutral-900/80 p-0.5 text-[11px] font-mono"
            >
              <button
                type="button"
                onClick={() => handleToggleLang('en')}
                className={`relative z-10 flex min-h-[30px] sm:min-h-[26px] min-w-[32px] sm:min-w-[28px] items-center justify-center rounded-sm px-2 py-0.5 font-semibold transition-all duration-150 cursor-pointer ${
                  lang === 'en'
                    ? 'bg-white dark:bg-neutral-800 text-neutral-950 dark:text-white shadow-2xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
                }`}
                aria-pressed={lang === 'en'}
                aria-label="Switch language to English"
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => handleToggleLang('id')}
                className={`relative z-10 flex min-h-[30px] sm:min-h-[26px] min-w-[32px] sm:min-w-[28px] items-center justify-center rounded-sm px-2 py-0.5 font-semibold transition-all duration-150 cursor-pointer ${
                  lang === 'id'
                    ? 'bg-white dark:bg-neutral-800 text-neutral-950 dark:text-white shadow-2xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
                }`}
                aria-pressed={lang === 'id'}
                aria-label="Ganti bahasa ke Bahasa Indonesia"
              >
                ID
              </button>
            </div>

            <ThemeToggle />

            {user ? (
              <div className="flex items-center gap-2">
                <span className="hidden font-mono text-xs text-neutral-600 dark:text-neutral-400 sm:inline truncate max-w-[120px]">
                  {user.email || user.fullName}
                </span>
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  className="text-xs px-2.5 py-1 rounded border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors cursor-pointer font-medium"
                >
                  {t.nav.logout}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                aria-label="Login / Daftar"
                className="text-xs px-3 py-1.5 rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors cursor-pointer font-medium shadow-2xs"
              >
                {t.nav.login}
              </button>
            )}

            <button
              type="button"
              onClick={onLaunchConsole}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-md bg-black dark:bg-white text-white dark:text-black px-3.5 py-1.5 text-xs font-semibold hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all shadow-xs active:scale-98 cursor-pointer"
            >
              <span>{t.nav.launchConsole}</span>
              <span aria-hidden="true">&rarr;</span>
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
        {/* 2. HERO SECTION WITH LOSS AVERSION TRIGGERS */}
        <section className="pt-16 pb-16 sm:pt-24 sm:pb-20">
          {/* Eyebrow Tag */}
          <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 dark:border-neutral-800 bg-neutral-100/70 dark:bg-neutral-900/70 px-3 py-1 text-xs font-mono text-neutral-600 dark:text-neutral-400 mb-6 backdrop-blur-xs">
            <span className="flex size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-neutral-950 dark:text-white">{t.hero.eyebrowBadge}</span>
            <span className="text-neutral-300 dark:text-neutral-700">|</span>
            <span>{t.hero.eyebrowSub}</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-[-0.035em] text-neutral-950 dark:text-white leading-[1.02] max-w-4xl mb-6">
            {t.hero.headlineMain} <br className="hidden sm:inline" />
            <span className="text-neutral-400 dark:text-neutral-500 font-normal">
              {t.hero.headlineHighlight}
            </span>
          </h1>

          <p className="text-base sm:text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl leading-relaxed mb-8 font-normal">
            {t.hero.subheadline}
          </p>

          <div className="flex flex-wrap items-center gap-3 mb-8">
            <button
              type="button"
              onClick={onLaunchConsole}
              className="inline-flex items-center gap-2 rounded-md bg-black dark:bg-white text-white dark:text-black px-4 py-2.5 text-xs sm:text-sm font-semibold hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all shadow-xs active:scale-98 cursor-pointer"
            >
              <span>{t.hero.ctaPrimary}</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded border border-neutral-700 dark:border-neutral-300 bg-neutral-900 dark:bg-neutral-100 text-[10px] font-mono text-neutral-300 dark:text-neutral-700">
                ⌘K
              </kbd>
              <span aria-hidden="true">&rarr;</span>
            </button>
            <a
              href="#how-it-works"
              onClick={(e) => {
                e.preventDefault()
                scrollToSection('how-it-works')
              }}
              className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-4 py-2.5 text-xs sm:text-sm font-medium text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-all shadow-2xs"
            >
              <span>{t.hero.ctaSecondary}</span>
              <span aria-hidden="true">&darr;</span>
            </a>
          </div>

          {/* Quick CLI Copy Strip */}
          <div className="mb-12">
            <div className="flex items-center justify-between rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-3.5 py-2 font-mono text-xs w-full max-w-md shadow-2xs">
              <div className="flex items-center gap-2 truncate">
                <span className="text-neutral-400 select-none">$</span>
                <span className="text-neutral-900 dark:text-neutral-100 font-medium truncate">{t.hero.cliLabel}</span>
              </div>
              <button
                type="button"
                onClick={handleCopyCli}
                className="ml-3 shrink-0 font-mono text-[10px] font-medium uppercase px-2 py-0.5 rounded border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors cursor-pointer text-neutral-700 dark:text-neutral-300"
              >
                {copiedCli ? t.hero.copiedButton : t.hero.copyButton}
              </button>
            </div>
          </div>

          {/* 4 Emotional Security Triggers (Loss Aversion & Peace of Mind) */}
          <div className="mb-14">
            <div className="text-xs font-mono text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-4">
              {t.hero.triggersTitle}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {t.hero.triggers.map((trigger, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4 flex flex-col justify-between shadow-2xs hover:border-neutral-400 dark:hover:border-neutral-700 transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-[10px] text-neutral-400 dark:text-neutral-500">
                        RISK 0{idx + 1}
                      </span>
                      <span className="font-mono text-[10px] uppercase font-semibold text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/40 px-1.5 py-0.2 rounded-xs">
                        {trigger.risk}
                      </span>
                    </div>
                    <div className="font-semibold text-sm text-neutral-950 dark:text-white mb-1.5 tracking-tight">
                      {trigger.title}
                    </div>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed font-normal">
                      {trigger.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Clean Vercel-Style Bento Pillars Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
            {t.bentoPillars.pillars.map((pillar, idx) => {
              if (idx === 0) {
                return (
                  <button
                    key={pillar.pillarId}
                    type="button"
                    onClick={onLaunchConsole}
                    className="group relative rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 text-left cursor-pointer transition-all hover:border-neutral-400 dark:hover:border-neutral-700 shadow-2xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs text-neutral-400 dark:text-neutral-500 font-mono mb-4">
                        <span>{pillar.pillarId}</span>
                        <span className="transition-transform group-hover:translate-x-1">&rarr;</span>
                      </div>
                      <div className="text-base font-semibold text-neutral-950 dark:text-white tracking-tight mb-2">
                        {pillar.title}
                      </div>
                      <div className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed font-normal">
                        {pillar.description}
                      </div>
                    </div>
                  </button>
                )
              }
              const targetHash = idx === 1 ? 'mcp' : 'cli'
              return (
                <a
                  key={pillar.pillarId}
                  href={`#${targetHash}`}
                  onClick={(e) => {
                    e.preventDefault()
                    scrollToSection(targetHash)
                  }}
                  className="group relative rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 transition-all hover:border-neutral-400 dark:hover:border-neutral-700 shadow-2xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between font-mono text-xs text-neutral-400 dark:text-neutral-500 mb-4">
                      <span>{pillar.pillarId}</span>
                      <span className="transition-transform group-hover:translate-x-1">&rarr;</span>
                    </div>
                    <div className="font-semibold text-base text-neutral-950 dark:text-white tracking-tight mb-2">
                      {pillar.title}
                    </div>
                    <div className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed font-normal">
                      {pillar.description}
                    </div>
                  </div>
                </a>
              )
            })}
          </div>

          {/* Interactive Inspection Telemetry */}
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-xs overflow-hidden">
            <div className="flex flex-wrap items-center justify-between border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-900/60 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 mr-2">
                  <span className="size-2 rounded-full bg-neutral-300 dark:bg-neutral-700" />
                  <span className="size-2 rounded-full bg-neutral-300 dark:bg-neutral-700" />
                  <span className="size-2 rounded-full bg-neutral-300 dark:bg-neutral-700" />
                </div>
                <span className="font-mono text-xs text-neutral-600 dark:text-neutral-400">
                  {t.telemetry.windowTitle}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveTab('report')}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                    activeTab === 'report'
                      ? 'bg-black text-white dark:bg-white dark:text-black font-semibold'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                  }`}
                >
                  {t.telemetry.reportTab}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('prompt')}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                    activeTab === 'prompt'
                      ? 'bg-black text-white dark:bg-white dark:text-black font-semibold'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                  }`}
                >
                  {t.telemetry.promptTab}
                </button>
              </div>
            </div>

            <div className="p-5 font-mono text-xs leading-relaxed overflow-x-auto bg-neutral-50/30 dark:bg-black/50">
              {activeTab === 'report' ? (
                <div className="space-y-2.5 text-neutral-600 dark:text-neutral-400">
                  <div className="text-neutral-500">
                    {t.telemetry.astScanStatus}
                  </div>
                  <div className="text-rose-600 dark:text-rose-400">
                    {t.telemetry.findingSecrets}
                  </div>
                  <div className="text-rose-600 dark:text-rose-400">
                    {t.telemetry.findingAccessControl}
                  </div>
                  <div className="text-amber-600 dark:text-amber-400">
                    {t.telemetry.findingPromptInjection}
                  </div>
                  <div className="pt-3 mt-3 border-t border-neutral-200/80 dark:border-neutral-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-neutral-900 dark:text-neutral-100 font-medium">
                      {t.telemetry.verdictSummary}
                    </span>
                    <span className="text-rose-600 dark:text-rose-400 text-xs font-semibold uppercase tracking-wider">
                      {t.telemetry.verdictBadge}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 bg-white dark:bg-neutral-900/60 p-4 rounded-lg border border-neutral-200 dark:border-neutral-800">
                  <div className="text-neutral-500 pb-2 border-b border-neutral-200/60 dark:border-neutral-800 text-[11px] font-semibold tracking-wider uppercase">
                    {t.telemetry.promptTitle}
                  </div>
                  <pre className="text-neutral-900 dark:text-neutral-100 whitespace-pre-wrap leading-relaxed">
                    {t.telemetry.promptSnippet}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 3. HOW IT WORKS SECTION (CARA KERJA: 3-SECOND PROTOCOL) */}
        <section id="how-it-works" className="py-20 border-t border-neutral-200 dark:border-neutral-800 scroll-mt-14">
          <div className="max-w-3xl mb-14">
            <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 dark:border-neutral-800 bg-neutral-100/70 dark:bg-neutral-900/70 px-3 py-1 text-xs font-mono text-neutral-600 dark:text-neutral-400 mb-4">
              <span className="size-1.5 rounded-full bg-black dark:bg-white" />
              <span>// {t.howItWorks.eyebrow}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-neutral-950 dark:text-white mb-4">
              {t.howItWorks.title}
            </h2>
            <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 leading-relaxed font-normal">
              {t.howItWorks.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative">
            {t.howItWorks.steps.map((step, idx) => (
              <div
                key={step.stepNumber}
                className="group relative flex flex-col justify-between rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 sm:p-7 shadow-xs hover:border-neutral-400 dark:hover:border-neutral-600 transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-5">
                  <span className="flex items-center justify-center size-9 rounded-md border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-900 font-mono text-sm font-bold text-neutral-950 dark:text-white shadow-2xs group-hover:scale-105 transition-transform">
                    {step.stepNumber}
                  </span>
                  <span className="font-mono text-[10px] tracking-wider uppercase text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 px-2 py-0.5 rounded-xs">
                    {step.badge}
                  </span>
                </div>

                <div className="mb-6">
                  <div className="font-mono text-xs text-neutral-400 dark:text-neutral-500 mb-1">
                    {step.tagline}
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-neutral-950 dark:text-white mb-2 tracking-tight">
                    {step.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed font-normal">
                    {step.description}
                  </p>
                </div>

                <div className="mt-auto pt-4 border-t border-neutral-100 dark:border-neutral-900 flex items-center justify-between font-mono text-[11px] text-neutral-400 dark:text-neutral-500">
                  <span>STEP 0{idx + 1} // PROTOCOL</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold uppercase">READY</span>
                </div>

                {/* Connector pip for desktop */}
                {idx < 2 && (
                  <div
                    aria-hidden="true"
                    className="hidden lg:block absolute -right-3.5 top-10 z-20 size-2 rounded-full border border-neutral-300 dark:border-neutral-700 bg-neutral-400 dark:bg-neutral-500"
                  />
                )}
              </div>
            ))}
          </div>
        </section>

        {/* 4. PERBEDAAN DENGAN PLATFORM SEJENIS (COMPARISON MATRIX) */}
        <section id="comparison" className="py-20 border-t border-neutral-200 dark:border-neutral-800 scroll-mt-14">
          <div className="max-w-3xl mb-12">
            <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 dark:border-neutral-800 bg-neutral-100/70 dark:bg-neutral-900/70 px-3 py-1 text-xs font-mono text-neutral-600 dark:text-neutral-400 mb-4">
              <span className="size-1.5 rounded-full bg-black dark:bg-white" />
              <span>// {t.comparison.eyebrow}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-neutral-950 dark:text-white mb-4">
              {t.comparison.title}
            </h2>
            <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 leading-relaxed font-normal">
              {t.comparison.subtitle}
            </p>
          </div>

          {/* Responsive Comparison Table Container with Sticky Column */}
          <div className="relative rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-xs overflow-hidden">
            {/* Mobile swipe helper */}
            <div className="flex sm:hidden items-center justify-between px-4 py-2 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 font-mono text-[11px] text-neutral-500">
              <span>&larr; {lang === 'id' ? 'Geser tabel horizontal' : 'Swipe horizontally'} &rarr;</span>
              <span>4 Columns</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-900/80 font-mono text-xs text-neutral-600 dark:text-neutral-400">
                    <th
                      scope="col"
                      className="py-4 px-4 sm:px-6 font-semibold w-[220px] sticky left-0 bg-neutral-50 dark:bg-neutral-900 z-10 border-r border-neutral-200 dark:border-neutral-800"
                    >
                      {t.comparison.colFeature}
                    </th>
                    <th
                      scope="col"
                      className="py-4 px-4 sm:px-6 font-bold text-neutral-950 dark:text-white bg-neutral-100/90 dark:bg-neutral-800/90 border-x-2 border-neutral-950 dark:border-neutral-100 w-[240px]"
                    >
                      <div className="flex items-center gap-2">
                        <span>{t.comparison.colShipSafe}</span>
                        <span className="font-mono text-[9px] px-1.5 py-0.5 rounded-xs bg-emerald-600 text-white font-normal uppercase">
                          AI NATIVE
                        </span>
                      </div>
                    </th>
                    <th scope="col" className="py-4 px-4 sm:px-6 font-semibold w-[180px]">
                      {t.comparison.colLegacy}
                    </th>
                    <th scope="col" className="py-4 px-4 sm:px-6 font-semibold w-[180px]">
                      {t.comparison.colLinters}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 text-xs sm:text-sm">
                  {t.comparison.rows.map((row, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-neutral-50/60 dark:hover:bg-neutral-900/40 transition-colors"
                    >
                      <th
                        scope="row"
                        className="py-3.5 px-4 sm:px-6 font-semibold text-neutral-900 dark:text-neutral-100 sticky left-0 bg-white dark:bg-neutral-950 z-10 border-r border-neutral-200 dark:border-neutral-800"
                      >
                        {row.feature}
                      </th>
                      <td className="py-3.5 px-4 sm:px-6 font-medium text-neutral-950 dark:text-white bg-neutral-50/60 dark:bg-neutral-900/30 border-x-2 border-neutral-950 dark:border-neutral-100">
                        <div className="flex items-start gap-1.5">
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">&check;</span>
                          <span>{row.shipsafe}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 text-neutral-600 dark:text-neutral-400">
                        {row.legacyEnterprise}
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 text-neutral-600 dark:text-neutral-400">
                        {row.basicLinters}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* 5. DEDICATED MCP SERVER SHOWCASE */}
        <section id="mcp" className="py-20 border-t border-neutral-200 dark:border-neutral-800 scroll-mt-20">
          <div className="max-w-3xl mb-12">
            <div className="text-xs font-mono text-neutral-400 dark:text-neutral-500 mb-2">
              PILLAR 02 // MODEL CONTEXT PROTOCOL
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-950 dark:text-white mb-3">
              Autonomous AI Agent Security Bridge
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed text-sm sm:text-base">
              Empower your coding agents (Cursor, Claude Desktop, Windsurf, OpenCode, Hermes) to execute AST security audits and fix findings autonomously via standard stdio JSON-RPC 2.0.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-xs overflow-hidden">
              <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-900/60 px-4 py-2 font-mono text-xs">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setMcpTab('cursor')}
                    className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                      mcpTab === 'cursor'
                        ? 'bg-black text-white dark:bg-white dark:text-black font-semibold'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    Cursor
                  </button>
                  <button
                    type="button"
                    onClick={() => setMcpTab('claude')}
                    className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                      mcpTab === 'claude'
                        ? 'bg-black text-white dark:bg-white dark:text-black font-semibold'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    Claude Desktop
                  </button>
                  <button
                    type="button"
                    onClick={() => setMcpTab('windsurf')}
                    className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                      mcpTab === 'windsurf'
                        ? 'bg-black text-white dark:bg-white dark:text-black font-semibold'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    Windsurf
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyMcp(mcpConfigs[mcpTab])}
                  className="text-xs px-2.5 py-0.5 rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer font-mono"
                >
                  {copiedMcp ? 'Copied' : 'Copy'}
                </button>
              </div>

              <div className="p-4 font-mono text-xs overflow-x-auto bg-neutral-50/20 dark:bg-black/40">
                <pre className="text-neutral-900 dark:text-neutral-100 leading-relaxed whitespace-pre font-mono">
                  {mcpConfigs[mcpTab]}
                </pre>
              </div>

              <div className="border-t border-neutral-100 dark:border-neutral-800/80 px-4 py-2.5 text-xs text-neutral-500 font-mono">
                Paste into your editor config file, restart the agent, and prompt: &quot;audit this repo with ShipSafe&quot;.
              </div>
            </div>

            <div className="lg:col-span-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 flex flex-col justify-between shadow-xs">
              <div>
                <div className="font-mono text-xs text-neutral-400 dark:text-neutral-500 mb-2">
                  4 NATIVE MCP TOOLS
                </div>
                <h3 className="text-base font-semibold text-neutral-950 dark:text-white mb-4 tracking-tight">
                  Autonomous Tool Definitions
                </h3>
                <div className="space-y-2.5 font-mono text-xs">
                  <div className="rounded-lg border border-neutral-100 dark:border-neutral-800 p-2.5 bg-neutral-50/50 dark:bg-neutral-900/40">
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100">1. audit_codebase</span>
                    <p className="text-neutral-500 font-sans text-xs mt-0.5">Scans local directory path against 10 critical web threat vectors.</p>
                  </div>
                  <div className="rounded-lg border border-neutral-100 dark:border-neutral-800 p-2.5 bg-neutral-50/50 dark:bg-neutral-900/40">
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100">2. get_threat_matrix</span>
                    <p className="text-neutral-500 font-sans text-xs mt-0.5">Returns matrix status (Secure, Warning, Vulnerable) per vector.</p>
                  </div>
                  <div className="rounded-lg border border-neutral-100 dark:border-neutral-800 p-2.5 bg-neutral-50/50 dark:bg-neutral-900/40">
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100">3. get_remediation_prompt</span>
                    <p className="text-neutral-500 font-sans text-xs mt-0.5">Generates agent-tailored instructions ready to paste or run.</p>
                  </div>
                  <div className="rounded-lg border border-neutral-100 dark:border-neutral-800 p-2.5 bg-neutral-50/50 dark:bg-neutral-900/40">
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100">4. verify_fix</span>
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

        {/* 6. DEDICATED TERMINAL CLI SHOWCASE */}
        <section id="cli" className="py-20 border-t border-neutral-200 dark:border-neutral-800 scroll-mt-20">
          <div className="max-w-3xl mb-12">
            <div className="text-xs font-mono text-neutral-400 dark:text-neutral-500 mb-2">
              PILLAR 03 // PRE-COMMIT &amp; CI/CD BARRIER
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-950 dark:text-white mb-3">
              ShipSafe Terminal CLI &amp; Git Hook
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed text-sm sm:text-base">
              Block dangerous commits locally before code ever leaves your machine. Generates OASIS standard SARIF 2.1.0 for GitHub Code Scanning.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 space-y-4">
              <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-5 shadow-xs">
                <div className="font-mono text-xs text-neutral-400 mb-2">QUICKSTART 01: AUDIT CURRENT DIRECTORY</div>
                <div className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-900/80 p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 font-mono text-xs">
                  <code className="text-neutral-900 dark:text-neutral-100 font-medium">npx @lankdev/shipsafe-cli scan .</code>
                  <button
                    type="button"
                    onClick={handleCopyCli}
                    className="px-2 py-0.5 rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-[10px] font-mono hover:border-neutral-400 transition-colors cursor-pointer"
                  >
                    {copiedCli ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="text-xs text-neutral-500 mt-2.5 leading-relaxed font-sans">
                  Parses <code className="text-neutral-700 dark:text-neutral-300 font-mono">.gitignore</code> automatically and outputs security scorecard ASCII table.
                </p>
              </div>

              <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-5 shadow-xs">
                <div className="font-mono text-xs text-neutral-400 mb-2">QUICKSTART 02: ONE-CLICK PRE-COMMIT HOOK</div>
                <div className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-900/80 p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 font-mono text-xs">
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

              <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4 font-mono text-xs shadow-xs">
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

            <div className="lg:col-span-6 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4 font-mono text-xs flex flex-col justify-between shadow-xs">
              <div className="rounded-lg border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50 dark:bg-black p-4 text-neutral-800 dark:text-neutral-200 overflow-x-auto">
                <pre className="text-[11px] leading-relaxed">
{`┌──────────────────────────────────────────────────────────────────────────┐
│ SHIPSAFE SECURITY AUDIT // VERDICT: [APPROVED FOR SHIP]                  │
├──────────────────────────────────────────────────────────────────────────┤
│ Target Directory: C:\\Users\\Developer\\Projects\\my-vibe-saas               │
│ Scanned Files   : 84 source files verified (Node / Python / Docker)      │
│ Critical: 0  |  High: 0  |  Medium: 0  |  Low: 0                         │
└──────────────────────────────────────────────────────────────────────────┘

✓ All AST/regex perimeter checks passed. No high-risk vectors detected.
✓ Ready for git commit and production deployment.`}
                </pre>
              </div>
              <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800/80 text-neutral-400 font-mono text-[11px]">
                GitHub Action: .github/workflows/shipsafe-gatekeeper.yml
              </div>
            </div>
          </div>
        </section>

        {/* 7. 10 THREAT VECTORS AUDITED */}
        <section id="threat-matrix" className="py-20 border-t border-neutral-200 dark:border-neutral-800 scroll-mt-20">
          <div className="max-w-3xl mb-12">
            <div className="text-xs font-mono text-neutral-400 dark:text-neutral-500 mb-2">
              {t.threatVectors.eyebrow}
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-950 dark:text-white mb-3">
              {t.threatVectors.title}
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed text-sm sm:text-base">
              {t.threatVectors.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 mb-12">
            {t.threatVectors.vectors.map((v) => (
              <div
                key={v.name}
                className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4 flex flex-col justify-between transition-colors shadow-2xs hover:border-neutral-400 dark:hover:border-neutral-700"
              >
                <div>
                  <div className="font-mono text-[10px] text-neutral-400 dark:text-neutral-500 mb-1">
                    VECTOR {v.id}
                  </div>
                  <div className="font-semibold text-sm text-neutral-950 dark:text-white mb-1.5 leading-snug">
                    {v.name}
                  </div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed font-normal">
                    {v.description}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 shadow-xs">
              <h3 className="text-base sm:text-lg font-semibold mb-2 text-neutral-950 dark:text-white tracking-tight">
                {t.threatVectors.sandboxGuaranteeTitle}
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed font-normal">
                {t.threatVectors.sandboxGuaranteeDesc}
              </p>
            </div>

            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 shadow-xs">
              <h3 className="text-base sm:text-lg font-semibold mb-2 text-neutral-950 dark:text-white tracking-tight">
                {t.threatVectors.promptFormatterTitle}
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed font-normal">
                {t.threatVectors.promptFormatterDesc}
              </p>
            </div>
          </div>
        </section>

        {/* 8. RADICAL TRANSPARENCY & BOUNDARIES */}
        <section id="limitations" className="py-20 border-t border-neutral-200 dark:border-neutral-800 scroll-mt-20">
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-8 sm:p-10 shadow-xs">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3 text-neutral-950 dark:text-white uppercase">
              {t.limitations.title}
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-2xl mb-8 leading-relaxed font-normal">
              {t.limitations.subtitle}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {t.limitations.items.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/80 dark:bg-neutral-900/40 p-5"
                >
                  <div className="font-semibold text-sm mb-1.5 text-neutral-950 dark:text-white tracking-tight">
                    {item.title}
                  </div>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed font-normal">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 9. TRANSPARENT DEVELOPER-FIRST PRICING */}
        <section id="pricing" className="py-20 border-t border-neutral-200 dark:border-neutral-800 scroll-mt-14">
          <div className="max-w-3xl mb-14">
            <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 dark:border-neutral-800 bg-neutral-100/70 dark:bg-neutral-900/70 px-3 py-1 text-xs font-mono text-neutral-600 dark:text-neutral-400 mb-4">
              <span className="size-1.5 rounded-full bg-black dark:bg-white" />
              <span>// {t.pricing.eyebrow}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-neutral-950 dark:text-white mb-4">
              {t.pricing.title}
            </h2>
            <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 leading-relaxed font-normal">
              {t.pricing.subtitle}
            </p>
          </div>

          {/* 3-Card Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch mb-10">
            {t.pricing.tiers.map((tier) => (
              <div
                key={tier.id}
                className={`relative flex flex-col justify-between rounded-xl bg-white dark:bg-neutral-950 p-6 sm:p-8 transition-all duration-200 ${
                  tier.isPopular
                    ? 'border-2 border-neutral-950 dark:border-white shadow-md lg:-translate-y-1'
                    : 'border border-neutral-200 dark:border-neutral-800 shadow-xs hover:border-neutral-400 dark:hover:border-neutral-600'
                }`}
              >
                {/* Popular Tier Badge */}
                {tier.isPopular && (
                  <div className="absolute -top-3 left-6 inline-flex items-center gap-1.5 rounded-full bg-black dark:bg-white text-white dark:text-black px-3 py-0.5 font-mono text-[10px] font-bold tracking-wider uppercase shadow-xs">
                    <span>{tier.badge}</span>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold text-neutral-950 dark:text-white tracking-tight">
                      {tier.name}
                    </h3>
                    {!tier.isPopular && (
                      <span className="font-mono text-[10px] text-neutral-400 dark:text-neutral-500 uppercase">
                        {tier.badge}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-6 leading-relaxed font-normal min-h-[36px]">
                    {tier.description}
                  </p>

                  <div className="flex items-baseline gap-1.5 mb-6 pb-6 border-b border-neutral-100 dark:border-neutral-800">
                    <span className="text-3xl sm:text-4xl font-bold font-mono tracking-tight text-neutral-950 dark:text-white">
                      {tier.price}
                    </span>
                    <span className="text-xs text-neutral-500 font-mono">
                      {tier.period}
                    </span>
                  </div>

                  <div className="space-y-2.5 mb-8">
                    <div className="font-mono text-[10px] uppercase font-semibold text-neutral-400 dark:text-neutral-500 mb-2">
                      {lang === 'id' ? 'Fitur & Jaminan:' : 'Included Guarantees:'}
                    </div>
                    {tier.features.map((feature, fIdx) => (
                      <div key={fIdx} className="flex items-start gap-2 text-xs text-neutral-700 dark:text-neutral-300">
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">&check;</span>
                        <span className="leading-relaxed">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (tier.id === 'enterprise') {
                      window.open('https://wa.me/6285156559384?text=Halo%20Admin%20ShipSafe%2C%20saya%20tertarik%20solusi%20Enterprise%20ShipSafe', '_blank')
                    } else {
                      onLaunchConsole()
                    }
                  }}
                  className={`w-full py-2.5 px-4 rounded-md text-xs font-semibold tracking-tight transition-all active:scale-[0.98] cursor-pointer shadow-xs ${
                    tier.isPopular
                      ? 'bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200'
                      : 'border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  }`}
                >
                  {tier.cta} &rarr;
                </button>
              </div>
            ))}
          </div>

          {/* Peace of Mind Reassurance Box */}
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/40 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-mono text-xs text-neutral-600 dark:text-neutral-400">
            <div className="flex items-center gap-2.5">
              <span className="flex size-2 rounded-full bg-emerald-500 shrink-0" />
              <span>{t.pricing.reassuranceNote}</span>
            </div>
            <a
              href="https://wa.me/6285156559384?text=Halo%20Admin%20ShipSafe%2C%20saya%20ingin%20tanya%20tentang%20pembayaran%20lokal%20atau%20paket%20Pro"
              target="_blank"
              rel="noreferrer"
              className="text-neutral-950 dark:text-white font-semibold underline underline-offset-4 hover:text-neutral-700 dark:hover:text-neutral-300 shrink-0"
            >
              {lang === 'id' ? 'Tanya Admin Langsung &rarr;' : 'Chat Maintainer &rarr;'}
            </a>
          </div>
        </section>

        {/* 10. DIRECT DEVELOPER ASSISTANCE */}
        <section id="developer-support" className="py-16 border-t border-neutral-200 dark:border-neutral-800 scroll-mt-20">
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 shadow-xs">
            <div>
              <div className="font-mono text-xs text-emerald-600 dark:text-emerald-400 mb-2 font-medium">
                {t.contact.statusBadge}
              </div>
              <h3 className="text-xl sm:text-2xl font-bold mb-2 text-neutral-950 dark:text-white tracking-tight">
                {t.contact.title}
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 max-w-2xl leading-relaxed font-normal">
                {t.contact.subtitle}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <a
                href="https://wa.me/6285156559384?text=Halo%20Admin%20ShipSafe%2C%20saya%20tertarik%20konsultasi%20keamanan%20proyek%20saya"
                target="_blank"
                rel="noreferrer"
                className="rounded-md bg-black dark:bg-white text-white dark:text-black text-xs font-semibold px-4 py-2.5 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all inline-flex items-center gap-2 shadow-xs active:scale-98"
              >
                <svg className="size-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.698c.969.586 1.761.884 2.796.885h.005c3.179 0 5.767-2.587 5.768-5.766 0-3.18-2.588-5.769-5.773-5.772zm3.374 8.211c-.147.418-.749.775-1.042.825-.294.05-.67.07-1.085-.064-.265-.086-.607-.207-1.053-.401-1.895-.824-3.128-2.739-3.223-2.865-.094-.125-.769-1.023-.769-1.95 0-.927.487-1.383.66-1.573.174-.189.38-.237.507-.237.127 0 .253.002.364.007.118.005.276-.045.432.329.162.391.554 1.349.602 1.448.048.099.08.214.016.34-.063.125-.095.203-.189.314-.095.111-.2.247-.286.332-.095.095-.195.198-.084.388.111.19.493.813 1.057 1.316.726.647 1.339.848 1.53.943.19.095.302.079.414-.048.111-.126.475-.554.602-.744.126-.19.253-.158.428-.095.174.064 1.109.523 1.3.618.19.095.317.143.364.222.048.079.048.459-.099.877z" />
                </svg>
                <span>{t.contact.whatsappButton}</span>
              </a>
              <a
                href="https://t.me/gilankdev"
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-neutral-800 dark:text-neutral-200 text-xs font-semibold px-4 py-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-all inline-flex items-center gap-2 shadow-2xs active:scale-98"
              >
                <svg className="size-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                </svg>
                <span>{t.contact.telegramButton}</span>
              </a>
            </div>
          </div>
        </section>

        {/* 11. INTERACTIVE FAQ ACCORDION */}
        <section id="faq" className="py-20 border-t border-neutral-200 dark:border-neutral-800 scroll-mt-20">
          <div className="max-w-3xl mb-12">
            <div className="text-xs font-mono text-neutral-400 dark:text-neutral-500 mb-2">
              {t.faq.eyebrow}
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-950 dark:text-white mb-3">
              {t.faq.title}
            </h2>
          </div>

          <div className="divide-y divide-neutral-200 dark:divide-neutral-800 border-y border-neutral-200 dark:border-neutral-800">
            {t.faq.items.map((item, idx) => (
              <div key={idx} className="py-5">
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="flex w-full items-center justify-between text-left font-medium text-sm sm:text-base text-neutral-950 dark:text-white cursor-pointer transition-colors hover:text-neutral-600 dark:hover:text-neutral-300"
                >
                  <span>{item.question}</span>
                  <span className="font-mono text-xs text-neutral-400 ml-4 shrink-0">
                    {openFaq === idx ? '−' : '+'}
                  </span>
                </button>
                {openFaq === idx && (
                  <div className="pt-3 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed font-normal">
                    {item.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* 12. MINIMAL VERCEL-STYLE TECHNICAL FOOTER */}
        <footer className="py-12 border-t border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500 font-mono">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="flex size-1.5 rounded-full bg-emerald-500" />
                <span className="font-semibold text-neutral-900 dark:text-neutral-100 text-xs">
                  {t.footer.operationalBadge}
                </span>
                <span className="text-[10px] rounded px-1.5 py-0.2 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-500">
                  {t.footer.operationalText}
                </span>
              </div>
              <div className="text-neutral-500 font-sans text-xs">
                {t.footer.description}
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <button
                type="button"
                onClick={onLaunchConsole}
                className="text-neutral-900 dark:text-neutral-100 hover:underline cursor-pointer"
              >
                {t.footer.consoleLink}
              </button>
              <a
                href="https://github.com/gilank-dev/shipsafe"
                target="_blank"
                rel="noreferrer"
                className="hover:text-neutral-900 dark:hover:text-neutral-100 hover:underline"
              >
                {t.footer.repoLink}
              </a>
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px] text-neutral-400 border-t border-neutral-100 dark:border-neutral-900">
            <div>
              {t.footer.complianceNotice}
            </div>
            <div>
              {t.footer.copyrightNotice}
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}
