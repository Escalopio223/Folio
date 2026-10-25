import { ipcMain, BrowserWindow } from 'electron'
import type { WindowAction } from '@shared/types'

export function registerWindowHandlers(): void {
  ipcMain.handle('window:action', async (event, action: WindowAction) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return false

    switch (action) {
      case 'minimize':
        win.minimize()
        return true
      case 'maximize':
        if (win.isMaximized()) {
          win.unmaximize()
        } else {
          win.maximize()
        }
        return win.isMaximized()
      case 'close':
        win.close()
        return true
      case 'isMaximized':
        return win.isMaximized()
      default:
        return false
    }
  })
}
