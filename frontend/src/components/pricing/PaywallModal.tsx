import React, { useEffect } from 'react'
import { useStore } from '../../state/store'

export const PaywallModal: React.FC = () => {
  const isOpen = useStore((s) => s.isPaywallModalOpen)
  const reason = useStore((s) => s.paywallReason)
  const quota = useStore((s) => s.quota)
  const user = useStore((s) => s.auth.user)
  const closeModal = useStore((s) => s.closePaywallModal)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeModal()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, closeModal])

  if (!isOpen) return null

  const isRemediation = reason === 'remediation'
  const isExport = (reason as string) === 'export'
  const isFree = (quota?.tier || 'free') === 'free'
  const isQuotaExceeded = isFree && (quota?.used ?? 0) >= (quota?.limit ?? 3)

  const handleUpgradeToPro = () => {
    const userEmail = user?.email ? ` (${user.email})` : ''
    const message = encodeURIComponent(
      `Halo Admin ShipSafe, saya ingin upgrade akun saya${userEmail} ke Paket Pro (Rp 79.000 / bulan) untuk mengaktifkan 50x kuota audit, ekspor laporan, dan unlimited 1-click AI remediation prompts.`
    )
    window.open(`https://wa.me/6282124153732?text=${message}`, '_blank')
    closeModal()
  }

  const resetDateFormatted = quota?.resetDate
    ? new Date(quota.resetDate).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'awal bulan berikutnya'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="paywall-title"
    >
      <div
        className="relative w-full max-w-lg rounded-none border border-rule bg-canvas p-6 sm:p-7 shadow-none transition-all font-mono"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={closeModal}
          className="absolute top-4 right-4 p-2 text-ink-3 hover:text-ink rounded-none transition-colors cursor-pointer"
          aria-label="Tutup modal"
        >
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Modal Badge */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-none border border-rule bg-surface text-ink font-mono text-[11px] font-semibold mb-3 uppercase tracking-wider">
          <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span>Fitur Pro ShipSafe</span>
        </div>

        {/* Header */}
        <h3 id="paywall-title" className="text-xl sm:text-2xl font-bold tracking-tight text-ink mb-2">
          {isRemediation
            ? 'Buka Semua Prompt Perbaikan AI Instan'
            : isExport
              ? 'Buka Fitur Ekspor Laporan Keamanan'
              : isQuotaExceeded
                ? 'Batas Kuota Audit Bulanan Tercapai'
                : 'Mau Upgrade Kuota Audit Lebih Banyak?'}
        </h3>
        <p className="text-xs text-ink-2 leading-relaxed mb-5 font-sans">
          {isRemediation
            ? 'Pada paket Free, prompt perbaikan instan terbuka untuk temuan pertama. Upgrade ke paket Pro untuk membuka solusi perbaikan 1-klik untuk seluruh temuan keamanan.'
            : isExport
              ? 'Fitur ekspor laporan Markdown, JSON, dan Standar PDF tersedia mulai dari paket Pro. Upgrade sekarang untuk mengunduh laporan lengkap.'
              : isQuotaExceeded
                ? `Kamu telah menggunakan seluruh jatah 3x audit gratis di siklus ini. Kuota kamu akan direset secara otomatis pada ${resetDateFormatted}.`
                : `Kamu saat ini masih memiliki sisa ${(quota?.limit ?? 3) - (quota?.used ?? 0)}x audit gratis. Upgrade ke paket Pro untuk meningkatkan kuota hingga 50x audit per bulan, kapasitas upload 100 MB, dan prompt perbaikan instan tanpa batas.`}
        </p>

        {/* Pricing Card Highlight */}
        <div className="rounded-none border border-rule bg-surface p-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-xs font-mono font-medium text-ink-2 uppercase tracking-wider">
                Paket Pro (Indie / Vibe Coder)
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-2xl font-bold text-ink">Rp 79.000</span>
                <span className="text-xs text-ink-3">/ bulan</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-none bg-ink text-canvas font-mono text-[10px] font-bold tracking-wide uppercase">
              Paling Populer
            </span>
          </div>

          <ul className="space-y-2 text-xs text-ink-2">
            <li className="flex items-center gap-2">
              <svg className="size-3.5 text-ink shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span><strong>50x</strong> audit keamanan per bulan (vs 3x Free)</span>
            </li>
            <li className="flex items-center gap-2">
              <svg className="size-3.5 text-ink shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span><strong>Unlimited</strong> 1-Click AI Remediation Prompts untuk semua temuan</span>
            </li>
            <li className="flex items-center gap-2">
              <svg className="size-3.5 text-ink shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span>Kapasitas upload ZIP hingga <strong>100 MB</strong> (vs 10 MB)</span>
            </li>
            <li className="flex items-center gap-2">
              <svg className="size-3.5 text-ink shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span>Ekspor laporan Markdown, JSON, dan Standar PDF</span>
            </li>
            <li className="flex items-center gap-2">
              <svg className="size-3.5 text-ink shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span>Akses Terminal CLI & Webhook Gatekeeper</span>
            </li>
          </ul>
        </div>

        {/* Action Button */}
        <div>
          <button
            type="button"
            onClick={handleUpgradeToPro}
            className="w-full py-2.5 px-4 rounded-none bg-ink hover:bg-ink-2 text-canvas font-mono font-medium text-xs transition-all cursor-pointer uppercase tracking-wider text-center"
          >
            Upgrade ke Pro Sekarang
          </button>
        </div>
      </div>
    </div>
  )
}
