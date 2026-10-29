import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AuthModal } from './AuthModal'

const authenticateWithRedirectMock = vi.fn().mockResolvedValue(undefined)

vi.mock('@clerk/clerk-react', () => ({
  useSignIn: () => ({
    signIn: {
      authenticateWithRedirect: authenticateWithRedirectMock,
    },
    isLoaded: true,
  }),
  useClerk: () => ({
    signOut: vi.fn(),
  }),
  useUser: () => ({
    user: null,
  }),
}))

vi.mock('../../state/store', () => ({
  useStore: (selector?: (state: any) => any) => {
    const state = {
      auth: { isAuthModalOpen: true },
      setAuthModalOpen: vi.fn(),
    }
    return selector ? selector(state) : state
  },
}))

describe('AuthModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders clean enterprise OAuth UI (GitHub & Google only) without email/password vulnerability risk', () => {
    render(<AuthModal />)

    expect(screen.getByText('ShipSafe Account Authentication')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /GitHub/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Google/i })).toBeInTheDocument()

    // Strictly ensure email and password fields are completely removed
    expect(screen.queryByLabelText(/Email/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Password/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Send Magic Link/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/or continue with email/i)).not.toBeInTheDocument()
  })

  it('triggers Google OAuth via Clerk when Lanjutkan dengan Google is clicked', async () => {
    render(<AuthModal />)

    const googleBtn = screen.getByRole('button', { name: /Google/i })
    fireEvent.click(googleBtn)

    expect(authenticateWithRedirectMock).toHaveBeenCalledWith(
      expect.objectContaining({
        strategy: 'oauth_google',
        redirectUrl: expect.stringContaining('/sso-callback'),
      }),
    )
  })

  it('triggers GitHub OAuth via Clerk when Lanjutkan dengan GitHub is clicked', async () => {
    render(<AuthModal />)

    const githubBtn = screen.getByRole('button', { name: /GitHub/i })
    fireEvent.click(githubBtn)

    expect(authenticateWithRedirectMock).toHaveBeenCalledWith(
      expect.objectContaining({
        strategy: 'oauth_github',
        redirectUrl: expect.stringContaining('/sso-callback'),
      }),
    )
  })
})
