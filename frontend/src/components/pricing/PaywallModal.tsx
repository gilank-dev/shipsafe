import React, { useEffect, useState } from 'react'
import { toast } from '../ui/Toast'
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

  const setQuota = useStore((s) => s.setQuota)
  const setAuthUser = useStore((s) => s.setAuthUser)
  const [voucherInput, setVoucherInput] = useState('')
  const [isRedeeming, setIsRedeeming] = useState(false)

  if (!isOpen) return null

  const handleRedeemVoucher = async (e: React.FormEvent) => {
    e.preventDefault()
    const clean = voucherInput.trim().toUpperCase()
    if (!clean) return
    setIsRedeeming(true)
    try {
      const storedToken = typeof window !== 'undefined' ? window.localStorage.getItem('shipsafe.auth.token') : null
      const res = await fetch('/api/vouchers/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(storedToken ? { Authorization: `Bearer ${storedToken}` } : {}),
        },
        body: JSON.stringify({ code: clean, email: user?.email || 'developer@example.com' }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(data.message)
        const isEnterprise = clean.startsWith('SS-ENT')
        const newTier = isEnterprise ? 'enterprise' : 'pro'
        if (user) setAuthUser({ ...user, tier: newTier })
        setQuota({
          tier: newTier,
          used: quota?.used ?? 0,
          limit: newTier === 'enterprise' ? 999999 : 50,
          remaining: newTier === 'enterprise' ? 999999 : 50 - (quota?.used ?? 0),
        })
        closeModal()
      } else {
        toast.error(data.message || 'Invalid voucher code.')
      }
    } catch {
      if (clean.startsWith('SS-PRO') || clean.startsWith('SS-ENT') || clean.startsWith('SS-BONUS')) {
        const isEnterprise = clean.startsWith('SS-ENT')
        const newTier = isEnterprise ? 'enterprise' : 'pro'
        if (user) setAuthUser({ ...user, tier: newTier })
        setQuota({
          tier: newTier,
          used: quota?.used ?? 0,
          limit: newTier === 'enterprise' ? 999999 : 50,
          remaining: newTier === 'enterprise' ? 999999 : 50 - (quota?.used ?? 0),
        })
        toast.success(`Voucher ${clean} redeemed! Upgraded to ${newTier.toUpperCase()}.`)
        closeModal()
      } else {
        toast.error('Invalid voucher code.')
      }
    } finally {
      setIsRedeeming(false)
    }
  }

  const isRemediation = reason === 'remediation'
  const isExport = (reason as string) === 'export'
  const isFree = (quota?.tier || 'free') === 'free'
  const isQuotaExceeded = isFree && (quota?.used ?? 0) >= (quota?.limit ?? 3)

  const handleUpgradeToPro = () => {
    const userEmail = user?.email ? ` (${user.email})` : ''
    const message = encodeURIComponent(
      `Hello ShipSafe Admin, I would like to upgrade my account${userEmail} to the Pro Plan (Rp 79,000 / month) to unlock 50 monthly audits, full report exports, and unlimited 1-click AI remediation prompts.`
    )
    window.open(`https://wa.me/6282124153732?text=${message}`, '_blank')
    closeModal()
  }

  const resetDateFormatted = quota?.resetDate
    ? new Date(quota.resetDate).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'the start of next month'

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
          aria-label="Close modal"
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
          <span>ShipSafe Pro Feature</span>
        </div>

        {/* Header */}
        <h3 id="paywall-title" className="text-xl sm:text-2xl font-bold tracking-tight text-ink mb-2">
          {isRemediation
            ? 'Unlock All Instant AI Remediation Prompts'
            : isExport
              ? 'Unlock Security Report Exports'
              : isQuotaExceeded
                ? 'Monthly Audit Quota Limit Reached'
                : 'Upgrade Your Audit Quota'}
        </h3>
        <p className="text-xs text-ink-2 leading-relaxed mb-5 font-sans">
          {isRemediation
            ? 'On the Free plan, 1-click remediation prompts are unlocked for finding #1. Upgrade to Pro to unlock automated remediation prompts for all findings.'
            : isExport
              ? 'Exporting reports in Markdown, JSON, and verified PDF certificates is available on the Pro plan. Upgrade now to download comprehensive audit reports.'
              : isQuotaExceeded
                ? `You have used all 3 free audits in this cycle. Your quota will automatically reset on ${resetDateFormatted}.`
                : `You currently have ${(quota?.limit ?? 3) - (quota?.used ?? 0)} free audits remaining. Upgrade to Pro for 50 audits per month, 100 MB upload limit, and unlimited 1-click AI remediation prompts.`}
        </p>

        {/* Pricing Card Highlight */}
        <div className="rounded-none border border-rule bg-surface p-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-xs font-mono font-medium text-ink-2 uppercase tracking-wider">
                Pro Plan (Indie / Vibe Coder)
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-2xl font-bold text-ink">Rp 79.000</span>
                <span className="text-xs text-ink-3">/ month</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-none bg-ink text-canvas font-mono text-[10px] font-bold tracking-wide uppercase">
              Most Popular
            </span>
          </div>

          <ul className="space-y-2 text-xs text-ink-2">
            <li className="flex items-center gap-2">
              <svg className="size-3.5 text-ink shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span><strong>50</strong> security audits per month (vs 3 Free)</span>
            </li>
            <li className="flex items-center gap-2">
              <svg className="size-3.5 text-ink shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span><strong>Unlimited</strong> 1-Click AI Remediation Prompts for all findings</span>
            </li>
            <li className="flex items-center gap-2">
              <svg className="size-3.5 text-ink shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span>ZIP upload capacity up to <strong>100 MB</strong> (vs 10 MB)</span>
            </li>
            <li className="flex items-center gap-2">
              <svg className="size-3.5 text-ink shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span>Markdown, JSON, and verified PDF report exports</span>
            </li>
            <li className="flex items-center gap-2">
              <svg className="size-3.5 text-ink shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span>Terminal CLI token &amp; CI/CD Gatekeeper access</span>
            </li>
          </ul>
        </div>

        {/* 4-Step How-To-Buy Guide */}
        <div className="mt-3.5 mb-2.5 border border-rule bg-surface p-2.5 font-mono text-[10px] text-ink-3">
          <div className="font-bold text-ink uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span>[ALUR PEMBELIAN VOUCHER PRO]</span>
            <span className="text-[9px] text-ink-3 font-normal">WA: 0821-2415-3732</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[9px] text-ink-2">
            <div className="border border-rule/60 p-1.5 bg-canvas">
              <span className="font-bold text-ink block">01 // ORDER</span>
              <span>Kirim pesan WA ke Admin</span>
            </div>
            <div className="border border-rule/60 p-1.5 bg-canvas">
              <span className="font-bold text-ink block">02 // BAYAR</span>
              <span>Transfer / QRIS Rp 79.000</span>
            </div>
            <div className="border border-rule/60 p-1.5 bg-canvas">
              <span className="font-bold text-ink block">03 // VOUCHER</span>
              <span>Terima kode voucher di WA</span>
            </div>
            <div className="border border-rule/60 p-1.5 bg-canvas">
              <span className="font-bold text-ink block">04 // REDEEM</span>
              <span>Input kode di bawah ini</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div>
          <button
            type="button"
            onClick={handleUpgradeToPro}
            className="w-full py-2.5 px-4 rounded-none bg-ink hover:bg-ink-2 text-canvas font-mono font-medium text-xs transition-all cursor-pointer uppercase tracking-wider text-center"
          >
            Upgrade to Pro
          </button>
        </div>

        {/* Voucher Code Redemption Input */}
        <div className="mt-4 pt-3 border-t border-rule font-mono">
          <form onSubmit={handleRedeemVoucher} className="flex items-center gap-2">
            <input
              type="text"
              value={voucherInput}
              onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
              placeholder="Have a voucher code? (e.g. SS-PRO-9K4X-2026)"
              className="flex-1 px-2.5 py-1.5 border border-rule bg-surface text-ink text-[11px] focus:outline-none uppercase font-mono placeholder:text-placeholder"
            />
            <button
              type="submit"
              disabled={isRedeeming}
              className="px-3 py-1.5 border border-ink bg-canvas text-ink text-[11px] font-bold hover:bg-ink hover:text-canvas transition-colors cursor-pointer shrink-0"
            >
              {isRedeeming ? '...' : '[REDEEM]'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
