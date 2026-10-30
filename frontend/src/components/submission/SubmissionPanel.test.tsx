import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SubmissionPanel } from './SubmissionPanel'
import { useStore } from '../../state/store'
import { supabase } from '../../lib/supabase'

describe('SubmissionPanel Supabase OAuth integration', () => {
  const signInWithOAuthMock = vi.fn().mockResolvedValue({
    data: { url: 'https://placeholder.supabase.co/oauth' },
    error: null,
  })

  beforeEach(() => {
    vi.clearAllMocks()
    useStore.setState({
      auth: {
        user: null,
        isAuthModalOpen: false,
        isHistoryModalOpen: false,
      },
    })

    vi.spyOn(supabase.auth, 'signInWithOAuth').mockImplementation(signInWithOAuthMock)
  })

  it('triggers Supabase OAuth for Google when Sign in with Google is clicked', async () => {
    const user = userEvent.setup()
    render(<SubmissionPanel />)

    const googleBtn = screen.getByRole('button', { name: /Sign in with Google/i })
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

  it('triggers Supabase OAuth for GitHub when Sign in with GitHub is clicked', async () => {
    const user = userEvent.setup()
    render(<SubmissionPanel />)

    const githubBtn = screen.getByRole('button', { name: /Sign in with GitHub/i })
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
