import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { UploadDropzone } from './UploadDropzone'
import { useStore } from '../../state/store'
import * as auditController from '../../state/audit-controller'

describe('UploadDropzone', () => {
  beforeEach(() => {
    useStore.setState({
      submission: {
        file: null,
        fileError: null,
        description: '',
        deployTarget: 'Not specified',
        handlesPII: false,
        handlesPayments: false,
        agentTarget: 'Generic',
        turnstileToken: null,
      },
      auth: {
        user: { id: 'usr-test-123', email: 'test@example.com' },
        isAuthModalOpen: false,
        isHistoryModalOpen: false,
      },
    })
    vi.restoreAllMocks()
  })

  it('renders mode tabs with Upload ZIP selected by default', () => {
    render(<UploadDropzone />)

    const uploadTab = screen.getByRole('tab', { name: /Upload ZIP/i })
    const repoTab = screen.getByRole('tab', { name: /Import GitHub Repo/i })

    expect(uploadTab).toBeInTheDocument()
    expect(repoTab).toBeInTheDocument()
    expect(uploadTab).toHaveAttribute('aria-selected', 'true')
    expect(repoTab).toHaveAttribute('aria-selected', 'false')

    // Dropzone prompt for ZIP is visible
    expect(screen.getByText(/Choose a ZIP file/i)).toBeInTheDocument()
  })

  it('switches between Upload ZIP and Import GitHub Repo modes', () => {
    render(<UploadDropzone />)

    const repoTab = screen.getByRole('tab', { name: /Import GitHub Repo/i })
    fireEvent.click(repoTab)

    expect(repoTab).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByLabelText(/GitHub Repository/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Import Repo/i })).toBeInTheDocument()

    const uploadTab = screen.getByRole('tab', { name: /Upload ZIP/i })
    fireEvent.click(uploadTab)

    expect(uploadTab).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText(/Choose a ZIP file/i)).toBeInTheDocument()
  })

  it('handles repo input and calls importGitHubRepo when Import Repo button is clicked', async () => {
    const importSpy = vi.spyOn(auditController, 'importGitHubRepo').mockResolvedValue(true)

    render(<UploadDropzone />)

    // Switch to GitHub mode
    fireEvent.click(screen.getByRole('tab', { name: /Import GitHub Repo/i }))

    const input = screen.getByLabelText(/GitHub Repository/i)
    fireEvent.change(input, { target: { value: 'gilank-dev/shipsafe' } })

    const importButton = screen.getByRole('button', { name: /Import Repo/i })
    expect(importButton).not.toBeDisabled()

    fireEvent.click(importButton)

    await waitFor(() => {
      expect(importSpy).toHaveBeenCalledWith('gilank-dev/shipsafe')
    })
  })

  it('triggers import when Enter key is pressed in the repo input field', async () => {
    const importSpy = vi.spyOn(auditController, 'importGitHubRepo').mockResolvedValue(true)

    render(<UploadDropzone />)

    fireEvent.click(screen.getByRole('tab', { name: /Import GitHub Repo/i }))

    const input = screen.getByLabelText(/GitHub Repository/i)
    fireEvent.change(input, { target: { value: 'facebook/react' } })
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })

    await waitFor(() => {
      expect(importSpy).toHaveBeenCalledWith('facebook/react')
    })
  })

  it('handles quick try button click', async () => {
    const importSpy = vi.spyOn(auditController, 'importGitHubRepo').mockResolvedValue(true)

    render(<UploadDropzone />)

    fireEvent.click(screen.getByRole('tab', { name: /Import GitHub Repo/i }))

    const quickTryBtn = screen.getByRole('button', { name: 'gilank-dev/shipsafe' })
    fireEvent.click(quickTryBtn)

    await waitFor(() => {
      expect(importSpy).toHaveBeenCalledWith('gilank-dev/shipsafe')
    })
  })

  it('shows error alert when importGitHubRepo fails', async () => {
    vi.spyOn(auditController, 'importGitHubRepo').mockRejectedValue(
      new Error('Repository not found or private.')
    )

    render(<UploadDropzone />)

    fireEvent.click(screen.getByRole('tab', { name: /Import GitHub Repo/i }))

    const input = screen.getByLabelText(/GitHub Repository/i)
    fireEvent.change(input, { target: { value: 'invalid/repo' } })

    const importButton = screen.getByRole('button', { name: /Import Repo/i })
    fireEvent.click(importButton)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText('Repository not found or private.')).toBeInTheDocument()
    })
  })

  it('displays selected file card and removes file when remove button is clicked', () => {
    const dummyFile = new File([new Uint8Array([0x50, 0x4b, 0x03, 0x04])], 'my-project.zip', {
      type: 'application/zip',
    })

    useStore.setState({
      submission: {
        ...useStore.getState().submission,
        file: dummyFile,
      },
    })

    render(<UploadDropzone />)

    expect(screen.getAllByText('my-project.zip').length).toBeGreaterThan(0)
    expect(screen.getByText(/Ready for audit/i)).toBeInTheDocument()

    const removeBtn = screen.getByRole('button', { name: /Remove/i })
    expect(removeBtn).toBeInTheDocument()

    fireEvent.click(removeBtn)

    expect(useStore.getState().submission.file).toBeNull()
  })

  it('triggers auth modal when unauthenticated user attempts to import repo', () => {
    useStore.setState({
      auth: {
        user: null,
        isAuthModalOpen: false,
        isHistoryModalOpen: false,
      },
    })

    render(<UploadDropzone />)

    fireEvent.click(screen.getByRole('tab', { name: /Import GitHub Repo/i }))
    const input = screen.getByLabelText(/GitHub Repository/i)
    fireEvent.change(input, { target: { value: 'gilank-dev/shipsafe' } })

    const importButton = screen.getByRole('button', { name: /Import Repo/i })
    fireEvent.click(importButton)

    expect(useStore.getState().auth.isAuthModalOpen).toBe(true)
  })
})
