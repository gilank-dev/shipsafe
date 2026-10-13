import { Finding, AgentTarget } from '../types';

export function generateRemediationPrompt(finding: Finding, target: AgentTarget): string {
  const locStr = finding.location?.file
    ? `${finding.location.file}${finding.location.line ? `:${finding.location.line}` : ''}`
    : 'Location not determined. Inspect the codebase for the relevant pattern.';

  const snippetStr = finding.location?.snippet
    ? `\nContext Snippet:\n\`\`\`\n${finding.location.snippet}\n\`\`\`\n`
    : '';

  const verifyStr = finding.verifyWith
    ? `Verification command: \`${finding.verifyWith}\``
    : 'Verification command: Run test suite and check static security invariants.';

  switch (target) {
    case 'Cursor':
      return [
        `/* @security-fix: [${finding.id}] ${finding.title} */`,
        `TARGET: @${locStr}`,
        `SEVERITY: ${finding.severity} | AREA: ${finding.area}`,
        snippetStr,
        `VULNERABILITY DESCRIPTION:`,
        `${finding.what}`,
        ``,
        `SECURITY RISK:`,
        `${finding.why}`,
        ``,
        `REMEDIATION DIRECTIVE:`,
        `${finding.recommendedFix}`,
        ``,
        `VERIFICATION:`,
        `${verifyStr}`,
        ``,
        `CONSTRAINTS:`,
        `1. Apply minimal surgical edits directly inside @${finding.location?.file || 'target file'}.`,
        `2. Preserve all surrounding interfaces and business contracts.`,
        `3. Never hardcode credentials. Store secrets exclusively in environment variables.`,
        `4. If live tokens were committed, rotate them immediately in your secrets manager.`
      ].join('\n');

    case 'ClaudeCode':
      return [
        `Task: Fix security vulnerability [${finding.id}] ${finding.title}`,
        `Severity: ${finding.severity} | Area: ${finding.area}`,
        `File: ${locStr}`,
        snippetStr,
        `Problem:`,
        `${finding.what}`,
        ``,
        `Threat Analysis:`,
        `${finding.why}`,
        ``,
        `Action Required:`,
        `${finding.recommendedFix}`,
        ``,
        `Verification Step:`,
        `${verifyStr}`,
        ``,
        `Execution Protocol:`,
        `- Inspect the exact location before editing.`,
        `- Implement the minimal fix without unnecessary refactoring.`,
        `- Run verification commands to prove the patch works with zero regressions.`,
        `- Never commit secrets or placeholder credentials.`
      ].join('\n');

    case 'Copilot':
      return [
        `// SECURITY FIX: [${finding.id}] ${finding.title} (${finding.severity} - ${finding.area})`,
        `// File: ${locStr}`,
        `// Vulnerability: ${finding.what}`,
        `// Impact: ${finding.why}`,
        `// Action: ${finding.recommendedFix}`,
        snippetStr,
        `// Invariant: Do not break existing API signatures.`,
        `// ${verifyStr}`,
        `// Note: Rotate any leaked credentials immediately.`
      ].join('\n');

    case 'Windsurf':
      return [
        `[ShipSafe Cascade Task] Fix ${finding.id}: ${finding.title}`,
        `Location: #${locStr}`,
        `Severity: ${finding.severity} | Area: ${finding.area}`,
        snippetStr,
        `Issue Analysis:`,
        `${finding.what}`,
        ``,
        `Exploitation Impact:`,
        `${finding.why}`,
        ``,
        `Required Modification:`,
        `${finding.recommendedFix}`,
        ``,
        `Verification:`,
        `${verifyStr}`,
        ``,
        `Rules: Apply a localized diff to #${finding.location?.file || 'file'}. Retain backward compatibility.`
      ].join('\n');

    case 'Generic':
    default:
      return [
        `You are an expert security engineer. Patch the following vulnerability cleanly:`,
        ``,
        `1. Vulnerability: [${finding.id}] ${finding.title} (${finding.severity} | ${finding.area})`,
        `2. Location: ${locStr}`,
        snippetStr,
        `3. Cause: ${finding.what}`,
        `4. Security Impact: ${finding.why}`,
        `5. Prescribed Fix: ${finding.recommendedFix}`,
        `6. Verification: ${verifyStr}`,
        `7. Rules:`,
        `   - Make targeted edits with zero collateral side effects.`,
        `   - Never hardcode keys or credentials.`,
        `   - If real credentials leaked, rotate them immediately.`
      ].join('\n');
  }
}
