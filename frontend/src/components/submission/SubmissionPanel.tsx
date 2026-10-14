import { useState } from 'react'
import { useSignIn, useClerk } from '@clerk/react'
import { AgentSelector } from './AgentSelector'
import { ContextForm } from './ContextForm'
import { RunAuditButton } from './RunAuditButton'
import { UploadDropzone } from './UploadDropzone'
import { TurnstileWidget } from '../ui/TurnstileWidget'
import { useStore } from '../../state/store'
import { IconLock, IconGitHub, IconGoogle } from '../ui/icons'

export function SubmissionPanel() {
  const user = useStore((s) => s.auth.user)
  const setAuthModalOpen = useStore((s) => s.setAuthModalOpen)
  const { isLoaded: isSignInLoaded, signIn } = useSignIn()
  const clerk = useClerk()
  const [oauthLoading, setOauthLoading] = useState<'google' | 'github' | null>(null)

  const handleOAuth = async (provider: 'google' | 'github') => {
    setOauthLoading(provider)
    const strategy = provider === 'google' ? 'oauth_google' : 'oauth_github'

    if (isSignInLoaded && signIn) {
      try {
        await signIn.authenticateWithRedirect({
          strategy,
          redirectUrl: `${window.location.origin}/sso-callback`,
          redirectUrlComplete: window.location.origin,
        })
        return
      } catch (err) {
        console.error(`[ShipSafe] Clerk ${provider} OAuth error:`, err)
      }
    }

    if (clerk?.openSignIn) {
      clerk.openSignIn()
    } else {
      setAuthModalOpen(true)
    }
    setOauthLoading(null)
  }

  return (
    <>
      {!user && (
        <div className="mb-6 border-2 border-ink bg-surface p-4 rounded-[var(--radius-control)]">
          <div className="flex items-center gap-2 mb-1.5 text-small font-bold text-ink">
            <IconLock width={16} height={16} />
            <span>Sign In Required</span>
          </div>
          <p className="text-small text-ink-2 mb-3.5 leading-relaxed">
            All code audits require verified sign in with GitHub or Google to prevent abuse and protect queue capacity.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              className="btn btn-outline flex items-center justify-center gap-2 py-2 text-small font-semibold hover:border-ink cursor-pointer"
              disabled={oauthLoading !== null}
              onClick={() => void handleOAuth('github')}
            >
              <IconGitHub width={16} height={16} />
              <span>{oauthLoading === 'github' ? 'Connecting to GitHub...' : 'Sign in with GitHub'}</span>
            </button>
            <button
              type="button"
              className="btn btn-outline flex items-center justify-center gap-2 py-2 text-small font-semibold hover:border-ink cursor-pointer"
              disabled={oauthLoading !== null}
              onClick={() => void handleOAuth('google')}
            >
              <IconGoogle width={16} height={16} />
              <span>{oauthLoading === 'google' ? 'Connecting to Google...' : 'Sign in with Google'}</span>
            </button>
          </div>
          <button
            type="button"
            className="mt-2.5 text-xs text-ink-3 hover:text-ink underline block cursor-pointer"
            onClick={() => setAuthModalOpen(true)}
          >
            Or sign in with email credentials
          </button>
        </div>
      )}

      <UploadDropzone />
      <ContextForm />
      <AgentSelector />
      <TurnstileWidget className="mt-6" />
      <RunAuditButton />
    </>
  )
}
