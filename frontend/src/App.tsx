import { useEffect } from 'react'
import { AppShell } from './components/shell/AppShell'
import { ReportArea } from './components/run/ReportArea'
import { SubmissionPanel } from './components/submission/SubmissionPanel'
import { AuthModal } from './components/dialogs/AuthModal'
import { ToastContainer } from './components/ui/Toast'
import { onAuthStateChange } from './lib/supabase'
import { useStore } from './state/store'

export default function App() {
  const setAuthUser = useStore((s) => s.setAuthUser)

  // Listen for Supabase session changes
  useEffect(() => {
    return onAuthStateChange((_session, user) => {
      setAuthUser(user ? { id: user.id, email: user.email ?? '' } : null)
    })
  }, [setAuthUser])

  // Nothing is saved anywhere, so warn before a reload or close throws away the ZIP choice or the report.
  const hasWork = useStore((s) => s.submission.file !== null || s.audit.report !== null)
  useEffect(() => {
    if (!import.meta.env.PROD || !hasWork) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [hasWork])

  return (
    <>
      <AppShell submission={<SubmissionPanel />} report={<ReportArea />} />
      <AuthModal />
      <ToastContainer />
    </>
  )
}
