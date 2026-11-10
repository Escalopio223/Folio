import { Menu, BrowserWindow, MenuItemConstructorOptions, clipboard } from 'electron'

/**
 * Configura el menú contextual nativo (clic derecho) para Windows y macOS,
 * asegurando la presencia y funcionamiento fluido de Copiar, Pegar, Cortar y Seleccionar todo.
 */
export function setupContextMenu(window: BrowserWindow): void {
  window.webContents.on('context-menu', async (_event, params) => {
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

    // 2. Cortar (disponible cuando el elemento es editable)
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
      let hasClipboardContent = false
      try {
        const text = await clipboard.readText()
        hasClipboardContent = text.length > 0
      } catch {
        hasClipboardContent = false
      }

      template.push({
        label: 'Pegar',
        role: 'paste',
        accelerator: 'CmdOrCtrl+V',
        enabled: params.editFlags.canPaste || hasClipboardContent
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
    menu.popup({ window })
  })
}
