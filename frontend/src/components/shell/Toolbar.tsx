import type { Ref } from 'react'
import { useClerk } from '@clerk/react'
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
  const setHistoryModalOpen = useStore((s) => s.setHistoryModalOpen)
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
            <span className="block size-3.5 bg-ink" aria-hidden="true" />
            <span className="text-h3 leading-none font-extrabold [font-stretch:125%]">ShipSafe</span>
            <span className="hidden text-small text-ink-3 md:inline">Pre-deployment security gate</span>
          </div>

          <div className="flex items-center gap-1.5 md:hidden">
            <ThemeToggle />
            {user ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="btn text-small px-2.5 min-h-[44px]"
                  onClick={() => setHistoryModalOpen(true)}
                  title="View saved audit history"
                >
                  History
                </button>
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
                <button
                  type="button"
                  className="btn btn-outline text-small"
                  onClick={() => setHistoryModalOpen(true)}
                  title="View saved audit history"
                >
                  History
                </button>
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
