import { create } from 'zustand'
import { MAX_DESCRIPTION_CHARS } from '../config/limits'
import { isSuperAdminEmail } from '../config/super-admin'
import type { AgentTarget, ApiErrorKind, AuditReport, AuditStage } from '../domain/types'

export type AuditStatus = 'idle' | 'running' | 'done' | 'error'
export type PromptsStatus = 'idle' | 'updating' | 'error'

export interface SubmissionState {
  file: File | null
  fileError: string | null
  description: string
  deployTarget: string
  handlesPII: boolean
  handlesPayments: boolean
  agentTarget: AgentTarget
  turnstileToken: string | null
}

export interface AuditErrorView {
  kind: ApiErrorKind
  message: string
  retryAfterMs?: number
}

export interface AuditState {
  status: AuditStatus
  stage: AuditStage | null
  uploadPct: number
  startedAt: number | null
  finishedAt: number | null
  reportId: string | null
  report: AuditReport | null
  /** Agent the prompts in `report` are formatted for. */
  reportAgent: AgentTarget | null
  reportFileName: string | null
  /** Identity of the inputs the report was built from. Outdated detection compares against it. */
  snapshot: string | null
  error: AuditErrorView | null
  promptsStatus: PromptsStatus
  promptsError: string | null
}

export type Theme = 'light' | 'dark'

export type SubscriptionTier = 'free' | 'pro' | 'enterprise'
export type AccountStatus = 'active' | 'suspended'

export interface UserProfile {
  id: string
  email?: string
  fullName?: string
  avatarUrl?: string
  tier?: SubscriptionTier
  isSuperAdmin?: boolean
  accountStatus?: AccountStatus
  organizationId?: string | null
  orgRole?: 'owner' | 'member' | null
  organizationName?: string | null
  customQuotaLimit?: number | null
}

export interface AuthState {
  user: UserProfile | null
  isAuthModalOpen: boolean
  isHistoryModalOpen: boolean
}

export type PaywallReason = 'quota' | 'remediation' | 'export' | 'cli'

export interface QuotaState {
  tier: SubscriptionTier
  used: number
  limit: number
  remaining: number
  resetDate?: string
}

export interface ShipSafeState {
  submission: SubmissionState
  audit: AuditState
  auth: AuthState
  theme: Theme
  quota: QuotaState | null
  setQuota: (quota: QuotaState | null) => void
  isPaywallModalOpen: boolean
  paywallReason: PaywallReason
  openPaywallModal: (reason?: PaywallReason) => void
  closePaywallModal: () => void
  setFile: (file: File | null, error: string | null) => void
  setDescription: (value: string) => void
  setDeployTarget: (value: string) => void
  setFlag: (flag: 'handlesPII' | 'handlesPayments', value: boolean) => void
  setAgentTarget: (target: AgentTarget) => void
  setTurnstileToken: (token: string | null) => void
  loadProject: (file: File, context: Pick<SubmissionState, 'description' | 'deployTarget' | 'handlesPII' | 'handlesPayments'>) => void
  patchAudit: (patch: Partial<AuditState>) => void
  setAuthUser: (user: UserProfile | null) => void
  setAuthModalOpen: (open: boolean) => void
  setHistoryModalOpen: (open: boolean) => void
  isEcosystemModalOpen: boolean
  ecosystemTab: 'mcp' | 'cli' | 'docs'
  openEcosystemModal: (tab?: 'mcp' | 'cli' | 'docs') => void
  closeEcosystemModal: () => void
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  isSidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
}

export const initialSubmission: SubmissionState = {
  file: null,
  fileError: null,
  description: '',
  deployTarget: 'Not specified',
  handlesPII: false,
  handlesPayments: false,
  agentTarget: 'Generic',
  turnstileToken: null,
}

export const initialAudit: AuditState = {
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
}

const getInitialUser = (): UserProfile | null => {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem('shipsafe.auth.user')
    if (!raw) return null
    const parsed = JSON.parse(raw) as UserProfile
    if (parsed && isSuperAdminEmail(parsed.email)) {
      return {
        ...parsed,
        isSuperAdmin: true,
        tier: 'enterprise',
      }
    }
    return parsed
  } catch {
    return null
  }
}

export const initialAuth: AuthState = {
  user: getInitialUser(),
  isAuthModalOpen: false,
  isHistoryModalOpen: false,
}

