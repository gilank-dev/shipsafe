import { useState } from 'react'
import { agentLabel } from '../../config/agents'
import {
  buildPromptsMarkdown,
  buildFullReportMarkdown,
  buildReportJson,
  exportReportAsPdf,
  downloadFile,
  promptFilename,
} from '../../domain/export'
import type { Finding } from '../../domain/types'
import { announce } from '../../state/announcer'
import { useStore } from '../../state/store'
import { CopyButton } from '../ui/CopyButton'
import { toast } from '../ui/Toast'
import { Lock, FileText, Code2, Printer } from 'lucide-react'

interface ExportBarProps {
  findings: Finding[]
}

export function ExportBar({ findings }: ExportBarProps) {
  const agentTarget = useStore((s) => s.submission.agentTarget)
  const promptsStatus = useStore((s) => s.audit.promptsStatus)
  const promptsError = useStore((s) => s.audit.promptsError)
  const report = useStore((s) => s.audit.report)
  const fileName = useStore((s) => s.submission.file?.name || 'shipsafe-project.zip')
  const user = useStore((s) => s.auth.user)
  const quota = useStore((s) => s.quota)
  const openPaywallModal = useStore((s) => s.openPaywallModal)

  const effectiveTier = user?.tier || quota?.tier || 'free'
  const isFree = effectiveTier === 'free'
  const isEnterprise = effectiveTier === 'enterprise'

  const [downloadedFormat, setDownloadedFormat] = useState<string | null>(null)

  const handleExportMarkdown = () => {
    if (isFree) {
      openPaywallModal('export')
      toast.error('Report exports are locked on the Free tier. Upgrade to Pro to unlock Markdown, JSON, and PDF exports.')
      return
    }

    if (!report) {
      // Fallback to prompts markdown if report object is not populated
      const allPromptsMarkdown = buildPromptsMarkdown(findings, agentTarget)
      const filename = promptFilename(agentTarget)
      if (downloadFile(allPromptsMarkdown, filename)) {
        toast.success(`Downloaded ${filename}`)
      }
      return
    }

    const whiteLabel = isEnterprise
      ? { companyName: user?.organizationName || user?.fullName || 'Enterprise Security' }
      : undefined

    const mdContent = buildFullReportMarkdown(report, fileName, whiteLabel)
    const outName = `${fileName.replace(/\.zip$/i, '')}-security-audit.md`
    if (downloadFile(mdContent, outName)) {
      setDownloadedFormat('md')
      announce(`Downloaded ${outName}`)
      toast.success(`Downloaded ${outName}`)
      setTimeout(() => setDownloadedFormat(null), 2000)
    }
  }

  const handleExportJson = () => {
    if (isFree) {
      openPaywallModal('export')
      toast.error('JSON report exports are locked on the Free tier. Upgrade to Pro to export audit data.')
      return
    }

    if (!report) {
      toast.error('Audit report data is not available yet.')
      return
    }

    const jsonContent = buildReportJson(report, fileName)
    const outName = `${fileName.replace(/\.zip$/i, '')}-security-audit.json`
    if (downloadFile(jsonContent, outName, 'application/json;charset=utf-8')) {
      setDownloadedFormat('json')
      announce(`Downloaded ${outName}`)
      toast.success(`Downloaded ${outName}`)
      setTimeout(() => setDownloadedFormat(null), 2000)
    }
  }

  const handleExportPdf = () => {
    if (isFree) {
      openPaywallModal('export')
      toast.error('PDF report exports are locked on the Free tier. Upgrade to Pro to download verified PDF certificates.')
      return
    }

    if (!report) {
      toast.error('Audit report data is not available yet.')
      return
    }

    const whiteLabel = isEnterprise
      ? { companyName: user?.organizationName || user?.fullName || 'Enterprise Security' }
      : undefined

    const success = exportReportAsPdf(report, fileName, whiteLabel)
    if (success) {
      announce('Opened printable PDF report window')
      toast.success(isEnterprise ? 'Opening White-Label PDF Report...' : 'Opening PDF Report...')
    } else {
      toast.error('Failed to open PDF print window. Please ensure pop-ups are allowed in your browser.')
    }
  }

  const allPromptsMarkdown = buildPromptsMarkdown(findings, agentTarget)

  return (
    <div
      className="border border-rule bg-surface/70 p-3.5 sm:p-4 rounded-[var(--radius-control)] shadow-xs"
      role="region"
      aria-label="Export remediation prompts and reports"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-body font-bold text-ink">Remediation Prompts & Reports</h4>
            <span className="tag text-small font-semibold">
              Format: {agentLabel(agentTarget)}
            </span>
            {isFree && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-zinc-800 text-zinc-400 border border-white/10">
                <Lock className="size-2.5" />
                <span>Export Locked</span>
              </span>
            )}
            {isEnterprise && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/30">
                <span>White-Label Ready</span>
              </span>
            )}
          </div>
          <p className="text-small text-ink-2 mt-0.5">
            {findings.length} tailored {findings.length === 1 ? 'prompt' : 'prompts'} ready to paste into your AI assistant
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <CopyButton text={allPromptsMarkdown} label="Copy all prompts" subject="all remediation prompts" />

          {/* Export Markdown */}
          <button
            type="button"
            className="btn text-xs inline-flex items-center gap-1.5"
            onClick={handleExportMarkdown}
            title={isFree ? 'Terkunci di Free - Upgrade ke Pro' : 'Download Full Audit Report (.md)'}
          >
            {isFree ? <Lock className="size-3 text-zinc-400" /> : <FileText className="size-3" />}
            <span>{downloadedFormat === 'md' ? 'Downloaded' : 'Export .md'}</span>
          </button>

          {/* Export JSON */}
          <button
            type="button"
            className="btn text-xs inline-flex items-center gap-1.5"
            onClick={handleExportJson}
            title={isFree ? 'Terkunci di Free - Upgrade ke Pro' : 'Download Structured JSON (.json)'}
          >
            {isFree ? <Lock className="size-3 text-zinc-400" /> : <Code2 className="size-3" />}
            <span>{downloadedFormat === 'json' ? 'Downloaded' : 'Export .json'}</span>
          </button>

          {/* Export / Print PDF */}
          <button
            type="button"
            className="btn text-xs inline-flex items-center gap-1.5"
            onClick={handleExportPdf}
            title={isFree ? 'Terkunci di Free - Upgrade ke Pro' : isEnterprise ? 'Print / Save White-Label PDF' : 'Print / Save PDF Report'}
          >
            {isFree ? <Lock className="size-3 text-zinc-400" /> : <Printer className="size-3" />}
            <span>{isEnterprise ? 'White-Label PDF' : 'PDF Report'}</span>
          </button>
        </div>
      </div>

      {promptsStatus === 'updating' && (
        <div className="mt-3 text-small text-ink-2 italic" role="status">
          Reformatting prompts for {agentLabel(agentTarget)}...
        </div>
      )}

      {promptsError && (
        <div className="mt-3 text-small text-status-fail font-medium" role="alert">
          {promptsError}
        </div>
      )}
    </div>
  )
}
