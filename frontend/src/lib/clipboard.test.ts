import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { copyToClipboard } from './clipboard'

describe('copyToClipboard', () => {
  const originalClipboard = navigator.clipboard
  const originalExecCommand = document.execCommand

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
      configurable: true,
      writable: true,
    })
    document.execCommand = originalExecCommand
  })

  it('copies successfully using navigator.clipboard.writeText when available', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    })

    const result = await copyToClipboard('test prompt content')
    expect(result).toBe(true)
    expect(writeTextMock).toHaveBeenCalledWith('test prompt content')
  })

  it('falls back to document.execCommand when navigator.clipboard.writeText fails', async () => {
    const writeTextMock = vi.fn().mockRejectedValue(new Error('Permission denied'))
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    })

    const execCommandMock = vi.fn().mockReturnValue(true)
    document.execCommand = execCommandMock

    const appendChildSpy = vi.spyOn(document.body, 'appendChild')
    const removeChildSpy = vi.spyOn(document.body, 'removeChild')

    const result = await copyToClipboard('fallback copy text')
    expect(result).toBe(true)
    expect(writeTextMock).toHaveBeenCalledWith('fallback copy text')
    expect(execCommandMock).toHaveBeenCalledWith('copy')
    expect(appendChildSpy).toHaveBeenCalled()
    expect(removeChildSpy).toHaveBeenCalled()
  })

  it('falls back to document.execCommand when navigator.clipboard is undefined', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
      writable: true,
    })

    const execCommandMock = vi.fn().mockReturnValue(true)
    document.execCommand = execCommandMock

    const result = await copyToClipboard('insecure context text')
    expect(result).toBe(true)
    expect(execCommandMock).toHaveBeenCalledWith('copy')
  })

  it('returns false gracefully when both modern and legacy copy methods fail', async () => {
    const writeTextMock = vi.fn().mockRejectedValue(new Error('NotAllowedError'))
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    })

    document.execCommand = vi.fn().mockReturnValue(false)

    const result = await copyToClipboard('failed text')
    expect(result).toBe(false)
  })

  it('returns false when document.execCommand throws an exception', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
      writable: true,
    })

    document.execCommand = vi.fn().mockImplementation(() => {
      throw new Error('SecurityError')
    })

    const result = await copyToClipboard('failed text')
    expect(result).toBe(false)
  })
})