const getInitialTheme = (): Theme => {
  if (typeof document !== 'undefined') {
    const attr = document.documentElement.getAttribute('data-theme')
    if (attr === 'light' || attr === 'dark') return attr
  }
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return 'light'
}

const getInitialSidebarOpen = (): boolean => {
  if (typeof window === 'undefined') return true
  try {
    const saved = window.localStorage.getItem('shipsafe.sidebar.open')
    if (saved !== null) return saved === 'true'
  } catch {
    // storage blocked
  }
  return true
}

// User session and theme are persisted to localStorage.
export const useStore = create<ShipSafeState>()((set) => ({
  submission: initialSubmission,
  audit: initialAudit,
  auth: initialAuth,
  theme: getInitialTheme(),
  isSidebarOpen: getInitialSidebarOpen(),
  setSidebarOpen: (isSidebarOpen) => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('shipsafe.sidebar.open', String(isSidebarOpen))
      }
    } catch {
      // storage blocked
    }
    set({ isSidebarOpen })
  },
  toggleSidebar: () =>
    set((s) => {
      const next = !s.isSidebarOpen
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('shipsafe.sidebar.open', String(next))
        }
      } catch {
        // storage blocked
      }
      return { isSidebarOpen: next }
    }),
  quota: {
    tier: 'free',
    used: 1,
    limit: 3,
    remaining: 2
  },
  setQuota: (quota) => set({ quota }),
  isPaywallModalOpen: false,
  paywallReason: 'quota',
  openPaywallModal: (reason = 'quota') => set({ isPaywallModalOpen: true, paywallReason: reason }),
  closePaywallModal: () => set({ isPaywallModalOpen: false }),
  setFile: (file, error) => set((s) => ({ submission: { ...s.submission, file, fileError: error } })),
  setDescription: (value) =>
    set((s) => ({
      // eslint-disable-next-line no-control-regex
      submission: { ...s.submission, description: value.replace(/\u0000/g, '').slice(0, MAX_DESCRIPTION_CHARS) },
    })),
  setDeployTarget: (value) => set((s) => ({ submission: { ...s.submission, deployTarget: value } })),
  setFlag: (flag, value) => set((s) => ({ submission: { ...s.submission, [flag]: value } })),
  setAgentTarget: (target) => set((s) => ({ submission: { ...s.submission, agentTarget: target } })),
  setTurnstileToken: (turnstileToken) => set((s) => ({ submission: { ...s.submission, turnstileToken } })),
  loadProject: (file, context) =>
    set((s) => ({ submission: { ...s.submission, ...context, file, fileError: null } })),
  patchAudit: (patch) => set((s) => ({ audit: { ...s.audit, ...patch } })),
  setAuthUser: (user) => {
    let finalUser = user
    if (finalUser && isSuperAdminEmail(finalUser.email)) {
      finalUser = {
        ...finalUser,
        isSuperAdmin: true,
        tier: 'enterprise',
      }
    }
    try {
      if (typeof window !== 'undefined') {
        if (finalUser) {
          window.localStorage.setItem('shipsafe.auth.user', JSON.stringify(finalUser))
        } else {
          window.localStorage.removeItem('shipsafe.auth.user')
        }
      }
    } catch {
      // storage blocked
    }
    set((s) => ({ auth: { ...s.auth, user: finalUser } }))
  },
  setAuthModalOpen: (isAuthModalOpen) => set((s) => ({ auth: { ...s.auth, isAuthModalOpen } })),
  setHistoryModalOpen: (isHistoryModalOpen) => set((s) => ({ auth: { ...s.auth, isHistoryModalOpen } })),
  isEcosystemModalOpen: false,
  ecosystemTab: 'mcp',
  openEcosystemModal: (tab = 'mcp') => set({ isEcosystemModalOpen: true, ecosystemTab: tab }),
  closeEcosystemModal: () => set({ isEcosystemModalOpen: false }),
  setTheme: (theme) => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme)
      document.documentElement.classList.toggle('dark', theme === 'dark')
    }
    try {
      window.localStorage.setItem('shipsafe.theme', theme)
    } catch {
      // storage blocked
    }
    set({ theme })
  },
  toggleTheme: () =>
    set((s) => {
      const next: Theme = s.theme === 'dark' ? 'light' : 'dark'
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', next)
        document.documentElement.classList.toggle('dark', next === 'dark')
      }
      try {
        window.localStorage.setItem('shipsafe.theme', next)
      } catch {
        // storage blocked
      }
      return { theme: next }
    }),
}))

