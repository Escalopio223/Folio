import { ipcMain, session } from 'electron'

export function registerSpellcheckHandlers(): void {
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
}
