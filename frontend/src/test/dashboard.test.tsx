import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ReportView } from '../components/report/ReportView'
import { FindingList } from '../components/report/FindingList'
import { ThreatMatrixView } from '../components/report/ThreatMatrixView'
import { RiskScorecard } from '../components/report/RiskScorecard'
import { useStore } from '../state/store'
import type { AuditReport, Finding, ThreatCheck } from '../domain/types'

const mockFindings: Finding[] = [
  {
    id: 'F-001',
    title: 'Hardcoded Stripe Live Secret Key',
    severity: 'Critical',
    area: 'Secrets',
    what: 'A production Stripe API key is committed directly in repository config.',
    why: 'Attackers can perform unauthorized financial charges and drain accounts.',
    recommendedFix: 'Revoke and rotate the key immediately. Store secret in environment variables.',
    remediationPrompt: 'Remove sk_live key from config and load via process.env.STRIPE_SECRET_KEY.',
    location: {
      file: 'src/config/stripe.ts',
      line: 8,
      snippet: 'export const STRIPE_KEY = "sk_live_1234567890abcdef"',
    },
  },
  {
    id: 'F-002',
    title: 'Missing Content-Security-Policy Header',
    severity: 'Medium',
    area: 'HTTP',
    what: 'HTTP response headers do not restrict script source execution.',
    why: 'Exposes users to reflected or stored Cross-Site Scripting injections.',
    recommendedFix: 'Add helmet or configure strict Content-Security-Policy headers.',
    remediationPrompt: 'Configure Content-Security-Policy header using helmet middleware.',
    location: {
      file: 'src/server.ts',
      line: 24,
    },
  },
]

const mockThreats: ThreatCheck[] = [
  {
    key: 'sqli',
    name: 'SQL Injection',
    category: 'Injeksi',
    status: 'Secure',
    summary: 'No raw SQL queries detected.',
    findingsCount: 0,
    mitigationTip: 'Use parameterized queries.',
  },
  {
    key: 'xss',
    name: 'Cross-Site Scripting',
    category: 'Injeksi',
    status: 'Vulnerable',
    summary: 'Raw HTML string injection found.',
    findingsCount: 1,
    mitigationTip: 'Sanitize input with DOMPurify.',
  },
]

const mockReport: AuditReport = {
  id: 'audit-test-123',
  summary: 'Codebase security scan completed with 1 critical secret exposure and 1 medium HTTP header issue.',
  countsBySeverity: {
    Critical: 1,
    High: 0,
    Medium: 1,
    Low: 0,
    Info: 0,
  },
  scorecard: [
    { area: 'Secrets', score: 2.0, status: 'Fail', topConcern: 'Exposed live Stripe key' },
    { area: 'HTTP', score: 6.0, status: 'Partial', topConcern: 'Missing CSP headers' },
    { area: 'Code', score: 9.0, status: 'Pass', topConcern: 'Clean static logic' },
    { area: 'Dependencies', score: 8.0, status: 'Pass', topConcern: 'No vulnerable packages' },
  ],
  threatMatrix: mockThreats,
  findings: mockFindings,
  secretsToRotate: ['sk_live_****'],
  notAssessed: ['Cloud infrastructure runtime', 'Third-party API SLAs'],
  skippedFiles: ['dist/bundle.js'],
}

