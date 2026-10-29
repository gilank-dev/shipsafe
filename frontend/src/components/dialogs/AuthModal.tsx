import { useState } from 'react'
import { useClerk, useSignIn } from '@clerk/clerk-react'
import { Dialog } from './Dialog'
import { useStore } from '../../state/store'
import { IconGitHub, IconGoogle, IconLock } from '../ui/icons'
import { announce } from '../../state/announcer'

export function AuthModal() {
  const isOpen = useStore((s) => s.auth.isAuthModalOpen)
  const setAuthModalOpen = useStore((s) => s.setAuthModalOpen)

  const [oauthLoading, setOauthLoading] = useState<'github' | 'google' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const clerk = useClerk()
  const { signIn: clerkSignIn, isLoaded: isClerkLoaded } = useSignIn()

  if (!isOpen) return null

  const handleClose = () => {
    setError(null)
    setOauthLoading(null)
    setAuthModalOpen(false)
  }

  const handleOAuth = async (provider: 'github' | 'google') => {
    setError(null)
    setOauthLoading(provider)
    const providerName = provider === 'github' ? 'GitHub' : 'Google'
    announce(`Menghubungkan ke autentikasi ${providerName}...`)

    try {
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
          console.warn('[ShipSafe] Clerk OAuth redirect error, falling back to modal:', clerkErr)
        }
      }

      if (clerk?.openSignIn) {
        clerk.openSignIn()
        setOauthLoading(null)
        handleClose()
        return
      }

      setOauthLoading(null)
      setError(`Unable to connect to ${providerName} authentication service. Please try again.`)
    } catch {
      setOauthLoading(null)
      setError(`Failed to authenticate with ${providerName}.`)
    }
  }

  return (
    <Dialog title="ShipSafe Account Authentication" onClose={handleClose}>
      <div className="space-y-4">
        {/* Security Notice */}
        <div className="border border-rule bg-surface p-3.5 text-small text-ink-2 rounded-xs">
          <div className="flex items-center gap-1.5 font-semibold text-ink mb-1">
            <IconLock width={14} height={14} />
            <span>Verified Authentication (OAuth Only)</span>
          </div>
          Sign in or register securely using your GitHub or Google account. Your credentials are used strictly for accessing pre-deployment security audits and CLI terminal tokens.
        </div>

        {error && (
          <div role="alert" className="border border-status-fail bg-surface p-3 text-small text-status-fail font-medium rounded-xs">
            {error}
          </div>
        )}

        {/* Primary OAuth Action Buttons */}
        <div className="space-y-2.5 pt-2">
          <button
            type="button"
            className="btn btn-outline w-full flex items-center justify-center gap-2.5 py-3 font-semibold min-h-[46px] hover:border-ink cursor-pointer"
            disabled={oauthLoading !== null}
            onClick={() => handleOAuth('github')}
          >
            <IconGitHub width={20} height={20} />
            <span>{oauthLoading === 'github' ? 'Connecting to GitHub...' : 'Continue with GitHub'}</span>
          </button>

          <button
            type="button"
            className="btn btn-outline w-full flex items-center justify-center gap-2.5 py-3 font-semibold min-h-[46px] hover:border-ink cursor-pointer"
            disabled={oauthLoading !== null}
            onClick={() => handleOAuth('google')}
          >
            <IconGoogle width={20} height={20} />
            <span>{oauthLoading === 'google' ? 'Connecting to Google...' : 'Continue with Google'}</span>
          </button>

        </div>

        {/* Security Assurance Footer */}
        <div className="pt-2 text-center text-xs text-ink-3 leading-relaxed border-t border-rule font-mono">
          <span>Privacy Guaranteed: Zero Code Retention / OAuth Credentials Managed Securely</span>
        </div>
      </div>
    </Dialog>
  )
}
