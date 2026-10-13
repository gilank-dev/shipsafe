import type { AgentTarget, AuditReport, AuditRequest, AuditStage } from '../domain/types'

export interface AuditOptions {
  signal: AbortSignal
  onStage: (stage: AuditStage, uploadPct?: number) => void
}

export interface AuditResult {
  reportId: string
  report: AuditReport
}

/** The only I/O surface the UI knows about. Implemented by the mock engine and the HTTP client. */
export interface ShipSafeApi {
  audit(req: AuditRequest, opts: AuditOptions): Promise<AuditResult>
  /** Returns finding id -> prompt formatted for the target agent. */
  formatPrompts(reportId: string, target: AgentTarget, opts: { signal: AbortSignal }): Promise<Record<string, string>>
}
