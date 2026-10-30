import { api, isApiError } from '../api/client'
import { agentLabel } from '../config/agents'
import type { AgentTarget, AuditReport } from '../domain/types'
import { hitKey, scanSecrets, type SecretHit } from '../domain/secrets'
import { snapshotOf } from '../domain/stale'
import { validateZipFile } from '../domain/zip-validate'
import { saveAuditToSupabase } from '../lib/supabase'
import { announce } from './announcer'
import { initialAudit, initialSubmission, useStore } from './store'
import { toast } from './toast'

export type AuditRequestResult =
  | { started: true }
  | { started: false; reason: 'no_file' | 'invalid_file' | 'busy' | 'unauthorized' }
  | { started: false; reason: 'needs_confirmation'; hits: SecretHit[] }

let controller: AbortController | null = null
let promptsController: AbortController | null = null
// Session-scoped. Hits the user chose to send are not asked about again.
const acknowledged = new Set<string>()

const get = () => useStore.getState()

/** Validates and stores a chosen file. Called by the dropzone and by the controller before every run. */
export async function selectFile(input: File | File[] | FileList): Promise<boolean> {
  if (!get().auth.user) {
    get().setAuthModalOpen(true)
    const msg = 'Authentication required. Please sign in with GitHub or Google before uploading files.'
    announce(msg)
    toast.error(msg)
    return false
  }
  const result = await validateZipFile(input)
  if (!result.ok) {
    get().setFile(null, result.message)
    announce(result.message)
    return false
  }
  const file = 'length' in input ? (Array.from(input)[0] as File) : input
  get().setFile(file, null)
  announce(`${file.name} selected`)
  return true
}

export async function importGitHubRepo(repoUrl: string): Promise<boolean> {
  if (!get().auth.user) {
    get().setAuthModalOpen(true)
    const msg = 'Authentication required. Please sign in with GitHub or Google before importing repositories.'
    announce(msg)
    toast.error(msg)
    throw new Error(msg)
  }
  const trimmed = repoUrl.trim()
  if (!trimmed) {
    const msg = 'Please enter a valid GitHub repository URL or owner/repo format.'
    announce(msg)
    throw new Error(msg)
  }

  try {
    announce(`Importing repository ${trimmed} from GitHub...`)
    const file = await api.importRepo(trimmed)
    const success = await selectFile(file)
    if (success) {
      toast.success(`Imported ${file.name} from GitHub`)
    }
    return success
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to import repository from GitHub.'
    announce(message)
    toast.error(message)
    throw err
  }
}

export function acknowledgeHits(hits: readonly SecretHit[]): void {
  hits.forEach((h) => acknowledged.add(hitKey(h)))
}

/**
 * Guard order: (1) validate the ZIP again, (2) scan the free text for secrets, (3) call the API.
 * The secret dialog is opened by the UI when this returns needs_confirmation.
 */
export async function requestAudit(): Promise<AuditRequestResult> {
  if (get().audit.status === 'running') return { started: false, reason: 'busy' }
  const { file, description } = get().submission
  if (!file) return { started: false, reason: 'no_file' }

  // Mandatory Authentication Check
  if (!get().auth.user) {
    get().setAuthModalOpen(true)
    const msg = 'Authentication required. Please sign in with GitHub or Google before auditing code.'
    announce(msg)
    toast.error(msg)
    return { started: false, reason: 'unauthorized' }
  }

  // Quota Limit Check: If Free tier limit is reached, show upgrade plan popup immediately
  const { quota } = get()
  if (quota && quota.tier === 'free' && quota.used >= quota.limit) {
    get().openPaywallModal('quota')
    const msg = `Batas kuota audit bulanan untuk paket Free telah tercapai (${quota.used}/${quota.limit}). Silakan upgrade ke Pro.`
    announce(msg)
    toast.error(msg)
    return { started: false, reason: 'invalid_file' }
  }

  const check = await validateZipFile(file)
  if (!check.ok) {
    get().setFile(null, check.message)
    announce(check.message)
    return { started: false, reason: 'invalid_file' }
  }

  const pending = scanSecrets(description).filter((h) => !acknowledged.has(hitKey(h)))
  if (pending.length > 0) return { started: false, reason: 'needs_confirmation', hits: pending }

  void runAudit()
  return { started: true }
}

