import React, { useState } from 'react'
import { useStore } from '../../state/store'

interface EnterpriseLeadForm {
  companyName: string
  teamSize: '4 orang' | '10 orang' | '10+ orang'
  estimatedVolume: '< 100' | '100 - 500' | '500+'
  needs: {
    cicd: boolean
    whiteLabel: boolean
    dedicatedSandbox: boolean
  }
}

export const PricingSection: React.FC = () => {
  const [isEnterpriseModalOpen, setIsEnterpriseModalOpen] = useState(false)
  const [enterpriseForm, setEnterpriseForm] = useState<EnterpriseLeadForm>({
    companyName: '',
    teamSize: '4 orang',
    estimatedVolume: '100 - 500',
    needs: {
      cicd: true,
      whiteLabel: true,
      dedicatedSandbox: false,
    },
  })

  const user = useStore((s) => s.auth.user)
  const setAuthModalOpen = useStore((s) => s.setAuthModalOpen)

  const handleFreeCta = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleProCta = () => {
    if (!user) {
      setAuthModalOpen(true)
      return
    }
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/console?view=pricing')
      window.dispatchEvent(new PopStateEvent('popstate'))
    }
  }

  const handleEnterpriseSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const selectedNeeds: string[] = []
    if (enterpriseForm.needs.cicd) selectedNeeds.push('Integrasi CI/CD')
    if (enterpriseForm.needs.whiteLabel) selectedNeeds.push('White-Label PDF Report')
    if (enterpriseForm.needs.dedicatedSandbox) selectedNeeds.push('Dedicated Sandbox / On-Premise')

    const message = encodeURIComponent(
      `Halo Admin ShipSafe, saya tertarik dengan paket Enterprise ShipSafe.\n\n` +
      `Informasi Tim / Agensi:\n` +
      `• Perusahaan / Agensi: ${enterpriseForm.companyName || 'Belum diisi'}\n` +
      `• Jumlah Anggota Tim: ${enterpriseForm.teamSize}\n` +
      `• Estimasi Deployment / Scan: ${enterpriseForm.estimatedVolume} per bulan\n` +
      `• Kebutuhan Utama: ${selectedNeeds.length > 0 ? selectedNeeds.join(', ') : 'Konsultasi Tim'}\n\n` +
      `Mohon info tindak lanjut dan penawaran teknisnya. Terima kasih.`
    )

    window.open(`https://wa.me/6282124153732?text=${message}`, '_blank')
    setIsEnterpriseModalOpen(false)
  }

  return (
    <section id="pricing" className="relative py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto scroll-mt-20">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-14">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-950 dark:text-white mb-3">
          Investasi Keamanan Seukuran Harga Kopi
        </h2>
        <p className="text-base sm:text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed">
          Rilis kode ke production dengan tenang. Pilih paket sesuai frekuensi deployment kamu.
        </p>
      </div>

      {/* 3-Tier Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-stretch">
        {/* Tier 1: Free (Sandbox) */}
        <div className="flex flex-col justify-between rounded-2xl border border-black/[0.08] dark:border-white/[0.12] bg-white dark:bg-[#121316] p-7 transition-all duration-200 hover:border-neutral-400 dark:hover:border-neutral-700 shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Free (Sandbox)
              </span>
            </div>

            <div className="flex items-baseline gap-1 mb-3">
              <span className="text-3xl sm:text-4xl font-bold text-neutral-950 dark:text-white">Rp 0</span>
              <span className="text-sm text-neutral-500 dark:text-neutral-400">/ bulan</span>
            </div>

            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed mb-6">
              Cocok untuk menguji keamanan proyek sampingan sebelum rilis pertama.
            </p>

            <div className="w-full h-px bg-neutral-200 dark:bg-neutral-800 mb-6" />

            <ul className="space-y-3 text-sm text-neutral-700 dark:text-neutral-300 mb-8">
              <li className="flex items-start gap-2.5">
                <svg className="size-4 text-neutral-900 dark:text-white shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span><strong>3x</strong> audit keamanan per bulan</span>
              </li>
              <li className="flex items-start gap-2.5">
                <svg className="size-4 text-neutral-900 dark:text-white shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Maksimal <strong>10 MB</strong> per ZIP / target</span>
              </li>
              <li className="flex items-start gap-2.5">
                <svg className="size-4 text-neutral-900 dark:text-white shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Deteksi Lengkap 10 Kategori Kerentanan</span>
              </li>
              <li className="flex items-start gap-2.5">
                <svg className="size-4 text-neutral-900 dark:text-white shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Auto-Redaction Rahasia (Zero-Persistence)</span>
              </li>
              <li className="flex items-start gap-2.5">
                <svg className="size-4 text-neutral-900 dark:text-white shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-neutral-800 dark:text-neutral-200">
                  1-Click AI Fix Prompt: <strong>Terbuka untuk temuan pertama</strong> (temuan berikutnya terkunci)
                </span>
              </li>
              <li className="flex items-start gap-2.5 text-neutral-500 dark:text-neutral-500">
                <svg className="size-4 text-neutral-400 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Format Laporan Web UI Dashboard</span>
              </li>
              <li className="flex items-start gap-2.5 text-neutral-500 dark:text-neutral-500">
                <svg className="size-4 text-neutral-400 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Manual Web Upload</span>
              </li>
              <li className="flex items-start gap-2.5 text-neutral-500 dark:text-neutral-500">
                <svg className="size-4 text-neutral-400 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Dukungan Komunitas & Dokumentasi</span>
              </li>
            </ul>
          </div>

          <button
            type="button"
            onClick={handleFreeCta}
            className="w-full py-2.5 px-4 rounded-xl border border-black/[0.12] dark:border-white/[0.16] bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800/80 dark:hover:bg-neutral-700 text-neutral-950 dark:text-white font-medium text-sm transition-all cursor-pointer font-sans active:scale-[0.99] text-center"
          >
            Mulai Scan Gratis
          </button>
        </div>

        {/* Tier 2: Pro (Indie / Vibe Coder) - Highlighted */}
        <div className="relative flex flex-col justify-between rounded-2xl border-2 border-neutral-900 dark:border-white bg-white dark:bg-[#121316] p-7 transition-all duration-200">
          {/* Badge */}
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-mono text-[11px] font-bold tracking-wide">
            Paling Populer
          </div>

          <div>
            <div className="flex items-center justify-between mb-4 mt-1">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-neutral-900 dark:text-white">
                Pro (Indie / Vibe Coder)
              </span>
            </div>

            <div className="flex items-baseline gap-1 mb-3">
              <span className="text-3xl sm:text-4xl font-bold text-neutral-950 dark:text-white">Rp 79.000</span>
              <span className="text-sm text-neutral-500 dark:text-neutral-400">/ bulan</span>
            </div>

            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed mb-6">
              Untuk solo developer & vibe coder yang rutin ship aplikasi ke production dengan cepat dan aman.
            </p>

            <div className="w-full h-px bg-neutral-200 dark:bg-neutral-800 mb-6" />

            <ul className="space-y-3 text-sm text-neutral-700 dark:text-neutral-300 mb-8">
              <li className="flex items-start gap-2.5">
                <svg className="size-4 text-neutral-900 dark:text-white shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span><strong>50x</strong> audit keamanan per bulan</span>
              </li>
              <li className="flex items-start gap-2.5">
                <svg className="size-4 text-neutral-900 dark:text-white shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Maksimal <strong>100 MB</strong> per ZIP / target</span>
              </li>
              <li className="flex items-start gap-2.5">
                <svg className="size-4 text-neutral-900 dark:text-white shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Deteksi Lengkap 10 Kategori Kerentanan</span>
              </li>
              <li className="flex items-start gap-2.5">
                <svg className="size-4 text-neutral-900 dark:text-white shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Auto-Redaction Rahasia (Zero-Persistence)</span>
              </li>
              <li className="flex items-start gap-2.5">
                <svg className="size-4 text-neutral-900 dark:text-white shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-medium text-neutral-950 dark:text-white">
                  <strong>Unlimited</strong> 1-Click AI Fix Prompts untuk semua temuan
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <svg className="size-4 text-neutral-900 dark:text-white shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Ekspor <strong>Markdown, JSON, & Standar PDF</strong></span>
              </li>
              <li className="flex items-start gap-2.5">
                <svg className="size-4 text-neutral-900 dark:text-white shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Manual Upload + <strong>CLI & Basic Webhook</strong></span>
              </li>
              <li className="flex items-start gap-2.5">
                <svg className="size-4 text-neutral-900 dark:text-white shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Prioritas Email & Discord</span>
              </li>
            </ul>
          </div>

          <button
            type="button"
            onClick={handleProCta}
            className="w-full py-2.5 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-900 font-medium text-sm transition-all cursor-pointer font-sans active:scale-[0.99] text-center"
          >
            Upgrade ke Pro Sekarang
          </button>
        </div>

        {/* Tier 3: Enterprise (Team / Agency) */}
        <div className="flex flex-col justify-between rounded-2xl border border-black/[0.08] dark:border-white/[0.12] bg-white dark:bg-[#121316] p-7 transition-all duration-200 hover:border-neutral-400 dark:hover:border-neutral-700 shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Enterprise (Team / Agency)
              </span>
            </div>

            <div className="flex items-baseline gap-1 mb-3">
              <span className="text-3xl sm:text-4xl font-bold text-neutral-950 dark:text-white">Kustom</span>
            </div>

            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed mb-6">
              Untuk software house, agensi, dan tim engineering yang butuh otomatisasi CI/CD dan laporan white-label.
            </p>

            <div className="w-full h-px bg-neutral-200 dark:bg-neutral-800 mb-6" />

            <ul className="space-y-3 text-sm text-neutral-700 dark:text-neutral-300 mb-8">
              <li className="flex items-start gap-2.5">
                <svg className="size-4 text-neutral-900 dark:text-white shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span><strong>Unlimited</strong> audit (Subjek Fair Use Policy)</span>
              </li>
              <li className="flex items-start gap-2.5">
                <svg className="size-4 text-neutral-900 dark:text-white shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Kustom kapasitas upload (Hingga <strong>500 MB+</strong>)</span>
              </li>
              <li className="flex items-start gap-2.5">
                <svg className="size-4 text-neutral-900 dark:text-white shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Deteksi 10 Kategori + <strong>Custom Rules</strong></span>
              </li>
              <li className="flex items-start gap-2.5">
                <svg className="size-4 text-neutral-900 dark:text-white shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span><strong>Dedicated Isolated Sandbox</strong> (Private VPS)</span>
              </li>
              <li className="flex items-start gap-2.5">
                <svg className="size-4 text-neutral-900 dark:text-white shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Unlimited + Custom Remediation Templates</span>
              </li>
              <li className="flex items-start gap-2.5">
                <svg className="size-4 text-neutral-900 dark:text-white shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span><strong>White-Label PDF</strong> (Logo Agensi Sendiri)</span>
              </li>
              <li className="flex items-start gap-2.5">
                <svg className="size-4 text-neutral-900 dark:text-white shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span><strong>Full CI/CD Integration</strong> (GitHub Actions / GitLab)</span>
              </li>
              <li className="flex items-start gap-2.5">
                <svg className="size-4 text-neutral-900 dark:text-white shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Dedicated Engineer + Remediation Advisory</span>
              </li>
            </ul>
          </div>

          <button
            type="button"
            onClick={() => setIsEnterpriseModalOpen(true)}
            className="w-full py-2.5 px-4 rounded-xl border border-black/[0.12] dark:border-white/[0.16] bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800/80 dark:hover:bg-neutral-700 text-neutral-950 dark:text-white font-medium text-sm transition-all cursor-pointer font-sans active:scale-[0.99] text-center"
          >
            Hubungi Admin
          </button>
        </div>
      </div>

      {/* Enterprise Lead Qualification Modal */}
      {isEnterpriseModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="enterprise-modal-title"
        >
          <div
            className="relative w-full max-w-lg rounded-2xl border border-black/[0.08] dark:border-white/[0.12] bg-white dark:bg-[#0D0E11] p-6 sm:p-7 shadow-2xl transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsEnterpriseModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
              aria-label="Tutup modal"
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-mono text-[11px] font-semibold mb-3">
              <span>Solusi Enterprise & Agensi</span>
            </div>

            <h3 id="enterprise-modal-title" className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-950 dark:text-white mb-2">
              Konsultasi Kebutuhan Enterprise
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed mb-6">
              Ceritakan kebutuhan arsitektur dan tim Anda untuk mendapatkan penawaran khusus dan akses sandbox dedicated.
            </p>

            <form onSubmit={handleEnterpriseSubmit} className="space-y-4">
              {/* Company Name */}
              <div>
                <label htmlFor="companyName" className="block text-xs font-mono font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Nama Perusahaan / Agensi
                </label>
                <input
                  id="companyName"
                  type="text"
                  required
                  placeholder="PT Teknologi Nusantara / Studio Dev"
                  value={enterpriseForm.companyName}
                  onChange={(e) => setEnterpriseForm({ ...enterpriseForm, companyName: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-950 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:border-neutral-900 dark:focus:border-white transition-colors"
                />
              </div>

              {/* Team Size */}
              <div>
                <label htmlFor="teamSize" className="block text-xs font-mono font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Jumlah Anggota Tim / Kursi Pengguna
                </label>
                <select
                  id="teamSize"
                  value={enterpriseForm.teamSize}
                  onChange={(e) => setEnterpriseForm({ ...enterpriseForm, teamSize: e.target.value as any })}
                  className="w-full px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-950 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:border-neutral-900 dark:focus:border-white transition-colors"
                >
                  <option value="4 orang">4 orang (Tim Kecil)</option>
                  <option value="10 orang">10 orang (Agensi / Studio)</option>
                  <option value="10+ orang">10+ orang (Enterprise Custom)</option>
                </select>
              </div>

              {/* Estimated Volume */}
              <div>
                <label htmlFor="estimatedVolume" className="block text-xs font-mono font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Estimasi Deployment / Scan per Bulan
                </label>
                <select
                  id="estimatedVolume"
                  value={enterpriseForm.estimatedVolume}
                  onChange={(e) => setEnterpriseForm({ ...enterpriseForm, estimatedVolume: e.target.value as any })}
                  className="w-full px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-950 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:border-neutral-900 dark:focus:border-white transition-colors"
                >
                  <option value="< 100">&lt; 100 scan per bulan</option>
                  <option value="100 - 500">100 - 500 scan per bulan</option>
                  <option value="500+">500+ scan per bulan</option>
                </select>
              </div>

              {/* Primary Needs */}
              <div>
                <span className="block text-xs font-mono font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Kebutuhan Utama
                </span>
                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 text-xs text-neutral-800 dark:text-neutral-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enterpriseForm.needs.cicd}
                      onChange={(e) =>
                        setEnterpriseForm({
                          ...enterpriseForm,
                          needs: { ...enterpriseForm.needs, cicd: e.target.checked },
                        })
                      }
                      className="size-4 rounded border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white focus:ring-neutral-400"
                    />
                    <span>Integrasi CI/CD (GitHub Actions / GitLab)</span>
                  </label>
                  <label className="flex items-center gap-2.5 text-xs text-neutral-800 dark:text-neutral-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enterpriseForm.needs.whiteLabel}
                      onChange={(e) =>
                        setEnterpriseForm({
                          ...enterpriseForm,
                          needs: { ...enterpriseForm.needs, whiteLabel: e.target.checked },
                        })
                      }
                      className="size-4 rounded border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white focus:ring-neutral-400"
                    />
                    <span>White-Label PDF Report (Custom Agency Logo)</span>
                  </label>
                  <label className="flex items-center gap-2.5 text-xs text-neutral-800 dark:text-neutral-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enterpriseForm.needs.dedicatedSandbox}
                      onChange={(e) =>
                        setEnterpriseForm({
                          ...enterpriseForm,
                          needs: { ...enterpriseForm.needs, dedicatedSandbox: e.target.checked },
                        })
                      }
                      className="size-4 rounded border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white focus:ring-neutral-400"
                    />
                    <span>Dedicated Sandbox / On-Premise Installation</span>
                  </label>
                </div>
              </div>

              {/* Submit to WhatsApp */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-900 font-medium text-sm transition-all cursor-pointer font-sans shadow-md hover:shadow-lg active:scale-[0.99] text-center flex items-center justify-center gap-2"
                >
                  <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.275.072.376-.044c.101-.116.433-.506.549-.68.116-.174.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.099.824z" />
                  </svg>
                  <span>Kirim Lead ke WhatsApp Admin</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
