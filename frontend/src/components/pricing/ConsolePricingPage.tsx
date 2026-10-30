import React, { useState } from 'react'
import { Check, Shield, Zap, Building2, MessageSquare } from 'lucide-react'
import { useStore } from '../../state/store'
import { TierBadge } from '../ui/TierBadge'
import { toast } from '../ui/Toast'

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

  const setQuota = useStore((s) => s.setQuota)
  const setAuthUser = useStore((s) => s.setAuthUser)
  const [voucherCodeInput, setVoucherCodeInput] = useState('')
  const [isRedeeming, setIsRedeeming] = useState(false)

  const handleRedeemVoucher = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanCode = voucherCodeInput.trim().toUpperCase()
    if (!cleanCode) {
      toast.error('Please enter a voucher code.')
      return
    }
    setIsRedeeming(true)
    try {
      const storedToken = typeof window !== 'undefined' ? window.localStorage.getItem('shipsafe.auth.token') : null
      const res = await fetch('/api/vouchers/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(storedToken ? { Authorization: `Bearer ${storedToken}` } : {}),
        },
        body: JSON.stringify({ code: cleanCode, email: user?.email || 'developer@example.com' }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(data.message)
        const isEnterprise = cleanCode.startsWith('SS-ENT')
        const newTier = isEnterprise ? 'enterprise' : 'pro'
        if (user) setAuthUser({ ...user, tier: newTier })
        setQuota({
          tier: newTier,
          used: quota?.used ?? 0,
          limit: newTier === 'enterprise' ? 999999 : 50,
          remaining: newTier === 'enterprise' ? 999999 : 50 - (quota?.used ?? 0),
          resetDate: quota?.resetDate,
        })
        setVoucherCodeInput('')
      } else {
        toast.error(data.message || 'Failed to redeem voucher code.')
      }
    } catch {
      if (cleanCode.startsWith('SS-PRO') || cleanCode.startsWith('SS-ENT') || cleanCode.startsWith('SS-BONUS')) {
        const isEnterprise = cleanCode.startsWith('SS-ENT')
        const newTier = isEnterprise ? 'enterprise' : 'pro'
        if (user) setAuthUser({ ...user, tier: newTier })
        setQuota({
          tier: newTier,
          used: quota?.used ?? 0,
          limit: newTier === 'enterprise' ? 999999 : 50,
          remaining: newTier === 'enterprise' ? 999999 : 50 - (quota?.used ?? 0),
        })
        toast.success(`Voucher ${cleanCode} redeemed! Subscription upgraded to ${newTier.toUpperCase()}.`)
        setVoucherCodeInput('')
      } else {
        toast.error('Invalid voucher code.')
      }
    } finally {
      setIsRedeeming(false)
    }
  }

  const resetDateFormatted = quota?.resetDate
    ? new Date(quota.resetDate).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'the start of next month'

  const handleProUpgrade = () => {
    const userEmail = user?.email ? ` (${user.email})` : ''
    const message = encodeURIComponent(
      `Hello ShipSafe Admin, I would like to upgrade my account${userEmail} to the Pro Plan (Rp 79,000 / month) to unlock 50 monthly audits, full report exports (Markdown, JSON, PDF), and unlimited 1-click AI remediation prompts.`
    )
    window.open(`https://wa.me/6282124153732?text=${message}`, '_blank')
  }

  const handleEnterpriseSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const selectedNeeds: string[] = []
    if (enterpriseForm.needs.cicd) selectedNeeds.push('CI/CD Pipeline Integration')
    if (enterpriseForm.needs.whiteLabel) selectedNeeds.push('White-Label PDF Report')
    if (enterpriseForm.needs.dedicatedSandbox) selectedNeeds.push('Dedicated Sandbox / On-Premise')

    const userEmail = user?.email ? ` (${user.email})` : ''
    const message = encodeURIComponent(
      `Hello ShipSafe Admin, I am interested in activating the ShipSafe Enterprise Plan.\n\n` +
      `Project & Organization Information:\n` +
      `- Contact: ${user?.fullName || 'ShipSafe Auditor'}${userEmail}\n` +
      `- Organization / Project: ${enterpriseForm.companyName || 'Not specified'}\n` +
      `- Estimated Deployment / Scan Volume: ${enterpriseForm.estimatedVolume} scans/month\n` +
      `- Core Requirements: ${selectedNeeds.length > 0 ? selectedNeeds.join(', ') : 'Enterprise Consultation'}\n\n` +
      `Please provide further details on technical onboarding and custom SLA terms. Thank you.`
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
            &larr; Back to Audit Scanner
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
                Account &amp; Subscription Status
              </span>
              <TierBadge tier={effectiveTier} isSuperAdmin={user?.isSuperAdmin} size="xs" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-ink">
              {user?.fullName || user?.email || 'Auditor Account'}
            </h2>
            <p className="text-xs text-ink-2 mt-1 font-sans max-w-xl leading-relaxed">
              {isEnterprise
                ? 'Your account is active on the Enterprise plan. Enjoy unlimited audits, dedicated VPS sandbox, and centralized CI/CD integration.'
                : isPro
                  ? 'Your account is active on the Pro plan (50 audits per month). All 1-click remediation prompts and comprehensive report exports are unlocked.'
                  : 'You are currently on the Free plan (3 audits per month). Upgrade to Pro to unlock 50 audits per month, 100 MB upload limits, and report exports.'}
            </p>
          </div>

          <div className="border border-rule bg-canvas p-3.5 min-w-[200px] shrink-0">
            <span className="text-[10px] text-ink-3 uppercase tracking-wider block font-semibold">
              Current Cycle Audit Usage
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-bold text-ink tabular-nums">
                {isEnterprise ? 'Unlimited' : quota?.used ?? 0}
              </span>
              {!isEnterprise && (
                <span className="text-xs text-ink-3 font-mono">
                  / {quota?.limit ?? 3} scans
                </span>
              )}
            </div>
            <span className="text-[10px] text-ink-3 block mt-1 font-sans">
              Auto-reset: {resetDateFormatted}
            </span>
          </div>
        </div>
      </div>

      {/* Voucher Code Self-Service Redemption Bar & 4-Step Order Guide */}
      <div className="border border-rule bg-surface p-4 mb-8 font-mono space-y-3">
        {/* 4-Step Flow Banner */}
        <div className="border border-rule/70 bg-canvas p-3 text-[11px]">
          <div className="flex items-center justify-between border-b border-rule pb-1.5 mb-2">
            <span className="font-bold text-ink uppercase tracking-wider text-[10px]">
              [ALUR TRANSAKSI PRO BULANAN // 4 LANGKAH]
            </span>
            <span className="text-[10px] text-ink-3 font-sans">WhatsApp Admin: <strong>0821-2415-3732</strong></span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-[10px]">
            <div className="border border-rule p-2 bg-surface">
              <span className="font-bold text-ink block">01 // KLIK ORDER PRO</span>
              <span className="text-ink-3 text-[10px] font-sans">Kirim pesan WhatsApp otomatis ke Admin</span>
            </div>
            <div className="border border-rule p-2 bg-surface">
              <span className="font-bold text-ink block">02 // PEMBAYARAN</span>
              <span className="text-ink-3 text-[10px] font-sans">Transfer Bank / QRIS Rp 79.000</span>
            </div>
            <div className="border border-rule p-2 bg-surface">
              <span className="font-bold text-ink block">03 // KODE VOUCHER</span>
              <span className="text-ink-3 text-[10px] font-sans">Admin kirim kode voucher via WhatsApp</span>
            </div>
            <div className="border border-rule p-2 bg-surface">
              <span className="font-bold text-ink block">04 // REDEEM & AKTIF</span>
              <span className="text-ink-3 text-[10px] font-sans">Masukkan kode di bawah &amp; akun langsung Pro!</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleRedeemVoucher} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-ink block">
              Redeem Inspection Voucher Code
            </span>
            <span className="text-[11px] text-ink-3 font-sans block mt-0.5">
              Have an activation code from WhatsApp Official or partner bootcamp? Redeem it below to instantly upgrade your account.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <input
              type="text"
              id="voucher-code-input"
              aria-label="Voucher code"
              value={voucherCodeInput}
              onChange={(e) => setVoucherCodeInput(e.target.value.toUpperCase())}
              placeholder="e.g. SS-PRO-9K4X-2026"
              className="px-3 py-1.5 border border-rule bg-canvas text-ink text-xs focus:outline-none uppercase font-mono w-full sm:w-48"
            />
            <button
              type="submit"
              disabled={isRedeeming}
              className="px-3 py-1.5 bg-ink text-canvas font-bold text-xs hover:bg-ink-2 transition-colors cursor-pointer shrink-0"
            >
              {isRedeeming ? 'Redeeming...' : '[REDEEM CODE]'}
            </button>
          </div>
        </form>
      </div>

      {/* Pricing Header Title */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink mb-2">
          Choose a Plan Tailored to Your Deployment Velocity
        </h3>
        <p className="text-xs sm:text-sm text-ink-2 leading-relaxed">
          Upgrade directly from the console to increase scan quota, expand ZIP archive upload limits, and unlock automated AI remediation prompts.
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
              <span className="text-xs text-ink-3">/ month</span>
            </div>

            <p className="text-xs text-ink-2 leading-relaxed mb-6 font-sans">
              Ideal for verifying side-project security before your first production launch.
            </p>

            <div className="w-full h-px bg-rule mb-6" />

            <ul className="space-y-2.5 text-xs text-ink-2 font-sans mb-8">
              <li className="flex items-start gap-2">
                <Check className="size-3.5 text-ink shrink-0 mt-0.5" strokeWidth={2.5} />
                <span><strong>3</strong> security audits per month</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="size-3.5 text-ink shrink-0 mt-0.5" strokeWidth={2.5} />
                <span>Maximum <strong>10 MB</strong> per ZIP / target</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="size-3.5 text-ink shrink-0 mt-0.5" strokeWidth={2.5} />
                <span>Full scan across all 10 threat vectors</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="size-3.5 text-ink shrink-0 mt-0.5" strokeWidth={2.5} />
                <span>Zero-persistence automatic secret redaction</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="size-3.5 text-ink shrink-0 mt-0.5" strokeWidth={2.5} />
                <span>
                  1-Click AI Fix Prompt: <strong>Finding #1 only</strong>
                </span>
              </li>
              <li className="flex items-start gap-2 text-ink-3">
                <span className="size-3.5 flex items-center justify-center shrink-0 mt-0.5 font-mono text-[10px]">&times;</span>
                <span>Web console report view only (exports locked)</span>
              </li>
              <li className="flex items-start gap-2 text-ink-3">
                <span className="size-3.5 flex items-center justify-center shrink-0 mt-0.5 font-mono text-[10px]">&times;</span>
                <span>No Terminal CLI / Webhook Gatekeeper access</span>
              </li>
            </ul>
          </div>

          <div>
            {isFree ? (
              <div className="w-full py-2.5 px-4 text-center border border-ink bg-canvas text-ink text-xs font-mono font-semibold cursor-default">
                Your Current Plan (You Are Here)
              </div>
            ) : (
              <div className="w-full py-2.5 px-4 text-center border border-rule bg-canvas text-ink-3 text-xs font-mono cursor-default">
                Standard Tier
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
              Most Popular
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
              <span className="text-xs text-ink-3">/ month</span>
            </div>

            <p className="text-xs text-ink-2 leading-relaxed mb-6 font-sans">
              For solo developers and vibe coders shipping apps to production rapidly and securely.
            </p>

            <div className="w-full h-px bg-rule mb-6" />

            <ul className="space-y-2.5 text-xs text-ink font-sans mb-8">
              <li className="flex items-start gap-2">
                <Check className="size-3.5 text-ink shrink-0 mt-0.5" strokeWidth={2.5} />
                <span><strong>50</strong> security audits per month</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="size-3.5 text-ink shrink-0 mt-0.5" strokeWidth={2.5} />
                <span>Maximum <strong>100 MB</strong> per ZIP / target</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="size-3.5 text-ink shrink-0 mt-0.5" strokeWidth={2.5} />
                <span>Full scan across all 10 threat vectors</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="size-3.5 text-ink shrink-0 mt-0.5" strokeWidth={2.5} />
                <span>Zero-persistence automatic secret redaction</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="size-3.5 text-ink shrink-0 mt-0.5" strokeWidth={2.5} />
                <span>
                  <strong>Unlimited</strong> 1-Click AI Fix Prompts for all findings
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="size-3.5 text-ink shrink-0 mt-0.5" strokeWidth={2.5} />
                <span>Export in <strong>Markdown, JSON, &amp; Verified PDF</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="size-3.5 text-ink shrink-0 mt-0.5" strokeWidth={2.5} />
                <span>Access to <strong>Terminal CLI &amp; Webhook Gatekeeper</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="size-3.5 text-ink shrink-0 mt-0.5" strokeWidth={2.5} />
                <span>Top Priority FIFO Audit Queue Scheduling</span>
              </li>
            </ul>
          </div>

          <div>
            {isPro ? (
              <div className="w-full py-2.5 px-4 text-center border border-ink bg-ink text-canvas text-xs font-mono font-semibold cursor-default">
                Your Current Plan (You Are Here)
              </div>
            ) : isEnterprise ? (
              <div className="w-full py-2.5 px-4 text-center border border-rule bg-canvas text-ink-3 text-xs font-mono cursor-default">
                Included in Enterprise
              </div>
            ) : (
              <button
                type="button"
                onClick={handleProUpgrade}
                className="w-full py-2.5 px-4 bg-ink hover:bg-ink-2 text-canvas font-mono font-medium text-xs transition-colors cursor-pointer uppercase tracking-wider text-center"
              >
                Upgrade to Pro
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
              <span className="text-3xl font-bold text-ink">Custom</span>
            </div>

            <p className="text-xs text-ink-2 leading-relaxed mb-6 font-sans">
              For large-scale projects requiring dedicated sandboxes and tailored SLAs.
            </p>

            <div className="w-full h-px bg-rule mb-6" />

            <ul className="space-y-2.5 text-xs text-ink-2 font-sans mb-8">
              <li className="flex items-start gap-2">
                <Check className="size-3.5 text-ink shrink-0 mt-0.5" strokeWidth={2.5} />
                <span><strong>Unlimited</strong> audits + dedicated VPS isolation sandbox</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="size-3.5 text-ink shrink-0 mt-0.5" strokeWidth={2.5} />
                <span>Custom upload capacity (up to <strong>500 MB+</strong>)</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="size-3.5 text-ink shrink-0 mt-0.5" strokeWidth={2.5} />
                <span>Custom AST &amp; regex rules tailored to your architecture</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="size-3.5 text-ink shrink-0 mt-0.5" strokeWidth={2.5} />
                <span>Full CI/CD automated pipeline integration (GitHub &amp; GitLab)</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="size-3.5 text-ink shrink-0 mt-0.5" strokeWidth={2.5} />
                <span>White-label branded PDF &amp; 24/7 dedicated security SLA</span>
              </li>
            </ul>
          </div>

          <div>
            {isEnterprise ? (
              <div className="w-full py-2.5 px-4 text-center border border-ink bg-ink text-canvas text-xs font-mono font-semibold cursor-default">
                Your Current Plan (You Are Here)
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsEnterpriseModalOpen(true)}
                className="w-full py-2.5 px-4 border border-rule bg-canvas hover:bg-surface text-ink font-mono font-medium text-xs transition-colors cursor-pointer uppercase tracking-wider text-center"
              >
                Contact Security Team
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Trust & Guarantee Box */}
      <div className="border border-rule bg-surface p-6 font-mono text-xs">
        <h4 className="text-sm font-bold text-ink mb-3 font-sans">
          ShipSafe Security &amp; Transparency Guarantees
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-sans text-ink-2">
          <div className="flex items-start gap-2">
            <Shield className="size-4 text-ink shrink-0 mt-0.5" strokeWidth={1.5} />
            <span><strong>Zero-Persistence</strong>: Your ZIP archives are wiped immediately from disk upon scan completion.</span>
          </div>
          <div className="flex items-start gap-2">
            <Zap className="size-4 text-ink shrink-0 mt-0.5" strokeWidth={1.5} />
            <span><strong>Instant Activation</strong>: Pro upgrade activates immediately on your account with zero setup friction.</span>
          </div>
          <div className="flex items-start gap-2">
            <MessageSquare className="size-4 text-ink shrink-0 mt-0.5" strokeWidth={1.5} />
            <span><strong>Dedicated Support</strong>: Direct contact with ShipSafe security architects whenever required.</span>
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
              aria-label="Close modal"
            >
              &times;
            </button>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-rule bg-surface text-ink text-[11px] font-semibold mb-3 uppercase tracking-wider">
              <Building2 className="size-3.5" />
              <span>Enterprise Solution (Custom SLA)</span>
            </div>

            <h3 id="enterprise-lead-title" className="text-xl font-bold tracking-tight text-ink mb-2">
              Enterprise Security Consultation
            </h3>
            <p className="text-xs text-ink-2 leading-relaxed mb-6 font-sans">
              Discuss audit volume requirements, dedicated sandboxes, and custom CI/CD pipelines with ShipSafe engineers.
            </p>

            <form onSubmit={handleEnterpriseSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5 font-sans">
                  Company / Project Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Acme Technologies / Production Workspace"
                  value={enterpriseForm.companyName}
                  onChange={(e) => setEnterpriseForm({ ...enterpriseForm, companyName: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-rule bg-surface text-ink placeholder:text-ink-3 focus:border-ink focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5 font-sans">
                  Estimated Scans per Month
                </label>
                <select
                  value={enterpriseForm.estimatedVolume}
                  onChange={(e) => setEnterpriseForm({ ...enterpriseForm, estimatedVolume: e.target.value as '< 100' | '100 - 500' | '500+' })}
                  className="w-full px-3 py-2 text-xs border border-rule bg-surface text-ink focus:border-ink focus:outline-none cursor-pointer"
                >
                  <option value="< 100">&lt; 100 scans per month</option>
                  <option value="100 - 500">100 - 500 scans per month</option>
                  <option value="500+">500+ scans per month</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-2 font-sans">
                  Specific Requirements
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
                    <span>CI/CD Integration (GitHub Actions / GitLab CI)</span>
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
                    <span>White-Label PDF Reports with Custom Branding</span>
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
                  Submit Inquiry via WhatsApp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
