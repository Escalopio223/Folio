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
export function detectLanguage(sampleText: string): 'es' | 'en' {
  if (!sampleText || sampleText.trim().length === 0) return 'es'

  const words = sampleText
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .match(/[a-zñáéíóúü]+/gi) || []

  if (words.length === 0) return 'es'

  let esScore = 0
  let enScore = 0

  const sample = words.slice(0, 50)
  for (const w of sample) {
    if (esPack.stopwords.has(w)) esScore++
    if (enPack.stopwords.has(w)) enScore++
  }

  // Palabras comunes y pronombres básicos en inglés
  const commonEnWords = new Set(['i', 'want', 'know', 'like', 'good', 'bad', 'works', 'hello', 'world', 'the', 'is', 'it', 'my', 'you', 'he', 'she'])
  for (const w of sample) {
    if (commonEnWords.has(w)) enScore += 0.5
  }

  if (enScore > esScore) return 'en'
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
