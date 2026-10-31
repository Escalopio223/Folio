import type { LanguagePack } from '../types'

export const universalPack: LanguagePack = {
  code: 'universal',
  name: 'Universal / Fallback',
  minWordLength: 4,
  stopwords: new Set([
    'and', 'the', 'for', 'with', 'that', 'this', 'from', 'have', 'from',
    'que', 'con', 'para', 'este', 'esta', 'como', 'pero', 'pero', 'bien',
    'und', 'der', 'die', 'das', 'mit', 'auf', 'für', 'von',
    'pour', 'avec', 'dans', 'mais', 'cette', 'plus', 'comme',
    'per', 'con', 'sono', 'come', 'anche', 'della', 'delle'
  ]),
  stem: (word: string): string => {
    return (word || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
  },
  synonyms: {},
  inflectReplacement: (originalWord: string, synonym: string): string => {
    if (!originalWord || !synonym) return synonym
    // Si la original empieza por mayúscula, poner mayúscula al sinónimo
    const isFirstUpper = originalWord[0] === originalWord[0].toUpperCase() && originalWord[0] !== originalWord[0].toLowerCase()
    const isAllUpper = originalWord === originalWord.toUpperCase() && originalWord.length > 1

    if (isAllUpper) return synonym.toUpperCase()
    if (isFirstUpper) return synonym.charAt(0).toUpperCase() + synonym.slice(1)
    return synonym.toLowerCase()
  }
}
