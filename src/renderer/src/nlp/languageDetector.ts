import type { LanguagePack, SupportedLanguageCode } from './types'
import { esPack } from './packs/esPack'
import { enPack } from './packs/enPack'
import { universalPack } from './packs/universalPack'

export const languagePacks: Record<string, LanguagePack> = {
  es: esPack,
  en: enPack,
  universal: universalPack
}

/**
 * Detecta automáticamente si el texto es predominantemente español o inglés
 * analizando una muestra de las primeras 50 palabras.
 */
export function detectLanguage(sampleText: string): 'es' | 'en' | 'universal' {
  if (!sampleText || sampleText.trim().length === 0) return 'es'

  const words = sampleText
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .match(/[a-zñáéíóúü]+/gi) || []

  if (words.length < 5) return 'es'

  let esScore = 0
  let enScore = 0

  const sample = words.slice(0, 50)
  for (const w of sample) {
    if (esPack.stopwords.has(w)) esScore++
    if (enPack.stopwords.has(w)) enScore++
  }

  if (esScore > enScore && esScore >= 2) return 'es'
  if (enScore > esScore && enScore >= 2) return 'en'
  if (esScore === 0 && enScore === 0) return 'universal'

  return 'es' // Idioma por defecto en Folio
}

/**
 * Resuelve el LanguagePack activo según la preferencia del usuario ('auto', 'es', 'en', 'universal')
 */
export function resolveLanguagePack(preference: SupportedLanguageCode, sampleText: string): LanguagePack {
  if (preference === 'auto') {
    const detected = detectLanguage(sampleText)
    return languagePacks[detected] || esPack
  }
  return languagePacks[preference] || esPack
}

export * from './types'
export { esPack, enPack, universalPack }
