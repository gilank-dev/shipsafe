import { describe, it, expect } from 'vitest';
import { compareAuditReports, getFindingFingerprint, calculatePostureScore } from './diff-verifier';
import { AuditReport, Finding } from '../types';

describe('Diff Verifier Module', () => {
  const baseFinding1: Finding = {
    id: 'F-001',
    title: 'SQL Injection in Query',
    severity: 'Critical',
    area: 'Code',
    threatCategory: 'sqli',
    location: { file: 'src/db.ts', line: 12 },
    what: 'Raw SQL',
    why: 'Injection',
    recommendedFix: 'Use parameterization',
    remediationPrompt: 'Prompt 1'
  };

  const baseFinding2: Finding = {
    id: 'F-002',
    title: 'Exposed API Secret Key',
    severity: 'High',
    area: 'Secrets',
    threatCategory: 'mitm',
    location: { file: 'src/config.ts', line: 5 },
    what: 'Exposed secret',
    why: 'Secret leak',
    recommendedFix: 'Use env var',
    remediationPrompt: 'Prompt 2'
  };

  const regressedFinding: Finding = {
    id: 'F-003',
    title: 'Insecure Deserialization via eval',
    severity: 'Critical',
    area: 'Code',
    threatCategory: 'zero_day',
    location: { file: 'src/eval.ts', line: 20 },
    what: 'eval used',
    why: 'RCE',
    recommendedFix: 'Remove eval',
    remediationPrompt: 'Prompt 3'
  };

  const mockBaseReport: AuditReport = {
    id: 'audit-base-123',
    summary: 'Base report',
    countsBySeverity: { Critical: 1, High: 1, Medium: 0, Low: 0, Info: 0 },
    scorecard: [
      { area: 'Code', score: 4.0, status: 'Action Required', topConcern: 'SQLi' },
      { area: 'Secrets', score: 5.0, status: 'Warning', topConcern: 'Secret' }
    ],
    threatMatrix: [],
    findings: [baseFinding1, baseFinding2],
    secretsToRotate: ['sk_live_****'],
    notAssessed: [],
    skippedFiles: []
  };

  it('correctly calculates posture score', () => {
    const score = calculatePostureScore(mockBaseReport);
    expect(score).toBe(4.5);
  });

  it('identifies resolved findings when target fixes issue', () => {
    const mockTargetReport: AuditReport = {
      id: 'audit-target-456',
      summary: 'Target report with SQLi fixed',
      countsBySeverity: { Critical: 0, High: 1, Medium: 0, Low: 0, Info: 0 },
      scorecard: [
        { area: 'Code', score: 10.0, status: 'Pass', topConcern: 'None' },
        { area: 'Secrets', score: 5.0, status: 'Warning', topConcern: 'Secret' }
      ],
      threatMatrix: [],
      findings: [baseFinding2], // Only baseFinding2 remains
      secretsToRotate: ['sk_live_****'],
      notAssessed: [],
      skippedFiles: []
    };

    const diff = compareAuditReports(mockBaseReport, mockTargetReport);
    expect(diff.resolvedFindings).toHaveLength(1);
    expect(diff.resolvedFindings[0].id).toBe('F-001');
    expect(diff.persistentFindings).toHaveLength(1);
    expect(diff.persistentFindings[0].id).toBe('F-002');
    expect(diff.regressedFindings).toHaveLength(0);
    expect(diff.scoreDelta).toBeGreaterThan(0);
    expect(diff.summary).toContain('1 issue(s) resolved');
  });

  it('identifies regressed findings when target introduces new issue', () => {
    const mockTargetReport: AuditReport = {
      id: 'audit-target-789',
      summary: 'Target report with new eval issue',
      countsBySeverity: { Critical: 2, High: 1, Medium: 0, Low: 0, Info: 0 },
      scorecard: [
        { area: 'Code', score: 2.0, status: 'Action Required', topConcern: 'Zero Day' },
        { area: 'Secrets', score: 5.0, status: 'Warning', topConcern: 'Secret' }
      ],
      threatMatrix: [],
      findings: [baseFinding1, baseFinding2, regressedFinding],
      secretsToRotate: [],
      notAssessed: [],
      skippedFiles: []
    };

    const diff = compareAuditReports(mockBaseReport, mockTargetReport);
    expect(diff.resolvedFindings).toHaveLength(0);
    expect(diff.persistentFindings).toHaveLength(2);
    expect(diff.regressedFindings).toHaveLength(1);
    expect(diff.regressedFindings[0].id).toBe('F-003');
    expect(diff.scoreDelta).toBeLessThan(0);
    expect(diff.summary).toContain('1 new regression(s) introduced');
  });
});
