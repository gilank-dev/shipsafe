import type { AgentTarget, Finding } from '../../domain/types'

export type BaseFinding = Omit<Finding, 'remediationPrompt'>

function locationLine(f: BaseFinding): string {
  if (!f.location) {
    return `Location not determined. Search the repository for code related to: ${f.title}.`
  }
  const { file, line, snippet } = f.location
  const where = line ? `${file}:${line}` : file
  return snippet ? `${where}\n  ${snippet}` : where
}

function core(f: BaseFinding, projectName: string): string {
  const verify = f.verifyWith ? `\nVerify with: ${f.verifyWith}` : ''
  return [
    `You are a security engineer working on ${projectName}. Fix the issue below without changing any other behavior.`,
    '',
    'Problem',
    `- ${f.id} ${f.title}`,
    `- Area: ${f.area}. Severity: ${f.severity}.`,
    `- What: ${f.what}`,
    `- Why it matters: ${f.why}`,
    '',
    'Location',
    locationLine(f),
    '',
    'Expected result after the fix',
    `${f.recommendedFix}${verify}`,
    '',
    'Constraints',
    '- Do not hardcode new secrets. Read credentials from environment variables.',
    '- Do not change features unrelated to this finding.',
    '- Follow the conventions already used in this project.',
    '- Add or update a test when the change is testable.',
    '',
    'Security note',
    '- Never paste real secrets into this chat or into code. If a credential was exposed, rotate it before anything else.',
  ].join('\n')
}

function fileRef(f: BaseFinding): string {
  return f.location ? `@${f.location.file}` : '(no file pinpointed, search the workspace)'
}

/** Builds a self-contained prompt (spec 6.1) wrapped for the chosen agent (spec 6.2). Never includes secret values. */
export function buildPrompt(f: BaseFinding, target: AgentTarget, projectName: string): string {
  const body = core(f, projectName)
  switch (target) {
    case 'Cursor':
      return `Edit the files directly. Start from ${fileRef(f)}.\n\n${body}\n\nWhen done, list every file you changed and why.`
    case 'ClaudeCode':
      return `Task: remediate ${f.id} in ${projectName}.\n\n${body}\n\nAfter the change, run the project's test and build commands and report the results. If anything fails, fix it before finishing.`
    case 'Copilot': {
      const where = f.location ? `${f.location.file}${f.location.line ? `:${f.location.line}` : ''}` : 'the repository'
      return `Fix ${f.id} (${f.severity}): ${f.title}. Look at ${where}.\n${f.recommendedFix}\nAdd a short code comment explaining the fix, then describe the change in two sentences.\nDo not hardcode secrets or change unrelated behavior. Rotate any exposed credential.`
    }
    case 'Windsurf':
      return `Work across the whole workspace for this change. Start from ${fileRef(f)} and follow the imports to related files.\n\n${body}\n\nSummarize the edits per file when done.`
    case 'Generic':
    default:
      return `${body}\n\nSteps\n1. Read the files named under Location.\n2. Apply the fix described above.\n3. Check the result against the verification step.\n4. Summarize what changed.`
  }
}
