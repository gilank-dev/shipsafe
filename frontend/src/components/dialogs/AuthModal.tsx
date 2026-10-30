import { useState } from 'react'
import { Dialog } from './Dialog'
import { useStore } from '../../state/store'
import { supabase } from '../../lib/supabase'
import { IconGitHub, IconGoogle, IconLock } from '../ui/icons'
import { announce } from '../../state/announcer'
import { toast } from '../ui/Toast'

export function AuthModal() {
  const isOpen = useStore((s) => s.auth.isAuthModalOpen)
  const setAuthModalOpen = useStore((s) => s.setAuthModalOpen)

  const [oauthLoading, setOauthLoading] = useState<'github' | 'google' | null>(null)
  const [emailLoading, setEmailLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [useMagicLink, setUseMagicLink] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  if (!isOpen) return null

  const handleClose = () => {
    setError(null)
    setNotice(null)
    setOauthLoading(null)
    setEmailLoading(false)
    setAuthModalOpen(false)
  }

  const handleOAuth = async (provider: 'github' | 'google') => {
    setError(null)
    setNotice(null)
    setOauthLoading(provider)
    const providerName = provider === 'github' ? 'GitHub' : 'Google'
    announce(`Connecting to ${providerName} authentication...`)

    try {
      const { data, error: sbError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      })

      if (sbError) {
        throw sbError
      }

      if (data?.url) {
        try {
          window.location.href = data.url
        } catch {
          // jsdom testing fallback
        }
        return
      }
    } catch (err: unknown) {
      console.warn(`[ShipSafe] Supabase ${providerName} OAuth error:`, err)
      const msg = err instanceof Error ? err.message : String(err)
      if (
        msg.toLowerCase().includes('not enabled') ||
        msg.toLowerCase().includes('unsupported provider')
      ) {
        setError(
          `${providerName} OAuth is not enabled in this Supabase project (okbryysoxihmamujoipb). Please enable ${providerName} in Supabase Dashboard (Authentication > Providers), or sign in with Email below.`
        )
      } else {
        setError(`Unable to connect to ${providerName} authentication: ${msg}`)
      }
      setOauthLoading(null)
    }
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setNotice(null)

    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail) {
      setError('Please provide a valid email address.')
      return
    }

    setEmailLoading(true)

    try {
      if (useMagicLink) {
        announce('Sending Supabase Magic Link...')
        const { error: otpErr } = await supabase.auth.signInWithOtp({
          email: cleanEmail,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        })
        if (otpErr) throw otpErr
        setNotice(`Magic login link dispatched to ${cleanEmail}. Check your inbox to sign in.`)
        toast.success(`Magic link dispatched to ${cleanEmail}`)
      } else {
        if (!password) {
          setError('Please enter your password.')
          setEmailLoading(false)
          return
        }
        announce('Authenticating with Supabase...')
        const { data: siData, error: siErr } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        })

        if (siErr) {
          // If user not registered yet, auto-attempt registration
          if (
            siErr.message.toLowerCase().includes('invalid login credentials') ||
            siErr.message.toLowerCase().includes('user not found')
          ) {
            const { data: suData, error: suErr } = await supabase.auth.signUp({
              email: cleanEmail,
              password,
            })
            if (!suErr && suData.session) {
              toast.success(`Registered and authenticated as ${cleanEmail}`)
              handleClose()
              return
            }
          }
          throw siErr
        }

        if (siData?.session) {
          toast.success(`Authenticated as ${cleanEmail}`)
          handleClose()
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed.'
      setError(msg)
    } finally {
      setEmailLoading(false)
    }
  }

  return (
    <Dialog title="ShipSafe Account Authentication" onClose={handleClose}>
      <div className="space-y-4">
        {/* Security Notice */}
        <div className="border border-rule bg-surface p-3 text-small text-ink-2 rounded-xs">
          <div className="flex items-center gap-1.5 font-semibold text-ink mb-1">
            <IconLock width={14} height={14} />
            <span>Supabase Verified Authentication</span>
          </div>
          Sign in securely using your OAuth account or email credentials. Only verified super administrator accounts have clearance for administrative systems.
        </div>

        {error && (
          <div
            role="alert"
            className="border border-status-fail bg-surface p-3 text-small text-status-fail font-medium rounded-xs leading-relaxed"
          >
            {error}
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="border border-status-pass bg-surface p-3 text-small text-status-pass font-medium rounded-xs leading-relaxed"
          >
            {notice}
          </div>
        )}

        {/* Primary OAuth Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            className="btn btn-outline w-full flex items-center justify-center gap-2.5 py-2.5 font-semibold min-h-[44px] hover:border-ink cursor-pointer text-xs"
            disabled={oauthLoading !== null || emailLoading}
            onClick={() => void handleOAuth('github')}
          >
            <IconGitHub width={18} height={18} />
            <span>{oauthLoading === 'github' ? 'Connecting to GitHub...' : 'Continue with GitHub'}</span>
          </button>

          <button
            type="button"
            className="btn btn-outline w-full flex items-center justify-center gap-2.5 py-2.5 font-semibold min-h-[44px] hover:border-ink cursor-pointer text-xs"
            disabled={oauthLoading !== null || emailLoading}
            onClick={() => void handleOAuth('google')}
          >
            <IconGoogle width={18} height={18} />
            <span>{oauthLoading === 'google' ? 'Connecting to Google...' : 'Continue with Google'}</span>
          </button>
        </div>

        {/* Divider */}
        <div className="relative flex items-center justify-center py-1">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-rule" />
          </div>
          <div className="relative bg-surface px-2 text-[10px] uppercase font-mono tracking-wider text-ink-3">
            or continue with email
          </div>
        </div>

        {/* Real Supabase Email Authentication Form */}
        <form onSubmit={handleEmailAuth} className="space-y-3">
          <div>
            <label htmlFor="auth-email-input" className="block text-xs font-mono font-medium text-ink-2 mb-1">
              Email Address
            </label>
            <input
              id="auth-email-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              required
              autoComplete="email"
              className="w-full border border-rule bg-canvas px-3 py-2 text-xs font-mono text-ink focus:border-ink focus:outline-hidden"
              disabled={emailLoading || oauthLoading !== null}
            />
          </div>

          {!useMagicLink && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="auth-password-input" className="block text-xs font-mono font-medium text-ink-2">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setUseMagicLink(true)}
                  className="text-[11px] font-mono text-ink-3 hover:text-ink underline cursor-pointer"
                >
                  Use Magic Link instead
                </button>
              </div>
              <input
                id="auth-password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password (min. 6 characters)"
                autoComplete="current-password"
                className="w-full border border-rule bg-canvas px-3 py-2 text-xs font-mono text-ink focus:border-ink focus:outline-hidden"
                disabled={emailLoading || oauthLoading !== null}
              />
            </div>
          )}

          {useMagicLink && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setUseMagicLink(false)}
                className="text-[11px] font-mono text-ink-3 hover:text-ink underline cursor-pointer"
              >
                Use Password instead
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={emailLoading || oauthLoading !== null}
            className="w-full py-2.5 px-4 bg-ink hover:bg-ink-2 text-canvas text-xs font-mono font-semibold transition-colors cursor-pointer border border-ink disabled:opacity-50"
          >
            {emailLoading
              ? 'Authenticating with Supabase...'
              : useMagicLink
                ? 'Send Magic Link / OTP'
                : 'Sign In / Register with Supabase'}
          </button>
        </form>

        {/* Security Assurance Footer */}
        <div className="pt-2 text-center text-[11px] text-ink-3 leading-relaxed border-t border-rule font-mono">
          <span>Supabase Auth &bull; Zero Code Retention &bull; Strict Role Isolation</span>
        </div>
      </div>
    </Dialog>
  )
}
