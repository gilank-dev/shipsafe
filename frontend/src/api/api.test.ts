import { describe, expect, it } from 'vitest'
import { SAMPLES } from '../config/samples'
import { AGENT_TARGETS } from '../config/agents'
import { scanSecrets } from '../domain/secrets'
import { countBySeverity } from '../domain/findings'
import type { AgentTarget, AuditReport } from '../domain/types'
import { ApiError } from './errors'
import { mapHttpError } from './http'
import { inspectEntries } from './mock/inspect'
import { mockApi } from './mock/engine'
import { buildSample } from './mock/sample-zips'
import { buildZipFile } from './mock/zip-build'
import { readZipEntries, type ZipEntry } from './mock/zip-entries'
import { parseReport } from './parse-report'

const entry = (name: string, extra: Partial<ZipEntry> = {}): ZipEntry => ({
  name,
  compressedSize: 100,
  uncompressedSize: 200,
  isDirectory: name.endsWith('/'),
  isSymlink: false,
  ...extra,
})

async function runAudit(file: File, target: AgentTarget = 'Generic') {
  const stages: string[] = []
  const result = await mockApi.audit(
    { file, agentTarget: target, context: { description: '', deployTarget: 'Not specified', handlesPII: false, handlesPayments: false } },
    { signal: new AbortController().signal, onStage: (s) => stages.push(s) },
  )
  return { ...result, stages }
}

describe('zip entry reader', () => {
  it('reads names, sizes and the symlink flag from the central directory', async () => {
    const file = buildZipFile('t.zip', [
      { name: 'app/page.tsx', content: 'export {}' },
      { name: 'link', content: 'app', symlink: true },
    ])
    const entries = await readZipEntries(file)
    expect(entries.map((e) => e.name)).toEqual(['app/page.tsx', 'link'])
    expect(entries[0]?.uncompressedSize).toBe(9)
    expect(entries[1]?.isSymlink).toBe(true)
  })

  it('rejects bytes that are not a ZIP', async () => {
    await expect(readZipEntries(new Blob([new Uint8Array(64)]))).rejects.toMatchObject({ kind: 'not_zip' })
  })
})

describe('archive safety rules (mirror of spec 4.1 and 4.2)', () => {
  it('rejects path traversal', () => {
    expect(inspectEntries([entry('../../etc/passwd')]).unsafeReason).toContain('path traversal')
    expect(inspectEntries([entry('a/../../b')]).unsafeReason).toContain('path traversal')
  })
  it('rejects absolute paths and drive letters', () => {
    expect(inspectEntries([entry('/etc/cron.d/x')]).unsafeReason).toContain('absolute path')
    expect(inspectEntries([entry('C:\\Windows\\x')]).unsafeReason).toContain('drive letter')
  })
  it('rejects more than 5,000 entries', () => {
    const many = Array.from({ length: 5001 }, (_, i) => entry(`f${i}.txt`))
    expect(inspectEntries(many).unsafeReason).toContain('5,000')
  })
  it('rejects more than 100 MB declared when extracted', () => {
    const big = entry('big.txt', { compressedSize: 90 * 1024 * 1024, uncompressedSize: 101 * 1024 * 1024 })
    expect(inspectEntries([big]).unsafeReason).toContain('100 MB')
  })
  it('rejects a compression ratio above 100:1', () => {
    const bomb = entry('bomb.txt', { compressedSize: 1000, uncompressedSize: 500_000 })
    expect(inspectEntries([bomb]).unsafeReason).toContain('100:1')
  })
  it('rejects extreme directory depth', () => {
    const deep = entry(Array.from({ length: 25 }, () => 'd').join('/') + '/f.txt')
    expect(inspectEntries([deep]).unsafeReason).toContain('nested')
  })
  it('ignores symlinks and noise folders and lists them as skipped', () => {
    const result = inspectEntries([
      entry('src/a.ts'),
      entry('link', { isSymlink: true }),
      entry('node_modules/x/index.js'),
      entry('public/logo.png'),
    ])
    expect(result.unsafeReason).toBeUndefined()
    expect(result.kept.map((e) => e.name)).toEqual(['src/a.ts'])
    expect(result.skipped).toHaveLength(3)
  })
})

