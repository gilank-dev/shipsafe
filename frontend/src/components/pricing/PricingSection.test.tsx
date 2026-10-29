import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PricingSection } from './PricingSection'

describe('PricingSection Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders exact Indonesian copywriting for section header and 3 tiers', () => {
    render(<PricingSection />)

    // Section Header
    expect(screen.getByText('Investasi Keamanan Seukuran Harga Kopi')).toBeInTheDocument()
    expect(
      screen.getByText('Rilis kode ke production dengan tenang. Pilih paket sesuai frekuensi deployment kamu.')
    ).toBeInTheDocument()

    // Tier 1: Free (Sandbox)
    expect(screen.getByText('Free (Sandbox)')).toBeInTheDocument()
    expect(screen.getByText('Rp 0')).toBeInTheDocument()
    expect(
      screen.getByText('Cocok untuk menguji keamanan proyek sampingan sebelum rilis pertama.')
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mulai Scan Gratis' })).toBeInTheDocument()

    // Tier 2: Pro (Indie / Vibe Coder)
    expect(screen.getByText('Pro (Indie / Vibe Coder)')).toBeInTheDocument()
    expect(screen.getByText('Paling Populer')).toBeInTheDocument()
    expect(screen.getByText('Rp 79.000')).toBeInTheDocument()
    expect(
      screen.getByText('Untuk solo developer & vibe coder yang rutin ship aplikasi ke production dengan cepat dan aman.')
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Upgrade ke Pro Sekarang' })).toBeInTheDocument()

    // Tier 3: Enterprise (Team / Agency)
    expect(screen.getByText('Enterprise (Team / Agency)')).toBeInTheDocument()
    expect(screen.getByText('Kustom')).toBeInTheDocument()
    expect(
      screen.getByText('Untuk software house, agensi, dan tim engineering yang butuh otomatisasi CI/CD dan laporan white-label.')
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hubungi Admin' })).toBeInTheDocument()
  })

  it('opens Enterprise Lead Qualification Modal and submits structured WhatsApp inquiry', () => {
    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    render(<PricingSection />)

    // Click Hubungi Admin
    const enterpriseBtn = screen.getByRole('button', { name: 'Hubungi Admin' })
    fireEvent.click(enterpriseBtn)

    // Modal should appear
    expect(screen.getByText('Konsultasi Kebutuhan Enterprise')).toBeInTheDocument()
    expect(screen.getByLabelText('Nama Perusahaan / Agensi')).toBeInTheDocument()
    expect(screen.getByLabelText('Estimasi Deployment / Scan per Bulan')).toBeInTheDocument()

    // Fill Form
    const companyInput = screen.getByLabelText('Nama Perusahaan / Agensi')
    fireEvent.change(companyInput, { target: { value: 'Acme Security Tech' } })

    const volumeSelect = screen.getByLabelText('Estimasi Deployment / Scan per Bulan')
    fireEvent.change(volumeSelect, { target: { value: '500+' } })

    // Submit Form
    const submitBtn = screen.getByRole('button', { name: /Kirim Lead ke WhatsApp Admin/i })
    fireEvent.click(submitBtn)

    expect(windowOpenSpy).toHaveBeenCalledTimes(1)
    const openedUrl = String(windowOpenSpy.mock.calls[0]?.[0] || '')
    expect(openedUrl).toContain('https://wa.me/6282124153732')
    expect(openedUrl).toContain('Acme%20Security%20Tech')
    expect(openedUrl).toContain('500%2B')
  })
})
