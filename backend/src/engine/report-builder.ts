import { AuditReport, Finding, ScorecardRow, Severity, Area, ThreatCheck } from '../types';
import { FilteredProjectFiles } from '../security/file-filter';

export function buildAuditReport(
  findings: Finding[],
  secretsToRotate: string[],
  threatMatrix: ThreatCheck[],
  files: FilteredProjectFiles,
  projectName: string = 'Uploaded Project'
): AuditReport {
  const countsBySeverity: Record<Severity, number> = {
    Critical: 0,
    High: 0,
    Medium: 0,
    Low: 0,
    Info: 0
  };

  for (const f of findings) {
    countsBySeverity[f.severity] = (countsBySeverity[f.severity] || 0) + 1;
  }

  // Calculate scores per area
  const areas: Area[] = ['Secrets', 'Dependencies', 'HTTP', 'Code'];
  const scorecard: ScorecardRow[] = areas.map((area) => {
    const areaFindings = findings.filter((f) => f.area === area);

    if (areaFindings.length === 0) {
      return {
        area,
        score: 10,
        status: 'Pass',
        topConcern: 'No identified vulnerabilities within analyzed scope.'
      };
    }

    let penalty = 0;
    let topConcern = areaFindings[0].title;

    for (const f of areaFindings) {
      if (f.severity === 'Critical') penalty += 4;
      else if (f.severity === 'High') penalty += 2.5;
      else if (f.severity === 'Medium') penalty += 1.2;
      else if (f.severity === 'Low') penalty += 0.5;
    }

    const score = Math.max(0, Math.round((10 - penalty) * 10) / 10);
    let status = 'Action Required';
    if (score >= 8.5) status = 'Pass';
    else if (score >= 6.0) status = 'Partial';

    return {
      area,
      score,
      status,
      topConcern
    };
  });

  // Construct executive summary
  const totalFindings = findings.length;
  let summary = `ShipSafe completed an automated pre-deployment security audit for ${projectName}. `;
  if (countsBySeverity.Critical > 0 || countsBySeverity.High > 0) {
    summary += `A total of ${totalFindings} findings were identified, including ${countsBySeverity.Critical} Critical and ${countsBySeverity.High} High severity risks that require immediate resolution prior to production release.`;
  } else if (totalFindings > 0) {
    summary += `A total of ${totalFindings} findings were identified (${countsBySeverity.Medium} Medium, ${countsBySeverity.Low} Low). No Critical blockers were found.`;
  } else {
    summary += `No vulnerabilities were detected across the analyzed files within the assessed scope. Always perform manual verification and continuous testing.`;
  }

  // Gaps & Not Assessed
  const notAssessed: string[] = [];
  if (files.manifests.length === 0) {
    notAssessed.push('Dependency manifests (package.json, requirements.txt) not found; transitive dependencies were not audited.');
  }
  if (files.serverHardeningFiles.length === 0) {
    notAssessed.push('Server deployment configs (nginx.conf, vercel.json) not detected; live reverse-proxy headers must be tested in staging.');
  }
  notAssessed.push('Runtime memory state, internal database contents, and encrypted network streams are not executed or assessed.');

  return {
    id: `audit-${Date.now()}`,
    summary,
    countsBySeverity,
    scorecard,
    threatMatrix,
    findings,
    secretsToRotate,
    notAssessed,
    skippedFiles: files.skippedFiles,
    createdAt: new Date().toISOString()
  };
}
