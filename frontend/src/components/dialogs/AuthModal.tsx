import { useEffect, useState, type FormEvent } from 'react'
import { useSignIn } from '@clerk/react'
import {
  isSupabaseConfigured,
  signInWithEmail,
  signUpWithEmail,
  signInWithOAuth,
  signInWithOtp,
  isProviderEnabled,
  saveDevSession,
  loginWithGoogle,
  loginWithGitHub,
} from '../../lib/supabase'
import { announce } from '../../state/announcer'
import { useStore, type UserProfile } from '../../state/store'
import { toast } from '../../state/toast'
import { Dialog } from './Dialog'
import { IconGitHub, IconGoogle, IconLock } from '../ui/icons'

export function AuthModal() {
  const isOpen = useStore((s) => s.auth.isAuthModalOpen)
  const setOpen = useStore((s) => s.setAuthModalOpen)
  const setAuthUser = useStore((s) => s.setAuthUser)

  const { isLoaded: isClerkLoaded, signIn: clerkSignIn } = useSignIn()

  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        return window.localStorage.getItem('shipsafe.auth.last_email') || ''
      } catch {
        return ''
      }
    }
    return ''
  })
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [otpLoading, setOtpLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<'google' | 'github' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [oauthDisabled, setOauthDisabled] = useState(false)

  // Probe OAuth provider availability on modal open
  useEffect(() => {
    if (!isOpen || Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY)) return
    let active = true
    void (async () => {
      try {
        const gh = await isProviderEnabled('github')
        const google = await isProviderEnabled('google')
        if (active && gh === false && google === false) {
          setOauthDisabled(true)
        }
      } catch {
        // ignore probe error in offline or test environment
      }
    })()
    return () => {
      active = false
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleClose = () => {
    setError(null)
    setSuccessMsg(null)
    setOpen(false)
  }

  const handleOAuth = async (provider: 'google' | 'github') => {
    setError(null)
    setSuccessMsg(null)
    setOauthLoading(provider)

    try {
      const providerName = provider === 'google' ? 'Google' : 'GitHub'
      announce(`Connecting to ${providerName}...`)

      // Attempt Clerk OAuth first (supports both Google and GitHub out of the box)
      if (isClerkLoaded && clerkSignIn) {
        try {
          const strategy = provider === 'google' ? 'oauth_google' : 'oauth_github'
          await clerkSignIn.authenticateWithRedirect({
            strategy,
            redirectUrl: `${window.location.origin}/sso-callback`,
            redirectUrlComplete: window.location.origin,
          })
          return
        } catch (clerkErr) {
          console.warn('[ShipSafe] Clerk OAuth redirect error, falling back:', clerkErr)
        }
      }

      if (provider === 'google') {
        const res = await loginWithGoogle()
        if (res.user) {
          setAuthUser(res.user)
          announce(`Signed in with Google (${res.user.email})`)
          toast.info(`Signed in with Google: ${res.user.email}`)
          setOauthLoading(null)
          handleClose()
          return
        }
      } else {
        const res = await signInWithOAuth('github')
        if (res.error) {
          const ghRes = await loginWithGitHub()
          if (ghRes.user) {
            setAuthUser(ghRes.user)
            announce(`Signed in with GitHub (${ghRes.user.email})`)
            toast.info(`Signed in with GitHub: ${ghRes.user.fullName || ghRes.user.email}`)
            setOauthLoading(null)
            handleClose()
            return
          }
        }
      }
    } catch {
      if (provider === 'github') {
        const ghRes = await loginWithGitHub()
        if (ghRes.user) {
          setAuthUser(ghRes.user)
          announce(`Signed in with GitHub (${ghRes.user.email})`)
          toast.info(`Signed in with GitHub: ${ghRes.user.fullName || ghRes.user.email}`)
          setOauthLoading(null)
          handleClose()
          return
        }
      }
      setOauthLoading(null)
      setError('Sign in failed')
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)

    if (!email || !password) {
      setError('Please provide both email and password.')
      return
    }

    try {
      if (typeof window !== 'undefined' && email) {
        window.localStorage.setItem('shipsafe.auth.last_email', email)
      }
    } catch {
      // storage blocked
    }

    setLoading(true)

    if (mode === 'signin') {
      const res = await signInWithEmail(email, password)
      setLoading(false)

      if (res.error) {
        setError(res.error.message)
      } else if (res.devProfile) {
        setAuthUser(res.devProfile)
        announce(`Signed in as ${res.devProfile.email}`)
        toast.info(`Signed in as ${res.devProfile.fullName}. Audit capabilities unlocked.`)
        handleClose()
      } else if (res.user) {
        const profile: UserProfile = {
          id: res.user.id,
          email: res.user.email ?? '',
          fullName:
            (typeof res.user.user_metadata?.full_name === 'string' && res.user.user_metadata.full_name) ||
            (typeof res.user.user_metadata?.name === 'string' && res.user.user_metadata.name) ||
            res.user.email?.split('@')[0] ||
            'ShipSafe Auditor',
          avatarUrl:
            (typeof res.user.user_metadata?.avatar_url === 'string' && res.user.user_metadata.avatar_url) ||
            (typeof res.user.user_metadata?.picture === 'string' && res.user.user_metadata.picture) ||
            `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(res.user.email ?? 'auditor')}`,
        }
        setAuthUser(profile)
        announce(`Signed in as ${profile.email}`)
        toast.info(`Signed in as ${profile.fullName || profile.email}`)
        handleClose()
      }
    } else {
      const res = await signUpWithEmail(email, password)
      setLoading(false)
      if (res.error) {
        setError(res.error.message)
      } else if (res.devProfile) {
        setAuthUser(res.devProfile)
        announce(`Signed in as ${res.devProfile.email}`)
        toast.info(`Signed in as ${res.devProfile.fullName}. Audit capabilities unlocked.`)
        handleClose()
      } else if (res.user) {
        const profile: UserProfile = {
          id: res.user.id,
          email: res.user.email ?? '',
          fullName:
            (typeof res.user.user_metadata?.full_name === 'string' && res.user.user_metadata.full_name) ||
            res.user.email?.split('@')[0] ||
            'ShipSafe Auditor',
          avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(res.user.email ?? 'auditor')}`,
        }
        setAuthUser(profile)
        announce(`Account created. Signed in as ${profile.email}`)
        toast.info(`Welcome to ShipSafe, ${profile.fullName || profile.email}!`)
        handleClose()
      }
    }
  }

  const handleMagicLink = async () => {
    setError(null)
    setSuccessMsg(null)

    if (!isSupabaseConfigured) {
      setError('Supabase is not configured yet in environment.')
      return
    }

    if (!email) {
      setError('Please enter your email to receive a magic sign-in link.')
      return
    }

    try {
      if (typeof window !== 'undefined' && email) {
        window.localStorage.setItem('shipsafe.auth.last_email', email)
      }
    } catch {
      // storage blocked
    }

    setOtpLoading(true)
    const res = await signInWithOtp(email)
    setOtpLoading(false)
    if (res.error) {
      setError(res.error.message)
    } else {
      setSuccessMsg(`Magic login link sent to ${email}. Please check your inbox.`)
      announce('Magic link sent to email')
    }
  }

  return (
    <Dialog title={mode === 'signin' ? 'Sign in to ShipSafe' : 'Create an Account'} onClose={handleClose}>
      <div className="space-y-4">
        {/* Notice Header */}
        <div className="border border-rule bg-surface p-3 text-small text-ink-2">
          <div className="flex items-center gap-1.5 font-semibold text-ink mb-1">
            <IconLock width={14} height={14} />
            <span>Authentication Required</span>
          </div>
          Sign in to your account to run pre-deployment security audits and manage reports.
        </div>

        {error && (
          <div role="alert" className="border border-status-fail bg-surface p-3 text-small text-status-fail font-medium">
            {error}
          </div>
        )}

        {successMsg && (
          <div role="status" className="border border-status-pass bg-surface p-3 text-small text-status-pass font-medium">
            {successMsg}
          </div>
        )}

        {oauthDisabled && (
          <div className="border border-status-warn/40 bg-surface p-2.5 text-xs text-ink-2 flex items-start gap-2">
            <span className="text-status-warn font-bold">i</span>
            <div>
              External OAuth providers are currently disabled in Supabase. Please sign in with email and password below or request a Magic Link.
            </div>
          </div>
        )}

        {/* Primary OAuth Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            className="btn btn-outline w-full flex items-center justify-center gap-2.5 py-2.5 font-medium min-h-[44px] hover:border-ink"
            disabled={oauthLoading !== null || loading || otpLoading}
            onClick={() => handleOAuth('github')}
          >
            <IconGitHub width={18} height={18} />
            <span>{oauthLoading === 'github' ? 'Connecting to GitHub...' : 'Continue with GitHub'}</span>
          </button>

          <button
            type="button"
            className="btn btn-outline w-full flex items-center justify-center gap-2.5 py-2.5 font-medium min-h-[44px] hover:border-ink"
            disabled={oauthLoading !== null || loading || otpLoading}
            onClick={() => handleOAuth('google')}
          >
            <IconGoogle width={18} height={18} />
            <span>{oauthLoading === 'google' ? 'Connecting to Google...' : 'Continue with Google'}</span>
          </button>
        </div>

        <div className="relative flex items-center py-2">
          <div className="grow border-t border-rule" />
          <span className="shrink mx-3 text-xs uppercase tracking-wider text-ink-3 font-mono">
            or continue with email
          </span>
          <div className="grow border-t border-rule" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="auth-email" className="block text-small font-semibold">
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              data-autofocus
              required
              className="control mt-1"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
            />
          </div>

          <div>
            <label htmlFor="auth-password" className="block text-small font-semibold">
              Password
            </label>
            <input
              id="auth-password"
              type="password"
              required
              minLength={6}
              className="control mt-1"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <button
              type="button"
              className="text-small text-ink-2 underline hover:text-ink text-left"
              onClick={() => {
                setError(null)
                setSuccessMsg(null)
                setMode(mode === 'signin' ? 'signup' : 'signin')
              }}
            >
              {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="btn btn-outline text-small w-full sm:w-auto"
                disabled={loading || otpLoading || oauthLoading !== null}
                onClick={handleMagicLink}
                title="Send a passwordless magic login link to your email"
              >
                {otpLoading ? 'Sending...' : 'Send Magic Link'}
              </button>
              <button
                type="submit"
                className="btn btn-primary w-full sm:w-auto"
                disabled={loading || otpLoading || oauthLoading !== null}
              >
                {loading ? 'Please wait...' : mode === 'signin' ? 'Sign in' : 'Create account'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </Dialog>
  )
}
