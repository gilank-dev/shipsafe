import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SuperAdminDashboard } from './SuperAdminDashboard'
import { toast } from '../ui/Toast'

// Global user state mock
let mockUser: { id: string; email: string; isSuperAdmin: boolean } | null = {
  id: 'usr-root-owner',
  email: 'gilankdev@gmail.com',
  isSuperAdmin: true,
}

vi.mock('../../state/store', () => ({
  useStore: (selector?: (state: Record<string, unknown>) => unknown) => {
    const state = {
      auth: {
        user: mockUser,
      },
    }
    return selector ? selector(state) : state
  },
}))

const mockTelemetry = {
  queue: { activeWorkers: 1, maxWorkers: 3, queuedRequests: 0, display: 'ACTIVE: 1/3 | QUEUED: 0/25' },
  gateway: { status: 'ONLINE // LATENCY: 24ms', latencyMs: 24 },
  sandbox: { lingeringCount: 0, display: '0 LINGERING ARCHIVES // ZERO-PERSISTENCE VERIFIED' },
  intake: { isOpen: true, display: '[INTAKE: OPEN]' },
  totals: {
    totalUsers: 2,
    freeUsers: 1,
    proUsers: 0,
    entUsers: 1,
    activeOrgs: 1,
    scans30d: 42,
    display: 'USERS: 2 (FREE: 1 | PRO: 0 | ENT: 1)',
  },
}

const mockUsers = [
  {
    id: 'usr-owner-gilank',
    email: 'gilankdev@gmail.com',
    fullName: 'Gilank Dev (LankDev Root Owner)',
    oauthProvider: 'GOOGLE',
    tier: 'enterprise',
    isSuperAdmin: true,
    accountStatus: 'active',
    organizationId: null,
    organizationName: null,
    orgRole: 'owner',
    auditsUsed: 4,
    customQuotaLimit: null,
    effectiveLimit: 999999,
    activeCliTokensCount: 1,
    billingCycleStart: '2026-10-01T00:00:00Z',
    lastActiveAt: '2026-10-29T10:00:00Z',
    createdAt: '2026-10-01T00:00:00Z',
  },
  {
    id: 'usr-standard-dev',
    email: 'developer@acme.com',
    fullName: 'Acme Developer',
    oauthProvider: 'GITHUB',
    tier: 'free',
    isSuperAdmin: false,
    accountStatus: 'active',
    organizationId: null,
    organizationName: null,
    orgRole: 'individual',
    auditsUsed: 2,
    customQuotaLimit: null,
    effectiveLimit: 3,
    activeCliTokensCount: 0,
    billingCycleStart: '2026-10-01T00:00:00Z',
    lastActiveAt: '2026-10-29T11:00:00Z',
    createdAt: '2026-10-01T00:00:00Z',
  },
]

const mockOrgs = [
  {
    id: 'org-acme',
    name: 'Acme Security Org',
    ownerId: 'usr-standard-dev',
    ownerEmail: 'developer@acme.com',
    maxSeats: 5,
    whitelabelHeader: 'Acme Enterprise Shield',
    totalScans: 12,
    createdAt: '2026-10-01T00:00:00Z',
    members: [
      {
        userId: 'usr-standard-dev',
        email: 'developer@acme.com',
        fullName: 'ACME DEVELOPER',
        role: 'owner',
        joinedAt: '2026-10-01T00:00:00Z',
      },
    ],
  },
]

const mockVouchers = [
  {
    code: 'SS-PRO-ABCD-2026',
    grantType: 'pro_monthly',
    maxUses: 1,
    uses: 0,
    expiresAt: '2026-11-29T00:00:00Z',
    redeemedBy: [],
    isActive: true,
    createdAt: '2026-10-29T00:00:00Z',
  },
  {
    code: 'SS-ENT-EFGH-2026',
    grantType: 'enterprise_monthly',
    maxUses: 10,
    uses: 2,
    expiresAt: '2026-12-29T00:00:00Z',
    redeemedBy: ['dev1@acme.com', 'dev2@acme.com'],
    isActive: true,
    createdAt: '2026-10-29T00:00:00Z',
  },
]

const mockScanLogs = [
  {
    id: 'scan-log-1',
    timestamp: '2026-10-29T12:00:00Z',
    userEmail: 'developer@acme.com',
    channel: 'WEB',
    zipSizeBytes: 1048576,
    durationMs: 950,
    findingsCount: 3,
    severityCounts: { Critical: 1, High: 1, Medium: 1, Low: 0, Info: 0 },
    securityGateStatus: '[OK // COMPLETED]',
  },
]

