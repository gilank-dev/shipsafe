// Types mirror shipsafe-spec.md section 9.2 with extensions for 10-threat checks & concurrency queue.
export type Severity = 'Critical' | 'High' | 'Medium' | 'Low' | 'Info'
export type Area = 'Secrets' | 'Dependencies' | 'HTTP' | 'Code'
export type AgentTarget = 'Generic' | 'Cursor' | 'ClaudeCode' | 'Copilot' | 'Windsurf'

export type ThreatKey =
  | 'sqli'
  | 'xss'
  | 'ddos'
  | 'brute_force'
  | 'malware_shell'
  | 'mitm'
  | 'phishing'
  | 'deface'
  | 'lfi_rfi'
  | 'zero_day'

export interface ThreatCheck {
  key: ThreatKey
  name: string
  category: string
  status: 'Secure' | 'Warning' | 'Vulnerable' | 'Not Assessed'
  findingsCount: number
  summary: string
  mitigationTip: string
}

export interface FindingLocation {
  file: string
  line?: number
  snippet?: string
}

export type Confidence = 'Confirmed' | 'Likely, verify' | 'Not enough information'

export interface Finding {
  id: string
  title: string
  severity: Severity
  area: Area
  threatCategory?: ThreatKey
  /** Never invented. Absent means "Location not determined". */
  location?: FindingLocation
  what: string
  why: string
  recommendedFix: string
  verifyWith?: string
  remediationPrompt: string
  /** EXTENSION: spec 5.2 requires uncertainty to be explicit. */
  confidence?: Confidence
}

export interface ScorecardRow {
  area: Area
  /** EXTENSION: null means the area could not be assessed. */
  score: number | null
  status: string
  topConcern: string
}

export interface QueueStats {
  activeWorkers: number
  maxConcurrency: number
  waitingInQueue: number
  capacity: number
}

export interface AuditReport {
  id?: string
  summary: string
  countsBySeverity: Record<Severity, number>
  scorecard: ScorecardRow[]
  threatMatrix?: ThreatCheck[]
  findings: Finding[]
  secretsToRotate: string[]
  notAssessed: string[]
  skippedFiles: string[]
  queueStats?: QueueStats
  aiEnhanced?: boolean
  aiInsights?: string
  createdAt?: string
}

export type AuditStage = 'upload' | 'scanning' | 'auditing' | 'report'

export type ApiErrorKind =
  | 'network'
  | 'timeout'
  | 'rate_limited'
  | 'queue_full'
  | 'queue_timeout'
  | 'too_large'
  | 'not_zip'
  | 'unsafe_archive'
  | 'captcha_failed'
  | 'server'
  | 'bad_response'
  | 'aborted'

export interface ProjectContext {
  description: string
  deployTarget: string
  handlesPII: boolean
  handlesPayments: boolean
}

export interface AuditRequest {
  file: File
  context: ProjectContext
  agentTarget: AgentTarget
  turnstileToken?: string
}

