import { useEffect, useRef, type ReactNode } from 'react'
import { LiveAnnouncer } from '../ui/LiveAnnouncer'
import { DisclaimerBanner } from './DisclaimerBanner'
import { SkipLinks } from './SkipLinks'
import { Toolbar } from './Toolbar'

interface AppShellProps {
  submission: ReactNode
  report: ReactNode
}

/**
 * Top banner, then two regions: submission (left) and report (right).
 * DOM order equals visual order, so on small screens it stacks as banner, toolbar, submission, report.
 * At 768px and up the header (disclaimer + toolbar) is sticky; below it only the toolbar sticks,
 * because the long disclaimer would cover about a third of a phone screen.
 */
export function AppShell({ submission, report }: AppShellProps) {
  const headerRef = useRef<HTMLElement>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)

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
      <main className="mx-auto min-h-[100dvh] w-full max-w-[105rem] px-3 py-6 sm:px-4 md:px-6 md:py-8 xl:px-10 pb-safe overflow-x-hidden">
        <div className="layout-grid grid grid-cols-1 gap-8 sm:gap-10 lg:grid-cols-[minmax(22rem,27rem)_minmax(0,1fr)] lg:gap-8 xl:gap-10">
          <section
            id="project-submission"
            aria-labelledby="submission-title"
            tabIndex={-1}
            className="w-full min-w-0 max-w-full lg:max-w-none lg:border-r lg:border-rule lg:pr-8 xl:pr-10"
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
            className="w-full min-w-0 max-w-full lg:max-w-none"
          >
            <h2 id="report-title" className="text-title">
              Audit report
            </h2>
            {report}
          </section>
        </div>
      </main>
      <LiveAnnouncer />
    </>
  )
}
