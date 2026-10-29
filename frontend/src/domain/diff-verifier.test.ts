import { describe, it, expect } from 'vitest'
import { compareAuditReports, calculatePostureScore, getFindingFingerprint } from './diff-verifier'
import type { AuditReport, Finding } from './types'

describe('Frontend Diff Verifier Helper', () => {
  const finding1: Finding = {
    id: 'F-001',
    title: 'SQL Injection in search',
    severity: 'Critical',
    area: 'Code',
    threatCategory: 'sqli',
    location: { file: 'src/search.ts', line: 10 },
    what: 'Raw SQL',
    why: 'Injection',
    recommendedFix: 'Parameterize',
    remediationPrompt: 'Fix prompt'
  }

  const finding2: Finding = {
    id: 'F-002',
    title: 'Hardcoded JWT Secret',
    severity: 'High',
    area: 'Secrets',
    threatCategory: 'mitm',
    location: { file: 'src/auth.ts', line: 5 },
    what: 'Secret',
    why: 'Exposure',
    recommendedFix: 'Use env',
    remediationPrompt: 'Fix prompt'
  }

  const mockReport: AuditReport = {
    id: 'rep-1',
    summary: 'Mock report',
    countsBySeverity: { Critical: 1, High: 1, Medium: 0, Low: 0, Info: 0 },
    scorecard: [
      { area: 'Code', score: 5.0, status: 'Warning', topConcern: 'SQLi' }
    ],
    threatMatrix: [],
    findings: [finding1, finding2],
    secretsToRotate: [],
    notAssessed: [],
    skippedFiles: []
  }

  it('generates consistent finding fingerprints', () => {
    const fp1 = getFindingFingerprint(finding1)
    expect(fp1).toContain('sqli')
    expect(fp1).toContain('src/search.ts')
  })

  it('calculates posture score from scorecard', () => {
    const score = calculatePostureScore(mockReport)
    expect(score).toBe(5.0)
  })

  it('correctly calculates diff between base and target reports', () => {
    const targetReport: AuditReport = {
      ...mockReport,
      id: 'rep-2',
      findings: [finding2], // finding1 fixed
      scorecard: [{ area: 'Code', score: 8.5, status: 'Pass', topConcern: 'None' }]
    }

    const diff = compareAuditReports(mockReport, targetReport)
    expect(diff.resolvedFindings).toHaveLength(1)
    expect(diff.resolvedFindings[0]?.id).toBe('F-001')
    expect(diff.persistentFindings).toHaveLength(1)
    expect(diff.scoreDelta).toBe(3.5)
  })
})
