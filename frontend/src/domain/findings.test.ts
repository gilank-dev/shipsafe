import { describe, expect, it } from 'vitest'
import { countBySeverity, filterFindings, severityTallyText, sortFindings } from './findings'
import type { Finding } from './types'

function f(id: string, severity: Finding['severity'], area: Finding['area'] = 'Code'): Finding {
  return { id, title: id, severity, area, what: 'w', why: 'y', recommendedFix: 'r', remediationPrompt: 'p' }
}

const sample = [f('F-003', 'Low'), f('F-001', 'High', 'Secrets'), f('F-002', 'Critical', 'HTTP'), f('F-004', 'High')]

describe('findings helpers', () => {
  it('sorts by severity, then id', () => {
    expect(sortFindings(sample).map((x) => x.id)).toEqual(['F-002', 'F-001', 'F-004', 'F-003'])
  })

  it('does not mutate the input', () => {
    const copy = [...sample]
    sortFindings(sample)
    expect(sample).toEqual(copy)
  })

  it('filters by severity and area, treating empty sets as no filter', () => {
    const none = { severities: new Set<never>(), areas: new Set<never>() }
    expect(filterFindings(sample, none)).toHaveLength(4)
    expect(filterFindings(sample, { severities: new Set(['High' as const]), areas: new Set<never>() })).toHaveLength(2)
    expect(
      filterFindings(sample, { severities: new Set(['High' as const]), areas: new Set(['Secrets' as const]) }),
    ).toHaveLength(1)
  })

  it('counts and formats a tally with all five levels', () => {
    const counts = countBySeverity(sample)
    expect(counts).toEqual({ Critical: 1, High: 2, Medium: 0, Low: 1, Info: 0 })
    expect(severityTallyText(counts)).toBe('1 Critical, 2 High, 0 Medium, 1 Low, 0 Info')
  })
})
