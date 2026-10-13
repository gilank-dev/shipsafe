import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UploadDropzone } from '../components/submission/UploadDropzone'
import { useStore } from '../state/store'
import * as controller from '../state/audit-controller'

describe('UploadDropzone - GitHub Repo Import', () => {
  beforeEach(() => {
    useStore.getState().setFile(null, null)
    vi.restoreAllMocks()
  })

  it('renders mode switch tabs and defaults to Upload ZIP', () => {
    render(<UploadDropzone />)
    expect(screen.getByRole('tab', { name: /upload zip/i })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: /import github repo/i })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByText(/Choose a ZIP file/i)).toBeInTheDocument()
  })

  it('switches to GitHub Repo mode when tab is clicked', () => {
    render(<UploadDropzone />)
    const repoTab = screen.getByRole('tab', { name: /import github repo/i })
    fireEvent.click(repoTab)

    expect(repoTab).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByPlaceholderText(/e\.g\. gilank-dev\/shipsafe/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /import repo/i })).toBeInTheDocument()
    expect(screen.getByText(/gilank-dev\/shipsafe/i)).toBeInTheDocument()
  })

  it('invokes importGitHubRepo when Import Repo button is clicked', async () => {
    const importSpy = vi.spyOn(controller, 'importGitHubRepo').mockImplementation(async () => {
      useStore.getState().setFile(new File([''], 'gilank-dev-shipsafe.zip'), null)
      return true
    })

    render(<UploadDropzone />)
    fireEvent.click(screen.getByRole('tab', { name: /import github repo/i }))

    const input = screen.getByPlaceholderText(/e\.g\. gilank-dev\/shipsafe/i)
    fireEvent.change(input, { target: { value: 'gilank-dev/shipsafe' } })

    const button = screen.getByRole('button', { name: /import repo/i })
    fireEvent.click(button)

    await waitFor(() => {
      expect(importSpy).toHaveBeenCalledWith('gilank-dev/shipsafe')
    })

    // After successful import, file should be selected and displayed
    expect(screen.getAllByText('gilank-dev-shipsafe.zip').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Ready/i).length).toBeGreaterThan(0)
  })

  it('displays quick-try button and populates input', async () => {
    const importSpy = vi.spyOn(controller, 'importGitHubRepo').mockImplementation(async () => {
      useStore.getState().setFile(new File([''], 'expressjs-express.zip'), null)
      return true
    })

    render(<UploadDropzone />)
    fireEvent.click(screen.getByRole('tab', { name: /import github repo/i }))

    const quickTryBtn = screen.getByRole('button', { name: 'expressjs/express' })
    fireEvent.click(quickTryBtn)

    await waitFor(() => {
      expect(importSpy).toHaveBeenCalledWith('expressjs/express')
    })
  })

  it('displays error message when import fails', async () => {
    vi.spyOn(controller, 'importGitHubRepo').mockResolvedValue(false)

    render(<UploadDropzone />)
    fireEvent.click(screen.getByRole('tab', { name: /import github repo/i }))

    const input = screen.getByPlaceholderText(/e\.g\. gilank-dev\/shipsafe/i)
    fireEvent.change(input, { target: { value: 'invalid/nonexistent-repo' } })

    const button = screen.getByRole('button', { name: /import repo/i })
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/failed to import repository/i)
    })
  })
})
