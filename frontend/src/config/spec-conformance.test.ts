import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import disclaimer from './text/disclaimer.txt?raw'
import { AGENT_TARGETS, AREAS, SEVERITIES } from './agents'

// Fails (never skips) when the spec cannot be read, so drift cannot pass silently.
const specPath = resolve(process.env.SHIPSAFE_SPEC_PATH ?? '../shipsafe-spec.md')
const spec = readFileSync(specPath, 'utf8').replace(/\r\n/g, '\n')

function specUnion(name: string): string[] {
  const line = spec.split('\n').find((l) => l.trim().startsWith(`type ${name} =`))
  if (!line) throw new Error(`type ${name} not found in spec`)
  return [...line.matchAll(/"([^"]+)"/g)].map((m) => m[1] as string)
}

describe('spec conformance', () => {
  it('disclaimer equals the fenced block under spec section 7, byte for byte', () => {
    const start = spec.indexOf('## 7. Disclaimer')
    expect(start).toBeGreaterThan(-1)
    const block = spec.slice(start).match(/```[^\n]*\n([\s\S]*?)\n```/)
    expect(block?.[1]).toBeTruthy()
    expect(disclaimer).toBe(block![1] + '\n')
  })

  it('Severity union matches the spec', () => {
    expect([...SEVERITIES]).toEqual(specUnion('Severity'))
    expect(SEVERITIES).toHaveLength(5)
  })

  it('Area union matches the spec', () => {
    expect(AREAS.map((a) => a.id)).toEqual(specUnion('Area'))
    expect(AREAS).toHaveLength(4)
  })

  it('AgentTarget union matches the spec', () => {
    expect(AGENT_TARGETS.map((a) => a.id)).toEqual(specUnion('AgentTarget'))
    expect(AGENT_TARGETS).toHaveLength(5)
  })
})
