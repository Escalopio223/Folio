import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { autoUpdater, ProgressInfo, UpdateInfo } from 'electron-updater'
import type { UpdaterStatusPayload } from '../shared/types'
import { closeDatabase } from './db'

const GITHUB_OWNER = 'Escalopio223'
const GITHUB_REPO = 'Folio'
const LATEST_RELEASE_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`

let mainWindowRef: BrowserWindow | null = null
let isQuittingForUpdate = false

let currentState: UpdaterStatusPayload = {
  status: 'idle'
}

function sendStatusToRenderer(payload: UpdaterStatusPayload): void {
  currentState = { ...payload }
  if (mainWindowRef && !mainWindowRef.isDestroyed()) {
    mainWindowRef.webContents.send('updater:status', currentState)
  }
}

export function setupAutoUpdater(window: BrowserWindow): void {
  mainWindowRef = window

  // Configuración de logger integrado
  autoUpdater.logger = console

  // Si estamos en desarrollo, permitir usar dev-app-update.yml si existe
  if (!app.isPackaged) {
    autoUpdater.forceDevUpdateConfig = true
  }

  // =========================================================================
  // 1. ESTRATEGIA HÍBRIDA POR SISTEMA OPERATIVO (SIN CERTIFICADOS DE PAGO)
  // =========================================================================
  if (process.platform === 'win32') {
    // Windows: Descarga automática en segundo plano e instalación limpia en reinicio
    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true
  } else if (process.platform === 'darwin') {
    // macOS: Desactivar autodescarga para evitar fallo de firma en Squirrel.Mac sin cuenta Apple Developer.
    // Usamos electron-updater como detector leyendo latest-mac.yml para ofrecer descarga directa de .dmg
    autoUpdater.autoDownload = false
    autoUpdater.autoInstallOnAppQuit = false
  } else {
    autoUpdater.autoDownload = false
    autoUpdater.autoInstallOnAppQuit = false
  }

  // =========================================================================
  // 2. LISTENERS DEL CICLO DE VIDA DE ELECTRON-UPDATER
  // =========================================================================
  autoUpdater.removeAllListeners()

  autoUpdater.on('checking-for-update', () => {
    console.log('[Updater] Comprobando actualizaciones en GitHub Releases...')
    sendStatusToRenderer({ status: 'checking' })
  })

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    console.log(`[Updater] Actualización detectada: v${info.version}`)

    if (process.platform === 'darwin') {
      // macOS: Notificar directamente versión disponible y URL de release para .dmg
      const releaseUrl = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/tag/v${info.version}`
      sendStatusToRenderer({
        status: 'available-mac',
        version: info.version,
        releaseUrl
      })
    } else {
      // Windows / Linux: Comienza la descarga en background
      sendStatusToRenderer({
        status: 'downloading',
        version: info.version
      })
    }
  })

  autoUpdater.on('update-not-available', () => {
    console.log('[Updater] La aplicación está al día.')
    sendStatusToRenderer({ status: 'up-to-date' })
  })

  autoUpdater.on('download-progress', (progress: ProgressInfo) => {
    sendStatusToRenderer({
      status: 'progress',
      percent: Math.round(progress.percent * 10) / 10,
      bytesPerSecond: Math.round(progress.bytesPerSecond),
      transferred: progress.transferred,
      total: progress.total
    })
  })

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    console.log(`[Updater] Actualización v${info.version} descargada y lista para instalar.`)
    sendStatusToRenderer({
      status: 'ready',
      version: info.version
    })
  })

  autoUpdater.on('error', (err: Error) => {
    console.warn('[Updater] Error durante el proceso de actualización:', err?.message || err)
    sendStatusToRenderer({
      status: 'error',
      message: err?.message || 'Error desconocido al comprobar actualizaciones'
    })
  })

  // =========================================================================
  // 3. COMPROBACIÓN AUTOMÁTICA TRAS 3 SEGUNDOS DE CARGA
  // =========================================================================
  window.webContents.once('did-finish-load', () => {
    if (app.isPackaged) {
      setTimeout(() => {
        try {
          autoUpdater.checkForUpdates().catch((err) => {
            console.warn('[Updater] Fallo en comprobación automática inicial:', err?.message)
          })
        } catch (err) {
          console.warn('[Updater] Error al lanzar checkForUpdates:', err)
        }
      }, 3000)
    }
  })
}

// =========================================================================
// 4. REGISTRO DE MANEJADORES IPC
// =========================================================================
export function registerUpdaterIpcHandlers(): void {
  ipcMain.handle('updater:get-state', () => {
    return currentState
  })

  ipcMain.handle('updater:check', async () => {
    try {
      if (app.isPackaged || autoUpdater.forceDevUpdateConfig) {
        sendStatusToRenderer({ status: 'checking' })
        const result = await autoUpdater.checkForUpdates()
        return Boolean(result)
      }
      console.log('[Updater] Comprobación manual omitida en modo dev no empaquetado')
      return false
    } catch (err) {
      console.warn('[Updater] Error en comprobación manual:', err)
      return false
    }
  })

  ipcMain.handle('updater:apply', async () => {
    console.log('[Updater] Solicitud de aplicación de actualización recibida...')

    if (process.platform === 'win32') {
      try {
        isQuittingForUpdate = true

        // Cerrar limpiamente la base de datos SQLite para que el instalador NSIS
        // no encuentre ningún archivo bloqueado
        closeDatabase()

        // Desactivar cualquier prevención de cierre en ventanas
        BrowserWindow.getAllWindows().forEach((win) => {
          win.removeAllListeners('close')
        })

        // Reiniciar e instalar de inmediato sin silenciamiento forzado para que el usuario
        // vea el instalador NSIS finalizar
        setImmediate(() => {
          autoUpdater.quitAndInstall(false, true)
        })

        return true
      } catch (err) {
        console.error('[Updater] Error al ejecutar quitAndInstall:', err)
        return false
      }
    } else if (process.platform === 'darwin') {
      // macOS: Abrir la release en el navegador para descargar el nuevo .dmg
      const targetUrl = currentState.releaseUrl || LATEST_RELEASE_URL
      try {
        await shell.openExternal(targetUrl)
        return true
      } catch (err) {
        console.error('[Updater] Error al abrir release en macOS:', err)
        return false
      }
    }

    return false
  })
}

export function getIsQuittingForUpdate(): boolean {
  return isQuittingForUpdate
}

