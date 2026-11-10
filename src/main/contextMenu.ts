import { Menu, BrowserWindow, MenuItemConstructorOptions } from 'electron'

/**
 * Configura el menú contextual nativo (clic derecho) para Windows y macOS,
 * asegurando la presencia y funcionamiento fluido de Copiar, Pegar, Cortar y Seleccionar todo.
 *
 * NOTA CRÍTICA: Este manejador DEBE ser 100% sincrónico. Cualquier llamada asíncrona (await)
 * libera el loop de mensajes nativo de Windows (WM_CONTEXTMENU) / macOS antes de abrir el popup,
 * provocando que el menú nunca aparezca en pantalla.
 */
export function setupContextMenu(window: BrowserWindow): void {
  // Evitar listeners duplicados en la misma ventana
  window.webContents.removeAllListeners('context-menu')

  window.webContents.on('context-menu', (_event, params) => {
    const template: MenuItemConstructorOptions[] = []

    // 1. Sugerencias del corrector ortográfico si hay palabra marcada
    if (params.misspelledWord) {
      if (params.dictionarySuggestions.length > 0) {
        for (const suggestion of params.dictionarySuggestions) {
          template.push({
            label: suggestion,
            click: () => window.webContents.replaceMisspelling(suggestion)
          })
        }
      } else {
        template.push({
          label: 'Sin sugerencias',
          enabled: false
        })
      }
      template.push({ type: 'separator' })
    }

    // 2. Cortar (disponible cuando el elemento es editable y hay texto seleccionado)
    if (params.isEditable) {
      template.push({
        label: 'Cortar',
        role: 'cut',
        accelerator: 'CmdOrCtrl+X',
        enabled: params.editFlags.canCut || Boolean(params.selectionText?.trim().length)
      })
    }

    // 3. Copiar (disponible en Windows y macOS con Ctrl+C / Cmd+C)
    const hasSelection = Boolean(params.selectionText && params.selectionText.trim().length > 0)
    template.push({
      label: 'Copiar',
      role: 'copy',
      accelerator: 'CmdOrCtrl+C',
      enabled: params.editFlags.canCopy || hasSelection
    })

    // 4. Pegar (disponible en Windows y macOS con Ctrl+V / Cmd+V)
    if (params.isEditable) {
      template.push({
        label: 'Pegar',
        role: 'paste',
        accelerator: 'CmdOrCtrl+V',
        enabled: params.editFlags.canPaste
      })
    } else {
      template.push({
        label: 'Pegar',
        role: 'paste',
        accelerator: 'CmdOrCtrl+V',
        enabled: false
      })
    }

    // 5. Seleccionar todo
    template.push({ type: 'separator' })
    template.push({
      label: 'Seleccionar todo',
      role: 'selectAll',
      accelerator: 'CmdOrCtrl+A',
      enabled: params.editFlags.canSelectAll
    })

    const menu = Menu.buildFromTemplate(template)
    menu.popup({ window, x: params.x, y: params.y })
  })
}