async function runAudit(): Promise<void> {
  const { submission } = get()
  const file = submission.file
  if (!file) return
  const context = {
    description: submission.description,
    deployTarget: submission.deployTarget,
    handlesPII: submission.handlesPII,
    handlesPayments: submission.handlesPayments,
  }
  const snapshot = snapshotOf(file, context)
  const hadReport = get().audit.report !== null

  controller?.abort()
  const ctrl = new AbortController()
  controller = ctrl
  get().patchAudit({
    status: 'running',
    stage: 'upload',
    uploadPct: 0,
    startedAt: Date.now(),
    error: null,
    promptsStatus: 'idle',
    promptsError: null,
  })
  announce('Audit started')

  try {
    const { reportId, report } = await api.audit(
      {
        file,
        context,
        agentTarget: submission.agentTarget,
        turnstileToken: submission.turnstileToken ?? undefined,
      },
      {
        signal: ctrl.signal,
        onStage: (stage, pct) => {
          if (ctrl.signal.aborted) return
          get().patchAudit({ stage, ...(pct !== undefined ? { uploadPct: pct } : {}) })
        },
      },
    )
    if (ctrl.signal.aborted) return
    get().patchAudit({
      status: 'done',
      stage: 'report',
      reportId,
      report,
      reportAgent: submission.agentTarget,
      reportFileName: file.name,
      snapshot,
      finishedAt: Date.now(),
      error: null,
    })
    announce(`Audit finished. ${report.findings.length} findings.`)
    get().setTurnstileToken(null)

    if (get().auth.user) {
      void saveAuditToSupabase(report, file.name)
        .then(({ id, error }) => {
          if (!error && id) {
            toast.info('Audit report successfully saved to your cloud account history.')
          }
        })
        .catch((err) => {
          console.warn('[ShipSafe] Failed to save audit to cloud history:', err)
        })
    }
  } catch (err) {
    if (ctrl.signal.aborted || (isApiError(err) && err.kind === 'aborted')) {
      // Cancel is silent: return to the state before the run.
      get().patchAudit({ status: hadReport ? 'done' : 'idle', stage: null })
      get().setTurnstileToken(null)
      return
    }
    if (isApiError(err) && err.kind === 'captcha_failed') {
      get().setTurnstileToken(null)
    }
    if (
      isApiError(err) &&
      (err.kind === 'quota_exceeded' ||
        err.message.toLowerCase().includes('kuota') ||
        err.message.toLowerCase().includes('quota'))
    ) {
      get().openPaywallModal('quota')
    }
    const view = isApiError(err)
      ? { kind: err.kind, message: err.message, ...(err.retryAfterMs !== undefined ? { retryAfterMs: err.retryAfterMs } : {}) }
      : { kind: 'server' as const, message: 'The audit service failed on its side.' }
    get().patchAudit({ status: 'error', stage: null, error: view })
    announce('Audit failed')
  } finally {
    if (controller === ctrl) controller = null
  }
}

export function cancelAudit(): void {
  controller?.abort()
  if (get().audit.status === 'running') {
    get().patchAudit({ status: get().audit.report ? 'done' : 'idle', stage: null })
    get().setTurnstileToken(null)
    announce('Audit cancelled')
  }
}

/** Switching the agent after a report re-formats prompts only. Finding content never changes. */
export async function changeAgentTarget(target: AgentTarget): Promise<void> {
  get().setAgentTarget(target)
  const { reportId, report, status } = get().audit
  if (!reportId || !report || status !== 'done') return

  promptsController?.abort()
  const ctrl = new AbortController()
  promptsController = ctrl
  get().patchAudit({ promptsStatus: 'updating', promptsError: null })
  try {
    const prompts = await api.formatPrompts(reportId, target, { signal: ctrl.signal })
    if (ctrl.signal.aborted) return
    const current = get().audit.report
    if (!current) return
    // Swap every prompt in one store update so the list never shows a mix of agents.
    const next: AuditReport = {
      ...current,
      findings: current.findings.map((f) => ({ ...f, remediationPrompt: prompts[f.id] ?? f.remediationPrompt })),
    }
    get().patchAudit({ report: next, reportAgent: target, promptsStatus: 'idle' })
    announce(`Prompts updated for ${agentLabel(target)}`)
  } catch (err) {
    if (ctrl.signal.aborted || (isApiError(err) && err.kind === 'aborted')) return
    // Keep the old prompts and say so inline.
    get().patchAudit({
      promptsStatus: 'error',
      promptsError: `Could not update prompts for ${agentLabel(target)}. The previous prompts are still shown. Try switching again.`,
    })
  }
}

export function resetAll(): void {
  controller?.abort()
  promptsController?.abort()
  acknowledged.clear()
  useStore.setState({ submission: initialSubmission, audit: initialAudit })
}

export function loadAuditFromHistory(report: AuditReport, projectName: string): void {
  controller?.abort()
  promptsController?.abort()
  get().patchAudit({
    status: 'done',
    stage: 'report',
    reportId: report.id ?? 'history-report',
    report,
    reportAgent: 'Generic',
    reportFileName: projectName,
    snapshot: null,
    finishedAt: Date.now(),
    error: null,
  })
  announce(`Loaded audit report for ${projectName}`)
}
