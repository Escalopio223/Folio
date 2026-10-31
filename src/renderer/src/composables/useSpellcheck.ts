import { ref } from 'vue'

export type SpellcheckLanguageMode = 'auto' | 'es' | 'en'

const spellcheckLang = ref<SpellcheckLanguageMode>('auto')
const activeSpellcheckCode = ref<'es-ES' | 'en-US'>('es-ES')

export function useSpellcheck() {
  async function setSpellcheckLanguage(mode: SpellcheckLanguageMode): Promise<void> {
    spellcheckLang.value = mode
    if (mode === 'en') {
      activeSpellcheckCode.value = 'en-US'
    } else if (mode === 'es') {
      activeSpellcheckCode.value = 'es-ES'
    }
    if (window.api?.spellcheck) {
      try {
        const langs = mode === 'en' ? ['en-US', 'es-ES'] : ['es-ES', 'en-US']
        await window.api.spellcheck.setLanguages(langs)
      } catch {
        // Ignorar si no está disponible
      }
    }
  }

  function setActiveCode(code: 'es-ES' | 'en-US'): void {
    activeSpellcheckCode.value = code
  }

  return {
    spellcheckLang,
    activeSpellcheckCode,
    setSpellcheckLanguage,
    setActiveCode
  }
}