const mockCliTokens = [
  {
    id: 'tok-1',
    userEmail: 'developer@acme.com',
    label: 'CI Runner',
    tokenPreview: 'sk_live_1234****',
    createdAt: '2026-10-01T00:00:00Z',
    expiresAt: '2027-10-01T00:00:00Z',
  },
]

const mockAuditLogs = [
  {
    id: 'log-1',
    actorEmail: 'gilankdev@gmail.com',
    targetEmail: 'developer@acme.com',
    actionType: 'CHANGE_TIER',
    diff: { newTier: 'pro' },
    createdAt: '2026-10-29T11:00:00Z',
  },
]

function setupFetchMocks(customOverrides: Record<string, () => Promise<unknown>> = {}) {
  const fetchMock = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
    const urlStr = url.toString()
    const method = options?.method?.toUpperCase() || 'GET'

    const override = customOverrides[`${method} ${urlStr}`] || customOverrides[urlStr]
    if (override) {
      return override()
    }

    if (urlStr.includes('/api/admin/telemetry') && method === 'GET') {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockTelemetry) })
    }
    if (urlStr.includes('/api/admin/users') && method === 'GET') {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ users: mockUsers }) })
    }
    if (urlStr.includes('/api/admin/organizations') && method === 'GET') {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ orgs: mockOrgs }) })
    }
    if (urlStr.includes('/api/admin/vouchers') && method === 'GET') {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ vouchers: mockVouchers }) })
    }
    if (urlStr.includes('/api/admin/telemetry-logs') && method === 'GET') {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ logs: mockScanLogs }) })
    }
    if (urlStr.includes('/api/admin/cli-tokens') && method === 'GET') {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ tokens: mockCliTokens }) })
    }
    if (urlStr.includes('/api/admin/audit-logs') && method === 'GET') {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ logs: mockAuditLogs }) })
    }

    if (method === 'POST' || method === 'DELETE' || method === 'PATCH') {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            isOpen: false,
            status: '[INTAKE: PAUSED]',
            message: 'Operation succeeded.',
            voucher: { code: 'SS-PRO-NEW1-2026' },
          }),
      })
    }

    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
  })

  global.fetch = fetchMock
  return fetchMock
}

