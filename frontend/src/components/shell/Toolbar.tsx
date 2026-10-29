import type { Ref } from 'react'
import { BookOpen, Menu } from 'lucide-react'
import { isMockMode } from '../../api/client'
import { selectOutdated } from '../../state/selectors'
import { useStore } from '../../state/store'
import { SampleMenu } from './SampleMenu'
import { ThemeToggle } from './ThemeToggle'
import { BrandLogo } from '../ui/BrandLogo'

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

interface ToolbarProps {
  ref?: Ref<HTMLDivElement>
  activeView?: 'audit' | 'docs' | 'pricing'
  onSelectView?: (view: 'audit' | 'docs' | 'pricing') => void
}

export function Toolbar({ ref, activeView = 'audit', onSelectView }: ToolbarProps) {
  const statusLine = useStatusLine()
  const user = useStore((s) => s.auth.user)
  const toggleSidebar = useStore((s) => s.toggleSidebar)
  const setAuthModalOpen = useStore((s) => s.setAuthModalOpen)

  return (
    <div ref={ref} className="bg-canvas border-b border-rule" data-print="hide">
      <div className="mx-auto flex min-h-12 max-w-[105rem] items-center justify-between gap-3 px-3 py-2 sm:px-4 md:px-6 xl:px-8">
        {/* Left: Sidebar Toggle, Brand Logo & Documentation View Button */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Toggle navigasi sidebar"
            title="Toggle navigasi (Ctrl+B)"
            className="p-1.5 text-ink-2 hover:text-ink hover:bg-surface rounded-sm cursor-pointer transition-colors"
          >
            <Menu className="size-4 shrink-0" strokeWidth={1.5} />
          </button>

          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.history.pushState({}, '', '/')
                window.dispatchEvent(new PopStateEvent('popstate'))
              }
            }}
            className="flex items-center gap-2 hover:opacity-85 transition-opacity cursor-pointer text-left shrink-0"
            title="Kembali ke Landing Page"
          >
            <BrandLogo size="md" />
          </button>

          <span className="text-rule hidden sm:inline select-none">|</span>

          {/* Documentation Button */}
          <button
            type="button"
            onClick={() => onSelectView?.(activeView === 'docs' ? 'audit' : 'docs')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono border transition-colors cursor-pointer rounded-sm ${
              activeView === 'docs'
                ? 'bg-ink text-canvas font-semibold border-ink'
                : 'bg-surface hover:bg-raised text-ink-2 hover:text-ink border-rule'
            }`}
            title="Buka Dokumentasi Lengkap ShipSafe"
          >
            <BookOpen className="size-3.5 shrink-0" strokeWidth={1.5} />
            <span>Documentation</span>
          </button>
        </div>

        {/* Center: Subtle Status Line */}
        <p
          className="hidden lg:block min-w-0 flex-1 truncate text-xs font-mono text-ink-3 text-center"
          data-testid="status-line"
        >
          {activeView === 'docs'
            ? 'Dokumentasi & Panduan Keamanan'
            : activeView === 'pricing'
              ? 'Paket & Langganan ShipSafe'
              : statusLine}
        </p>

        {/* Right: Actions & Theme Toggle (User Identity & Quota are at the bottom of the left sidebar) */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {activeView === 'audit' && (
            <div className="flex items-center gap-1.5">
              {isMockMode && (
                <span className="hidden sm:inline font-mono text-[10px] text-ink-3 px-1.5 py-0.5 border border-rule bg-surface">
                  Mock
                </span>
              )}
              <SampleMenu />
            </div>
          )}

          <ThemeToggle />

          {!user && (
            <button
              type="button"
              className="btn btn-primary text-xs font-mono px-3 py-1"
              onClick={() => setAuthModalOpen(true)}
              title="Sign in to save audits"
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
