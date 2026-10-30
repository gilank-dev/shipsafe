import { describe, it, expect } from 'vitest'
import { recordUserScanUsage, getUserSyncProfile, listScanTelemetry } from './admin-controller'

describe('CLI & MCP Scan Quota and Usage Recording', () => {
  it('increments audit usage and returns quota details for CLI scan', async () => {
    const testUser = `cli-tester-${Date.now()}-1@shipsafe.dev`
    const beforeProfile = await getUserSyncProfile(testUser)
    const initialUsed = beforeProfile.quota.used

    const result = await recordUserScanUsage(testUser, {
      channel: 'CLI',
      findingsCount: 2,
      durationMs: 450,
      severityCounts: { Critical: 1, High: 1, Medium: 0, Low: 0, Info: 0 },
    })

    expect(result.allowed).toBe(true)
    expect(result.user.email).toBe(testUser)
    expect(result.quota.used).toBe(initialUsed + 1)
    expect(result.quota.remaining).toBe(Math.max(0, result.quota.limit - (initialUsed + 1)))

    const telemetry = listScanTelemetry()
    const lastEntry = telemetry[0]
    expect(lastEntry).toBeDefined()
    expect(lastEntry.userEmail).toBe(testUser)
    expect(lastEntry.channel).toBe('CLI')
    expect(lastEntry.findingsCount).toBe(2)
    expect(lastEntry.securityGateStatus).toBe('[OK // COMPLETED]')
  })

  it('records MCP channel scans accurately in telemetry', async () => {
    const testUser = `mcp-tester-${Date.now()}-2@shipsafe.dev`
    const result = await recordUserScanUsage(testUser, {
      channel: 'MCP',
      findingsCount: 5,
      durationMs: 80,
    })

    expect(result.allowed).toBe(true)
    const telemetry = listScanTelemetry()
    expect(telemetry[0].channel).toBe('MCP')
  })

  it('blocks scan and returns 429 quota exhaustion when limit is reached for non-admin', async () => {
    const limitedUser = `quota-maxed-${Date.now()}@test.dev`
    const profile = await getUserSyncProfile(limitedUser)
    const limit = profile.quota.limit

    // Run scans up to the limit
    for (let i = 0; i < limit; i++) {
      const res = await recordUserScanUsage(limitedUser, { channel: 'CLI' })
      expect(res.allowed).toBe(true)
    }

    // Next scan should be denied
    const denied = await recordUserScanUsage(limitedUser, { channel: 'CLI' })
    expect(denied.allowed).toBe(false)
    expect(denied.quota.remaining).toBe(0)
    expect(denied.quota.used).toBeGreaterThanOrEqual(limit)

    const telemetry = listScanTelemetry()
    expect(telemetry[0].securityGateStatus).toBe('[DENIED // QUOTA_EXCEEDED]')
  })

  it('allows super admin to exceed default quota limits', async () => {
    const superAdmin = 'hi@lankdev.my.id'
    const res = await recordUserScanUsage(superAdmin, { channel: 'CLI' })
    expect(res.allowed).toBe(true)
    expect(res.user.isSuperAdmin).toBe(true)
  })
})
