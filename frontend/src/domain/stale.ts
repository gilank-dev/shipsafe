import type { ProjectContext } from './types'
import { hashString } from './hash'

/** Identity of what the audit was based on: the ZIP and the project context. */
export function snapshotOf(file: File | null, context: ProjectContext): string {
  const fileKey = file ? `${file.name}|${file.size}|${file.lastModified}` : 'no-file'
  const ctx = [
    context.description.trim(),
    context.deployTarget,
    context.handlesPII ? 'pii' : 'no-pii',
    context.handlesPayments ? 'pay' : 'no-pay',
  ].join('|')
  return hashString(`${fileKey}::${ctx}`)
}

/** A report is Outdated when its snapshot differs from the current inputs. Reverting an edit clears it. */
export function isOutdated(reportSnapshot: string | null, currentSnapshot: string): boolean {
  return reportSnapshot !== null && reportSnapshot !== currentSnapshot
}
