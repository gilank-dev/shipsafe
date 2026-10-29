import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DiffVerifierView } from './DiffVerifierView'
import type { AuditReport } from '../../domain/types'

describe('DiffVerifierView Component', () => {
  const mockReport: AuditReport = {
    id: 'report-current',
    summary: 'Current report',
    countsBySeverity: { Critical: 0, High: 1, Medium: 0, Low: 0, Info: 0 },
    scorecard: [
      { area: 'Code', score: 8.0, status: 'Pass', topConcern: 'None' }
    ],
    threatMatrix: [],
    findings: [
      {
        id: 'F-001',
        title: 'Missing Rate Limiter on API Endpoint',
        severity: 'High',
        area: 'HTTP',
        threatCategory: 'ddos',
        location: { file: 'src/server.ts', line: 20 },
        what: 'No rate limiting middleware',
        why: 'Allows DDoS exhaustion',
        recommendedFix: 'Add express-rate-limit',
        remediationPrompt: 'Fix prompt'
      }
    ],
    secretsToRotate: [],
    notAssessed: [],
    skippedFiles: []
  }

  it('renders initial empty baseline state with trigger button', () => {
    render(<DiffVerifierView currentReport={mockReport} />)

    expect(screen.getByText(/Re-Audit Diff & Fix Verification/i)).toBeInTheDocument()
    expect(screen.getByText(/No Baseline Audit Linked for Comparison/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Compare with Baseline/i })).toBeInTheDocument()
  })

  it('calculates and renders diff when Compare with Baseline is clicked', () => {
    render(<DiffVerifierView currentReport={mockReport} />)

    const compareBtn = screen.getByRole('button', { name: /Compare with Baseline/i })
    fireEvent.click(compareBtn)

    expect(screen.getByText(/Posture Delta/i)).toBeInTheDocument()
    expect(screen.getByText(/Resolved Issues/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Export Certificate/i })).toBeInTheDocument()
  })
})
