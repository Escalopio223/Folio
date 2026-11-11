import { ipcMain, session } from 'electron'
import {
  getCustomDictionaryWords,
  addCustomDictionaryWord,
  removeCustomDictionaryWord
} from '../db'

interface NspellInstance {
  correct: (word: string) => boolean
  suggest: (word: string) => string[]
  add: (word: string) => void
  remove: (word: string) => void
}

let spellEs: NspellInstance | null = null
let spellEn: NspellInstance | null = null
let initPromise: Promise<void> | null = null

export async function ensureNspellReady(): Promise<void> {
  if (spellEs && spellEn) return
  if (initPromise) return initPromise

  initPromise = (async () => {
    try {
      const [nspellMod, esMod, enMod] = await Promise.all([
        import('nspell'),
        import('dictionary-es'),
        import('dictionary-en')
      ])

      const nspell = nspellMod.default
      const esDict = esMod.default
      const enDict = enMod.default

      spellEs = nspell(esDict.aff, esDict.dic)
      spellEn = nspell(enDict.aff, enDict.dic)

      // Cargar todas las palabras guardadas por el usuario en SQLite
      const customWords = getCustomDictionaryWords()
      for (const word of customWords) {
        try {
          if (spellEs) spellEs.add(word)
          if (spellEn) spellEn.add(word)
        } catch {
          // ignorar palabra inválida
        }
      }
    } catch (err) {
      console.error('[Spellcheck] Failed to initialize nspell dictionaries:', err)
    }
  })()

  return initPromise
}

export function syncCustomDictionaryWithSession(): void {
  try {
    if (!session.defaultSession) return
    const customWords = getCustomDictionaryWords()
    for (const w of customWords) {
      try {
        session.defaultSession.addWordToSpellCheckerDictionary(w)
      } catch {
        // ignorar
      }
    }
  } catch (err) {
    console.warn('[Spellcheck] Failed to sync custom dictionary with session:', err)
  }
}

export function registerSpellcheckHandlers(): void {
  // Iniciar la carga de diccionarios en segundo plano
  ensureNspellReady().catch(() => {})

  ipcMain.handle('spellcheck:setLanguages', (_event, languages: string[]) => {
    try {
      if (session.defaultSession) {
        const available = session.defaultSession.availableSpellCheckerLanguages || []
        if (available.length > 0) {
          const matched: string[] = []
          for (const lang of languages) {
            if (available.includes(lang)) {
              matched.push(lang)
            } else {
              const base = lang.split('-')[0]
              const alt = available.find((a) => a === base || a.startsWith(`${base}-`))
              if (alt && !matched.includes(alt)) {
                matched.push(alt)
              }
            }
          }
          if (matched.length > 0) {
            session.defaultSession.setSpellCheckerLanguages(matched)
            return true
          }
        }
        session.defaultSession.setSpellCheckerLanguages(languages)
        return true
      }
    } catch (err) {
      console.error('[Spellcheck IPC] Failed to set languages:', err)
    }
    return false
  })

  ipcMain.handle('spellcheck:getLanguages', () => {
    try {
      return session.defaultSession?.getSpellCheckerLanguages() || []
    } catch {
      return []
    }
  })

  ipcMain.handle('spellcheck:getAvailableLanguages', () => {
    try {
      return session.defaultSession?.availableSpellCheckerLanguages || []
    } catch {
      return []
    }
  })

  ipcMain.handle(
    'spellcheck:checkAndSuggest',
    async (_event, rawWord: string, lang?: 'es' | 'en' | 'auto') => {
      if (!rawWord || typeof rawWord !== 'string') {
        return { word: '', isMisspelled: false, suggestions: [] }
      }

      // Limpiar puntuación periférica pero conservar apóstrofes y guiones interiores
      const cleanWord = rawWord.trim().replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '')
      if (cleanWord.length < 2) {
        return { word: rawWord, isMisspelled: false, suggestions: [] }
      }

      // Números o sin letras
      if (!/\p{L}/u.test(cleanWord) || /^\d+$/.test(cleanWord)) {
        return { word: cleanWord, isMisspelled: false, suggestions: [] }
      }

      // Si está en el diccionario personalizado de la base de datos, es válida
      const customWords = getCustomDictionaryWords()
      const isCustom = customWords.some(
        (cw) => cw.toLowerCase() === cleanWord.toLowerCase()
      )
      if (isCustom) {
        return { word: cleanWord, isMisspelled: false, suggestions: [] }
      }

      await ensureNspellReady()

      const targetLang = lang === 'en' ? 'en' : 'es'
      const primaryChecker = targetLang === 'en' ? spellEn : spellEs
      const fallbackChecker = targetLang === 'en' ? spellEs : spellEn

      if (!primaryChecker) {
        return { word: cleanWord, isMisspelled: false, suggestions: [] }
      }

      const isCorrect = primaryChecker.correct(cleanWord)
      if (isCorrect) {
        return { word: cleanWord, isMisspelled: false, suggestions: [] }
      }

      // En modo 'auto', verificar si es correcta en el otro idioma antes de marcar error
      if (lang === 'auto' && fallbackChecker && fallbackChecker.correct(cleanWord)) {
        return { word: cleanWord, isMisspelled: false, suggestions: [] }
      }

      // Obtener hasta 3 sugerencias ordenadas
      const rawSug = primaryChecker.suggest(cleanWord) || []
      const uniqueSug: string[] = []
      for (const s of rawSug) {
        if (!uniqueSug.includes(s) && s.toLowerCase() !== cleanWord.toLowerCase()) {
          uniqueSug.push(s)
          if (uniqueSug.length >= 3) break
        }
      }

      return {
        word: cleanWord,
        isMisspelled: true,
        suggestions: uniqueSug
      }
    }
  )

  ipcMain.handle('spellcheck:getCustomWords', () => {
    return getCustomDictionaryWords()
  })

  ipcMain.handle('spellcheck:addCustomWord', (_event, rawWord: string) => {
    if (!rawWord || typeof rawWord !== 'string') return getCustomDictionaryWords()
    const word = rawWord.trim().replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '')
    if (!word) return getCustomDictionaryWords()

    addCustomDictionaryWord(word)

    if (spellEs) spellEs.add(word)
    if (spellEn) spellEn.add(word)

    try {
      session.defaultSession?.addWordToSpellCheckerDictionary(word)
    } catch (err) {
      console.warn('[Spellcheck IPC] addWordToSpellCheckerDictionary:', err)
    }

    return getCustomDictionaryWords()
  })

  ipcMain.handle('spellcheck:removeCustomWord', (_event, rawWord: string) => {
    if (!rawWord || typeof rawWord !== 'string') return getCustomDictionaryWords()
    const word = rawWord.trim()
    removeCustomDictionaryWord(word)

    try {
      session.defaultSession?.removeWordFromSpellCheckerDictionary(word)
    } catch (err) {
      console.warn('[Spellcheck IPC] removeWordFromSpellCheckerDictionary:', err)
    }

    return getCustomDictionaryWords()
  })
}
