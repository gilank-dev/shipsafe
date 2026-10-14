import { useEffect, useState } from 'react'
import { useUser, useAuth, AuthenticateWithRedirectCallback } from '@clerk/clerk-react'
import { AppShell } from './components/shell/AppShell'
import { ReportArea } from './components/run/ReportArea'
import { SubmissionPanel } from './components/submission/SubmissionPanel'
import { AuthModal } from './components/dialogs/AuthModal'
import { HistoryModal } from './components/dialogs/HistoryModal'
import { ToastContainer } from './components/ui/Toast'
import { NotFoundPage } from './components/shell/NotFoundPage'
import { onAuthStateChange } from './lib/supabase'
import { useStore } from './state/store'
import { Analytics } from '@vercel/analytics/react'

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

  // Clerk session synchronization
  const { user: clerkUser, isSignedIn: isClerkSignedIn } = useUser()
  const { getToken: getClerkToken } = useAuth()

  useEffect(() => {
    if (!isClerkSignedIn || !clerkUser) return
    let active = true
    void (async () => {
      try {
        const token = await getClerkToken()
        if (!active) return
        if (token && typeof window !== 'undefined') {
          window.localStorage.setItem('shipsafe.auth.token', token)
        }
        const email =
          clerkUser.primaryEmailAddress?.emailAddress ||
          clerkUser.emailAddresses?.[0]?.emailAddress ||
          ''
        const fullName =
          clerkUser.fullName ||
          `${clerkUser.firstName ?? ''} ${clerkUser.lastName ?? ''}`.trim() ||
          email.split('@')[0] ||
          'ShipSafe Auditor'
        const avatarUrl =
          clerkUser.imageUrl ||
          `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email || 'auditor')}`

        setAuthUser({
          id: clerkUser.id,
          email,
          fullName,
          avatarUrl,
        })
      } catch (err) {
        console.error('[ShipSafe] Error obtaining Clerk session token:', err)
      }
    })()
    return () => {
      active = false
    }
  }, [isClerkSignedIn, clerkUser, getClerkToken, setAuthUser])

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
        // Only clear user if not using an active Clerk, dev, or custom session
        const storedToken = typeof window !== 'undefined' ? window.localStorage.getItem('shipsafe.auth.token') : null
        if (!storedToken || (!storedToken.startsWith('dev-token-') && !storedToken.startsWith('google-token-') && !storedToken.startsWith('github-token-') && !storedToken.includes('.'))) {
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

  // SSO Callback for Clerk OAuth
  if (currentPath === '/sso-callback') {
    return <AuthenticateWithRedirectCallback signInForceRedirectUrl="/" />
  }

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
        <Analytics />
      </>
    )
  }

  return (
    <>
      <AppShell submission={<SubmissionPanel />} report={<ReportArea />} />
      <AuthModal />
      <HistoryModal />
      <ToastContainer />
      <Analytics />
    </>
  )
}
