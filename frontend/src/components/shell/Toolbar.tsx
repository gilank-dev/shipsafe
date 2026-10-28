import type { Ref } from 'react'
import { useClerk } from '@clerk/clerk-react'
import { isMockMode } from '../../api/client'
import { signOut } from '../../lib/supabase'
import { announce } from '../../state/announcer'
import { selectOutdated } from '../../state/selectors'
import { useStore } from '../../state/store'
import { SampleMenu } from './SampleMenu'
import { ThemeToggle } from './ThemeToggle'

const STAGE_WORD = { upload: 'uploading', scanning: 'scanning', auditing: 'auditing', report: 'writing the report' } as const

/** Exactly one status line: running, outdated, no ZIP, or ready. */
function useStatusLine(): string {
  const status = useStore((s) => s.audit.status)
  const stage = useStore((s) => s.audit.stage)
  const outdated = useStore(selectOutdated)
  const fileName = useStore((s) => s.submission.file?.name ?? null)
  if (status === 'running') return `Running audit, ${stage ? STAGE_WORD[stage] : 'starting'}`
  if (outdated) return 'Report outdated'
  if (!fileName) return 'No ZIP selected'
  return `${fileName} ready`
}

export function Toolbar({ ref }: { ref?: Ref<HTMLDivElement> }) {
  const statusLine = useStatusLine()
  const user = useStore((s) => s.auth.user)
  const setAuthModalOpen = useStore((s) => s.setAuthModalOpen)
  const openEcosystemModal = useStore((s) => s.openEcosystemModal)
  const setAuthUser = useStore((s) => s.setAuthUser)
  const clerk = useClerk()

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
    announce('Signed out')
  }

  return (
    <div ref={ref} className="bg-canvas" data-print="hide">
      <div className="mx-auto flex min-h-12 max-w-[105rem] flex-col gap-2.5 px-3 py-2 sm:px-4 md:flex-row md:items-center md:gap-x-4 md:gap-y-2 md:px-6 xl:px-10">
        <div className="flex w-full items-center justify-between gap-2 md:w-auto">
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.history.pushState({}, '', '/')
                  window.dispatchEvent(new PopStateEvent('popstate'))
                }
              }}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer text-left"
              title="Return to Landing Page & System Overview"
            >
              <span className="block size-3.5 bg-ink" aria-hidden="true" />
              <span className="text-h3 leading-none font-extrabold [font-stretch:125%]">ShipSafe</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.history.pushState({}, '', '/')
                  window.dispatchEvent(new PopStateEvent('popstate'))
                }
              }}
              className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-ink font-bold border border-rule hover:border-rule-strong bg-surface hover:bg-raised px-2 py-1 rounded-sm cursor-pointer transition-colors shadow-xs shrink-0"
              title="Return to Landing Page & System Overview"
            >
              <span>←</span>
              <span className="hidden sm:inline">Landing Page</span>
              <span className="sm:hidden">Home</span>
            </button>
            <div className="hidden sm:flex items-center gap-1.5 font-mono text-[11px]">
              <button
                type="button"
                onClick={() => openEcosystemModal('mcp')}
                className="px-2 py-0.5 rounded-xs border border-rule hover:border-ink bg-surface hover:bg-raised text-ink-2 hover:text-ink cursor-pointer transition-colors"
                title="ShipSafe MCP Server Configuration for AI Agents"
              >
                ⚡ MCP
              </button>
              <button
                type="button"
                onClick={() => openEcosystemModal('cli')}
                className="px-2 py-0.5 rounded-xs border border-rule hover:border-ink bg-surface hover:bg-raised text-ink-2 hover:text-ink cursor-pointer transition-colors"
                title="ShipSafe Terminal CLI & Pre-Commit Git Hook"
              >
                💻 CLI
              </button>
              <button
                type="button"
                onClick={() => openEcosystemModal('docs')}
                className="px-2 py-0.5 rounded-xs border border-rule hover:border-ink bg-surface hover:bg-raised text-ink-2 hover:text-ink cursor-pointer transition-colors"
                title="Security Architecture & Threat Vectors Documentation"
              >
                📖 Docs
              </button>
            </div>
            <span className="hidden text-small text-ink-3 lg:inline">Pre-deployment security gate</span>
          </div>

          <div className="flex items-center gap-1.5 md:hidden shrink-0">
            <button
              type="button"
              onClick={() => openEcosystemModal('mcp')}
              className="hidden sm:inline-block px-2 py-1 rounded-xs border border-rule font-mono text-[11px] text-ink bg-surface"
              title="MCP Server"
            >
              MCP
            </button>
            <button
              type="button"
              onClick={() => openEcosystemModal('cli')}
              className="hidden sm:inline-block px-2 py-1 rounded-xs border border-rule font-mono text-[11px] text-ink bg-surface"
              title="CLI Gatekeeper"
            >
              CLI
            </button>
            <ThemeToggle />
            {user ? (
              <div className="flex items-center gap-1">
                <button type="button" className="btn text-small px-2.5 min-h-[44px]" onClick={handleSignOut}>
                  Sign out
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn text-small px-3 min-h-[44px]"
                onClick={() => setAuthModalOpen(true)}
                title="Sign in via Supabase to save audit reports"
              >
                Sign in
              </button>
            )}
          </div>
        </div>

        <p
          className="min-w-0 flex-1 truncate text-small text-ink-2 md:text-center text-left"
          data-testid="status-line"
        >
          {statusLine}
        </p>

        <div className="flex flex-wrap items-center gap-2 max-md:w-full max-md:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {isMockMode && (
              <span
                className="tag tag-outline text-ink-2 max-w-[180px] sm:max-w-none truncate text-caption"
                title="Reports come from the built-in demo engine"
              >
                Mock responses
              </span>
            )}
            <SampleMenu />
          </div>

          <div className="hidden md:flex md:items-center md:gap-2">
            <ThemeToggle />
            {user ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 max-w-[180px] pl-1">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.fullName || user.email || 'User avatar'}
                      className="size-7 rounded-full border border-ink object-cover shrink-0"
                    />
                  ) : (
                    <span className="size-7 rounded-full border border-ink bg-surface flex items-center justify-center text-xs font-bold font-mono shrink-0">
                      {((user.fullName || user.email || 'U')[0] || 'U').toUpperCase()}
                    </span>
                  )}
                  <span className="text-small text-ink-2 truncate font-medium" title={user.email || user.fullName}>
                    {user.fullName || (user.email ? user.email.split('@')[0] : 'User')}
                  </span>
                </div>
                <button type="button" className="btn text-small" onClick={handleSignOut}>
                  Sign out
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn text-small"
                onClick={() => setAuthModalOpen(true)}
                title="Sign in via Supabase to save audit reports"
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
