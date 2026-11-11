import { ref, computed } from 'vue'

export type SpellcheckLanguageMode = 'auto' | 'es' | 'en'

const spellcheckLang = ref<SpellcheckLanguageMode>('auto')
const detectedLang = ref<'es' | 'en'>('es')
const customWords = ref<string[]>([])
let customWordsLoaded = false

export function useSpellcheck() {
  const activeSpellcheckCode = computed<'es-ES' | 'en-US'>(() => {
    if (spellcheckLang.value === 'en') return 'en-US'
    if (spellcheckLang.value === 'es') return 'es-ES'
    return detectedLang.value === 'en' ? 'en-US' : 'es-ES'
  })

  async function loadCustomWords(): Promise<string[]> {
    if (window.api?.spellcheck?.getCustomWords) {
      try {
        const words = await window.api.spellcheck.getCustomWords()
        customWords.value = words
        customWordsLoaded = true
        return words
      } catch {
        return []
      }
    }
    return []
  }

  if (!customWordsLoaded && typeof window !== 'undefined') {
    loadCustomWords()
  }

  async function addCustomWord(word: string): Promise<string[]> {
    if (!word || !window.api?.spellcheck?.addCustomWord) return customWords.value
    try {
      const updated = await window.api.spellcheck.addCustomWord(word)
      customWords.value = updated
      return updated
    } catch {
      return customWords.value
    }
  }

  async function removeCustomWord(word: string): Promise<string[]> {
    if (!word || !window.api?.spellcheck?.removeCustomWord) return customWords.value
    try {
      const updated = await window.api.spellcheck.removeCustomWord(word)
      customWords.value = updated
      return updated
    } catch {
      return customWords.value
    }
  }

  function isCustomWord(word: string): boolean {
    if (!word) return false
    const clean = word.toLowerCase().trim()
    return customWords.value.some((w) => w.toLowerCase() === clean)
  }

  async function checkAndSuggest(
    word: string
  ): Promise<{ word: string; isMisspelled: boolean; suggestions: string[] }> {
    if (!word || !window.api?.spellcheck?.checkAndSuggest) {
      return { word, isMisspelled: false, suggestions: [] }
    }
    if (isCustomWord(word)) {
      return { word, isMisspelled: false, suggestions: [] }
    }
    try {
      return await window.api.spellcheck.checkAndSuggest(word, spellcheckLang.value)
    } catch {
      return { word, isMisspelled: false, suggestions: [] }
    }
  }

  async function applyLanguages(): Promise<void> {
    if (window.api?.spellcheck) {
      try {
        // Enviar exclusivamente el idioma objetivo para que palabras de otro idioma sean marcadas con error
        const target = activeSpellcheckCode.value === 'en-US' ? ['en-US'] : ['es-ES']
        await window.api.spellcheck.setLanguages(target)
      } catch {
        // Ignorar si no está disponible en la plataforma
      }
    }
  }

  async function setSpellcheckLanguage(mode: SpellcheckLanguageMode): Promise<void> {
    spellcheckLang.value = mode
    await applyLanguages()
  }

  function setDetectedLanguage(lang: 'es' | 'en'): void {
    if (detectedLang.value !== lang) {
      detectedLang.value = lang
      if (spellcheckLang.value === 'auto') {
        applyLanguages()
      }
    }
  }

  function setActiveCode(code: 'es-ES' | 'en-US'): void {
    setDetectedLanguage(code === 'en-US' ? 'en' : 'es')
  }

  return {
    spellcheckLang,
    detectedLang,
    activeSpellcheckCode,
    customWords,
    loadCustomWords,
    addCustomWord,
    removeCustomWord,
    isCustomWord,
    checkAndSuggest,
    setSpellcheckLanguage,
    setDetectedLanguage,
    setActiveCode,
    applyLanguages
  }
}
