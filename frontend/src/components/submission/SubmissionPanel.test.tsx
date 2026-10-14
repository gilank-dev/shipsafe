import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SubmissionPanel } from './SubmissionPanel'
import { useStore } from '../../state/store'
import * as clerkReact from '@clerk/clerk-react'

describe('SubmissionPanel Clerk OAuth integration', () => {
  const authenticateWithRedirectMock = vi.fn().mockResolvedValue({})

  beforeEach(() => {
    vi.clearAllMocks()
    useStore.setState({
      auth: {
        user: null,
        isAuthModalOpen: false,
        isHistoryModalOpen: false,
      },
    })

    vi.spyOn(clerkReact, 'useSignIn').mockReturnValue({
      isLoaded: true,
      signIn: {
        authenticateWithRedirect: authenticateWithRedirectMock,
      } as unknown as NonNullable<ReturnType<typeof clerkReact.useSignIn>['signIn']>,
    } as unknown as ReturnType<typeof clerkReact.useSignIn>)
  })

  it('triggers Clerk OAuth for Google when Sign in with Google is clicked', async () => {
    const user = userEvent.setup()
    render(<SubmissionPanel />)

    const googleBtn = screen.getByRole('button', { name: /Sign in with Google/i })
    await user.click(googleBtn)

    expect(authenticateWithRedirectMock).toHaveBeenCalledWith(
      expect.objectContaining({
        strategy: 'oauth_google',
        redirectUrl: expect.stringContaining('/sso-callback'),
      }),
    )
  })

  it('triggers Clerk OAuth for GitHub when Sign in with GitHub is clicked', async () => {
    const user = userEvent.setup()
    render(<SubmissionPanel />)

    const githubBtn = screen.getByRole('button', { name: /Sign in with GitHub/i })
    await user.click(githubBtn)

    expect(authenticateWithRedirectMock).toHaveBeenCalledWith(
      expect.objectContaining({
        strategy: 'oauth_github',
        redirectUrl: expect.stringContaining('/sso-callback'),
      }),
    )
  })
})
