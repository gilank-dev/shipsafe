import { useEffect, useState, useCallback } from 'react'
import type { AuditHistoryItem } from '../../domain/types'
import {
  deleteAuditFromSupabase,
  fetchAuditHistory,
  fetchAuditReportById,
  isSupabaseConfigured,
} from '../../lib/supabase'
import { announce } from '../../state/announcer'
import { loadAuditFromHistory } from '../../state/audit-controller'
import { useStore } from '../../state/store'
import { toast } from '../../state/toast'
import { SeverityTag } from '../ui/SeverityTag'
import { Dialog } from './Dialog'

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

export function HistoryModal() {
  const isOpen = useStore((s) => s.auth.isHistoryModalOpen)
  const setOpen = useStore((s) => s.setHistoryModalOpen)
  const user = useStore((s) => s.auth.user)

  const [audits, setAudits] = useState<AuditHistoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingAuditId, setLoadingAuditId] = useState<string | null>(null)
  const [deletingAuditId, setDeletingAuditId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadHistory = useCallback(async () => {
    if (!isSupabaseConfigured || !user) return
    setLoading(true)
    setError(null)
    const { audits: data, error: err } = await fetchAuditHistory()
    setLoading(false)
    if (err) {
      setError(err.message)
    } else {
      setAudits(data)
    }
  }, [user])

  useEffect(() => {
    if (!isOpen) return
    const timer = setTimeout(() => {
      void loadHistory()
    }, 0)
    return () => clearTimeout(timer)
  }, [isOpen, loadHistory])

  if (!isOpen) return null

  const handleClose = () => {
    setError(null)
    setOpen(false)
  }

  const handleOpenReport = async (item: AuditHistoryItem) => {
    setLoadingAuditId(item.id)
    const { report, projectName, error: err } = await fetchAuditReportById(item.id)
    setLoadingAuditId(null)

    if (err || !report) {
      toast.error(err?.message || 'Gagal memuat laporan audit.')
      return
    }

    loadAuditFromHistory(report, projectName || item.projectName)
    toast.info(`Laporan audit "${item.projectName}" berhasil dibuka.`)
    handleClose()
  }

  const handleDelete = async (item: AuditHistoryItem) => {
    if (!window.confirm(`Hapus riwayat audit untuk "${item.projectName}"? Tindakan ini tidak dapat dibatalkan.`)) {
      return
    }

    setDeletingAuditId(item.id)
    const { error: err } = await deleteAuditFromSupabase(item.id)
    setDeletingAuditId(null)

    if (err) {
      toast.error(`Gagal menghapus audit: ${err.message}`)
      return
    }

    setAudits((prev) => prev.filter((a) => a.id !== item.id))
    announce(`Audit ${item.projectName} deleted`)
    toast.info(`Riwayat audit "${item.projectName}" berhasil dihapus.`)
  }

  return (
    <Dialog title="Audit History" onClose={handleClose} wide>
      <div className="space-y-4 py-1">
        {error && (
          <div className="rounded border border-red-500/40 bg-red-500/10 p-3 text-small text-red-600 dark:text-red-400">
            <p className="font-semibold">Failed to load history</p>
            <p className="mt-1">{error}</p>
            <button
              type="button"
              className="btn btn-outline text-caption mt-2"
              onClick={() => void loadHistory()}
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-ink-2">
            <div className="size-6 animate-spin rounded-full border-2 border-ink border-t-transparent mb-2" />
            <p className="text-small">Loading audit history...</p>
          </div>
        ) : audits.length === 0 ? (
          <div className="rounded-lg border border-rule bg-sunken/40 p-8 text-center text-ink-2">
            <p className="text-body font-semibold text-ink">No saved audits yet</p>
            <p className="mt-1.5 text-small">
              Audit reports are automatically saved to your account history when you run an audit while signed in.
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {audits.map((item) => {
              const counts = item.countsBySeverity || { Critical: 0, High: 0, Medium: 0, Low: 0, Info: 0 }
              const isOpening = loadingAuditId === item.id
              const isDeleting = deletingAuditId === item.id

              return (
                <div
                  key={item.id}
                  className="rounded-lg border border-rule bg-canvas p-4 transition-colors hover:border-ink/40"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-title font-bold text-ink truncate">
                          {item.projectName}
                        </span>
                        <span className="text-caption text-ink-3">
                          {formatDate(item.createdAt)}
                        </span>
                      </div>

                      {item.summary && (
                        <p className="mt-1.5 text-small text-ink-2 line-clamp-2">
                          {item.summary}
                        </p>
                      )}

                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        {counts.Critical > 0 && (
                          <div className="flex items-center gap-1">
                            <SeverityTag level="Critical" />
                            <span className="font-mono text-caption text-ink font-bold">
                              {counts.Critical}
                            </span>
                          </div>
                        )}
                        {counts.High > 0 && (
                          <div className="flex items-center gap-1">
                            <SeverityTag level="High" />
                            <span className="font-mono text-caption text-ink font-bold">
                              {counts.High}
                            </span>
                          </div>
                        )}
                        {counts.Medium > 0 && (
                          <div className="flex items-center gap-1">
                            <SeverityTag level="Medium" />
                            <span className="font-mono text-caption text-ink font-bold">
                              {counts.Medium}
                            </span>
                          </div>
                        )}
                        {counts.Low > 0 && (
                          <div className="flex items-center gap-1">
                            <SeverityTag level="Low" />
                            <span className="font-mono text-caption text-ink font-bold">
                              {counts.Low}
                            </span>
                          </div>
                        )}
                        {counts.Critical === 0 && counts.High === 0 && counts.Medium === 0 && counts.Low === 0 && (
                          <span className="text-caption text-ink font-semibold">
                            Clean (0 Issues)
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 sm:self-center">
                      <button
                        type="button"
                        className="btn btn-primary text-small px-3 min-h-[38px]"
                        disabled={isOpening || isDeleting}
                        onClick={() => void handleOpenReport(item)}
                      >
                        {isOpening ? 'Loading...' : 'View Report'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline text-small px-2.5 text-red-600 dark:text-red-400 hover:border-red-500 min-h-[38px]"
                        disabled={isOpening || isDeleting}
                        title="Delete audit from history"
                        onClick={() => void handleDelete(item)}
                      >
                        {isDeleting ? '...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="mt-4 flex justify-end border-t border-rule pt-3">
        <button type="button" className="btn text-small px-4" onClick={handleClose}>
          Close
        </button>
      </div>
    </Dialog>
  )
}
