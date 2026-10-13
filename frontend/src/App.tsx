import { useEffect, useState } from 'react'
import { AppShell } from './components/shell/AppShell'
import { ReportArea } from './components/run/ReportArea'
import { SubmissionPanel } from './components/submission/SubmissionPanel'
import { AuthModal } from './components/dialogs/AuthModal'
import { HistoryModal } from './components/dialogs/HistoryModal'
import { ToastContainer } from './components/ui/Toast'
import { NotFoundPage } from './components/shell/NotFoundPage'
import { onAuthStateChange } from './lib/supabase'
import { useStore } from './state/store'

export default function App() {
  const setAuthUser = useStore((s) => s.setAuthUser)
  const [currentPath, setCurrentPath] = useState(() => (typeof window !== 'undefined' ? window.location.pathname : '/'))

  // Listen for browser navigation
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Listen for Supabase session changes
  useEffect(() => {
    return onAuthStateChange((_session, user) => {
      if (user) {
        setAuthUser({
          id: user.id,
          email: user.email ?? '',
          fullName:
            (typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name) ||
            (typeof user.user_metadata?.name === 'string' && user.user_metadata.name) ||
            '',
          avatarUrl:
            (typeof user.user_metadata?.avatar_url === 'string' && user.user_metadata.avatar_url) ||
            (typeof user.user_metadata?.picture === 'string' && user.user_metadata.picture) ||
            '',
        })
      } else {
        // Only clear user if not using an active developer session
        const devToken = typeof window !== 'undefined' ? window.localStorage.getItem('shipsafe.auth.token') : null
        if (!devToken || !devToken.startsWith('dev-token-')) {
          setAuthUser(null)
        }
      }
    })
  }, [setAuthUser])

  // Warn before a reload or close throws away uncommitted work in production
  const hasWork = useStore((s) => s.submission.file !== null || s.audit.report !== null)
  useEffect(() => {
    if (!import.meta.env.PROD || !hasWork) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [hasWork])

  // Custom 404 Route handling
  if (currentPath !== '/' && currentPath !== '') {
    return (
      <>
        <NotFoundPage
          onGoHome={() => {
            window.history.pushState({}, '', '/')
            setCurrentPath('/')
          }}
        />
        <AuthModal />
        <ToastContainer />
      </>
    )
  }

  return (
    <>
      <AppShell submission={<SubmissionPanel />} report={<ReportArea />} />
      <AuthModal />
      <HistoryModal />
      <ToastContainer />
    </>
  )
}