describe('Compact Dashboard & Tabbed Report Navigation', () => {
  it('renders top posture KPI bar and tabbed navigation in ReportView', () => {
    useStore.getState().patchAudit({
      status: 'done',
      report: mockReport,
    })

    render(<ReportView />)

    // Verify Posture score is displayed
    expect(screen.getByText('Security Posture')).toBeInTheDocument()
    // Average score: (2 + 6 + 9 + 8) / 4 = 6.25 -> 6.3
    expect(screen.getByText('6.3')).toBeInTheDocument()
    expect(screen.getByText('● Action Required')).toBeInTheDocument()

    // Verify tabs are present
    expect(screen.getByRole('tab', { name: /Overview/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Findings/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Threat Matrix/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Secrets & Scope/i })).toBeInTheDocument()

    // Overview is active by default
    expect(screen.getByRole('tab', { name: /Overview/i })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText(/Executive Summary/i)).toBeInTheDocument()
    expect(screen.getByRole('region', { name: /Risk Scorecard/i })).toBeInTheDocument()
  })

  it('switches between dashboard tabs smoothly', () => {
    useStore.getState().patchAudit({
      status: 'done',
      report: mockReport,
    })

    render(<ReportView />)

    // Click on Findings tab
    fireEvent.click(screen.getByRole('tab', { name: /Findings/i }))
    expect(screen.getByRole('tab', { name: /Findings/i })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText(/Findings \(2 of 2\)/i)).toBeInTheDocument()

    // Click on Threat Matrix tab
    fireEvent.click(screen.getByRole('tab', { name: /Threat Matrix/i }))
    expect(screen.getByRole('tab', { name: /Threat Matrix/i })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText(/10-Threat Security Vector Matrix/i)).toBeInTheDocument()

    // Click on Secrets & Scope tab
    fireEvent.click(screen.getByRole('tab', { name: /Secrets & Scope/i }))
    expect(screen.getByRole('tab', { name: /Secrets & Scope/i })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText(/Secrets to rotate immediately/i)).toBeInTheDocument()
    expect(screen.getByText(/Scope limitations and skipped areas/i)).toBeInTheDocument()
  })

  it('filters findings by search query in real-time in FindingList', () => {
    const handleViewPrompt = vi.fn()
    render(<FindingList findings={mockFindings} onViewPrompt={handleViewPrompt} />)

    expect(screen.getByText(/Hardcoded Stripe Live Secret Key/i)).toBeInTheDocument()
    expect(screen.getByText(/Missing Content-Security-Policy Header/i)).toBeInTheDocument()

    // Search for "Stripe"
    const searchInput = screen.getByLabelText(/Search findings/i)
    fireEvent.change(searchInput, { target: { value: 'Stripe' } })

    expect(screen.getByText(/Hardcoded Stripe Live Secret Key/i)).toBeInTheDocument()
    expect(screen.queryByText(/Missing Content-Security-Policy Header/i)).not.toBeInTheDocument()

    // Clear search
    const clearButton = screen.getByLabelText(/Clear search query/i)
    fireEvent.click(clearButton)

    expect(screen.getByText(/Hardcoded Stripe Live Secret Key/i)).toBeInTheDocument()
    expect(screen.getByText(/Missing Content-Security-Policy Header/i)).toBeInTheDocument()
  })

  it('supports expand all and collapse all in FindingList', () => {
    const handleViewPrompt = vi.fn()
    const { container } = render(<FindingList findings={mockFindings} onViewPrompt={handleViewPrompt} />)

    // Expand all
    const expandAllBtn = screen.getByRole('button', { name: /Expand all/i })
    fireEvent.click(expandAllBtn)

    expect(container.querySelectorAll('pre').length).toBeGreaterThan(0)

    // Collapse all
    const collapseAllBtn = screen.getByRole('button', { name: /Collapse all/i })
    fireEvent.click(collapseAllBtn)

    expect(container.querySelectorAll('pre').length).toBe(0)
  })

  it('filters threat matrix cards by status in ThreatMatrixView', () => {
    render(<ThreatMatrixView threats={mockThreats} />)

    expect(screen.getByText('SQL Injection')).toBeInTheDocument()
    expect(screen.getByText('Cross-Site Scripting')).toBeInTheDocument()

    // Filter to Vulnerable only
    const vulnBtn = screen.getByRole('button', { name: /✖ 1 Vulnerable/i })
    fireEvent.click(vulnBtn)

    expect(screen.queryByText('SQL Injection')).not.toBeInTheDocument()
    expect(screen.getByText('Cross-Site Scripting')).toBeInTheDocument()

    // Filter to Secure only
    const secureBtn = screen.getByRole('button', { name: /● 1 Secure/i })
    fireEvent.click(secureBtn)

    expect(screen.getByText('SQL Injection')).toBeInTheDocument()
    expect(screen.queryByText('Cross-Site Scripting')).not.toBeInTheDocument()
  })

  it('calculates and renders average posture score in RiskScorecard', () => {
    render(<RiskScorecard scorecard={mockReport.scorecard} />)

    expect(screen.getByText(/Avg Score:/i)).toBeInTheDocument()
    expect(screen.getByText('6.3/10')).toBeInTheDocument()
  })
})
