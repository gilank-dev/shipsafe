import { create } from 'zustand'
import { MAX_DESCRIPTION_CHARS } from '../config/limits'
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

export interface UserProfile {
  id: string
  email?: string
}

export interface AuthState {
  user: UserProfile | null
  isAuthModalOpen: boolean
}

export interface ShipSafeState {
  submission: SubmissionState
  audit: AuditState
  auth: AuthState
  theme: Theme
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
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
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

export const initialAuth: AuthState = {
  user: null,
  isAuthModalOpen: false,
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

// Nothing the user provides is persisted. Only the theme key is ever written to storage (ThemeToggle).
export const useStore = create<ShipSafeState>()((set) => ({
  submission: initialSubmission,
  audit: initialAudit,
  auth: initialAuth,
  theme: getInitialTheme(),
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
  setAuthUser: (user) => set((s) => ({ auth: { ...s.auth, user } })),
  setAuthModalOpen: (isAuthModalOpen) => set((s) => ({ auth: { ...s.auth, isAuthModalOpen } })),
  setTheme: (theme) => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme)
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
      }
      try {
        window.localStorage.setItem('shipsafe.theme', next)
      } catch {
        // storage blocked
      }
      return { theme: next }
    }),
}))

