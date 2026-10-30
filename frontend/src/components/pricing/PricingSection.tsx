import React, { useState } from 'react'
import { useStore } from '../../state/store'

interface EnterpriseLeadForm {
  companyName: string
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
    if (enterpriseForm.needs.cicd) selectedNeeds.push('CI/CD Pipeline Integration')
    if (enterpriseForm.needs.whiteLabel) selectedNeeds.push('White-Label PDF Report')
    if (enterpriseForm.needs.dedicatedSandbox) selectedNeeds.push('Dedicated Sandbox / On-Premise')

    const message = encodeURIComponent(
      `Hello ShipSafe Security Team, I am interested in the ShipSafe Enterprise plan.\n\n` +
      `Project & Organization Information:\n` +
      `- Organization / Project: ${enterpriseForm.companyName || 'Not specified'}\n` +
      `- Estimated Deployment / Scan Volume: ${enterpriseForm.estimatedVolume} scans per month\n` +
      `- Core Requirements: ${selectedNeeds.length > 0 ? selectedNeeds.join(', ') : 'Enterprise Consultation'}\n\n` +
      `Please provide further details on technical onboarding and custom SLA terms. Thank you.`
    )

    window.open(`https://wa.me/6282124153732?text=${message}`, '_blank')
    setIsEnterpriseModalOpen(false)
  }

  return (
    <section id="pricing" className="relative min-h-[calc(100dvh-4rem)] flex flex-col justify-center py-8 sm:py-12 lg:py-16 px-4 sm:px-6 lg:px-8 w-full max-w-7xl mx-auto scroll-mt-20">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-neutral-950 dark:text-white mb-3">
          Developer Security for the Price of a Coffee
        </h2>
        <p className="text-base sm:text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed">
          Ship code to production with complete peace of mind. Choose the plan tailored to your release velocity.
        </p>
      </div>

      {/* 3-Tier Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-stretch">
        {/* Tier 1: Free (Sandbox) */}
        <div className="flex flex-col justify-between rounded-2xl border border-black/[0.08] dark:border-white/[0.12] bg-white dark:bg-[#121316] p-6 sm:p-7 transition-all duration-200 hover:border-neutral-400 dark:hover:border-neutral-700 hover:-translate-y-1 hover:shadow-md shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Free (Sandbox)
              </span>
            </div>

            <div className="flex items-baseline gap-1 mb-1.5">
              <span className="text-3xl sm:text-4xl font-extrabold text-neutral-950 dark:text-white">Rp 0</span>
              <span className="text-sm text-neutral-500 dark:text-neutral-400">/ month</span>
            </div>

            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed mb-4 min-h-[44px]">
              Ideal for verifying side-project security before your first production launch.
            </p>

            <div className="w-full h-px bg-neutral-200 dark:bg-neutral-800 mb-3 sm:mb-4" />

            <ul className="space-y-3 text-sm text-neutral-700 dark:text-neutral-300 mb-6">
              <li className="flex items-start gap-2">
                <svg className="size-3.5 sm:size-4 text-neutral-900 dark:text-white shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>3 security audits per month (Max 10 MB)</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="size-3.5 sm:size-4 text-neutral-900 dark:text-white shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>10 critical threat categories &amp; runtime vulnerability scans</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="size-3.5 sm:size-4 text-neutral-900 dark:text-white shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Zero-persistence automatic secret redaction</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="size-3.5 sm:size-4 text-neutral-900 dark:text-white shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>AI remediation prompt unlocked for finding #1</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="size-3.5 sm:size-4 text-neutral-900 dark:text-white shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Web console &amp; JSON audit report export</span>
              </li>
            </ul>
          </div>

          <button
            type="button"
            onClick={handleFreeCta}
            className="w-full py-3 px-4 rounded-xl border border-black/[0.12] dark:border-white/[0.16] bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800/80 dark:hover:bg-neutral-700 text-neutral-950 dark:text-white font-medium text-sm transition-all cursor-pointer font-sans active:scale-[0.99] text-center"
          >
            Start Free Scan
          </button>
        </div>

        {/* Tier 2: Pro (Indie / Vibe Coder) - Highlighted */}
        <div className="relative flex flex-col justify-between rounded-2xl border-2 border-neutral-900 dark:border-white bg-white dark:bg-[#121316] p-6 sm:p-7 transition-all duration-200 shadow-md">
          {/* Badge */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-mono text-[10px] font-bold tracking-wide">
            Most Popular
          </div>

          <div>
            <div className="flex items-center justify-between mb-2 sm:mb-3 mt-0.5">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-neutral-900 dark:text-white">
                Pro (Indie / Vibe Coder)
              </span>
            </div>

            <div className="flex items-baseline gap-1 mb-1.5">
              <span className="text-3xl sm:text-4xl font-extrabold text-neutral-950 dark:text-white">Rp 79.000</span>
              <span className="text-sm text-neutral-500 dark:text-neutral-400">/ month</span>
            </div>

            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed mb-4 min-h-[44px]">
              For solo developers and vibe coders shipping apps to production rapidly and securely.
            </p>

            <div className="w-full h-px bg-neutral-200 dark:bg-neutral-800 mb-3 sm:mb-4" />

            <ul className="space-y-3 text-sm text-neutral-700 dark:text-neutral-300 mb-6">
              <li className="flex items-start gap-2">
                <svg className="size-3.5 sm:size-4 text-neutral-900 dark:text-white shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Unlimited ZIP audits &amp; local CLI scans</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="size-3.5 sm:size-4 text-neutral-900 dark:text-white shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Full ShipSafe MCP Server (Cursor, Claude, Windsurf)</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="size-3.5 sm:size-4 text-neutral-900 dark:text-white shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Official security clearance PDF certificate export</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="size-3.5 sm:size-4 text-neutral-900 dark:text-white shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Persistent audit history &amp; cloud synchronization</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="size-3.5 sm:size-4 text-neutral-900 dark:text-white shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Highest-priority AI worker queue execution</span>
              </li>
            </ul>
          </div>

          <button
            type="button"
            onClick={handleProCta}
            className="w-full py-3 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-900 font-medium text-sm transition-all cursor-pointer font-sans active:scale-[0.99] text-center"
          >
            Upgrade to Pro
          </button>
        </div>

        {/* Tier 3: Enterprise (Custom SLA) */}
        <div className="flex flex-col justify-between rounded-2xl border border-black/[0.08] dark:border-white/[0.12] bg-white dark:bg-[#121316] p-6 sm:p-7 transition-all duration-200 hover:border-neutral-400 dark:hover:border-neutral-700 shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Enterprise (Custom SLA)
              </span>
            </div>

            <div className="flex items-baseline gap-1 mb-1.5">
              <span className="text-3xl sm:text-4xl font-extrabold text-neutral-950 dark:text-white">Custom</span>
            </div>

            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed mb-4 min-h-[44px]">
              For large-scale projects requiring dedicated sandboxes and tailored SLAs.
            </p>

            <div className="w-full h-px bg-neutral-200 dark:bg-neutral-800 mb-3 sm:mb-4" />

            <ul className="space-y-3 text-sm text-neutral-700 dark:text-neutral-300 mb-6">
              <li className="flex items-start gap-2">
                <svg className="size-3.5 sm:size-4 text-neutral-900 dark:text-white shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Unlimited audits + dedicated VPS isolation sandbox</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="size-3.5 sm:size-4 text-neutral-900 dark:text-white shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Custom upload capacity (up to 500 MB+)</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="size-3.5 sm:size-4 text-neutral-900 dark:text-white shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Custom AST &amp; regex rules tailored to your architecture</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="size-3.5 sm:size-4 text-neutral-900 dark:text-white shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Full CI/CD automated pipeline integration (GitHub &amp; GitLab)</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="size-3.5 sm:size-4 text-neutral-900 dark:text-white shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>White-label branded PDF &amp; 24/7 dedicated security SLA</span>
              </li>
            </ul>
          </div>

          <button
            type="button"
            onClick={() => setIsEnterpriseModalOpen(true)}
            className="w-full py-3 px-4 rounded-xl border border-black/[0.12] dark:border-white/[0.16] bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800/80 dark:hover:bg-neutral-700 text-neutral-950 dark:text-white font-medium text-sm transition-all cursor-pointer font-sans active:scale-[0.99] text-center"
          >
            Contact Security Team
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
            className="relative w-full max-w-lg rounded-2xl border border-black/[0.08] dark:border-white/[0.12] bg-white dark:bg-[#0D0E11] p-5 sm:p-6 shadow-2xl transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsEnterpriseModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-mono text-[11px] font-semibold mb-3">
              <span>Enterprise Solution (Custom SLA)</span>
            </div>

            <h3 id="enterprise-modal-title" className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-950 dark:text-white mb-2">
              Enterprise Security Consultation
            </h3>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed mb-5">
              Share your architectural requirements and release volume to receive tailored SLA terms and dedicated sandbox access.
            </p>

            <form onSubmit={handleEnterpriseSubmit} className="space-y-4">
              {/* Company / Project Name */}
              <div>
                <label htmlFor="companyName" className="block text-xs font-mono font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Company / Project Name
                </label>
                <input
                  id="companyName"
                  type="text"
                  required
                  placeholder="Acme Technologies / Production Workspace"
                  value={enterpriseForm.companyName}
                  onChange={(e) => setEnterpriseForm({ ...enterpriseForm, companyName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-950 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:border-neutral-900 dark:focus:border-white transition-colors"
                />
              </div>

              {/* Estimated Volume */}
              <div>
                <label htmlFor="estimatedVolume" className="block text-xs font-mono font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Estimated Deployment / Scan Volume per Month
                </label>
                <select
                  id="estimatedVolume"
                  value={enterpriseForm.estimatedVolume}
                  onChange={(e) => setEnterpriseForm({ ...enterpriseForm, estimatedVolume: e.target.value as '< 100' | '100 - 500' | '500+' })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-950 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:border-neutral-900 dark:focus:border-white transition-colors"
                >
                  <option value="< 100">&lt; 100 scans per month</option>
                  <option value="100 - 500">100 - 500 scans per month</option>
                  <option value="500+">500+ scans per month</option>
                </select>
              </div>

              {/* Primary Needs */}
              <div>
                <span className="block text-xs font-mono font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Key Requirements
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
                    <span>CI/CD Pipeline Integration (GitHub Actions / GitLab)</span>
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
                    <span>White-Label PDF Report (Custom Branding)</span>
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
                  className="w-full py-2.5 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-900 font-medium text-xs sm:text-sm transition-all cursor-pointer font-sans shadow-md hover:shadow-lg active:scale-[0.99] text-center flex items-center justify-center gap-2"
                >
                  <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.275.072.376-.044c.101-.116.433-.506.549-.68.116-.174.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.099.824z" />
                  </svg>
                  <span>Submit Inquiry via WhatsApp</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
