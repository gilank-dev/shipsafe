import React, { useState } from 'react'
import { Check, Shield, Zap, Building2, MessageSquare } from 'lucide-react'
import { useStore } from '../../state/store'
import { TierBadge } from '../ui/TierBadge'

interface EnterpriseLeadForm {
  companyName: string
  estimatedVolume: '< 100' | '100 - 500' | '500+'
  needs: {
    cicd: boolean
    whiteLabel: boolean
    dedicatedSandbox: boolean
  }
}

interface ConsolePricingPageProps {
  onBackToAudit?: () => void
}

export const ConsolePricingPage: React.FC<ConsolePricingPageProps> = ({ onBackToAudit }) => {
  const user = useStore((s) => s.auth.user)
  const quota = useStore((s) => s.quota)
  const [isEnterpriseModalOpen, setIsEnterpriseModalOpen] = useState(false)
  const [enterpriseForm, setEnterpriseForm] = useState<EnterpriseLeadForm>({
    companyName: '',
    estimatedVolume: '100 - 500',
    needs: {
      cicd: true,
      whiteLabel: true,
      dedicatedSandbox: false,
    },
  })

  const effectiveTier = user?.tier || quota?.tier || 'free'
  const isFree = effectiveTier === 'free'
  const isPro = effectiveTier === 'pro'
  const isEnterprise = effectiveTier === 'enterprise'

  const resetDateFormatted = quota?.resetDate
    ? new Date(quota.resetDate).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'awal bulan berikutnya'

  const handleProUpgrade = () => {
    const userEmail = user?.email ? ` (${user.email})` : ''
    const message = encodeURIComponent(
      `Halo Admin ShipSafe, saya ingin upgrade akun saya${userEmail} ke Paket Pro (Rp 79.000 / bulan) untuk mengaktifkan kuota 50x audit bulanan, ekspor laporan lengkap (Markdown, JSON, PDF), dan unlimited 1-click AI remediation prompts.`
    )
    window.open(`https://wa.me/6282124153732?text=${message}`, '_blank')
  }

  const handleEnterpriseSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const selectedNeeds: string[] = []
    if (enterpriseForm.needs.cicd) selectedNeeds.push('Integrasi CI/CD')
    if (enterpriseForm.needs.whiteLabel) selectedNeeds.push('White-Label PDF Report')
    if (enterpriseForm.needs.dedicatedSandbox) selectedNeeds.push('Dedicated Sandbox / On-Premise')

    const userEmail = user?.email ? ` (${user.email})` : ''
    const message = encodeURIComponent(
      `Halo Admin ShipSafe, saya tertarik mengaktifkan Paket Enterprise ShipSafe.\n\n` +
      `Informasi Proyek / Perusahaan:\n` +
      `- Pengaju: ${user?.fullName || 'User ShipSafe'}${userEmail}\n` +
      `- Perusahaan / Proyek: ${enterpriseForm.companyName || 'Belum diisi'}\n` +
      `- Estimasi Deployment / Scan: ${enterpriseForm.estimatedVolume} per bulan\n` +
      `- Kebutuhan Utama: ${selectedNeeds.length > 0 ? selectedNeeds.join(', ') : 'Konsultasi Enterprise'}\n\n` +
      `Mohon info aktivasi dan penawaran teknisnya. Terima kasih.`
    )

    window.open(`https://wa.me/6282124153732?text=${message}`, '_blank')
    setIsEnterpriseModalOpen(false)
  }

  return (
    <div className="w-full max-w-[105rem] mx-auto px-4 py-8 sm:px-6 md:px-8 xl:px-12 font-sans animate-fade-in">
      {/* Navigation Breadcrumb / Top Bar */}
      {onBackToAudit && (
        <div className="mb-6 flex items-center justify-between border-b border-rule pb-3">
          <button
            type="button"
            onClick={onBackToAudit}
            className="inline-flex items-center gap-1.5 text-xs font-mono text-ink-2 hover:text-ink transition-colors cursor-pointer"
          >
            &larr; Kembali ke Audit Scanner
          </button>
          <span className="text-xs font-mono text-ink-3">Console / Pricing &amp; Plans</span>
        </div>
      )}

      {/* Header Banner with Current Subscription Quota Overview */}
      <div className="border border-rule bg-surface p-5 sm:p-6 mb-8 font-mono">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold">
                Status Akun &amp; Langganan
              </span>
              <TierBadge tier={effectiveTier} isSuperAdmin={user?.isSuperAdmin} size="xs" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-ink">
              {user?.fullName || user?.email || 'Akun Auditor'}
            </h2>
            <p className="text-xs text-ink-2 mt-1 font-sans max-w-xl leading-relaxed">
              {isEnterprise
                ? 'Akun kamu aktif di paket Enterprise. Nikmati kuota audit unlimited, dedicated VPS sandbox, dan integrasi CI/CD terpusat.'
                : isPro
                  ? 'Akun kamu aktif di paket Pro (50x audit per bulan). Seluruh prompt perbaikan instan dan ekspor laporan telah terbuka.'
                  : 'Kamu saat ini berada pada paket Free (3x audit per bulan). Upgrade ke Pro untuk membuka kapasitas 50x audit dan fitur ekspor.'}
            </p>
          </div>

          <div className="border border-rule bg-canvas p-3.5 min-w-[200px] shrink-0">
            <span className="text-[10px] text-ink-3 uppercase tracking-wider block font-semibold">
              Jatah Audit Siklus Ini
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-bold text-ink tabular-nums">
                {isEnterprise ? 'Unlimited' : quota?.used ?? 0}
              </span>
              {!isEnterprise && (
                <span className="text-xs text-ink-3 font-mono">
                  / {quota?.limit ?? 3} scan
                </span>
              )}
            </div>
            <span className="text-[10px] text-ink-3 block mt-1 font-sans">
              Reset otomatis: {resetDateFormatted}
            </span>
          </div>
        </div>
      </div>

      {/* Pricing Header Title */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink mb-2">
          Pilih Paket Sesuai Frekuensi Deployment
        </h3>
        <p className="text-xs sm:text-sm text-ink-2 leading-relaxed">
          Upgrade langsung dari console untuk mengaktifkan kuota lebih tinggi, kapasitas upload ZIP, dan prompt perbaikan instan tanpa jeda.
        </p>
      </div>

      {/* 3-Tier Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch mb-12">
        {/* Tier 1: Free (Sandbox) */}
        <div
          className={`flex flex-col justify-between border bg-surface p-6 font-mono transition-all ${
            isFree ? 'border-ink ring-1 ring-ink' : 'border-rule hover:border-ink-2'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-2">
                Free (Sandbox)
              </span>
              {isFree && (
                <span className="px-2 py-0.5 border border-ink bg-ink text-canvas text-[10px] font-bold tracking-wide uppercase">
                  You are here
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-3xl font-bold text-ink">Rp 0</span>
              <span className="text-xs text-ink-3">/ bulan</span>
            </div>

            <p className="text-xs text-ink-2 leading-relaxed mb-6 font-sans">
              Cocok untuk menguji keamanan proyek sampingan sebelum rilis pertama.
            </p>

            <div className="w-full h-px bg-rule mb-6" />

            <ul className="space-y-2.5 text-xs text-ink-2 font-sans mb-8">
              <li className="flex items-start gap-2">
                <Check className="size-3.5 text-ink shrink-0 mt-0.5" strokeWidth={2.5} />
                <span><strong>3x</strong> audit keamanan per bulan</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="size-3.5 text-ink shrink-0 mt-0.5" strokeWidth={2.5} />
                <span>Maksimal <strong>10 MB</strong> per ZIP / target</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="size-3.5 text-ink shrink-0 mt-0.5" strokeWidth={2.5} />
                <span>Deteksi Lengkap 10 Kategori Kerentanan</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="size-3.5 text-ink shrink-0 mt-0.5" strokeWidth={2.5} />
                <span>Auto-Redaction Rahasia (Zero-Persistence)</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="size-3.5 text-ink shrink-0 mt-0.5" strokeWidth={2.5} />
                <span>
                  1-Click AI Fix Prompt: <strong>Hanya temuan #1</strong>
                </span>
              </li>
              <li className="flex items-start gap-2 text-ink-3">
                <span className="size-3.5 flex items-center justify-center shrink-0 mt-0.5 font-mono text-[10px]">&times;</span>
                <span>Format Laporan Web UI Saja (Tanpa Ekspor)</span>
              </li>
              <li className="flex items-start gap-2 text-ink-3">
                <span className="size-3.5 flex items-center justify-center shrink-0 mt-0.5 font-mono text-[10px]">&times;</span>
                <span>Tanpa Akses Terminal CLI / Webhook</span>
              </li>
            </ul>
          </div>

          <div>
            {isFree ? (
              <div className="w-full py-2.5 px-4 text-center border border-rule bg-canvas text-ink text-xs font-mono font-semibold cursor-default">
                Paket Kamu Saat Ini (You Are Here)
              </div>
            ) : (
              <div className="w-full py-2.5 px-4 text-center border border-rule bg-canvas text-ink-3 text-xs font-mono cursor-default">
                Tingkat Standar
              </div>
            )}
          </div>
        </div>

        {/* Tier 2: Pro (Indie / Vibe Coder) */}
        <div
          className={`relative flex flex-col justify-between border bg-surface p-6 font-mono transition-all ${
            isPro ? 'border-ink ring-2 ring-ink shadow-md' : 'border-rule hover:border-ink-2'
          }`}
        >
          {/* Most popular indicator */}
          {!isPro && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-ink text-canvas text-[10px] font-bold tracking-wide uppercase border border-ink">
              Paling Populer
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-3 mt-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink">
                Pro (Indie / Vibe Coder)
              </span>
              {isPro && (
                <span className="px-2 py-0.5 border border-ink bg-ink text-canvas text-[10px] font-bold tracking-wide uppercase">
                  You are here
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-3xl font-bold text-ink">Rp 79.000</span>
              <span className="text-xs text-ink-3">/ bulan</span>
            </div>

            <p className="text-xs text-ink-2 leading-relaxed mb-6 font-sans">
              Untuk solo developer & vibe coder yang rutin ship aplikasi ke production dengan cepat dan aman.
            </p>

            <div className="w-full h-px bg-rule mb-6" />

            <ul className="space-y-2.5 text-xs text-ink font-sans mb-8">
              <li className="flex items-start gap-2">
                <Check className="size-3.5 text-ink shrink-0 mt-0.5" strokeWidth={2.5} />
                <span><strong>50x</strong> audit keamanan per bulan</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="size-3.5 text-ink shrink-0 mt-0.5" strokeWidth={2.5} />
                <span>Maksimal <strong>100 MB</strong> per ZIP / target</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="size-3.5 text-ink shrink-0 mt-0.5" strokeWidth={2.5} />
                <span>Deteksi Lengkap 10 Kategori Kerentanan</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="size-3.5 text-ink shrink-0 mt-0.5" strokeWidth={2.5} />
                <span>Auto-Redaction Rahasia (Zero-Persistence)</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="size-3.5 text-ink shrink-0 mt-0.5" strokeWidth={2.5} />
                <span>
                  <strong>Unlimited</strong> 1-Click AI Fix Prompts untuk semua temuan
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="size-3.5 text-ink shrink-0 mt-0.5" strokeWidth={2.5} />
                <span>Ekspor <strong>Markdown, JSON, &amp; Standar PDF</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="size-3.5 text-ink shrink-0 mt-0.5" strokeWidth={2.5} />
                <span>Akses <strong>Terminal CLI &amp; Webhook Gatekeeper</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="size-3.5 text-ink shrink-0 mt-0.5" strokeWidth={2.5} />
                <span>Prioritas Antrean Audit FIFO</span>
              </li>
            </ul>
          </div>

          <div>
            {isPro ? (
              <div className="w-full py-2.5 px-4 text-center border border-ink bg-ink text-canvas text-xs font-mono font-semibold cursor-default">
                Paket Kamu Saat Ini (You Are Here)
              </div>
            ) : isEnterprise ? (
              <div className="w-full py-2.5 px-4 text-center border border-rule bg-canvas text-ink-3 text-xs font-mono cursor-default">
                Tercakup dalam Enterprise
              </div>
            ) : (
              <button
                type="button"
                onClick={handleProUpgrade}
                className="w-full py-2.5 px-4 bg-ink hover:bg-ink-2 text-canvas font-mono font-medium text-xs transition-colors cursor-pointer uppercase tracking-wider text-center"
              >
                Upgrade ke Pro Sekarang
              </button>
            )}
          </div>
        </div>

        {/* Tier 3: Enterprise (Custom SLA) */}
        <div
          className={`flex flex-col justify-between border bg-surface p-6 font-mono transition-all ${
            isEnterprise ? 'border-ink ring-2 ring-ink shadow-md' : 'border-rule hover:border-ink-2'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-2">
                Enterprise (Custom SLA)
              </span>
              {isEnterprise && (
                <span className="px-2 py-0.5 border border-ink bg-ink text-canvas text-[10px] font-bold tracking-wide uppercase">
                  You are here
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-3xl font-bold text-ink">Kustom</span>
            </div>

            <p className="text-xs text-ink-2 leading-relaxed mb-6 font-sans">
              Untuk proyek skala besar dengan dedicated sandbox dan SLA khusus.
            </p>

            <div className="w-full h-px bg-rule mb-6" />

            <ul className="space-y-2.5 text-xs text-ink-2 font-sans mb-8">
              <li className="flex items-start gap-2">
                <Check className="size-3.5 text-ink shrink-0 mt-0.5" strokeWidth={2.5} />
                <span><strong>Unlimited</strong> audit + dedicated VPS sandbox</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="size-3.5 text-ink shrink-0 mt-0.5" strokeWidth={2.5} />
                <span>Kustom kapasitas upload (hingga <strong>500 MB+</strong>)</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="size-3.5 text-ink shrink-0 mt-0.5" strokeWidth={2.5} />
                <span>Aturan kustom AST &amp; regex khusus arsitektur</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="size-3.5 text-ink shrink-0 mt-0.5" strokeWidth={2.5} />
                <span>Full integrasi otomatis CI/CD (GitHub &amp; GitLab)</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="size-3.5 text-ink shrink-0 mt-0.5" strokeWidth={2.5} />
                <span>White-label PDF &amp; SLA prioritas teknis 24/7</span>
              </li>
            </ul>
          </div>

          <div>
            {isEnterprise ? (
              <div className="w-full py-2.5 px-4 text-center border border-ink bg-ink text-canvas text-xs font-mono font-semibold cursor-default">
                Paket Kamu Saat Ini (You Are Here)
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsEnterpriseModalOpen(true)}
                className="w-full py-2.5 px-4 border border-rule bg-canvas hover:bg-surface text-ink font-mono font-medium text-xs transition-colors cursor-pointer uppercase tracking-wider text-center"
              >
                Konsultasi Enterprise
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Trust & Guarantee Box */}
      <div className="border border-rule bg-surface p-6 font-mono text-xs">
        <h4 className="text-sm font-bold text-ink mb-3 font-sans">
          Jaminan Keamanan &amp; Transparansi Layanan ShipSafe
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-sans text-ink-2">
          <div className="flex items-start gap-2">
            <Shield className="size-4 text-ink shrink-0 mt-0.5" strokeWidth={1.5} />
            <span><strong>Zero-Persistence</strong>: Kode ZIP kamu langsung dihapus dari disk setelah audit selesai.</span>
          </div>
          <div className="flex items-start gap-2">
            <Zap className="size-4 text-ink shrink-0 mt-0.5" strokeWidth={1.5} />
            <span><strong>Aktivasi Seketika</strong>: Upgrade Pro langsung aktif di akunmu tanpa ribet setup.</span>
          </div>
          <div className="flex items-start gap-2">
            <MessageSquare className="size-4 text-ink shrink-0 mt-0.5" strokeWidth={1.5} />
            <span><strong>Dukungan WhatsApp</strong>: Komunikasi langsung dengan engineer ShipSafe kapan pun dibutuhkan.</span>
          </div>
        </div>
      </div>

      {/* Enterprise Lead Qualification Modal */}
      {isEnterpriseModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-mono"
          role="dialog"
          aria-modal="true"
          aria-labelledby="enterprise-lead-title"
        >
          <div
            className="relative w-full max-w-lg border border-rule bg-canvas p-6 sm:p-7 shadow-none"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsEnterpriseModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-ink-3 hover:text-ink cursor-pointer"
              aria-label="Tutup modal"
            >
              &times;
            </button>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-rule bg-surface text-ink text-[11px] font-semibold mb-3 uppercase tracking-wider">
              <Building2 className="size-3.5" />
              <span>Solusi Enterprise (Custom SLA)</span>
            </div>

            <h3 id="enterprise-lead-title" className="text-xl font-bold tracking-tight text-ink mb-2">
              Konsultasi Kebutuhan Enterprise
            </h3>
            <p className="text-xs text-ink-2 leading-relaxed mb-6 font-sans">
              Diskusikan kebutuhan volume audit, dedicated sandbox, dan integrasi CI/CD khusus dengan engineer ShipSafe.
            </p>

            <form onSubmit={handleEnterpriseSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5 font-sans">
                  Nama Perusahaan / Proyek
                </label>
                <input
                  type="text"
                  required
                  placeholder="Misal: PT Inovasi Digital Nusantara / Proyek Produksi"
                  value={enterpriseForm.companyName}
                  onChange={(e) => setEnterpriseForm({ ...enterpriseForm, companyName: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-rule bg-surface text-ink placeholder:text-ink-3 focus:border-ink focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5 font-sans">
                  Estimasi Scan / Bulan
                </label>
                <select
                  value={enterpriseForm.estimatedVolume}
                  onChange={(e) => setEnterpriseForm({ ...enterpriseForm, estimatedVolume: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs border border-rule bg-surface text-ink focus:border-ink focus:outline-none cursor-pointer"
                >
                  <option value="< 100">&lt; 100 scan per bulan</option>
                  <option value="100 - 500">100 - 500 scan per bulan</option>
                  <option value="500+">500+ scan per bulan</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-2 font-sans">
                  Kebutuhan Spesifik
                </label>
                <div className="space-y-2 text-xs text-ink-2 font-sans">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enterpriseForm.needs.cicd}
                      onChange={(e) =>
                        setEnterpriseForm({
                          ...enterpriseForm,
                          needs: { ...enterpriseForm.needs, cicd: e.target.checked },
                        })
                      }
                      className="size-3.5 border border-rule"
                    />
                    <span>Integrasi CI/CD (GitHub Actions / GitLab CI)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enterpriseForm.needs.whiteLabel}
                      onChange={(e) =>
                        setEnterpriseForm({
                          ...enterpriseForm,
                          needs: { ...enterpriseForm.needs, whiteLabel: e.target.checked },
                        })
                      }
                      className="size-3.5 border border-rule"
                    />
                    <span>Laporan PDF White-Label dengan Branding Kustom</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enterpriseForm.needs.dedicatedSandbox}
                      onChange={(e) =>
                        setEnterpriseForm({
                          ...enterpriseForm,
                          needs: { ...enterpriseForm.needs, dedicatedSandbox: e.target.checked },
                        })
                      }
                      className="size-3.5 border border-rule"
                    />
                    <span>Dedicated Isolated Sandbox / On-Premise</span>
                  </label>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-ink hover:bg-ink-2 text-canvas text-xs font-mono font-medium transition-colors cursor-pointer uppercase tracking-wider text-center"
                >
                  Kirim Pengajuan via WhatsApp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
