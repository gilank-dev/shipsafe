import { describe, it, expect } from 'vitest'
import { landingDictionary } from './landingDictionary'

describe('landingDictionary', () => {
  it('contains complete dictionary for both en and id languages', () => {
    expect(landingDictionary.en).toBeDefined()
    expect(landingDictionary.id).toBeDefined()
  })

  it('contains 4 emotional security triggers in hero for both languages', () => {
    expect(landingDictionary.en.hero.triggers).toHaveLength(4)
    expect(landingDictionary.id.hero.triggers).toHaveLength(4)

    const expectedKeys = ['Stop Leaked Keys', 'Prevent Public Database Breaches', 'Eliminate 5-Figure Bill Shocks', 'Protect Your Launch Reputation']
    landingDictionary.en.hero.triggers.forEach((trigger, idx) => {
      expect(trigger.title).toBe(expectedKeys[idx])
      expect(trigger.description.length).toBeGreaterThan(20)
      expect(trigger.risk.length).toBeGreaterThan(3)
    })
  })

  it('contains exactly 3 steps in How It Works for both languages', () => {
    expect(landingDictionary.en.howItWorks.steps).toHaveLength(3)
    expect(landingDictionary.id.howItWorks.steps).toHaveLength(3)

    expect(landingDictionary.en.howItWorks.steps[0]?.stepNumber).toBe('01')
    expect(landingDictionary.en.howItWorks.steps[1]?.stepNumber).toBe('02')
    expect(landingDictionary.en.howItWorks.steps[2]?.stepNumber).toBe('03')
  })

  it('contains detailed comparison table with 7 architectural criteria', () => {
    expect(landingDictionary.en.comparison.rows).toHaveLength(7)
    expect(landingDictionary.id.comparison.rows).toHaveLength(7)

    landingDictionary.en.comparison.rows.forEach((row) => {
      expect(row.feature.length).toBeGreaterThan(0)
      expect(row.shipsafe.length).toBeGreaterThan(0)
      expect(row.legacyEnterprise.length).toBeGreaterThan(0)
      expect(row.basicLinters.length).toBeGreaterThan(0)
    })
  })

  it('contains exactly 10 threat vectors in both languages', () => {
    expect(landingDictionary.en.threatVectors.vectors).toHaveLength(10)
    expect(landingDictionary.id.threatVectors.vectors).toHaveLength(10)
  })

  it('contains transparent 3-tier pricing (Free Solo, Pro Developer, Enterprise Custom)', () => {
    expect(landingDictionary.en.pricing.tiers).toHaveLength(3)
    expect(landingDictionary.id.pricing.tiers).toHaveLength(3)
    expect(landingDictionary.en.pricing.tiers[1]?.name).toBe('Pro Developer')
    expect(landingDictionary.id.pricing.tiers[1]?.name).toBe('Pro Developer')

    const tierIds = ['free', 'pro', 'enterprise']
    landingDictionary.en.pricing.tiers.forEach((tier, idx) => {
      expect(tier.id).toBe(tierIds[idx])
      expect(tier.features.length).toBeGreaterThanOrEqual(6)
    })
  })

  it('contains zero em-dashes in any text across both languages', () => {
    const rawJson = JSON.stringify(landingDictionary)
    const emDashRegex = /[\u2014\u2013]/g
    const matches = rawJson.match(emDashRegex)
    expect(matches).toBeNull()
  })
})
