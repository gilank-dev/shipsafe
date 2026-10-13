import { SEVERITIES } from '../config/agents'
import type { Area, Finding, Severity } from './types'

const ORDER = new Map<Severity, number>(SEVERITIES.map((s, i) => [s, i]))

export function sortFindings(findings: readonly Finding[]): Finding[] {
  return [...findings].sort(
    (a, b) => (ORDER.get(a.severity) ?? 99) - (ORDER.get(b.severity) ?? 99) || a.id.localeCompare(b.id),
  )
}

export interface FindingFilter {
  severities: ReadonlySet<Severity>
  areas: ReadonlySet<Area>
}

/** An empty set means "no filter on this axis". */
export function filterFindings(findings: readonly Finding[], filter: FindingFilter): Finding[] {
  return findings.filter(
    (f) =>
      (filter.severities.size === 0 || filter.severities.has(f.severity)) &&
      (filter.areas.size === 0 || filter.areas.has(f.area)),
  )
}

export function countBySeverity(findings: readonly Finding[]): Record<Severity, number> {
  const counts: Record<Severity, number> = { Critical: 0, High: 0, Medium: 0, Low: 0, Info: 0 }
  for (const f of findings) counts[f.severity] += 1
  return counts
}

export function countByArea(findings: readonly Finding[]): Record<Area, number> {
  const counts: Record<Area, number> = { Secrets: 0, Dependencies: 0, HTTP: 0, Code: 0 }
  for (const f of findings) counts[f.area] += 1
  return counts
}

export function severityTallyText(counts: Record<Severity, number>): string {
  return SEVERITIES.map((s) => `${counts[s]} ${s}`).join(', ')
}