describe('mock engine', () => {
  it.each(SAMPLES.map((s) => s.id))('%s returns all five report sections and consistent counts', async (id) => {
    const { file } = buildSample(id)
    const { report, stages } = await runAudit(file)
    expect(stages).toEqual(expect.arrayContaining(['upload', 'scanning', 'auditing', 'report']))
    expect(report.summary.length).toBeGreaterThan(40)
    expect(report.scorecard).toHaveLength(4)
    expect(Array.isArray(report.secretsToRotate)).toBe(true)
    expect(Array.isArray(report.notAssessed)).toBe(true)
    expect(report.findings.length).toBeGreaterThan(0)
    expect(report.countsBySeverity).toEqual(countBySeverity(report.findings))
  })

  it('Ledgerline has 2 Critical findings and masked secrets to rotate', async () => {
    const { report } = await runAudit(buildSample('ledgerline').file)
    expect(report.countsBySeverity.Critical).toBe(2)
    expect(report.secretsToRotate.length).toBeGreaterThan(0)
    for (const s of report.secretsToRotate) expect(s).toMatch(/\w{4}\*{4}/)
  })

  it('Waybill has no Critical finding and Harborlog only Low and Info', async () => {
    const waybill = (await runAudit(buildSample('waybill').file)).report
    expect(waybill.countsBySeverity.Critical).toBe(0)
    const harbor = (await runAudit(buildSample('harborlog').file)).report
    expect(harbor.countsBySeverity.Critical + harbor.countsBySeverity.High + harbor.countsBySeverity.Medium).toBe(0)
    expect(harbor.secretsToRotate).toEqual([])
  })

  it.each(AGENT_TARGETS.map((a) => a.id))('every finding has a self-contained prompt for %s', async (target) => {
    const { report } = await runAudit(buildSample('ledgerline').file, target)
    for (const f of report.findings) {
      expect(f.remediationPrompt.length).toBeGreaterThan(120)
      expect(f.remediationPrompt).toContain(f.title)
      expect(f.remediationPrompt.toLowerCase()).toContain('secret')
    }
  })

  it('prompts, summaries and findings never contain a scannable secret or a CVE id', async () => {
    for (const s of SAMPLES) {
      const { report } = await runAudit(buildSample(s.id).file, 'Cursor')
      const text = JSON.stringify(report)
      expect(scanSecrets(text)).toEqual([])
      expect(text).not.toMatch(/CVE-\d{4}-\d+/)
    }
  })

  it('dependency findings are labeled "Likely, verify"', async () => {
    const { report } = await runAudit(buildSample('ledgerline').file)
    const deps = report.findings.filter((f) => f.area === 'Dependencies')
    expect(deps.length).toBeGreaterThan(0)
    for (const f of deps) expect(f.confidence).toBe('Likely, verify')
  })

  it('every location points to a path that exists in the sample archive', async () => {
    for (const s of SAMPLES) {
      const sample = buildSample(s.id).file
      const names = new Set((await readZipEntries(sample)).map((e) => e.name))
      const { report } = await runAudit(sample)
      for (const f of report.findings) {
        if (f.location) expect(names.has(f.location.file)).toBe(true)
      }
    }
  })

  it('formatPrompts re-wraps prompts for another agent without changing findings', async () => {
    const first = await runAudit(buildSample('waybill').file, 'Generic')
    const prompts = await mockApi.formatPrompts(first.reportId, 'Cursor', { signal: new AbortController().signal })
    expect(Object.keys(prompts).sort()).toEqual(first.report.findings.map((f) => f.id).sort())
    for (const f of first.report.findings) {
      expect(prompts[f.id]).not.toBe(f.remediationPrompt)
      expect(prompts[f.id]).toContain('@')
    }
  })

  it('structure-only heuristics for an unknown ZIP never claim content findings', async () => {
    const file = buildZipFile('my-project.zip', [
      { name: 'package.json', content: '{}' },
      { name: '.env', content: 'A=1' },
      { name: 'Dockerfile', content: 'FROM node' },
    ])
    const { report } = await runAudit(file)
    expect(report.findings.map((f) => f.title).join(' ')).toContain('.env')
    expect(report.findings.every((f) => !f.location?.line)).toBe(true)
    expect(report.scorecard.every((r) => r.score === null)).toBe(true)
    expect(report.notAssessed.join(' ')).toContain('File contents were not read')
    expect(JSON.stringify(report)).not.toMatch(/CVE-/)
  })

  it('rejects hostile archives with the specific reason', async () => {
    const file = buildZipFile('hostile.zip', [{ name: '../../etc/cron.d/backdoor', content: 'x' }])
    await expect(runAudit(file)).rejects.toMatchObject({ kind: 'unsafe_archive' })
  })

  it.each([
    ['__mock_fail_rate_limited', 'rate_limited'],
    ['__mock_fail_timeout', 'timeout'],
    ['__mock_fail_server', 'server'],
  ])('file name sentinel %s produces %s', async (sentinel, kind) => {
    const file = buildZipFile(`demo${sentinel}.zip`, [{ name: 'a.txt', content: 'x' }])
    await expect(runAudit(file)).rejects.toMatchObject({ kind })
  })

  it('honours an aborted signal', async () => {
    const ctrl = new AbortController()
    ctrl.abort()
    const file = buildSample('waybill').file
    await expect(
      mockApi.audit(
        { file, agentTarget: 'Generic', context: { description: '', deployTarget: '', handlesPII: false, handlesPayments: false } },
        { signal: ctrl.signal, onStage: () => {} },
      ),
    ).rejects.toMatchObject({ kind: 'aborted' })
  })
})

