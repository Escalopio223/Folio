import { ref, computed } from 'vue'

export type SpellcheckLanguageMode = 'auto' | 'es' | 'en'

const spellcheckLang = ref<SpellcheckLanguageMode>('auto')
const detectedLang = ref<'es' | 'en'>('es')

export function useSpellcheck() {
  const activeSpellcheckCode = computed<'es-ES' | 'en-US'>(() => {
    if (spellcheckLang.value === 'en') return 'en-US'
    if (spellcheckLang.value === 'es') return 'es-ES'
    return detectedLang.value === 'en' ? 'en-US' : 'es-ES'
  })

  async function applyLanguages(): Promise<void> {
    if (window.api?.spellcheck) {
      try {
        const primary = activeSpellcheckCode.value === 'en-US' ? ['en-US', 'es-ES'] : ['es-ES', 'en-US']
        await window.api.spellcheck.setLanguages(primary)
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
    setSpellcheckLanguage,
    setDetectedLanguage,
    setActiveCode,
    applyLanguages
  }
}
