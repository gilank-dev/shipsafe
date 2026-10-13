import { useState, type FormEvent } from 'react'
import { isSupabaseConfigured, signInWithEmail, signUpWithEmail } from '../../lib/supabase'
import { announce } from '../../state/announcer'
import { useStore } from '../../state/store'
import { Dialog } from './Dialog'

export function AuthModal() {
  const isOpen = useStore((s) => s.auth.isAuthModalOpen)
  const setOpen = useStore((s) => s.setAuthModalOpen)
  const setAuthUser = useStore((s) => s.setAuthUser)

  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  if (!isOpen) return null

  const handleClose = () => {
    setError(null)
    setSuccessMsg(null)
    setOpen(false)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)

    if (!isSupabaseConfigured) {
      setError('Supabase is not configured yet. Audit requests will run in guest mode without persisting history.')
      return
    }

    if (!email || !password) {
      setError('Please provide both email and password.')
      return
    }

    setLoading(false)
    setLoading(true)

    if (mode === 'signin') {
      const res = await signInWithEmail(email, password)
      setLoading(false)
      if (res.error) {
        setError(res.error.message)
      } else if (res.user) {
        setAuthUser({ id: res.user.id, email: res.user.email ?? '' })
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

  return (
    <Dialog title={mode === 'signin' ? 'Sign in to ShipSafe' : 'Create an account'} onClose={handleClose}>
      <div className="space-y-4">
        {!isSupabaseConfigured && (
          <div className="border border-rule bg-surface p-3 text-small text-ink-2">
            <span className="font-semibold block text-ink">Guest mode active</span>
            Supabase credentials are not set in the environment. You can run audits without signing in. Audit reports remain in your browser session.
          </div>
        )}

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
            <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={loading}>
              {loading ? 'Please wait...' : mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </div>
        </form>

        <div className="border-t border-rule pt-3 text-right">
          <button type="button" className="btn w-full sm:w-auto" onClick={handleClose}>
            Continue as Guest
          </button>
        </div>
      </div>
    </Dialog>
  )
}
