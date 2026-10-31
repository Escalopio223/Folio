import { ipcMain, session } from 'electron'

export function registerSpellcheckHandlers(): void {
  ipcMain.handle('spellcheck:setLanguages', (_event, languages: string[]) => {
    try {
      if (session.defaultSession) {
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
