import { useEffect, useRef, useState, type ReactNode } from 'react'
import { LiveAnnouncer } from '../ui/LiveAnnouncer'
import { DisclaimerBanner } from './DisclaimerBanner'
import { SkipLinks } from './SkipLinks'
import { Toolbar } from './Toolbar'
import { useStore } from '../../state/store'
import { IconFile, IconShield, IconChevron } from '../ui/icons'

interface AppShellProps {
  submission: ReactNode
  report: ReactNode
}

/**
 * Top banner, then two regions: submission (left) and report (right).
 * On desktop (lg+), the submission rail is sticky and scrollable within the viewport,
 * preventing scroll fatigue while viewing reports.
 * On mobile/tablet (< lg), a segmented tab bar toggles between Submission and Report
 * so users never have to scroll down past 800px of submission form to see results.
 */
export function AppShell({ submission, report }: AppShellProps) {
  const headerRef = useRef<HTMLElement>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const [userSelectedTab, setUserSelectedTab] = useState<'submission' | 'report' | null>(null)
  const [showScrollTop, setShowScrollTop] = useState(false)

  const auditStatus = useStore((s) => s.audit.status)
  const hasReport = useStore((s) => Boolean(s.audit.report))

  // Derived mobile tab: defaults to report when running or report is ready, unless manually overridden
  const activeMobileTab = userSelectedTab ?? (auditStatus === 'running' || hasReport ? 'report' : 'submission')

  // Scroll to top button visibility
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 350)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Keep --rail-h equal to the sticky area's height so focused controls are never hidden behind it (WCAG 2.4.11).
  useEffect(() => {
    const header = headerRef.current
    const toolbar = toolbarRef.current
    if (!header || !toolbar) return
    const wide = window.matchMedia?.('(min-width: 768px)')
    const apply = () => {
      const height = wide?.matches ? header.offsetHeight : toolbar.offsetHeight
      document.documentElement.style.setProperty('--rail-h', `${height}px`)
    }
    apply()
    const observer = new ResizeObserver(apply)
    observer.observe(header)
    observer.observe(toolbar)
    wide?.addEventListener?.('change', apply)
    return () => {
      observer.disconnect()
      wide?.removeEventListener?.('change', apply)
    }
  }, [])

  return (
    <>
      <SkipLinks />
      <header ref={headerRef} className="z-30 md:sticky md:top-0 max-md:contents">
        <h1 className="visually-hidden">ShipSafe</h1>
        <DisclaimerBanner />
        <Toolbar ref={toolbarRef} />
      </header>

      <main className="mx-auto min-h-[100dvh] w-full max-w-[105rem] px-3 py-4 sm:px-4 md:px-6 md:py-6 xl:px-10 pb-safe overflow-x-hidden">
        {/* Mobile View Switcher (< lg) to eliminate massive vertical scroll */}
        <div className="lg:hidden mb-4 border-b border-rule pb-2" role="tablist" aria-label="Mobile workspace view">
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-surface border border-rule rounded-[var(--radius-control)]">
            <button
              type="button"
              role="tab"
              aria-selected={activeMobileTab === 'submission'}
              aria-controls="project-submission"
              id="mobile-tab-submission"
              onClick={() => setUserSelectedTab('submission')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 text-small font-semibold rounded-[var(--radius-chip)] transition-all ${
                activeMobileTab === 'submission'
                  ? 'bg-canvas text-ink font-bold shadow-xs border border-rule/60'
                  : 'text-ink-2 hover:text-ink hover:bg-canvas/40'
              }`}
            >
              <IconFile width={15} height={15} />
              <span>Submission</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeMobileTab === 'report'}
              aria-controls="audit-report"
              id="mobile-tab-report"
              onClick={() => setUserSelectedTab('report')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 text-small font-semibold rounded-[var(--radius-chip)] transition-all ${
                activeMobileTab === 'report'
                  ? 'bg-canvas text-ink font-bold shadow-xs border border-rule/60'
                  : 'text-ink-2 hover:text-ink hover:bg-canvas/40'
              }`}
            >
              <IconShield width={15} height={15} />
              <span>Audit Report</span>
              {auditStatus === 'running' && (
                <span className="size-2 rounded-full bg-status-fail animate-ping ml-1" />
              )}
              {hasReport && (
                <span className="size-2 rounded-full bg-status-pass ml-1" />
              )}
            </button>
          </div>
        </div>

        <div className="layout-grid grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-[minmax(22rem,27rem)_minmax(0,1fr)] lg:gap-8 xl:gap-10 items-start">
          <section
            id="project-submission"
            aria-labelledby="submission-title"
            tabIndex={-1}
            className={`w-full min-w-0 max-w-full lg:max-w-none lg:border-r lg:border-rule lg:pr-8 xl:pr-10 lg:sticky lg:top-[calc(var(--rail-h)+1rem)] lg:max-h-[calc(100vh-var(--rail-h)-2rem)] lg:overflow-y-auto custom-scrollbar ${
              activeMobileTab === 'submission' ? 'block' : 'hidden lg:block'
            }`}
            data-print="hide"
          >
            <h2 id="submission-title" className="text-title">
              Project submission
            </h2>
            {submission}
          </section>

          <section
            id="audit-report"
            aria-labelledby="report-title"
            tabIndex={-1}
            className={`w-full min-w-0 max-w-full lg:max-w-none ${
              activeMobileTab === 'report' ? 'block' : 'hidden lg:block'
            }`}
          >
            <h2 id="report-title" className="text-title">
              Audit report
            </h2>
            {report}
          </section>
        </div>
      </main>

      {/* Floating Scroll To Top Button */}
      {showScrollTop && (
        <button
          type="button"
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-40 p-2.5 rounded-full border border-rule bg-raised/95 text-ink shadow-md hover:bg-surface transition-all focus-visible:outline-2 focus-visible:outline-ink animate-fadeIn"
          aria-label="Scroll back to top"
          title="Back to top"
        >
          <span className="rotate-180 inline-block">
            <IconChevron width={16} height={16} />
          </span>
        </button>
      )}

      <LiveAnnouncer />
    </>
  )
}
