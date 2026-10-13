import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthModal } from './AuthModal'
import { useStore } from '../../state/store'
import * as supabaseLib from '../../lib/supabase'

vi.mock('../../lib/supabase', async (importOriginal) => {
  const actual = await importOriginal<typeof supabaseLib>()
  return {
    ...actual,
    isSupabaseConfigured: true,
    signInWithOAuth: vi.fn(),
    signInWithEmail: vi.fn(),
    signUpWithEmail: vi.fn(),
    signInWithOtp: vi.fn(),
    isProviderEnabled: vi.fn().mockResolvedValue(false),
  }
})

describe('AuthModal component', () => {
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
  })

  it('renders authentication gate and 1-click Instant Developer sign-in option', () => {
    render(<AuthModal />)

    expect(screen.getByText('Mandatory Authentication Gate')).toBeInTheDocument()
    expect(screen.getByText('Lead Auditor Access')).toBeInTheDocument()
    expect(screen.getByText('⚡ Instant Sign-in as Developer')).toBeInTheDocument()
    expect(screen.getByText('Continue with GitHub')).toBeInTheDocument()
    expect(screen.getByText('Continue with Google')).toBeInTheDocument()
    expect(screen.getByText('Pre-fill Developer Account')).toBeInTheDocument()
  })

  it('signs in immediately when Instant Sign-in as Developer is clicked', async () => {
    const user = userEvent.setup()
    render(<AuthModal />)

    const devBtn = screen.getByRole('button', { name: /Instant Sign-in as Developer/i })
    await user.click(devBtn)

    await waitFor(() => {
      const state = useStore.getState()
      expect(state.auth.user).toEqual(
        expect.objectContaining({
          id: 'usr-dev-auditor',
          email: 'developer@example.com',
          fullName: 'ShipSafe Lead Auditor',
        }),
      )
      expect(state.auth.isAuthModalOpen).toBe(false)
      expect(window.localStorage.getItem('shipsafe.auth.token')).toBe('dev-token-developer@example.com')
    })
  })

  it('pre-fills developer credentials when Pre-fill Developer Account is clicked', async () => {
    const user = userEvent.setup()
    render(<AuthModal />)

    const prefillBtn = screen.getByText('Pre-fill Developer Account')
    await user.click(prefillBtn)

    const emailInput = screen.getByLabelText(/Email/i) as HTMLInputElement
    const passwordInput = screen.getByLabelText(/Password/i) as HTMLInputElement

    expect(emailInput.value).toBe('developer@example.com')
    expect(passwordInput.value).toBe('developer123')
  })

  it('gracefully informs user when OAuth providers are disabled in Supabase', async () => {
    const user = userEvent.setup()
    vi.mocked(supabaseLib.signInWithOAuth).mockResolvedValueOnce({
      data: null,
      error: new Error("OAuth provider 'GitHub' is not enabled in Supabase configuration."),
    })

    render(<AuthModal />)

    const githubBtn = screen.getByRole('button', { name: /Continue with GitHub/i })
    await user.click(githubBtn)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/not enabled in Supabase/i)
    })
  })

  it('supports seamless developer fallback when sign in with developer@example.com is submitted', async () => {
    const user = userEvent.setup()
    vi.mocked(supabaseLib.signInWithEmail).mockResolvedValueOnce({
      user: null,
      session: null,
      error: new Error('Invalid login credentials'),
    })

    render(<AuthModal />)

    const emailInput = screen.getByLabelText(/Email/i)
    const passwordInput = screen.getByLabelText(/Password/i)

    await user.type(emailInput, 'developer@example.com')
    await user.type(passwordInput, 'somepassword')

    const submitBtn = screen.getByRole('button', { name: /^Sign in$/i })
    await user.click(submitBtn)

    await waitFor(() => {
      const state = useStore.getState()
      expect(state.auth.user?.email).toBe('developer@example.com')
      expect(state.auth.isAuthModalOpen).toBe(false)
    })
  })
})
