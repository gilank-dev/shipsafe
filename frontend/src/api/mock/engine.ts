import { AREAS } from '../../config/agents'
import { MAX_ZIP_BYTES } from '../../config/limits'
import { countBySeverity } from '../../domain/findings'
import { hashString } from '../../domain/hash'
import type {
  AgentTarget,
  Area,
  AuditReport,
  AuditRequest,
  Finding,
  ScorecardRow,
  Severity,
} from '../../domain/types'
import { ApiError } from '../errors'
import type { AuditOptions, AuditResult, ShipSafeApi } from '../types'
import { analyzeStructure } from './heuristics'
import { inspectEntries } from './inspect'
import { buildPrompt, type BaseFinding } from './prompts'
import { harborlog } from './scenarios/harborlog'
import { ledgerline } from './scenarios/ledgerline'
import type { Scenario } from './scenarios/types'
import { waybill } from './scenarios/waybill'
import { readZipEntries } from './zip-entries'

const SCENARIOS: Record<string, Scenario> = { ledgerline, waybill, harborlog }

// Failure sentinels in the file name let tests and demos reach every error state.
const SENTINELS: Record<string, () => ApiError> = {
  __mock_fail_rate_limited: () => new ApiError('rate_limited', 'Too many requests.', 8000),
  __mock_fail_timeout: () => new ApiError('timeout', 'The audit timed out.'),
  __mock_fail_server: () => new ApiError('server', 'The audit service failed.'),
  __mock_fail_captcha: () => new ApiError('captcha_failed', 'Verifikasi CAPTCHA Cloudflare gagal atau kedaluwarsa. Silakan coba lagi.'),
}

const WEIGHT: Record<Severity, number> = { Critical: 4, High: 2.5, Medium: 1, Low: 0.4, Info: 0 }

interface StoredReport {
  scenario: Scenario
  findings: BaseFinding[]
}
const store = new Map<string, StoredReport>()

function latencyEnabled(): boolean {
  return import.meta.env.VITE_MOCK_LATENCY !== 'none'
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  if (!latencyEnabled()) {
    if (signal.aborted) return Promise.reject(new ApiError('aborted', 'Audit cancelled.'))
    return Promise.resolve()
  }
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new ApiError('aborted', 'Audit cancelled.'))
      return
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(timer)
      reject(new ApiError('aborted', 'Audit cancelled.'))
    }
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

function statusForScore(score: number | null): string {
  if (score === null) return 'Not assessed'
  if (score >= 8) return 'Pass'
  if (score >= 5) return 'Partial'
  return 'Fail'
}

function buildScorecard(findings: readonly BaseFinding[], contentsRead: boolean): ScorecardRow[] {
  return AREAS.map(({ id }): ScorecardRow => {
    const inArea = findings.filter((f) => f.area === id)
    if (!contentsRead) {
      return {
        area: id as Area,
        score: null,
        status: 'Not assessed',
        topConcern: inArea[0]?.title ?? 'File contents were not read in mock mode.',
      }
    }
    const penalty = inArea.reduce((sum, f) => sum + WEIGHT[f.severity], 0)
    const score = Math.max(0, Math.min(10, Math.round(10 - penalty)))
    const top = [...inArea].sort((a, b) => WEIGHT[b.severity] - WEIGHT[a.severity])[0]
    return {
      area: id as Area,
      score,
      status: statusForScore(score),
      topConcern: top && top.severity !== 'Info' ? top.title : 'No significant concern found.',
    }
  })
}

function withPrompts(findings: readonly BaseFinding[], target: AgentTarget, project: string): Finding[] {
  return findings.map((f) => ({ ...f, remediationPrompt: buildPrompt(f, target, project) }))
}

function pickScenario(fileName: string): Scenario | null {
  const key = fileName.toLowerCase().split(/[-_.]/)[0] ?? ''
  return SCENARIOS[key] ?? null
}

function projectNameOf(fileName: string): string {
  const base = fileName.replace(/\.zip$/i, '')
  return base.length > 0 ? base : 'this project'
}

