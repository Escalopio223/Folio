export interface LanguagePack {
  code: string // 'es' | 'en' | 'universal'
  name: string
  minWordLength: number
  stopwords: Set<string>
  stem: (word: string) => string // Normaliza plurales y sufijos verbales comunes a una raíz
  synonyms: Record<string, string[]> // Diccionario offline (clave normalizada -> array de sinónimos)
  inflectReplacement: (originalWord: string, synonym: string) => string // Preserva mayúsculas y plural básico
}

export type SupportedLanguageCode = 'auto' | 'es' | 'en' | 'universal'
