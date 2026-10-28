import { enContent } from './en'
import { idContent } from './id'
import type { LandingContentSchema, SupportedLanguage } from './types'

export * from './types'
export { enContent } from './en'
export { idContent } from './id'

export const translations: Record<SupportedLanguage, LandingContentSchema> = {
  en: enContent,
  id: idContent,
}

export const DEFAULT_LANGUAGE: SupportedLanguage = 'en'

export function isSupportedLanguage(lang: unknown): lang is SupportedLanguage {
  return lang === 'en' || lang === 'id'
}

export function getLandingContent(lang?: string | null): LandingContentSchema {
  if (lang && isSupportedLanguage(lang)) {
    return translations[lang]
  }
  return translations[DEFAULT_LANGUAGE]
}
