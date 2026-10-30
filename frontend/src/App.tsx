import { useEffect, useState } from 'react'

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

import { onAuthStateChange } from './lib/supabase'
import { isSuperAdminEmail } from './config/super-admin'

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
  const authUser = useStore((s) => s.auth.user)
  const setQuota = useStore((s) => s.setQuota)
  const setAuthModalOpen = useStore((s) => s.setAuthModalOpen)

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



  // Listen for Supabase session changes
  useEffect(() => {
    return onAuthStateChange((session, user) => {
      if (session?.access_token && typeof window !== 'undefined') {
        try {
          window.localStorage.setItem('shipsafe.auth.token', session.access_token)
        } catch {
          // storage blocked
        }
      }

      if (user) {
        const email = user.email ?? ''
        const fullName =
          (typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name) ||
          (typeof user.user_metadata?.name === 'string' && user.user_metadata.name) ||
          email.split('@')[0] ||
          'ShipSafe Auditor'

        const avatarUrl =
          (typeof user.user_metadata?.avatar_url === 'string' && user.user_metadata.avatar_url) ||
          (typeof user.user_metadata?.picture === 'string' && user.user_metadata.picture) ||
          `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email || 'auditor')}`

        setAuthUser({
          id: user.id,
          email,
          fullName,
          avatarUrl,
        })
      } else {
        const storedUser = typeof window !== 'undefined' ? window.localStorage.getItem('shipsafe.auth.user') : null
        if (!storedUser) {
          setAuthUser(null)
        }
      }
    })
  }, [setAuthUser])

  // Restore stored session on mount if available
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const stored = window.localStorage.getItem('shipsafe.auth.user')
      if (stored && !authUser) {
        const parsed = JSON.parse(stored)
        if (parsed?.id && parsed?.email) {
          setAuthUser(parsed)
        }
      }
    } catch {
      // storage blocked or invalid json
    }
  }, [authUser, setAuthUser])



  // Realtime User Profile & Quota Synchronization with Supabase & Backend Admin Ledger
  useEffect(() => {
    if (!authUser?.email) return
    let active = true

    const syncProfileAndQuota = async () => {
      try {
        const storedToken = typeof window !== 'undefined' ? window.localStorage.getItem('shipsafe.auth.token') : null
        const res = await fetch(`/api/user/sync?email=${encodeURIComponent(authUser.email!)}`, {
          headers: {
            'x-user-email': authUser.email!,
            // Identity is resolved from the verified session token server-side.
            ...(storedToken ? { Authorization: `Bearer ${storedToken}` } : {}),
          },
        })
        if (!res.ok || !active) return
        const data = await res.json()
        if (data?.user && active) {
          setAuthUser({
            id: data.user.id || authUser.id,
            email: data.user.email || authUser.email,
            fullName: data.user.fullName || authUser.fullName,
            avatarUrl: data.user.avatarUrl || authUser.avatarUrl,
            tier: data.user.tier,
            isSuperAdmin: data.user.isSuperAdmin,
            accountStatus: data.user.accountStatus,
            organizationId: data.user.organizationId,
            organizationName: data.user.organizationName,
            orgRole: data.user.orgRole,
          })
        }
        if (data?.quota && active) {
          setQuota({
            tier: data.quota.tier,
            used: data.quota.used,
            limit: data.quota.limit,
            remaining: data.quota.remaining,
            resetDate: data.quota.resetDate,
          })
        }
      } catch (err) {
        console.warn('[ShipSafe] User profile sync warning:', err)
      }
    }

    void syncProfileAndQuota()
    const timer = setInterval(syncProfileAndQuota, 30000)
    const handleFocus = () => void syncProfileAndQuota()
    window.addEventListener('focus', handleFocus)

    return () => {
      active = false
      clearInterval(timer)
      window.removeEventListener('focus', handleFocus)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.email, setAuthUser, setQuota])

  // Navigation handlers: Guard console entry if unauthenticated
  const handleLaunchConsole = () => {
    if (!authUser) {
      setAuthModalOpen(true)
    } else {
      navigateTo('/console')
    }
  }

  // Warn before a reload or close throws away uncommitted work in production

  const hasWork = useStore((s) => s.submission.file !== null || s.audit.report !== null)

  useEffect(() => {

    if (!import.meta.env.PROD || !hasWork) return

    const warn = (e: BeforeUnloadEvent) => e.preventDefault()

    window.addEventListener('beforeunload', warn)

    return () => window.removeEventListener('beforeunload', warn)

  }, [hasWork])



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

        <LandingPage onLaunchConsole={handleLaunchConsole} />

        <AuthModal />

        <EcosystemModal />

        <PaywallModal />

        <ToastContainer />

        <Analytics />

      </>

    )

  }



  // Super Admin Route (Strictly gated by Super Admin whitelist)
  const isAdminRoute = currentPath === '/admin' || currentPath.startsWith('/admin/')

  if (isAdminRoute) {
    const isSuperAdmin = Boolean(authUser && (authUser.isSuperAdmin || isSuperAdminEmail(authUser.email)))
    if (!isSuperAdmin) {
      navigateTo('/console')
      return null
    }

    return (
      <>
        <SuperAdminDashboard onNavigate={navigateTo} />
        <AuthModal />
        <ToastContainer />
        <Analytics />
      </>
    )
  }



  // Deprecated team routes redirect to console

  if (currentPath === '/dashboard/team' || currentPath === '/team') {

    navigateTo('/console')

    return null

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

