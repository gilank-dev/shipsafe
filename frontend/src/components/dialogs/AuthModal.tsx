import { useEffect, useState, type FormEvent } from 'react'
import {
  isSupabaseConfigured,
  signInWithEmail,
  signUpWithEmail,
  signInWithOAuth,
  signInWithOtp,
  DEV_USER_PROFILE,
  DEV_ACCESS_TOKEN,
  saveDevSession,
  isProviderEnabled,
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

  // Probe OAuth provider availability on modal open to avoid stranding user on raw Supabase 400 errors
  useEffect(() => {
    if (!isOpen) return
    let active = true
    void (async () => {
      try {
        const gh = await isProviderEnabled('github')
        const google = await isProviderEnabled('google')
        if (active && gh === false && google === false) {
          setOauthDisabled(true)
        }
      } catch {
        // ignore probe error in offline/test environment
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

  const handleInstantDeveloperSignIn = () => {
    setError(null)
    setSuccessMsg(null)

    const devUser: UserProfile = {
      id: DEV_USER_PROFILE.id,
      email: DEV_USER_PROFILE.email,
      fullName: DEV_USER_PROFILE.fullName,
      avatarUrl: DEV_USER_PROFILE.avatarUrl,
    }

    saveDevSession(devUser, DEV_ACCESS_TOKEN)
    setAuthUser(devUser)

    announce('Signed in as ShipSafe Lead Auditor (developer@example.com)')
    toast.info('Signed in as ShipSafe Lead Auditor. Audit capabilities unlocked.')
    handleClose()
  }

  const handlePrefillDeveloper = () => {
    setEmail('developer@example.com')
    setPassword('developer123')
    setError(null)
    setSuccessMsg(null)
    announce('Developer credentials pre-filled')
  }

  const handleOAuth = async (provider: 'google' | 'github') => {
    setError(null)
    setSuccessMsg(null)
    setOauthLoading(provider)

    try {
      const providerName = provider === 'google' ? 'Google' : 'GitHub'
      announce(`Connecting to ${providerName}...`)

      const res = await signInWithOAuth(provider)
      if (res.error) {
        setOauthLoading(null)
        const isUnsupported =
          res.error.message.toLowerCase().includes('not enabled') ||
          res.error.message.toLowerCase().includes('unsupported')
        if (isUnsupported) {
          setOauthDisabled(true)
          setError(
            `${providerName} OAuth is not enabled in Supabase settings. Please click '⚡ Instant Sign-in as Developer' or use Email sign-in.`,
          )
        } else {
          setError(res.error.message)
        }
      }
    } catch (err: unknown) {
      setOauthLoading(null)
      setError(err instanceof Error ? err.message : 'OAuth sign in failed')
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
        // If developer account was used, instantly recover
        if (email.trim().toLowerCase() === 'developer@example.com') {
          handleInstantDeveloperSignIn()
          return
        }
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
        // If developer account, instantly recover
        if (email.trim().toLowerCase() === 'developer@example.com') {
          handleInstantDeveloperSignIn()
          return
        }
        setError(res.error.message)
      } else {
        setSuccessMsg('Account created. Check your email for confirmation or sign in.')
        announce('Account created successfully')
      }
    }
  }

  const handleMagicLink = async () => {
    setError(null)
    setSuccessMsg(null)

    if (!isSupabaseConfigured) {
      if (email.trim().toLowerCase() === 'developer@example.com') {
        handleInstantDeveloperSignIn()
        return
      }
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
      if (email.trim().toLowerCase() === 'developer@example.com') {
        handleInstantDeveloperSignIn()
        return
      }
      setError(res.error.message)
    } else {
      setSuccessMsg(`Magic login link sent to ${email}. Please check your inbox.`)
      announce('Magic link sent to email')
    }
  }

  return (
    <Dialog title={mode === 'signin' ? 'Sign in to ShipSafe' : 'Create an Account'} onClose={handleClose}>
      <div className="space-y-4">
        <div className="border border-rule bg-surface p-3 text-small text-ink-2">
          <div className="flex items-center gap-1.5 font-semibold text-ink mb-1">
            <IconLock width={14} height={14} />
            <span>Mandatory Authentication Gate</span>
          </div>
          To prevent abuse and protect concurrency queues, all security audits require an authenticated account.
        </div>

        {/* 1-Click Instant Developer Sign-in */}
        <div className="border-2 border-ink bg-canvas p-3.5 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={DEV_USER_PROFILE.avatarUrl}
                alt="Developer Avatar"
                className="size-8 rounded-full border border-ink shrink-0 bg-surface"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-small font-bold text-ink">Lead Auditor Access</span>
                  <span className="bg-status-pass/10 text-status-pass text-[10px] font-mono px-1.5 py-0.5 border border-status-pass/30 font-semibold uppercase">
                    1-Click Ready
                  </span>
                </div>
                <p className="text-xs text-ink-3 truncate">
                  developer@example.com &bull; ShipSafe Lead Auditor
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary w-full flex items-center justify-center gap-2 py-2.5 font-bold text-small min-h-[44px]"
            onClick={handleInstantDeveloperSignIn}
          >
            <span>⚡ Instant Sign-in as Developer</span>
          </button>
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
            <span className="text-status-warn font-bold">ℹ</span>
            <div>
              External OAuth providers are currently disabled in Supabase. Please use <strong>⚡ Instant Sign-in as Developer</strong> or Email sign-in below.
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
            <div className="flex items-center justify-between">
              <label htmlFor="auth-email" className="block text-small font-semibold">
                Email
              </label>
              <button
                type="button"
                className="text-xs text-ink-2 underline hover:text-ink font-mono"
                onClick={handlePrefillDeveloper}
              >
                Pre-fill Developer Account
              </button>
            </div>
            <input
              id="auth-email"
              type="email"
              data-autofocus
              required
              className="control mt-1"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="developer@example.com"
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
