import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { buildPromptsMarkdown, downloadFile, promptFilename } from './export'
import type { Finding } from './types'

const findings: Finding[] = [
  { id: 'F-001', title: 'Exposed key', severity: 'Critical', area: 'Secrets', what: '', why: '', recommendedFix: '', remediationPrompt: 'Prompt one' },
  { id: 'F-002', title: 'No CSP', severity: 'Medium', area: 'HTTP', what: '', why: '', recommendedFix: '', remediationPrompt: 'Prompt two' },
]

describe('export', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

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

  it('downloads file with delayed URL revocation for mobile browsers', () => {
    vi.useFakeTimers()
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url')
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

    let clicked = false
    const appendChildSpy = vi.spyOn(document.body, 'appendChild')
    const removeChildSpy = vi.spyOn(document.body, 'removeChild')

    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const el = originalCreateElement(tagName)
      if (tagName === 'a') {
        el.click = () => {
          clicked = true
        }
      }
      return el
    })

    const result = downloadFile('# Content', 'test-remediation.md')

    expect(result).toBe(true)
    expect(createObjectURLSpy).toHaveBeenCalled()
    expect(clicked).toBe(true)
    expect(appendChildSpy).toHaveBeenCalled()
    expect(removeChildSpy).toHaveBeenCalled()

    // Immediately after click, revokeObjectURL should NOT be called yet (delayed for mobile WebKit)
    expect(revokeObjectURLSpy).not.toHaveBeenCalled()

    // Fast forward 1500ms
    vi.advanceTimersByTime(1500)
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url')
  })

  it('returns false gracefully when downloadFile fails', () => {
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => {
      throw new Error('Blocked by security policy')
    })
    const result = downloadFile('# Content', 'test-remediation.md')
    expect(result).toBe(false)
  })
})
