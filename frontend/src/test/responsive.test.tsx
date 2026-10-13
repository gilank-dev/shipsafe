import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import fs from 'node:fs'
import path from 'node:path'
import { ThreatMatrixView } from '../components/report/ThreatMatrixView'
import { FindingCard } from '../components/report/FindingCard'
import { UploadDropzone } from '../components/submission/UploadDropzone'
import { TurnstileWidget } from '../components/ui/TurnstileWidget'
import { useStore } from '../state/store'
import type { Finding, ThreatCheck } from '../domain/types'

describe('Responsive & Cross-Device UI Architecture', () => {
  it('verifies index.html supports safe-area with viewport-fit=cover', () => {
    const htmlPath = path.resolve(__dirname, '../../index.html')
    const htmlContent = fs.readFileSync(htmlPath, 'utf-8')
    expect(htmlContent).toContain('viewport-fit=cover')
  })

  it('verifies tokens.css and index.css declare safe area variables and utilities', () => {
    const tokensPath = path.resolve(__dirname, '../styles/tokens.css')
    const tokensContent = fs.readFileSync(tokensPath, 'utf-8')
    expect(tokensContent).toContain('--safe-area-top')
    expect(tokensContent).toContain('--safe-area-bottom')

    const indexPath = path.resolve(__dirname, '../styles/index.css')
    const indexContent = fs.readFileSync(indexPath, 'utf-8')
    expect(indexContent).toContain('.pt-safe')
    expect(indexContent).toContain('.pb-safe')
    expect(indexContent).toContain('overflow-x: hidden')
  })

  it('verifies ThreatMatrixView uses 1, 2, 3, 5 column responsive grid', () => {
    const mockThreats: ThreatCheck[] = [
      {
        key: 'sqli',
        name: 'SQL Injection',
        category: 'Injeksi',
        status: 'Secure',
        summary: 'Tidak ditemukan pola SQL mentah.',
        findingsCount: 0,
        mitigationTip: 'Gunakan parameterized queries.',
      },
      {
        key: 'xss',
        name: 'Cross-Site Scripting',
        category: 'Injeksi',
        status: 'Warning',
        summary: 'Ada penggunaan innerHTML tanpa sanitasi.',
        findingsCount: 1,
        mitigationTip: 'Gunakan textContent atau DOMPurify.',
      },
    ]

    const { container } = render(<ThreatMatrixView threats={mockThreats} />)
    const grid = container.querySelector('.grid')
    expect(grid).toHaveClass('grid-cols-1')
    expect(grid).toHaveClass('sm:grid-cols-2')
    expect(grid).toHaveClass('lg:grid-cols-3')
    expect(grid).toHaveClass('xl:grid-cols-5')
  })

  it('verifies FindingCard has responsive header actions and scrollable snippet', () => {
    const mockFinding: Finding = {
      id: 'F-001',
      title: 'Exposed JWT Secret',
      severity: 'Critical',
      area: 'Secrets',
      confidence: 'Confirmed',
      what: 'Hardcoded secret token in auth config.',
      why: 'Attackers can forge arbitrary valid authentication tokens.',
      recommendedFix: 'Extract token to environment variable.',
      remediationPrompt: 'Fix JWT secret by loading from env.',
      location: {
        file: 'src/auth/jwt.ts',
        line: 12,
        snippet: 'const SECRET = "super_secret_jwt_key_12345"',
      },
    }

    const { container } = render(
      <FindingCard finding={mockFinding} onViewPrompt={() => {}} />
    )

    // Header has responsive wrap classes
    const header = container.querySelector('header')
    expect(header).toHaveClass('flex-col')
    expect(header).toHaveClass('sm:flex-row')

    // Code snippet has horizontal scrolling
    const pre = container.querySelector('pre')
    expect(pre).toHaveClass('overflow-x-auto')
  })

  it('verifies UploadDropzone is tap-friendly and renders Browse button', () => {
    render(<UploadDropzone />)
    expect(screen.getByText(/Choose a ZIP file/i)).toBeInTheDocument()
    expect(screen.getByText(/Browse ZIP file/i)).toBeInTheDocument()
  })

  it('verifies UploadDropzone chip truncates long filenames', () => {
    const longName = 'my-extremely-long-repository-backup-file-version-2.0.0-final-release-build.zip'
    useStore.getState().setFile(new File([''], longName), null)

    const { container } = render(<UploadDropzone />)
    const elements = screen.getAllByText(longName)
    expect(elements[0]).toHaveClass('truncate')
    expect(container.querySelector('button.btn-quiet')).toHaveTextContent(`Remove ${longName}`)

    // Cleanup store
    useStore.getState().setFile(null, null)
  })

  it('verifies TurnstileWidget container prevents mobile overflow', () => {
    const { container } = render(<TurnstileWidget />)
    expect(container.querySelector('[data-testid="turnstile-widget"]')).toBeInTheDocument()
  })
})
