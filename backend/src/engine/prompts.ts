import { Finding, AgentTarget } from '../types';

export function generateRemediationPrompt(finding: Finding, target: AgentTarget): string {
  const locStr = finding.location?.file
    ? `${finding.location.file}${finding.location.line ? `:${finding.location.line}` : ''}`
    : 'Location not determined. Search the codebase for the relevant implementation.';

  const snippetStr = finding.location?.snippet
    ? `\nCode snippet context:\n\`\`\`\n${finding.location.snippet}\n\`\`\`\n`
    : '';

  const verifyStr = finding.verifyWith
    ? `Verification command / step: \`${finding.verifyWith}\``
    : 'Verification: Ensure all existing tests pass and verify the security invariant.';

  switch (target) {
    case 'Cursor':
      return [
        `You are a senior security engineer. Fix the following security vulnerability:`,
        ``,
        `### Issue: [${finding.id}] ${finding.title}`,
        `- Severity: ${finding.severity}`,
        `- Area: ${finding.area}`,
        `- Target File: @${locStr}`,
        snippetStr,
        `### Vulnerability Details`,
        `- What: ${finding.what}`,
        `- Why it matters: ${finding.why}`,
        ``,
        `### Recommended Solution`,
        finding.recommendedFix,
        ``,
        `### Verification`,
        verifyStr,
        ``,
        `### Constraints`,
        `1. Make minimal surgical edits directly to @${finding.location?.file || 'target file'}.`,
        `2. Do not change other business logic or break existing features.`,
        `3. Do not hardcode any sensitive credentials or secrets.`,
        `4. If an exposed real secret was involved, rotate it in your secrets manager immediately.`
      ].join('\n');

    case 'ClaudeCode':
      return [
        `Role: Security Engineering Specialist`,
        `Goal: Resolve security finding ${finding.id} without introducing regressions.`,
        ``,
        `## Problem: ${finding.title} (${finding.severity} in ${finding.area})`,
        `Location: ${locStr}`,
        snippetStr,
        `## Explanation`,
        finding.what,
        ``,
        `## Security Impact`,
        finding.why,
        ``,
        `## Implementation Plan`,
        finding.recommendedFix,
        ``,
        `## Verification`,
        verifyStr,
        `Run local test suites (e.g. npm test or linting) to ensure zero regressions after applying changes.`,
        ``,
        `## Critical Rules`,
        `- Follow existing architectural conventions.`,
        `- Never hardcode secrets. Use environment variables.`,
        `- If credentials were exposed, immediately mark them for rotation.`
      ].join('\n');

    case 'Copilot':
      return [
        `// SECURITY FIX: [${finding.id}] ${finding.title} (${finding.severity})`,
        `// Location: ${locStr}`,
        `// Issue: ${finding.what}`,
        `// Fix: ${finding.recommendedFix}`,
        snippetStr,
        `// Action: Refactor this section to follow secure coding standards.`,
        `// Ensure: ${verifyStr}`,
        `// Warning: Never hardcode credentials. Rotate any exposed tokens.`
      ].join('\n');

    case 'Windsurf':
      return [
        `[Security Task] Resolve ${finding.id}: ${finding.title}`,
        ``,
        `Context:`,
        `- Severity: ${finding.severity}`,
        `- Area: ${finding.area}`,
        `- File: ${locStr}`,
        snippetStr,
        `Problem Description:`,
        `${finding.what}`,
        `Risk: ${finding.why}`,
        ``,
        `Fix Instructions:`,
        `${finding.recommendedFix}`,
        ``,
        `Verification:`,
        `${verifyStr}`,
        ``,
        `Rules: Apply targeted patch to the workspace without altering unrelated behavior.`
      ].join('\n');

    case 'Generic':
    default:
      return [
        `You are a security engineer. Fix the following vulnerability without altering existing application behavior.`,
        ``,
        `1. Vulnerability: [${finding.id}] ${finding.title} (${finding.severity} - ${finding.area})`,
        `2. Location: ${locStr}`,
        snippetStr,
        `3. What is wrong: ${finding.what}`,
        `4. Impact: ${finding.why}`,
        `5. Required Fix: ${finding.recommendedFix}`,
        `6. Verification: ${verifyStr}`,
        `7. Constraints:`,
        `   - Do not hardcode any sensitive credentials.`,
        `   - Maintain existing conventions and behavior.`,
        `   - If real credentials were leaked, rotate them immediately.`
      ].join('\n');
  }
}
