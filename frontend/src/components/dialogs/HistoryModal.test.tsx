import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HistoryModal } from './HistoryModal'
import { useStore } from '../../state/store'
import * as supabaseLib from '../../lib/supabase'

vi.mock('../../lib/supabase', async (importOriginal) => {
  const actual = await importOriginal<typeof supabaseLib>()
  return {
    ...actual,
    isSupabaseConfigured: true,
    fetchAuditHistory: vi.fn(),
    fetchAuditReportById: vi.fn(),
    deleteAuditFromSupabase: vi.fn(),
  }
})

describe('HistoryModal component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useStore.setState({
      auth: {
        user: { id: 'test-user-123', email: 'tester@example.com' },
        isAuthModalOpen: false,
        isHistoryModalOpen: true,
      },
      audit: {
        status: 'idle',
        stage: null,
        uploadPct: 0,
        startedAt: null,
        finishedAt: null,
        reportId: null,
        report: null,
        reportAgent: null,
        reportFileName: null,
        snapshot: null,
        error: null,
        promptsStatus: 'idle',
        promptsError: null,
      },
    })
  })

  it('renders empty state when user has no past audits', async () => {
    vi.mocked(supabaseLib.fetchAuditHistory).mockResolvedValueOnce({
      audits: [],
      error: null,
    })

    render(<HistoryModal />)

    await waitFor(() => {
      expect(screen.getByText('No saved audits yet')).toBeInTheDocument()
    })
    expect(screen.getByText(/Audit reports are automatically saved to your account history/i)).toBeInTheDocument()
  })

  it('renders past audits with project names and severity badges', async () => {
    vi.mocked(supabaseLib.fetchAuditHistory).mockResolvedValueOnce({
      audits: [
        {
          id: 'audit-1',
          projectName: 'ecommerce-api.zip',
          summary: 'Critical API keys exposed in server configuration.',
          countsBySeverity: { Critical: 1, High: 2, Medium: 0, Low: 0, Info: 0 },
          scorecard: [],
          createdAt: '2026-10-13T20:00:00.000Z',
        },
      ],
      error: null,
    })

    render(<HistoryModal />)

    await waitFor(() => {
      expect(screen.getByText('ecommerce-api.zip')).toBeInTheDocument()
    })
    expect(screen.getByText('Critical API keys exposed in server configuration.')).toBeInTheDocument()
    expect(screen.getByText('Critical')).toBeInTheDocument()
    expect(screen.getByText('High')).toBeInTheDocument()
  })

  it('loads and displays report when View Report is clicked', async () => {
    const user = userEvent.setup()
    vi.mocked(supabaseLib.fetchAuditHistory).mockResolvedValueOnce({
      audits: [
        {
          id: 'audit-1',
          projectName: 'ecommerce-api.zip',
          summary: 'Found 1 issue',
          countsBySeverity: { Critical: 1, High: 0, Medium: 0, Low: 0, Info: 0 },
          scorecard: [],
          createdAt: '2026-10-13T20:00:00.000Z',
        },
      ],
      error: null,
    })

    vi.mocked(supabaseLib.fetchAuditReportById).mockResolvedValueOnce({
      report: {
        id: 'audit-1',
        summary: 'Found 1 issue',
        countsBySeverity: { Critical: 1, High: 0, Medium: 0, Low: 0, Info: 0 },
        scorecard: [],
        findings: [
          {
            id: 'F-001',
            title: 'Stripe Secret Exposed',
            severity: 'Critical',
            area: 'Secrets',
            what: 'Key found in env',
            why: 'Direct leak',
            recommendedFix: 'Rotate key',
            remediationPrompt: 'Fix prompt',
          },
        ],
        secretsToRotate: ['sk_live_****'],
        notAssessed: [],
        skippedFiles: [],
      },
      projectName: 'ecommerce-api.zip',
      error: null,
    })

    render(<HistoryModal />)

    await waitFor(() => {
      expect(screen.getByText('View Report')).toBeInTheDocument()
    })

    await user.click(screen.getByText('View Report'))

    await waitFor(() => {
      const state = useStore.getState()
      expect(state.audit.status).toBe('done')
      expect(state.audit.reportFileName).toBe('ecommerce-api.zip')
      expect(state.audit.report?.findings).toHaveLength(1)
      expect(state.auth.isHistoryModalOpen).toBe(false)
    })
  })
})
