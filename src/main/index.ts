import { app, shell, BrowserWindow, Menu, session } from 'electron'
import { join } from 'node:path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { initDatabase } from './db'
import { registerAllIpcHandlers } from './ipc'
import { setupContextMenu } from './contextMenu'
import { syncCustomDictionaryWithSession } from './ipc/spellcheckHandler'
import { setupAutoUpdater } from './updater'
import { closeDatabase } from './db'

function createWindow(): BrowserWindow {
  const isDarwin = process.platform === 'darwin'
  const mainWindow = new BrowserWindow({
    width: 1120,
    height: 760,
    minWidth: 880,
    minHeight: 600,
    show: false,
    frame: false,
    titleBarStyle: isDarwin ? 'hiddenInset' : 'hidden',
    trafficLightPosition: isDarwin ? { x: 12, y: 13 } : undefined,
    backgroundColor: '#EFEAE1',
    autoHideMenuBar: true,
    icon: icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      spellcheck: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.maximize()
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer based on electron-vite cli.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // Activar menú contextual nativo (Copiar, Pegar, Cortar, Seleccionar todo)
  setupContextMenu(mainWindow)

  // Configurar actualizador automático híbrido (Windows NSIS auto / macOS direct dmg)
  setupAutoUpdater(mainWindow)

  return mainWindow
}

app.whenReady().then(() => {
  // Set app user model id for windows notifications & taskbar
  electronApp.setAppUserModelId('com.folio.desktop')

  // Remove native menu bar
  Menu.setApplicationMenu(null)

  // Configurar corrector ortográfico multilingüe (Español e Inglés simultáneos)
  if (session.defaultSession) {
    try {
      const avail = session.defaultSession.availableSpellCheckerLanguages || []
      const desired = ['es-ES', 'en-US', 'es', 'en'].filter((l) => avail.includes(l))
      if (desired.length > 0) {
        session.defaultSession.setSpellCheckerLanguages(desired)
      } else {
        session.defaultSession.setSpellCheckerLanguages(['es-ES', 'en-US'])
      }
    } catch (err) {
      console.warn('[Folio Main] Failed to configure spellchecker languages:', err)
    }
  }

  // Initialize SQLite database and tables
  try {
    const dbInfo = initDatabase()
    console.log(`[Folio Main] SQLite Database initialized at: ${dbInfo.path}`)
    syncCustomDictionaryWithSession()
  } catch (err) {
    console.error('[Folio Main] Failed to initialize SQLite database:', err)
  }

  // Register typed IPC communication handlers
  registerAllIpcHandlers()

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
    setupContextMenu(window)
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  closeDatabase()
})
