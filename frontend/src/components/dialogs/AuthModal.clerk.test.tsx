import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthModal } from './AuthModal'
import { useStore } from '../../state/store'
import * as clerkReact from '@clerk/react'

describe('AuthModal Clerk OAuth integration', () => {
  const authenticateWithRedirectMock = vi.fn().mockResolvedValue({})

  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    useStore.setState({
      auth: {
        user: null,
        isAuthModalOpen: true,
        isHistoryModalOpen: false,
      },
    })

    vi.spyOn(clerkReact, 'useSignIn').mockReturnValue({
      isLoaded: true,
      signIn: {
        authenticateWithRedirect: authenticateWithRedirectMock,
      } as unknown as clerkReact.SignInResource,
    } as unknown as ReturnType<typeof clerkReact.useSignIn>)
  })

  it('triggers Clerk OAuth with oauth_google strategy when Continue with Google is clicked', async () => {
    const user = userEvent.setup()
    render(<AuthModal />)

    const googleBtn = screen.getByRole('button', { name: /Continue with Google/i })
    await user.click(googleBtn)

    expect(authenticateWithRedirectMock).toHaveBeenCalledWith(
      expect.objectContaining({
        strategy: 'oauth_google',
        redirectUrl: expect.stringContaining('/sso-callback'),
      }),
    )
  })

  it('triggers Clerk OAuth with oauth_github strategy when Continue with GitHub is clicked', async () => {
    const user = userEvent.setup()
    render(<AuthModal />)

    const githubBtn = screen.getByRole('button', { name: /Continue with GitHub/i })
    await user.click(githubBtn)

    expect(authenticateWithRedirectMock).toHaveBeenCalledWith(
      expect.objectContaining({
        strategy: 'oauth_github',
        redirectUrl: expect.stringContaining('/sso-callback'),
      }),
    )
  })
})
