import type { Ref } from 'react'
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
  const setAuthUser = useStore((s) => s.setAuthUser)

  const handleSignOut = async () => {
    await signOut()
    setAuthUser(null)
    announce('Signed out')
  }

  return (
    <div ref={ref} className="border-b border-ink bg-canvas max-md:sticky max-md:top-0 max-md:z-30" data-print="hide">
      <div className="mx-auto flex min-h-12 max-w-[105rem] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 md:px-6 xl:px-10">
        <div className="flex items-center gap-2.5">
          <span className="block size-3.5 bg-ink" aria-hidden="true" />
          <span className="text-h3 leading-none font-extrabold [font-stretch:125%]">ShipSafe</span>
          <span className="hidden text-small text-ink-3 md:inline">Pre-deployment security gate</span>
        </div>
        <p className="min-w-0 flex-1 truncate text-small text-ink-2 md:text-center" data-testid="status-line">
          {statusLine}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {isMockMode && (
            <span className="tag tag-outline text-ink-2" title="Reports come from the built-in demo engine">
              Mock responses, no model attached
            </span>
          )}
          <SampleMenu />
          <ThemeToggle />
          {user ? (
            <div className="flex items-center gap-2">
              <span className="text-small text-ink-2" title={user.email}>
                {user.email ? user.email.split('@')[0] : 'User'}
              </span>
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
  )
}
