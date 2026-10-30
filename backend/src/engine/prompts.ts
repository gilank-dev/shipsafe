import { Finding, AgentTarget } from '../types';

export const TOKEN_BUDGET_BY_TARGET: Record<AgentTarget, number> = {
  Cursor: 450,
  ClaudeCode: 400,
  Copilot: 180,
  Windsurf: 400,
  Generic: 400,
};

const MAX_SNIPPET_LINES = 12;
const MAX_SNIPPET_CHARS = 500;

/**
 * Estimates token count for English code and instructions (standard ~4 chars per token).
 */
export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Bounds code snippet length to prevent blowing prompt context windows and token budgets.
 */
function formatBoundedSnippet(
  snippet?: string,
  commentPrefix = '',
  maxLines = MAX_SNIPPET_LINES,
  maxChars = MAX_SNIPPET_CHARS
): string {
  if (!snippet || !snippet.trim()) return '';

  const clean = snippet.trim();
  const rawLines = clean.split('\n');
  let truncated = false;

  let selectedLines = rawLines;
  if (selectedLines.length > maxLines) {
    selectedLines = selectedLines.slice(0, maxLines);
    truncated = true;
  }

  let text = selectedLines.join('\n');
  if (text.length > maxChars) {
    text = text.slice(0, maxChars);
    truncated = true;
  }

  if (commentPrefix) {
    const commentedLines = text.split('\n').map((l) => `${commentPrefix}${l}`);
    if (truncated) {
      commentedLines.push(`${commentPrefix}... [snippet truncated for token budget]`);
    }
    return `\n${commentedLines.join('\n')}\n`;
  }

  const notice = truncated ? '\n... [snippet truncated for token budget]' : '';
  return `\nContext Snippet:\n\`\`\`\n${text}${notice}\n\`\`\`\n`;
}

export function generateRemediationPrompt(finding: Finding, target: AgentTarget): string {
  const locStr = finding.location?.file
    ? `${finding.location.file}${finding.location.line ? `:${finding.location.line}` : ''}`
    : 'Location not determined. Inspect the codebase for the relevant pattern.';

  const verifyStr = finding.verifyWith
    ? `Verification command: \`${finding.verifyWith}\``
    : 'Verification command: Run test suite and check static security invariants.';

  switch (target) {
    case 'Cursor': {
      const snippetStr = formatBoundedSnippet(finding.location?.snippet);
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
      ].filter((line) => line !== undefined).join('\n');
    }

    case 'ClaudeCode': {
      const snippetStr = formatBoundedSnippet(finding.location?.snippet);
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
      ].filter((line) => line !== undefined).join('\n');
    }

    case 'Copilot': {
      // Inline comment format: token-dense and syntactically valid in JS/TS
      const snippetComment = formatBoundedSnippet(finding.location?.snippet, '// ', 3, 120);
      return [
        `// [SECURITY FIX] ${finding.id}: ${finding.title} (${finding.severity} - ${finding.area})`,
        `// Target: ${locStr}`,
        `// Vulnerability: ${finding.what}`,
        `// Impact: ${finding.why}`,
        `// Action: ${finding.recommendedFix}`,
        snippetComment.trim(),
        `// Invariant: Do not break existing API signatures.`,
        `// ${verifyStr}`,
        `// Note: Rotate any leaked credentials immediately.`
      ].filter(Boolean).join('\n');
    }

    case 'Windsurf': {
      const snippetStr = formatBoundedSnippet(finding.location?.snippet);
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
      ].filter((line) => line !== undefined).join('\n');
    }

    case 'Generic':
    default: {
      const snippetStr = formatBoundedSnippet(finding.location?.snippet);
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
      ].filter((line) => line !== undefined).join('\n');
    }
  }
}
