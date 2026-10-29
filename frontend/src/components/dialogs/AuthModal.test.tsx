import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthModal } from './AuthModal'
import { useStore } from '../../state/store'
import * as clerkReact from '@clerk/clerk-react'

describe('AuthModal component (OAuth Only)', () => {
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
      } as unknown as NonNullable<ReturnType<typeof clerkReact.useSignIn>['signIn']>,
    } as unknown as ReturnType<typeof clerkReact.useSignIn>)
  })

  it('renders clean enterprise OAuth UI (GitHub & Google only) without email/password vulnerability risk', () => {
    render(<AuthModal />)

    expect(screen.getByText('Autentikasi Terverifikasi (OAuth Only)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Lanjutkan dengan GitHub/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Lanjutkan dengan Google/i })).toBeInTheDocument()

    // Strictly ensure email and password fields are completely removed
    expect(screen.queryByLabelText(/Email/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Password/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Send Magic Link/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/or continue with email/i)).not.toBeInTheDocument()
  })

  it('triggers Google OAuth via Clerk when Lanjutkan dengan Google is clicked', async () => {
    const user = userEvent.setup()
    render(<AuthModal />)

    const googleBtn = screen.getByRole('button', { name: /Lanjutkan dengan Google/i })
    await user.click(googleBtn)

    expect(authenticateWithRedirectMock).toHaveBeenCalledWith(
      expect.objectContaining({
        strategy: 'oauth_google',
        redirectUrl: expect.stringContaining('/sso-callback'),
      }),
    )
  })

  it('triggers GitHub OAuth via Clerk when Lanjutkan dengan GitHub is clicked', async () => {
    const user = userEvent.setup()
    render(<AuthModal />)

    const githubBtn = screen.getByRole('button', { name: /Lanjutkan dengan GitHub/i })
    await user.click(githubBtn)

    expect(authenticateWithRedirectMock).toHaveBeenCalledWith(
      expect.objectContaining({
        strategy: 'oauth_github',
        redirectUrl: expect.stringContaining('/sso-callback'),
      }),
    )
  })
})
