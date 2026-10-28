import { describe, expect, it } from 'vitest'
import {
  DEFAULT_LANGUAGE,
  enContent,
  getLandingContent,
  idContent,
  isSupportedLanguage,
  translations,
} from './index'
import jsonDictionary from './landing-content.json'

describe('ShipSafe i18n & Localization Dictionary', () => {
  it('identifies supported languages correctly', () => {
    expect(isSupportedLanguage('en')).toBe(true)
    expect(isSupportedLanguage('id')).toBe(true)
    expect(isSupportedLanguage('es')).toBe(false)
    expect(isSupportedLanguage('')).toBe(false)
    expect(isSupportedLanguage(null)).toBe(false)
    expect(isSupportedLanguage(undefined)).toBe(false)
    expect(translations.en).toBeDefined()
    expect(translations.id).toBeDefined()
  })

  it('retrieves correct content by language code and falls back safely', () => {
    expect(getLandingContent('en')).toBe(enContent)
    expect(getLandingContent('id')).toBe(idContent)
    expect(getLandingContent('invalid')).toBe(enContent)
    expect(getLandingContent(null)).toBe(enContent)
    expect(DEFAULT_LANGUAGE).toBe('en')
  })

  it('verifies exact parity of all 10 threat vectors between en and id', () => {
    expect(enContent.threatMatrix.vectors).toHaveLength(10)
    expect(idContent.threatMatrix.vectors).toHaveLength(10)

    for (let i = 0; i < 10; i++) {
      const enVec = enContent.threatMatrix.vectors[i]
      const idVec = idContent.threatMatrix.vectors[i]

      expect(enVec).toBeDefined()
      expect(idVec).toBeDefined()
      if (enVec && idVec) {
        expect(enVec.id).toBe(idVec.id)
        expect(enVec.name.trim().length).toBeGreaterThan(0)
        expect(idVec.name.trim().length).toBeGreaterThan(0)
        expect(enVec.techDescription.trim().length).toBeGreaterThan(15)
        expect(idVec.techDescription.trim().length).toBeGreaterThan(15)
        expect(enVec.consequence.trim().length).toBeGreaterThan(15)
        expect(idVec.consequence.trim().length).toBeGreaterThan(15)
      }
    }
  })

  it('verifies exact parity of all 5 FAQ entries between en and id', () => {
    expect(enContent.faq.items).toHaveLength(5)
    expect(idContent.faq.items).toHaveLength(5)

    for (let i = 0; i < 5; i++) {
      const enFaq = enContent.faq.items[i]
      const idFaq = idContent.faq.items[i]

      expect(enFaq).toBeDefined()
      expect(idFaq).toBeDefined()
      if (enFaq && idFaq) {
        expect(enFaq.id).toBe(idFaq.id)
        expect(enFaq.question.trim().length).toBeGreaterThan(10)
        expect(idFaq.question.trim().length).toBeGreaterThan(10)
        expect(enFaq.answer.trim().length).toBeGreaterThan(30)
        expect(idFaq.answer.trim().length).toBeGreaterThan(30)
      }
    }
  })

  it('verifies How-It-Works steps and comparison table rows', () => {
    const enSteps = Object.values(enContent.howItWorks.steps)
    const idSteps = Object.values(idContent.howItWorks.steps)
    expect(enSteps).toHaveLength(3)
    expect(idSteps).toHaveLength(3)

    expect(enContent.comparison.rows).toHaveLength(6)
    expect(idContent.comparison.rows).toHaveLength(6)

    for (let i = 0; i < 6; i++) {
      const enRow = enContent.comparison.rows[i]
      const idRow = idContent.comparison.rows[i]
      expect(enRow).toBeDefined()
      expect(idRow).toBeDefined()
      if (enRow && idRow) {
        expect(enRow.metric.trim().length).toBeGreaterThan(0)
        expect(idRow.metric.trim().length).toBeGreaterThan(0)
        expect(enRow.shipsafe.trim().length).toBeGreaterThan(0)
        expect(idRow.shipsafe.trim().length).toBeGreaterThan(0)
      }
    }
  })

  it('verifies pricing tiers and feature items parity', () => {
    const tiers = ['community', 'pro', 'enterprise'] as const
    for (const tier of tiers) {
      const enTier = enContent.pricing.tiers[tier]
      const idTier = idContent.pricing.tiers[tier]

      expect(enTier.name).toBeDefined()
      expect(idTier.name).toBeDefined()
      expect(enTier.features.length).toBeGreaterThan(0)
      expect(enTier.features.length).toBe(idTier.features.length)
      expect(enTier.cta.length).toBeGreaterThan(0)
      expect(idTier.cta.length).toBeGreaterThan(0)
    }
  })

  it('verifies limitations and boundaries transparency', () => {
    expect(enContent.limitations.items.archiveLimit.title).toBeDefined()
    expect(idContent.limitations.items.archiveLimit.title).toBeDefined()
    expect(enContent.limitations.items.staticOnly.title).toBeDefined()
    expect(idContent.limitations.items.staticOnly.title).toBeDefined()
    expect(enContent.limitations.items.notPentest.title).toBeDefined()
    expect(idContent.limitations.items.notPentest.title).toBeDefined()
  })

  it('verifies telemetry report logs and prompt snippet', () => {
    expect(enContent.telemetry.reportLogs.summary).toContain('Verdict:')
    expect(idContent.telemetry.reportLogs.summary).toContain('Hasil:')
    expect(enContent.telemetry.promptSnippet.content).toContain('STRIPE_SECRET_KEY')
    expect(idContent.telemetry.promptSnippet.content).toContain('STRIPE_SECRET_KEY')
  })

  it('verifies support channels (WhatsApp & Telegram)', () => {
    expect(enContent.support.whatsapp.url).toContain('wa.me')
    expect(idContent.support.whatsapp.url).toContain('wa.me')
    expect(enContent.support.telegram.url).toContain('t.me')
    expect(idContent.support.telegram.url).toContain('t.me')
  })

  it('matches landing-content.json structure with enContent and idContent', () => {
    expect(jsonDictionary.languages).toEqual(['en', 'id'])
    expect(jsonDictionary.content.en.nav.brand.name).toBe(enContent.nav.brand.name)
    expect(jsonDictionary.content.id.nav.brand.name).toBe(idContent.nav.brand.name)
    expect(jsonDictionary.content.en.threatMatrix.vectors).toHaveLength(10)
    expect(jsonDictionary.content.id.threatMatrix.vectors).toHaveLength(10)
  })
})