describe('parseReport', () => {
  async function validReport(): Promise<AuditReport> {
    return (await runAudit(buildSample('harborlog').file)).report
  }

  it('accepts a valid report', async () => {
    const report = await validReport()
    expect(parseReport(JSON.parse(JSON.stringify(report))).findings).toHaveLength(report.findings.length)
  })

  it('rejects a report with a finding that has no remediation prompt', async () => {
    const report = JSON.parse(JSON.stringify(await validReport())) as AuditReport
    const first = report.findings[0] as unknown as Record<string, unknown>
    delete first.remediationPrompt
    expect(() => parseReport(report)).toThrow(ApiError)
    expect(() => parseReport(report)).toThrowError(/remediationPrompt/)
  })

  it('rejects payloads that are not objects', () => {
    expect(() => parseReport('nope')).toThrow(ApiError)
    expect(() => parseReport(null)).toThrow(ApiError)
  })
})

describe('mapHttpError', () => {
  it('maps the documented status codes', () => {
    expect(mapHttpError(403, { error: { code: 'captcha_failed', message: 'Turnstile check failed' } })).toMatchObject({
      kind: 'captcha_failed',
      message: 'Turnstile check failed',
    })
    expect(mapHttpError(413, null).kind).toBe('too_large')
    expect(mapHttpError(415, null).kind).toBe('not_zip')
    expect(mapHttpError(422, { error: { message: 'zip-slip entry' } })).toMatchObject({ kind: 'unsafe_archive', message: 'zip-slip entry' })
    expect(mapHttpError(503, null).kind).toBe('server')
  })

  it('reads Retry-After for 429 and defaults to 30 seconds', () => {
    expect(mapHttpError(429, null, '12').retryAfterMs).toBe(12_000)
    expect(mapHttpError(429, null).retryAfterMs).toBe(30_000)
    expect(mapHttpError(429, { error: { retryAfterSeconds: 5 } }).retryAfterMs).toBe(5000)
  })
})
