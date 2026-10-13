import { AREAS, SEVERITIES } from '../config/agents'
import { MAX_RESPONSE_CHARS } from '../config/limits'
import type { Area, AuditReport, Finding, Severity, ScorecardRow, Confidence, ThreatCheck, ThreatKey } from '../domain/types'
import { ApiError } from './errors'

function bad(detail: string): never {
  throw new ApiError('bad_response', `The service returned an unusable report (${detail}). Retry.`)
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const str = (v: unknown, name: string, required = true): string => {
  if (typeof v === 'string' && (v.length > 0 || !required)) return v
  return bad(`missing ${name}`)
}
const strList = (v: unknown, name: string): string[] => {
  if (!Array.isArray(v) || v.some((x) => typeof x !== 'string')) return bad(`${name} must be a list of text`)
  return v as string[]
}
const CONFIDENCES: readonly Confidence[] = ['Confirmed', 'Likely, verify', 'Not enough information']

function parseFinding(raw: unknown): Finding {
  if (!isObj(raw)) return bad('finding is not an object')
  const severity = raw.severity as Severity
  const area = raw.area as Area
  if (!SEVERITIES.includes(severity)) bad('unknown severity')
  if (!AREAS.some((a) => a.id === area)) bad('unknown area')
  const finding: Finding = {
    id: str(raw.id, 'id'),
    title: str(raw.title, 'title'),
    severity,
    area,
    what: str(raw.what, 'what'),
    why: str(raw.why, 'why'),
    recommendedFix: str(raw.recommendedFix, 'recommendedFix'),
    // Spec Req 6.1: every finding carries a remediation prompt.
    remediationPrompt: str(raw.remediationPrompt, 'remediationPrompt'),
  }
  if (isObj(raw.location)) {
    const loc = raw.location
    finding.location = { file: str(loc.file, 'location.file') }
    if (typeof loc.line === 'number') finding.location.line = loc.line
    if (typeof loc.snippet === 'string') finding.location.snippet = loc.snippet
  }
  if (typeof raw.verifyWith === 'string') finding.verifyWith = raw.verifyWith
  if (typeof raw.confidence === 'string' && CONFIDENCES.includes(raw.confidence as Confidence)) {
    finding.confidence = raw.confidence as Confidence
  }
  if (typeof raw.threatCategory === 'string') {
    finding.threatCategory = raw.threatCategory as ThreatKey
  }
  return finding
}

function parseScorecard(raw: unknown): ScorecardRow[] {
  if (!Array.isArray(raw)) return bad('scorecard must be a list')
  return raw.map((row): ScorecardRow => {
    if (!isObj(row)) return bad('scorecard row is not an object')
    const score = row.score
    if (score !== null && (typeof score !== 'number' || score < 0 || score > 10)) bad('scorecard score out of range')
    return {
      area: row.area as Area,
      score: score as number | null,
      status: str(row.status, 'status'),
      topConcern: str(row.topConcern, 'topConcern', false),
    }
  })
}

function parseThreatMatrix(raw: unknown): ThreatCheck[] | undefined {
  if (!Array.isArray(raw)) return undefined
  return raw.map((item): ThreatCheck => {
    if (!isObj(item)) return bad('threat item is not an object')
    return {
      key: str(item.key, 'key') as ThreatKey,
      name: str(item.name, 'name'),
      category: str(item.category, 'category'),
      status: str(item.status, 'status') as any,
      findingsCount: typeof item.findingsCount === 'number' ? item.findingsCount : 0,
      summary: str(item.summary, 'summary'),
      mitigationTip: typeof item.mitigationTip === 'string' ? item.mitigationTip : '',
    }
  })
}

/** Validates an untrusted API payload. Throws ApiError('bad_response') on any shape problem. */
export function parseReport(raw: unknown): AuditReport {
  if (!isObj(raw)) return bad('not an object')
  if (JSON.stringify(raw).length > MAX_RESPONSE_CHARS) bad('too large')
  if (!isObj(raw.countsBySeverity)) bad('missing countsBySeverity')
  const counts = {} as Record<Severity, number>
  for (const s of SEVERITIES) {
    const n = (raw.countsBySeverity as Record<string, unknown>)[s]
    if (typeof n !== 'number') bad(`missing count for ${s}`)
    counts[s] = n as number
  }
  if (!Array.isArray(raw.findings)) bad('missing findings')
  return {
    id: typeof raw.id === 'string' ? raw.id : undefined,
    summary: str(raw.summary, 'summary'),
    countsBySeverity: counts,
    scorecard: parseScorecard(raw.scorecard),
    threatMatrix: parseThreatMatrix(raw.threatMatrix),
    findings: (raw.findings as unknown[]).map(parseFinding),
    secretsToRotate: strList(raw.secretsToRotate, 'secretsToRotate'),
    notAssessed: strList(raw.notAssessed, 'notAssessed'),
    skippedFiles: strList(raw.skippedFiles, 'skippedFiles'),
    aiEnhanced: typeof raw.aiEnhanced === 'boolean' ? raw.aiEnhanced : undefined,
    aiInsights: typeof raw.aiInsights === 'string' ? raw.aiInsights : undefined,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : undefined,
  }
}
