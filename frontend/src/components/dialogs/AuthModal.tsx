import { useState, type FormEvent } from 'react'
import { isSupabaseConfigured, signInWithEmail, signUpWithEmail, signInWithOAuth, signInWithOtp } from '../../lib/supabase'
import { announce } from '../../state/announcer'
import { useStore } from '../../state/store'
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
      announce(`Redirecting to ${provider === 'google' ? 'Google' : 'GitHub'} authentication...`)
      const res = await signInWithOAuth(provider)
      if (res.error) {
        setError(res.error.message)
        setOauthLoading(null)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'OAuth sign in failed')
      setOauthLoading(null)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)

    if (!isSupabaseConfigured) {
      setError('Supabase is not configured yet in environment.')
      return
    }

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
      } else if (res.user) {
        setAuthUser({
          id: res.user.id,
          email: res.user.email ?? '',
          fullName:
            (typeof res.user.user_metadata?.full_name === 'string' && res.user.user_metadata.full_name) ||
            (typeof res.user.user_metadata?.name === 'string' && res.user.user_metadata.name) ||
            '',
          avatarUrl:
            (typeof res.user.user_metadata?.avatar_url === 'string' && res.user.user_metadata.avatar_url) ||
            (typeof res.user.user_metadata?.picture === 'string' && res.user.user_metadata.picture) ||
            '',
        })
        announce(`Signed in as ${res.user.email}`)
        handleClose()
      }
    } else {
      const res = await signUpWithEmail(email, password)
      setLoading(false)
      if (res.error) {
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
        <div className="border border-rule bg-surface p-3 text-small text-ink-2">
          <div className="flex items-center gap-1.5 font-semibold text-ink mb-1">
            <IconLock width={14} height={14} />
            <span>Mandatory Authentication Gate</span>
          </div>
          To prevent abuse and protect concurrency queues, all security audits require signing in with GitHub or Google.
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
