import { agentLabel } from '../config/agents'
import type { AgentTarget, Finding } from './types'

/** Copy All Prompts: one header per finding, then its prompt (spec 6.3). */
export function buildPromptsMarkdown(findings: readonly Finding[], target: AgentTarget): string {
  const head = `# ShipSafe remediation prompts for ${agentLabel(target)}\n`
  const body = findings
    .map((f) => `## ${f.id} ${f.title} (${f.severity})\n\n${f.remediationPrompt}`)
    .join('\n\n---\n\n')
  return `${head}\n${body}\n`
}

export function promptFilename(target: AgentTarget): string {
  return `shipsafe-remediation-prompts-${target.toLowerCase()}.md`
}

export function downloadFile(content: string, filename: string): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false
  try {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.style.display = 'none'
    a.href = url
    a.download = filename
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)

    // Delay revocation to ensure Mobile Safari and Android Chrome initiate download before blob URL is destroyed
    setTimeout(() => {
      try {
        URL.revokeObjectURL(url)
      } catch {
        // ignore
      }
    }, 1500)
    return true
  } catch (err) {
    console.error('[ShipSafe] downloadFile failed:', err)
    return false
  }
}

