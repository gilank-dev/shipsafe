import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TierStamp } from './TierStamp'

describe('TierStamp Component', () => {
  it('renders [TIER: FREE] stamp with rectilinear rules', () => {
    render(<TierStamp tier="free" />)
    const stamp = screen.getByTestId('tier-stamp-free')
    expect(stamp).toBeInTheDocument()
    expect(stamp).toHaveTextContent('[TIER: FREE]')
    expect(stamp.className).toContain('font-mono')
    expect(stamp.className).toContain('border-rule')
  })

  it('renders [TIER: PRO] stamp with high-contrast ink styling', () => {
    render(<TierStamp tier="pro" />)
    const stamp = screen.getByTestId('tier-stamp-pro')
    expect(stamp).toBeInTheDocument()
    expect(stamp).toHaveTextContent('[TIER: PRO]')
    expect(stamp.className).toContain('bg-ink')
    expect(stamp.className).toContain('text-canvas')
  })

  it('renders [TIER: ENTERPRISE // ORG] stamp', () => {
    render(<TierStamp tier="enterprise" />)
    const stamp = screen.getByTestId('tier-stamp-enterprise')
    expect(stamp).toBeInTheDocument()
    expect(stamp).toHaveTextContent('[TIER: ENTERPRISE // ORG]')
    expect(stamp.className).toContain('border-ink')
  })

  it('renders [CLEARANCE: SUPER ADMIN] stamp when isSuperAdmin is true', () => {
    render(<TierStamp tier="enterprise" isSuperAdmin={true} />)
    const stamp = screen.getByTestId('tier-stamp-super-admin')
    expect(stamp).toBeInTheDocument()
    expect(stamp).toHaveTextContent('[CLEARANCE: SUPER ADMIN]')
    expect(stamp.className).toContain('font-bold')
  })
})
