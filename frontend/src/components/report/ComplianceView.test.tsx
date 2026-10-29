import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ComplianceView } from './ComplianceView'
import type { Finding } from '../../domain/types'

describe('ComplianceView Component', () => {
  const mockFindings: Finding[] = [
    {
      id: 'F-001',
      title: 'SQL Injection in user query',
      severity: 'Critical',
      area: 'Code',
      threatCategory: 'sqli',
      what: 'Raw string interpolation in SQL query',
      why: 'Allows arbitrary DB execution',
      recommendedFix: 'Use parameterized queries',
      remediationPrompt: 'Fix prompt'
    },
    {
      id: 'F-002',
      title: 'Missing Content Security Policy',
      severity: 'Medium',
      area: 'HTTP',
      threatCategory: 'xss',
      what: 'CSP header missing',
      why: 'Increases XSS risk',
      recommendedFix: 'Add CSP headers',
      remediationPrompt: 'Add CSP'
    }
  ]

  it('renders OWASP compliance heading and overview scorecard', () => {
    render(<ComplianceView findings={mockFindings} />)

    expect(screen.getByText(/OWASP Top 10 \(2021\) Compliance Posture/i)).toBeInTheDocument()
    expect(screen.getByText(/ASVS Level 2/i)).toBeInTheDocument()
    expect(screen.getByText(/Compliance Score/i)).toBeInTheDocument()
    expect(screen.getByText(/Passed Controls/i)).toBeInTheDocument()
    expect(screen.getByText(/Violated Controls/i)).toBeInTheDocument()
  })

  it('triggers window.print when Print/PDF button is clicked', () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {})
    render(<ComplianceView findings={mockFindings} />)

    const printButton = screen.getByRole('button', { name: /Print \/ PDF/i })
    expect(printButton).toBeInTheDocument()
    fireEvent.click(printButton)

    expect(printSpy).toHaveBeenCalledTimes(1)
    printSpy.mockRestore()
  })

  it('expands category details and displays mapped findings and CWE badges', () => {
    render(<ComplianceView findings={mockFindings} />)

    // Find A03:2021 (Injection)
    const injectionCat = screen.getByText('Injection')
    expect(injectionCat).toBeInTheDocument()

    // Click to expand
    fireEvent.click(injectionCat)

    // Should display CWEs and mapped findings
    expect(screen.getByText(/Associated CWEs:/i)).toBeInTheDocument()
    expect(screen.getByText('CWE-89')).toBeInTheDocument()
    expect(screen.getByText('F-001')).toBeInTheDocument()
    expect(screen.getByText('SQL Injection in user query')).toBeInTheDocument()
  })

  it('filters categories by status', () => {
    render(<ComplianceView findings={mockFindings} />)

    // Filter by Violated
    const violatedBtn = screen.getByRole('button', { name: /Violated/i })
    fireEvent.click(violatedBtn)

    expect(screen.getByText('Injection')).toBeInTheDocument()
  })
})
