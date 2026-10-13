import { describe, expect, it } from 'vitest'
import { buildPromptsMarkdown, promptFilename } from './export'
import type { Finding } from './types'

const findings: Finding[] = [
  { id: 'F-001', title: 'Exposed key', severity: 'Critical', area: 'Secrets', what: '', why: '', recommendedFix: '', remediationPrompt: 'Prompt one' },
  { id: 'F-002', title: 'No CSP', severity: 'Medium', area: 'HTTP', what: '', why: '', recommendedFix: '', remediationPrompt: 'Prompt two' },
]

describe('export', () => {
  it('writes a header per finding and one prompt per finding', () => {
    const md = buildPromptsMarkdown(findings, 'Cursor')
    expect(md).toContain('## F-001 Exposed key (Critical)')
    expect(md).toContain('## F-002 No CSP (Medium)')
    expect(md).toContain('Prompt one')
    expect(md).toContain('Prompt two')
    expect(md.startsWith('# ShipSafe remediation prompts for Cursor')).toBe(true)
  })

  it('names the download after the agent', () => {
    expect(promptFilename('ClaudeCode')).toBe('shipsafe-remediation-prompts-claudecode.md')
  })
})