async function audit(req: AuditRequest, opts: AuditOptions): Promise<AuditResult> {
  const { file, agentTarget } = req
  const { signal, onStage } = opts

  for (const [sentinel, make] of Object.entries(SENTINELS)) {
    if (file.name.includes(sentinel)) {
      onStage('upload', 100)
      await sleep(400, signal)
      throw make()
    }
  }
  if (file.size > MAX_ZIP_BYTES) throw new ApiError('too_large', 'The server rejected this ZIP as too large.')

  // upload
  for (const pct of [0, 25, 60, 100]) {
    onStage('upload', pct)
    await sleep(180, signal)
  }

  // scanning: read the central directory only. Nothing is extracted or executed.
  onStage('scanning')
  const entries = await readZipEntries(file)
  const inspection = inspectEntries(entries)
  if (inspection.unsafeReason) throw new ApiError('unsafe_archive', inspection.unsafeReason)
  await sleep(700, signal)

  // auditing: deterministic duration from the file identity so repeat runs feel consistent
  onStage('auditing')
  const seed = Number.parseInt(hashString(`${file.name}${file.size}`).slice(0, 4), 36) % 1200
  await sleep(1200 + seed, signal)

  const authored = pickScenario(file.name)
  const scenario = authored ?? analyzeStructure(projectNameOf(file.name), inspection.kept, inspection.skipped)
  const contentsRead = authored !== null

  const skippedFiles = [...inspection.skipped, ...scenario.skippedFiles]
  const findings = withPrompts(scenario.findings, agentTarget, scenario.projectName)
  const report: AuditReport = {
    summary: scenario.summary,
    countsBySeverity: countBySeverity(findings),
    scorecard: buildScorecard(scenario.findings, contentsRead),
    threatMatrix: [
      { key: 'sqli', name: 'SQL Injection (SQLi)', category: 'Database & Data Integrity', status: 'Secure', findingsCount: 0, summary: 'Tidak ditemukan konkatenasi query SQL berbahaya; menggunakan query builder atau parameterized queries.', mitigationTip: 'Pertahankan penggunaan parameterized queries ($1, ?) atau ORM yang aman.' },
      { key: 'xss', name: 'Cross-Site Scripting (XSS)', category: 'Client & Browser Security', status: 'Secure', findingsCount: 0, summary: 'Tidak ditemukan penyisipan markup tidak tersanitasi; DOM dan template output terlindungi.', mitigationTip: 'Gunakan DOMPurify dan aktifkan Content-Security-Policy (CSP) ketat.' },
      { key: 'ddos', name: 'Distributed Denial-of-Service (DDoS)', category: 'Availability & Resource Limits', status: 'Secure', findingsCount: 0, summary: 'Proteksi resource limit dan pola regex aman dari kelebihan beban backtracking.', mitigationTip: 'Terapkan rate-limiting pada endpoint publik dan batasi ukuran payload request.' },
      { key: 'brute_force', name: 'Brute Force & Credential Stuffing', category: 'Authentication & Access', status: 'Secure', findingsCount: 0, summary: 'Verifikasi kata sandi kriptografis dan tidak ditemukan pola perbandingan string sederhana.', mitigationTip: 'Gunakan algoritma hash modern (bcrypt/Argon2) dan batasi percobaan login.' },
      { key: 'malware_shell', name: 'Malware & Upload Web Shell', category: 'Server Integrity & RCE', status: 'Secure', findingsCount: 0, summary: 'Arsip bersih dari signature backdoor web shell dan handler upload file yang rentan.', mitigationTip: 'Validasi ekstensi file dengan whitelist ketat dan simpan di luar webroot publik.' },
      { key: 'mitm', name: 'Man-in-the-Middle (MitM)', category: 'Transport & Encryption', status: 'Secure', findingsCount: 0, summary: 'Verifikasi sertifikat TLS aktif dan transmisi sensitif tidak menggunakan plaintext HTTP.', mitigationTip: 'Wajibkan HTTPS, aktifkan HSTS, dan setel flag Secure/HttpOnly pada cookies.' },
      { key: 'phishing', name: 'Phishing & Social Engineering', category: 'Redirects & Clickjacking', status: 'Secure', findingsCount: 0, summary: 'Tidak ditemukan endpoint open redirect atau risiko framing antarmuka tanpa batas.', mitigationTip: 'Batasi target pengalihan ke URL internal dan pasang header X-Frame-Options: DENY.' },
      { key: 'deface', name: 'Website Defacement Risk', category: 'Content & Asset Protection', status: 'Secure', findingsCount: 0, summary: 'Berkas template dan webroot terlindungi dari modifikasi runtime tidak terotorisasi.', mitigationTip: 'Terapkan izin file read-only pada direktori statis dan amankan rute CMS.' },
      { key: 'lfi_rfi', name: 'Local / Remote File Inclusion (LFI/RFI)', category: 'File System & SSRF', status: 'Secure', findingsCount: 0, summary: 'Akses sistem file terlindungi dari path traversal dan tidak ada SSRF terbuka.', mitigationTip: 'Sanitasi path dengan path.basename() dan batasi request server ke domain tepercaya.' },
      { key: 'zero_day', name: 'Zero-Day & Dynamic Code Execution', category: 'Runtime & Supply Chain', status: 'Secure', findingsCount: 0, summary: 'Tidak ada penggunaan fungsi eksekusi dinamis eval() atau prototype pollution.', mitigationTip: 'Gunakan dependensi versi terkunci (lockfile) dan hindari evaluasi kode runtime.' }
    ],
    findings,
    secretsToRotate: scenario.secretsToRotate,
    notAssessed: scenario.notAssessed,
    skippedFiles,
  }

  const reportId = `mock-${hashString(file.name + file.size + Date.now())}`
  store.set(reportId, { scenario, findings: scenario.findings })
  onStage('report')
  return { reportId, report }
}

async function formatPrompts(
  reportId: string,
  target: AgentTarget,
  opts: { signal: AbortSignal },
): Promise<Record<string, string>> {
  await sleep(500, opts.signal)
  const stored = store.get(reportId)
  if (!stored) throw new ApiError('bad_response', 'This report is no longer available. Run the audit again.')
  return Object.fromEntries(
    stored.findings.map((f) => [f.id, buildPrompt(f, target, stored.scenario.projectName)]),
  )
}

export const mockApi: ShipSafeApi = { audit, formatPrompts }
