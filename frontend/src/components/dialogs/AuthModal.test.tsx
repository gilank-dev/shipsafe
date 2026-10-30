import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AuthModal } from './AuthModal'
import { toast } from '../ui/Toast'

const signInWithOAuthMock = vi.fn().mockResolvedValue({
  data: { url: 'https://placeholder.supabase.co/oauth' },
  error: null,
})

const signInWithPasswordMock = vi.fn().mockResolvedValue({
  data: { session: { access_token: 'valid-jwt-token' } },
  error: null,
})

const signInWithOtpMock = vi.fn().mockResolvedValue({
  data: { user: null, session: null },
  error: null,
})

const signUpMock = vi.fn().mockResolvedValue({
  data: { session: { access_token: 'new-user-jwt' } },
  error: null,
})

const setAuthModalOpenMock = vi.fn()
const setAuthUserMock = vi.fn()

vi.mock('../../state/store', () => ({
  useStore: (selector?: (state: Record<string, unknown>) => unknown) => {
    const state = {
      auth: { isAuthModalOpen: true },
      setAuthModalOpen: setAuthModalOpenMock,
      setAuthUser: setAuthUserMock,
    }
    return selector ? selector(state) : state
  },
}))

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithOAuth: (...args: unknown[]) => signInWithOAuthMock(...args),
      signInWithPassword: (...args: unknown[]) => signInWithPasswordMock(...args),
      signInWithOtp: (...args: unknown[]) => signInWithOtpMock(...args),
      signUp: (...args: unknown[]) => signUpMock(...args),
    },
  },
  signInWithOAuth: (...args: unknown[]) => signInWithOAuthMock(...args),
}))

describe('AuthModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    signInWithOAuthMock.mockResolvedValue({
      data: { url: 'https://placeholder.supabase.co/oauth' },
      error: null,
    })
    signInWithPasswordMock.mockResolvedValue({
      data: { session: { access_token: 'valid-jwt-token' } },
      error: null,
    })
    signInWithOtpMock.mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    })
  })

  it('renders clean Supabase Auth UI and strictly NEVER displays any 1-Click Root Owner backdoor button', () => {
    render(<AuthModal />)

    expect(screen.getByText('ShipSafe Account Authentication')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /GitHub/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Google/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument()

    // Strictly ensure no 1-click backdoor or root owner button exists
    expect(screen.queryByText(/ROOT OWNER/i)).not.toBeInTheDocument()
    expect(screen.queryByTestId('root-owner-login-btn')).not.toBeInTheDocument()
  })

  it('triggers Google OAuth via Supabase when Continue with Google is clicked', async () => {
    render(<AuthModal />)

    const googleBtn = screen.getByRole('button', { name: /Google/i })
    fireEvent.click(googleBtn)

    await waitFor(() => {
      expect(signInWithOAuthMock).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'google',
          options: expect.objectContaining({
            redirectTo: expect.stringContaining('/'),
          }),
        }),
      )
    })
  })

  it('triggers GitHub OAuth via Supabase when Continue with GitHub is clicked', async () => {
    render(<AuthModal />)

    const githubBtn = screen.getByRole('button', { name: /GitHub/i })
    fireEvent.click(githubBtn)

    await waitFor(() => {
      expect(signInWithOAuthMock).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'github',
          options: expect.objectContaining({
            redirectTo: expect.stringContaining('/'),
          }),
        }),
      )
    })
  })

  it('truthfully displays error without faking login when Supabase OAuth fails', async () => {
    signInWithOAuthMock.mockRejectedValueOnce(
      new Error('Unsupported provider: provider is not enabled'),
    )

    render(<AuthModal />)

    const googleBtn = screen.getByRole('button', { name: /Google/i })
    fireEvent.click(googleBtn)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/not enabled in this Supabase project/i)
      // Strictly ensure setAuthUserMock is NOT called to fake login
      expect(setAuthUserMock).not.toHaveBeenCalled()
    })
  })

  it('authenticates with Supabase password when email form is submitted', async () => {
    const toastSpy = vi.spyOn(toast, 'success')
    render(<AuthModal />)

    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'gilankdev@gmail.com' },
    })
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: 'SecretPassword123!' },
    })

    const submitBtn = screen.getByRole('button', { name: /Sign In \/ Register/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(signInWithPasswordMock).toHaveBeenCalledWith({
        email: 'gilankdev@gmail.com',
        password: 'SecretPassword123!',
      })
      expect(toastSpy).toHaveBeenCalledWith('Authenticated as gilankdev@gmail.com')
      expect(setAuthModalOpenMock).toHaveBeenCalledWith(false)
    })
  })

  it('switches to magic link mode and dispatches OTP email', async () => {
    const toastSpy = vi.spyOn(toast, 'success')
    render(<AuthModal />)

    const switchBtn = screen.getByRole('button', { name: /Use Magic Link instead/i })
    fireEvent.click(switchBtn)

    expect(screen.queryByLabelText(/Password/i)).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'auditor@example.com' },
    })

    const sendBtn = screen.getByRole('button', { name: /Send Magic Link \/ OTP/i })
    fireEvent.click(sendBtn)

    await waitFor(() => {
      expect(signInWithOtpMock).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'auditor@example.com',
        }),
      )
      expect(toastSpy).toHaveBeenCalledWith('Magic link dispatched to auditor@example.com')
    })
  })
})
