import { describe, it, expect } from 'vitest'
import { mapFindingToOwasp, calculateOwaspCompliance, OWASP_TOP_10_2021 } from './owasp-map'
import type { Finding } from './types'

describe('OWASP Top 10 Mapping', () => {
  it('contains all 10 OWASP Top 10 (2021) categories', () => {
    expect(OWASP_TOP_10_2021).toHaveLength(10)
    expect(OWASP_TOP_10_2021[0]?.owaspId).toBe('A01:2021')
    expect(OWASP_TOP_10_2021[2]?.owaspId).toBe('A03:2021')
    expect(OWASP_TOP_10_2021[9]?.owaspId).toBe('A10:2021')
  })

  it('correctly maps SQL injection finding to A03:2021 Injection', () => {
    const finding: Finding = {
      id: 'F-001',
      title: 'SQL Injection in Query',
      severity: 'Critical',
      area: 'Code',
      threatCategory: 'sqli',
      what: 'Raw query interpolation',
      why: 'Arbitrary database command execution',
      recommendedFix: 'Use parameterized queries',
      remediationPrompt: 'Fix prompt'
    }

    const mapping = mapFindingToOwasp(finding)
    expect(mapping.primaryOwaspId).toBe('A03:2021')
    expect(mapping.owaspMappings.some(m => m.owaspId === 'A03:2021')).toBe(true)
  })

  it('correctly maps exposed secret to A02:2021 Cryptographic Failures', () => {
    const finding: Finding = {
      id: 'F-002',
      title: 'Hardcoded Stripe API Secret Key',
      severity: 'Critical',
      area: 'Secrets',
      threatCategory: 'mitm',
      what: 'Exposed secret',
      why: 'Key compromise',
      recommendedFix: 'Move to environment variable',
      remediationPrompt: 'Rotate key'
    }

    const mapping = mapFindingToOwasp(finding)
    expect(mapping.owaspMappings.some(m => m.owaspId === 'A02:2021')).toBe(true)
  })

  it('calculates 100% compliance when findings list is empty', () => {
    const compliance = calculateOwaspCompliance([])
    expect(compliance.complianceScore).toBe(100)
    expect(compliance.passCount).toBe(10)
    expect(compliance.failCount).toBe(0)
    expect(compliance.warnCount).toBe(0)
  })

  it('calculates reduced compliance score when violations exist', () => {
    const findings: Finding[] = [
      {
        id: 'F-001',
        title: 'SQL Injection',
        severity: 'Critical',
        area: 'Code',
        threatCategory: 'sqli',
        what: 'Raw SQL',
        why: 'Injection risk',
        recommendedFix: 'Use parameterization',
        remediationPrompt: 'Fix SQL'
      },
      {
        id: 'F-002',
        title: 'Exposed Private Key',
        severity: 'Critical',
        area: 'Secrets',
        threatCategory: 'mitm',
        what: 'Private key exposed',
        why: 'Compromise',
        recommendedFix: 'Rotate',
        remediationPrompt: 'Fix secret'
      }
    ]

    const compliance = calculateOwaspCompliance(findings)
    expect(compliance.complianceScore).toBeLessThan(100)
    expect(compliance.failCount).toBeGreaterThan(0)
    expect(compliance.categories).toHaveLength(10)
  })
})
