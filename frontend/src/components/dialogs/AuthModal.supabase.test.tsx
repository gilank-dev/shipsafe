import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthModal } from './AuthModal'
import { useStore } from '../../state/store'
import { supabase } from '../../lib/supabase'

describe('AuthModal Supabase OAuth integration', () => {
  const signInWithOAuthMock = vi.fn().mockResolvedValue({
    data: { url: 'https://placeholder.supabase.co/oauth' },
    error: null,
  })

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

    vi.spyOn(supabase.auth, 'signInWithOAuth').mockImplementation(signInWithOAuthMock)
  })

  it('triggers Supabase OAuth with google provider when Continue with Google is clicked', async () => {
    const user = userEvent.setup()
    render(<AuthModal />)

    const googleBtn = screen.getByRole('button', { name: /Continue with Google/i })
    await user.click(googleBtn)

    expect(signInWithOAuthMock).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'google',
        options: expect.objectContaining({
          redirectTo: expect.stringContaining('/'),
        }),
      }),
    )
  })

  it('triggers Supabase OAuth with github provider when Continue with GitHub is clicked', async () => {
    const user = userEvent.setup()
    render(<AuthModal />)

    const githubBtn = screen.getByRole('button', { name: /Continue with GitHub/i })
    await user.click(githubBtn)

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
