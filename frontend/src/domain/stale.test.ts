import { describe, expect, it } from 'vitest'
import { isOutdated, snapshotOf } from './stale'
import type { ProjectContext } from './types'

const base: ProjectContext = { description: 'Invoicing app', deployTarget: 'Vercel', handlesPII: true, handlesPayments: false }
const file = new File(['x'], 'app.zip', { lastModified: 1000 })

describe('stale detection', () => {
  it('is not outdated when nothing changed', () => {
    const snap = snapshotOf(file, base)
    expect(isOutdated(snap, snapshotOf(file, base))).toBe(false)
  })

  it('is outdated after a context edit and clears when reverted', () => {
    const snap = snapshotOf(file, base)
    expect(isOutdated(snap, snapshotOf(file, { ...base, description: 'Invoicing app v2' }))).toBe(true)
    expect(isOutdated(snap, snapshotOf(file, { ...base }))).toBe(false)
  })

  it('ignores whitespace at the ends of the description', () => {
    expect(snapshotOf(file, { ...base, description: '  Invoicing app  ' })).toBe(snapshotOf(file, base))
  })

  it('is outdated when the ZIP changes', () => {
    const snap = snapshotOf(file, base)
    const other = new File(['xy'], 'app.zip', { lastModified: 1000 })
    expect(isOutdated(snap, snapshotOf(other, base))).toBe(true)
  })

  it('is never outdated before a report exists', () => {
    expect(isOutdated(null, snapshotOf(file, base))).toBe(false)
  })
})
