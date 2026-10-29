import type { AuditReport, Finding, AuditDiffResult } from './types';

/**
 * Normalizes a finding fingerprint for deterministic comparison across re-audits.
 * Fingerprint combines threat category or area + relative file path + core title snippet.
 */
export function getFindingFingerprint(finding: Finding): string {
  const areaOrCategory = finding.threatCategory || finding.area || 'unknown';
  const file = finding.location?.file ? finding.location.file.replace(/\\/g, '/').toLowerCase() : '';
  const titleKey = finding.title.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (file) {
    return `${areaOrCategory}:${file}:${titleKey}`;
  }
  return `${areaOrCategory}:${titleKey}`;
}

/**
 * Calculates overall security posture score (0.0 to 10.0) for an audit report.
 */
export function calculatePostureScore(report: AuditReport): number {
  if (report.scorecard && report.scorecard.length > 0) {
    const assessed = report.scorecard.filter((r) => r.score !== null);
    if (assessed.length > 0) {
      const sum = assessed.reduce((acc, r) => acc + (r.score ?? 0), 0);
      return Number((sum / assessed.length).toFixed(1));
    }
  }

  // Fallback penalty calculation if scorecard is empty
  let penalty = 0;
  const counts = report.countsBySeverity || { Critical: 0, High: 0, Medium: 0, Low: 0, Info: 0 };
  penalty += (counts.Critical || 0) * 2.5;
  penalty += (counts.High || 0) * 1.5;
  penalty += (counts.Medium || 0) * 0.5;
  penalty += (counts.Low || 0) * 0.2;

  const score = Math.max(0, 10 - penalty);
  return Number(score.toFixed(1));
}

/**
 * Compares a Base Audit Report against a Target Audit Report (Re-Audit / Verify Fix).
 */
export function compareAuditReports(
  baseReport: AuditReport,
  targetReport: AuditReport
): AuditDiffResult {
  const scoreBefore = calculatePostureScore(baseReport);
  const scoreAfter = calculatePostureScore(targetReport);
  const scoreDelta = Number((scoreAfter - scoreBefore).toFixed(1));

  const baseMap = new Map<string, Finding>();
  for (const f of baseReport.findings || []) {
    baseMap.set(getFindingFingerprint(f), f);
  }

  const targetMap = new Map<string, Finding>();
  for (const f of targetReport.findings || []) {
    targetMap.set(getFindingFingerprint(f), f);
  }

  const resolvedFindings: Finding[] = [];
  const persistentFindings: Finding[] = [];
  const regressedFindings: Finding[] = [];

  // Check base findings
  for (const [key, baseFinding] of baseMap.entries()) {
    if (targetMap.has(key)) {
      persistentFindings.push(targetMap.get(key)!);
    } else {
      resolvedFindings.push(baseFinding);
    }
  }

  // Check target findings for new regressions
  for (const [key, targetFinding] of targetMap.entries()) {
    if (!baseMap.has(key)) {
      regressedFindings.push(targetFinding);
    }
  }

  // Summary generation
  let summary = `Re-audit completed. `;
  if (resolvedFindings.length > 0) {
    summary += `${resolvedFindings.length} issue(s) resolved. `;
  }
  if (regressedFindings.length > 0) {
    summary += `${regressedFindings.length} new regression(s) introduced. `;
  }
  if (persistentFindings.length > 0) {
    summary += `${persistentFindings.length} issue(s) remain persistent. `;
  }
  if (resolvedFindings.length === 0 && regressedFindings.length === 0 && persistentFindings.length === 0) {
    summary += `No changes detected between base and target audits. `;
  }

  if (scoreDelta > 0) {
    summary += `Security posture improved by +${scoreDelta} points (${scoreBefore}/10 → ${scoreAfter}/10).`;
  } else if (scoreDelta < 0) {
    summary += `Security posture degraded by ${scoreDelta} points (${scoreBefore}/10 → ${scoreAfter}/10).`;
  } else {
    summary += `Posture score unchanged (${scoreBefore}/10).`;
  }

  return {
    baseAuditId: baseReport.id,
    targetAuditId: targetReport.id,
    scoreBefore,
    scoreAfter,
    scoreDelta,
    resolvedFindings,
    persistentFindings,
    regressedFindings,
    summary,
  };
}