describe('SuperAdminDashboard Frontend Component Comprehensive Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(toast, 'success').mockImplementation(() => '')
    vi.spyOn(toast, 'error').mockImplementation(() => '')

    mockUser = {
      id: 'usr-root-owner',
      email: 'gilankdev@gmail.com',
      isSuperAdmin: true,
    }
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('1. Clearance Gatekeeper', () => {
    it('restricts access and redirects away when user is not a whitelisted super admin', () => {
      mockUser = { id: 'usr-non-admin', email: 'regular@user.com', isSuperAdmin: false }
      const onNavigateMock = vi.fn()
      const { container } = render(<SuperAdminDashboard onNavigate={onNavigateMock} />)

      expect(onNavigateMock).toHaveBeenCalledWith('/console')
      expect(container.firstChild).toBeNull()
      expect(screen.queryByText(/\[ADMIN LEDGER\]/i)).not.toBeInTheDocument()
    })

    it('grants full access when user is a whitelisted root owner', async () => {
      mockUser = { id: 'usr-root-owner', email: 'gilankdev@gmail.com', isSuperAdmin: true }
      setupFetchMocks()

      render(<SuperAdminDashboard />)

      expect(screen.getByText(/ShipSafe Mission Control \[ADMIN LEDGER\]/i)).toBeInTheDocument()
      await waitFor(() => {
        expect(screen.getByText('[01 // USERS, ROLES & QUOTAS]')).toBeInTheDocument()
      })
    })
  });

  describe('2. Sub-Tab Navigation Handling', () => {
    it('switches between all 4 rectilinear sub-tabs seamlessly without page reload', async () => {
      setupFetchMocks()
      render(<SuperAdminDashboard />)

      // Tab 1: Users (default)
      await waitFor(() => {
        expect(screen.getByText('developer@acme.com')).toBeInTheDocument()
      })

      // Switch to Tab 2: Organizations
      const orgTab = screen.getByRole('button', { name: /\[02 \/\/ ENTERPRISE ORGANIZATIONS/i })
      fireEvent.click(orgTab)
      await waitFor(() => {
        expect(screen.getByText('Acme Security Org')).toBeInTheDocument()
        expect(screen.getByText(/5 SEATS/i)).toBeInTheDocument()
      })

      // Switch to Tab 3: Vouchers
      const voucherTab = screen.getByRole('button', { name: /\[03 \/\/ VOUCHERS/i })
      fireEvent.click(voucherTab)
      await waitFor(() => {
        expect(screen.getByText('SS-PRO-ABCD-2026')).toBeInTheDocument()
        expect(screen.getByText('SS-ENT-EFGH-2026')).toBeInTheDocument()
      })

      // Switch to Tab 4: Security Abuse & Audit Logs
      const secTab = screen.getByRole('button', { name: /\[04 \/\/ SECURITY ABUSE/i })
      fireEvent.click(secTab)
      await waitFor(() => {
        expect(screen.getByText('CI Runner')).toBeInTheDocument()
        expect(screen.getByText('sk_live_1234****')).toBeInTheDocument()
        expect(screen.getByText('CHANGE_TIER')).toBeInTheDocument()
      })
    })
  });

  describe('3. Telemetry Actions & State Updates Without Page Reload', () => {
    it('handles Flush Queue action and updates state with success toast', async () => {
      const fetchMock = setupFetchMocks()
      render(<SuperAdminDashboard />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /\[FLUSH\]/i })).toBeInTheDocument()
      })

      const flushBtn = screen.getByRole('button', { name: /\[FLUSH\]/i })
      fireEvent.click(flushBtn)

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          '/api/admin/queue/flush',
          expect.objectContaining({ method: 'POST' })
        )
        expect(toast.success).toHaveBeenCalledWith('Stuck worker queue flushed successfully.')
      })
    })

    it('toggles intake gate between OPEN and PAUSED without page reload', async () => {
      setupFetchMocks()
      render(<SuperAdminDashboard />)

      await waitFor(() => {
        expect(screen.getByText('[INTAKE: OPEN]')).toBeInTheDocument()
      })

      const toggleBtn = screen.getByRole('button', { name: /PAUSE/i })
      fireEvent.click(toggleBtn)

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Intake gate PAUSED for maintenance.')
        expect(screen.getByText('[INTAKE: PAUSED]')).toBeInTheDocument()
      })
    })
  });

  describe('4. User Management Actions & Root Owner Protection', () => {
    it('protects root owner identity from deletion (displays [ROOT] badge and no delete button)', async () => {
      setupFetchMocks()
      render(<SuperAdminDashboard />)

      await waitFor(() => {
        expect(screen.getByText('developer@acme.com')).toBeInTheDocument()
      })

      // gilankdev@gmail.com row should have [ROOT] and no [HAPUS] button
      expect(screen.getByText('[ROOT]')).toBeInTheDocument()

      // developer@acme.com row should have [HAPUS] button
      expect(screen.getByRole('button', { name: /\[HAPUS\]/i })).toBeInTheDocument()
    })

    it('opens confirmation modal and executes permanent user deletion for standard user', async () => {
      const fetchMock = setupFetchMocks()
      render(<SuperAdminDashboard />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /\[HAPUS\]/i })).toBeInTheDocument()
      })

      // Click delete button
      fireEvent.click(screen.getByRole('button', { name: /\[HAPUS\]/i }))

      // Modal should appear
      expect(screen.getByText(/\[KONFIRMASI HAPUS AKUN PERMANEN\]/i)).toBeInTheDocument()
      expect(screen.getAllByText(/developer@acme\.com/i).length).toBeGreaterThanOrEqual(2)

      // Confirm deletion
      const confirmBtn = screen.getByRole('button', { name: /YA, HAPUS AKUN/i })
      fireEvent.click(confirmBtn)

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          '/api/admin/users/usr-standard-dev',
          expect.objectContaining({ method: 'DELETE' })
        )
        expect(toast.success).toHaveBeenCalledWith('Operation succeeded.')
      })
    })

    it('updates user tier dropdown without page reload', async () => {
      const fetchMock = setupFetchMocks()
      render(<SuperAdminDashboard />)

      await waitFor(() => {
        expect(screen.getByDisplayValue('Free')).toBeInTheDocument()
      })

      const tierSelect = screen.getByDisplayValue('Free')
      fireEvent.change(tierSelect, { target: { value: 'pro' } })

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          '/api/admin/users/usr-standard-dev/tier',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ tier: 'pro' }),
          })
        )
        expect(toast.success).toHaveBeenCalledWith('User tier updated to PRO.')
      })
    })

    it('resets user audit usage counter to 0 without page reload', async () => {
      const fetchMock = setupFetchMocks()
      render(<SuperAdminDashboard />)

      await waitFor(() => {
        const resetBtns = screen.getAllByRole('button', { name: /\[RESET/i })
        expect(resetBtns.length).toBeGreaterThan(0)
      })

      const resetBtn = screen.getAllByRole('button', { name: /\[RESET/i })[1]!
      fireEvent.click(resetBtn)

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          '/api/admin/users/usr-standard-dev/reset',
          expect.objectContaining({ method: 'POST' })
        )
        expect(toast.success).toHaveBeenCalledWith('Audit usage counter reset to 0.')
      })
    })

    it('opens custom quota override modal, inputs limit, and applies override', async () => {
      const fetchMock = setupFetchMocks()
      render(<SuperAdminDashboard />)

      await waitFor(() => {
        const quotaBtns = screen.getAllByRole('button', { name: /^Quota$/i })
        expect(quotaBtns.length).toBeGreaterThan(0)
      })

      const quotaBtn = screen.getAllByRole('button', { name: /^Quota$/i })[1]!
      fireEvent.click(quotaBtn)

      // Modal open
      expect(screen.getByText(/Override Monthly Quota: developer@acme\.com/i)).toBeInTheDocument()
      const input = screen.getByPlaceholderText('e.g. 10, 25, 100')
      fireEvent.change(input, { target: { value: '75' } })

      const applyBtn = screen.getByRole('button', { name: /Apply Override/i })
      fireEvent.click(applyBtn)

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          '/api/admin/users/usr-standard-dev/quota',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ customQuotaLimit: 75 }),
          })
        )
        expect(toast.success).toHaveBeenCalledWith('Custom monthly quota limit applied.')
      })
    })
  });

  describe('5. Vouchers Tab Actions', () => {
    it('generates new voucher and copies code and WhatsApp text', async () => {
      const fetchMock = setupFetchMocks()
      render(<SuperAdminDashboard />)

      // Switch to vouchers tab
      fireEvent.click(screen.getByRole('button', { name: /\[03 \/\/ VOUCHERS/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /\[GENERATE INSPECTION VOUCHER\]/i })).toBeInTheDocument()
      })

      // Generate voucher
      fireEvent.click(screen.getByRole('button', { name: /\[GENERATE INSPECTION VOUCHER\]/i }))

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          '/api/admin/vouchers',
          expect.objectContaining({ method: 'POST' })
        )
        expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('SS-PRO-NEW1-2026'))
      })

      // Copy voucher code
      const copyBtns = screen.getAllByRole('button', { name: /\[COPY CODE\]/i })
      fireEvent.click(copyBtns[0]!)
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('SS-PRO-ABCD-2026')
      expect(toast.success).toHaveBeenCalledWith('Voucher code copied to clipboard.')

      // Copy WhatsApp text
      const waBtns = screen.getAllByRole('button', { name: /\[COPY WA FULFILLMENT TEXT\]/i })
      fireEvent.click(waBtns[0]!)
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('Halo Kak! Terima kasih telah melakukan pemesanan lisensi')
      )
      expect(toast.success).toHaveBeenCalledWith('WhatsApp fulfillment message copied.')
    })
  });

  describe('6. Error Handling & Error Toast Notifications', () => {
    it('shows error toast when queue flush API fails', async () => {
      setupFetchMocks({
        'POST /api/admin/queue/flush': () => Promise.reject(new Error('Network error')),
      })
      render(<SuperAdminDashboard />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /\[FLUSH\]/i })).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /\[FLUSH\]/i }))

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to flush queue.')
      })
    })

    it('shows error toast when user tier update fails', async () => {
      setupFetchMocks({
        'POST /api/admin/users/usr-standard-dev/tier': () =>
          Promise.resolve({ ok: false, status: 500 }),
      })
      render(<SuperAdminDashboard />)

      await waitFor(() => {
        expect(screen.getByDisplayValue('Free')).toBeInTheDocument()
      })

      fireEvent.change(screen.getByDisplayValue('Free'), { target: { value: 'pro' } })

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to update user tier.')
      })
    })

    it('shows error toast when delete user fails', async () => {
      setupFetchMocks({
        'DELETE /api/admin/users/usr-standard-dev': () =>
          Promise.resolve({
            ok: false,
            status: 400,
            json: () => Promise.resolve({ message: 'User is locked by ongoing audit.' }),
          }),
      })
      render(<SuperAdminDashboard />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /\[HAPUS\]/i })).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /\[HAPUS\]/i }))
      fireEvent.click(screen.getByRole('button', { name: /YA, HAPUS AKUN/i }))

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('User is locked by ongoing audit.')
      })
    })
  });
});
