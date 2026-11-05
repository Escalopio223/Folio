/**
 * Utilidades de detección de plataforma y formateo de atajos de teclado.
 * Permite mostrar 'Cmd' o '⌘' en macOS y 'Ctrl' en Windows / Linux de manera dinámica.
 */

export const isMac: boolean =
  typeof window !== 'undefined' &&
  (window.electron?.process?.platform === 'darwin' ||
    /Mac|iPhone|iPod|iPad/i.test(navigator.userAgent) ||
    /Mac/i.test(navigator.platform || ''))

/**
 * Nombre del modificador principal según el sistema operativo ('Cmd' en Mac, 'Ctrl' en Windows/Linux)
 */
export const modKey: string = isMac ? 'Cmd' : 'Ctrl'

/**
 * Símbolo o etiqueta del modificador principal ('⌘' en Mac, 'Ctrl' en Windows/Linux)
 */
export const modSymbol: string = isMac ? '⌘' : 'Ctrl'

/**
 * Reemplaza de forma dinámica cualquier referencia a 'Ctrl' o 'Cmd' en un string de atajo
 * Ejemplos:
 *  - "Ctrl+Shift+F" -> "Cmd+Shift+F" (en macOS) o "Ctrl+Shift+F" (en Windows)
 *  - "Ctrl+S" -> "Cmd+S" (en macOS)
 */
export function formatShortcut(shortcut?: string): string {
  if (!shortcut) return ''
  return isMac
    ? shortcut.replace(/\bCtrl\b/gi, 'Cmd')
    : shortcut.replace(/\bCmd\b/gi, 'Ctrl')
}

/**
 * Formatea una lista de teclas reemplazando 'Ctrl' o 'Cmd' por la tecla adecuada del SO
 * Ejemplo: ['Ctrl', 'Shift', 'F'] -> ['Cmd', 'Shift', 'F'] en Mac
 */
export function formatKeys(keys: string[]): string[] {
  return keys.map((key) => {
    const lower = key.toLowerCase()
    if (lower === 'ctrl' || lower === 'cmd') {
      return modKey
    }
    return key
  })
}

