import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthModal } from './AuthModal'
import { useStore } from '../../state/store'
import * as supabaseLib from '../../lib/supabase'
import * as clerkReact from '@clerk/react'

vi.mock('../../lib/supabase', async (importOriginal) => {
  const actual = await importOriginal<typeof supabaseLib>()
  return {
    ...actual,
    isSupabaseConfigured: true,
    signInWithOAuth: vi.fn(),
    signInWithEmail: vi.fn(),
    signUpWithEmail: vi.fn(),
    signInWithOtp: vi.fn(),
    isProviderEnabled: vi.fn().mockResolvedValue(true),
  }
})

describe('AuthModal component', () => {
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

  it('renders clean production enterprise UI without developer shortcut cards', () => {
    render(<AuthModal />)

    expect(screen.getByText('Authentication Required')).toBeInTheDocument()
    expect(
      screen.getByText('Sign in to your account to run pre-deployment security audits and manage reports.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Continue with GitHub/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Continue with Google/i })).toBeInTheDocument()
    expect(screen.getByText(/or continue with email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Sign in$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Send Magic Link/i })).toBeInTheDocument()

    // Ensure developer shortcut cards are completely removed
    expect(screen.queryByText('Lead Auditor Access')).not.toBeInTheDocument()
    expect(screen.queryByText('1-Click Ready')).not.toBeInTheDocument()
    expect(screen.queryByText(/⚡ Instant Sign-in as Developer/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Pre-fill Developer Account/i)).not.toBeInTheDocument()
  })

  it('triggers Google OAuth via Clerk when Continue with Google is clicked', async () => {
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

  it('triggers GitHub OAuth via Clerk when Continue with GitHub is clicked', async () => {
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

  it('signs in with email and password successfully', async () => {
    const user = userEvent.setup()
    vi.mocked(supabaseLib.signInWithEmail).mockResolvedValueOnce({
      user: {
        id: 'usr-auditor-123',
        email: 'auditor@enterprise.com',
        user_metadata: { full_name: 'Lead Security Auditor' },
      } as any,
      session: { access_token: 'valid-jwt-token' } as any,
      error: null,
    })

    render(<AuthModal />)

    const emailInput = screen.getByLabelText(/Email/i)
    const passwordInput = screen.getByLabelText(/Password/i)
    const submitBtn = screen.getByRole('button', { name: /^Sign in$/i })

    await user.type(emailInput, 'auditor@enterprise.com')
    await user.type(passwordInput, 'SecOps2026!')
    await user.click(submitBtn)

    await waitFor(() => {
      const state = useStore.getState()
      expect(state.auth.user).toEqual(
        expect.objectContaining({
          id: 'usr-auditor-123',
          email: 'auditor@enterprise.com',
          fullName: 'Lead Security Auditor',
        }),
      )
      expect(state.auth.isAuthModalOpen).toBe(false)
    })
  })

  it('toggles to sign up mode and sends registration', async () => {
    const user = userEvent.setup()
    vi.mocked(supabaseLib.signUpWithEmail).mockResolvedValueOnce({
      user: { id: 'usr-new-123', email: 'new@enterprise.com', user_metadata: {} } as any,
      session: { access_token: 'new-jwt-token' } as any,
      error: null,
    })

    render(<AuthModal />)

    const toggleBtn = screen.getByRole('button', { name: /Don't have an account\? Sign up/i })
    await user.click(toggleBtn)

    expect(screen.getByRole('heading', { name: /Create an Account/i })).toBeInTheDocument()
    const submitBtn = screen.getByRole('button', { name: /Create account/i })

    const emailInput = screen.getByLabelText(/Email/i)
    const passwordInput = screen.getByLabelText(/Password/i)
    await user.type(emailInput, 'new@enterprise.com')
    await user.type(passwordInput, 'SecOps2026!')
    await user.click(submitBtn)

    await waitFor(() => {
      const state = useStore.getState()
      expect(state.auth.user?.email).toBe('new@enterprise.com')
      expect(state.auth.isAuthModalOpen).toBe(false)
    })
  })

  it('requests magic link with entered email', async () => {
    const user = userEvent.setup()
    vi.mocked(supabaseLib.signInWithOtp).mockResolvedValueOnce({
      error: null,
    })

    render(<AuthModal />)

    const emailInput = screen.getByLabelText(/Email/i)
    await user.type(emailInput, 'magic@enterprise.com')

    const magicBtn = screen.getByRole('button', { name: /Send Magic Link/i })
    await user.click(magicBtn)

    await waitFor(() => {
      expect(supabaseLib.signInWithOtp).toHaveBeenCalledWith('magic@enterprise.com')
      expect(screen.getByRole('status')).toHaveTextContent(/Magic login link sent to magic@enterprise.com/i)
    })
  })
})
