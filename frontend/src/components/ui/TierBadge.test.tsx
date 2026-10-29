import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TierBadge } from './TierBadge'

describe('TierBadge Component', () => {
  it('renders FREE badge with clean minimalist styling', () => {
    render(<TierBadge tier="free" />)
    const badge = screen.getByTestId('tier-badge-free')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveTextContent(/free/i)
    expect(badge.className).toContain('border-rule')
    expect(badge.className).toContain('bg-surface')
  })

  it('renders PRO badge with contrast styling', () => {
    render(<TierBadge tier="pro" />)
    const badge = screen.getByTestId('tier-badge-pro')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveTextContent(/pro/i)
    expect(badge.className).toContain('bg-ink')
    expect(badge.className).toContain('text-canvas')
  })

  it('renders ENTERPRISE badge with monochrome styling', () => {
    render(<TierBadge tier="enterprise" />)
    const badge = screen.getByTestId('tier-badge-enterprise')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveTextContent(/enterprise/i)
    expect(badge.className).toContain('border-ink')
  })

  it('renders SUPER ADMIN badge with monochrome white & black styling when isSuperAdmin is true', () => {
    render(<TierBadge tier="enterprise" isSuperAdmin={true} />)
    const badge = screen.getByTestId('tier-badge-super-admin')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveTextContent(/admin/i)
    expect(badge.className).toContain('bg-ink')
    expect(badge.className).toContain('text-canvas')
  })
})
