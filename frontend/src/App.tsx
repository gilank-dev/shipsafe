import { useEffect, useState } from 'react'
import { useUser, useAuth, AuthenticateWithRedirectCallback } from '@clerk/clerk-react'
import { AppShell } from './components/shell/AppShell'
import { ReportArea } from './components/run/ReportArea'
import { SubmissionPanel } from './components/submission/SubmissionPanel'
import { AuthModal } from './components/dialogs/AuthModal'
import { EcosystemModal } from './components/dialogs/EcosystemModal'
import { ToastContainer } from './components/ui/Toast'
import { NotFoundPage } from './components/shell/NotFoundPage'
import { LandingPage } from './components/landing/LandingPage'
import { PaywallModal } from './components/pricing/PaywallModal'
import { SuperAdminDashboard } from './components/admin/SuperAdminDashboard'
import { TeamManagementPage } from './components/team/TeamManagementPage'
import { onAuthStateChange } from './lib/supabase'
import { useStore } from './state/store'
import { Analytics } from '@vercel/analytics/react'

const normalizePath = (rawPath: string): string => {
  let p = rawPath.split('?')[0] || '/'
  while (p.length > 1 && p.endsWith('/')) {
    p = p.slice(0, -1)
  }
  p = p.toLowerCase()
  if (p === '/index.html' || p === '') {
    return '/'
  }
  return p
}

export default function App() {
  const setAuthUser = useStore((s) => s.setAuthUser)
  const [currentPath, setCurrentPath] = useState(() => {
    if (typeof window === 'undefined') return '/'
    const hash = window.location.hash
    if (hash === '#/console' || hash === '#console') return '/console'
    if (hash === '#/landing' || hash === '#landing') return '/'
    return normalizePath(window.location.pathname)
  })

  // Listen for browser navigation
  useEffect(() => {
    if (typeof window !== 'undefined') {
      ;(window as unknown as { __STORE__: typeof useStore }).__STORE__ = useStore
    }
    const handlePopState = () => {
      const hash = window.location.hash
      if (hash === '#/console' || hash === '#console') {
        setCurrentPath('/console')
        return
      }
      if (hash === '#/landing' || hash === '#landing') {
        setCurrentPath('/')
        return
      }
      setCurrentPath(normalizePath(window.location.pathname))
    }
    window.addEventListener('popstate', handlePopState)
    window.addEventListener('hashchange', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
      window.removeEventListener('hashchange', handlePopState)
    }
  }, [])

  // Navigation helpers
  const navigateTo = (path: string) => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', path)
      window.dispatchEvent(new PopStateEvent('popstate'))
      if (path.includes('#')) {
        const hash = path.substring(path.indexOf('#'))
        setTimeout(() => {
          const el = document.querySelector(hash)
          if (el) {
            el.scrollIntoView({ behavior: 'smooth' })
          }
        }, 100)
      }
    }
    const cleanPath = normalizePath(path.split('#')[0] || '/')
    setCurrentPath(cleanPath)
  }

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

  // Landing Page Route & Aliases
  const isLandingRoute =
    currentPath === '/' ||
    currentPath === '' ||
    currentPath === '/landing' ||
    currentPath === '/home' ||
    currentPath === '/pricing' ||
    currentPath === '/mcp' ||
    currentPath === '/cli' ||
    currentPath === '/docs' ||
    currentPath === '/documentation' ||
    currentPath === '/threat-matrix' ||
    currentPath === '/faq' ||
    currentPath === '/privacy' ||
    currentPath === '/terms'

  if (isLandingRoute) {
    return (
      <>
        <LandingPage onLaunchConsole={() => navigateTo('/console')} />
        <AuthModal />
        <EcosystemModal />
        <PaywallModal />
        <ToastContainer />
        <Analytics />
      </>
    )
  }

  // Super Admin Route
  const isAdminRoute = currentPath === '/admin' || currentPath.startsWith('/admin/')
  if (isAdminRoute) {
    return (
      <>
        <SuperAdminDashboard onNavigate={navigateTo} />
        <AuthModal />
        <ToastContainer />
        <Analytics />
      </>
    )
  }

  // Enterprise Team Route
  const authUser = useStore((s) => s.auth.user)
  const quotaState = useStore((s) => s.quota)
  const effectiveUserTier = authUser?.organizationId ? 'enterprise' : (authUser?.tier || quotaState?.tier || 'free')
  const isTeamUser = Boolean(authUser && (authUser.organizationId || authUser.organizationName || effectiveUserTier === 'enterprise' || authUser.isSuperAdmin))

  const isTeamRoute = currentPath === '/dashboard/team' || currentPath === '/team'
  if (isTeamRoute) {
    if (!isTeamUser) {
      navigateTo('/console')
      return null
    }
    return (
      <>
        <TeamManagementPage onNavigate={navigateTo} />
        <AuthModal />
        <PaywallModal />
        <ToastContainer />
        <Analytics />
      </>
    )
  }

  // Security Console Routes & Aliases
  const isConsoleRoute =
    currentPath === '/console' ||
    currentPath === '/app' ||
    currentPath === '/audit' ||
    currentPath === '/scan' ||
    currentPath === '/dashboard' ||
    currentPath === '/report' ||
    currentPath === '/history'

  if (isConsoleRoute) {
    return (
      <>
        <AppShell submission={<SubmissionPanel />} report={<ReportArea />} />
        <AuthModal />
        <EcosystemModal />
        <PaywallModal />
        <ToastContainer />
        <Analytics />
      </>
    )
  }

  // Custom 404 Route handling
  return (
    <>
      <NotFoundPage
        onGoHome={() => {
          navigateTo('/')
        }}
      />
      <AuthModal />
      <EcosystemModal />
      <PaywallModal />
      <ToastContainer />
      <Analytics />
    </>
  )
}
