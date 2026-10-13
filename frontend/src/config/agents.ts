import type { AgentTarget, Area, Severity } from '../domain/types'

export interface AgentOption {
  id: AgentTarget
  label: string
  /** Style hint from spec section 6.2. */
  hint: string
}

export const AGENT_TARGETS: readonly AgentOption[] = [
  { id: 'Generic', label: 'Generic', hint: 'Neutral prompt with clear numbered steps.' },
  { id: 'Cursor', label: 'Cursor', hint: 'File-based edits with @file references.' },
  { id: 'ClaudeCode', label: 'Claude Code', hint: 'Task style that asks to run tests or the build to verify.' },
  { id: 'Copilot', label: 'GitHub Copilot', hint: 'Short, inline-comment style with a change description.' },
  { id: 'Windsurf', label: 'Windsurf', hint: 'Workspace-based, close to the Cursor style.' },
]

export const SEVERITIES: readonly Severity[] = ['Critical', 'High', 'Medium', 'Low', 'Info']

export const AREAS: readonly { id: Area; label: string }[] = [
  { id: 'Secrets', label: 'Secrets' },
  { id: 'Dependencies', label: 'Dependencies' },
  { id: 'HTTP', label: 'HTTP hardening' },
  { id: 'Code', label: 'Code security' },
]

export const DEPLOY_TARGETS = [
  'Not specified',
  'Vercel',
  'Netlify',
  'AWS',
  'Google Cloud',
  'Azure',
  'Docker or VPS',
  'Other',
] as const

export function agentLabel(id: AgentTarget): string {
  return AGENT_TARGETS.find((a) => a.id === id)?.label ?? id
}

export function areaLabel(id: Area): string {
  return AREAS.find((a) => a.id === id)?.label ?? id
}
