import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

export interface AutoCapitalizeOptions {
  enabled: () => boolean
}

export const autoCapitalizePluginKey = new PluginKey('autoCapitalize')

export const AutoCapitalizeExtension = Extension.create<AutoCapitalizeOptions>({
  name: 'autoCapitalize',

  addOptions() {
    return {
      enabled: () => true
    }
  },

  addProseMirrorPlugins() {
    const extension = this

    return [
      new Plugin({
        key: autoCapitalizePluginKey,
        props: {
          handleTextInput(view, from, to, text) {
            if (extension.options.enabled && !extension.options.enabled()) {
              return false
            }

            // Solo actuar ante la inserción de un único carácter (no en pegado o autocompletado en bloque)
            if (!text || text.length !== 1) {
              return false
            }

            const state = view.state
            const $from = state.doc.resolve(from)

            // Si estamos dentro de un bloque de código, no auto-capitalizar
            if ($from.parent.type.spec.code) {
              return false
            }

            // Extraer el texto inmediatamente anterior dentro del mismo bloque
            const textBefore = $from.parent.textBetween(0, $from.parentOffset, undefined, '\uFFFC')

            // Si es parte de una URL o protocolo, omitir
            if (/(?:https?:\/\/|www\.)\S*$/i.test(textBefore)) {
              return false
            }

            // Verificar si el carácter escrito es una letra Unicode (soporta acentos y eñes)
            const isLetter = /^\p{L}$/u.test(text)

            // 1. Caso: El usuario escribe otro punto '.' o cualquier carácter no alfabético
            // Si el usuario escribe otro punto '.', dejamos que pase normalmente para que
            // se puedan formar '..' o '...' (puntos suspensivos) sin interferencias
            if (!isLetter) {
              return false
            }

            // 2. Caso: Inicio de párrafo o línea vacía (ej. al comenzar un capítulo o párrafo nuevo)
            if (textBefore.trim().length === 0) {
              const upper = text.toUpperCase()
              if (upper !== text) {
                const tr = state.tr.insertText(upper, from, to)
                view.dispatch(tr)
                return true
              }
              return false
            }

            // 3. Caso: Raya de diálogo al inicio de párrafo (— o – o -)
            if (/^[—–-]\s*$/.test(textBefore)) {
              const needsSpace = !textBefore.endsWith(' ')
              const upper = text.toUpperCase()
              const toInsert = (needsSpace ? ' ' : '') + upper
              const tr = state.tr.insertText(toInsert, from, to)
              view.dispatch(tr)
              return true
            }

            // 4. Caso: Signos de apertura al inicio o tras punto (¿, ¡, «, ")
            if (/(?:^|(?<!\.)\.\s*)[¿¡«"']\s*$/.test(textBefore)) {
              const upper = text.toUpperCase()
              if (upper !== text) {
                const tr = state.tr.insertText(upper, from, to)
                view.dispatch(tr)
                return true
              }
              return false
            }

            // 5. Caso solicitado principal: Tras un PUNTO ÚNICO seguido inmediatamente por una letra (sin espacio)
            // Ej: "Hola." + 'm' -> se inserta " M" (espacio automático + mayúscula)
            // Nota: (?<!\.)\. garantiza que si hay 2 o más puntos ("..", "..."), NO coincida
            if (/(?<!\.)\.$/.test(textBefore)) {
              const toInsert = ' ' + text.toUpperCase()
              const tr = state.tr.insertText(toInsert, from, to)
              view.dispatch(tr)
              return true
            }

            // 6. Caso solicitado: Tras un PUNTO ÚNICO seguido de uno o más espacios
            // Ej: "Hola. " + 'm' -> se transforma en "M"
            if (/(?<!\.)\.\s+$/.test(textBefore)) {
              const upper = text.toUpperCase()
              if (upper !== text) {
                const tr = state.tr.insertText(upper, from, to)
                view.dispatch(tr)
                return true
              }
              return false
            }

            // 7. Tras signo de cierre de exclamación o interrogación (? o !)
            if (/[?!]$/.test(textBefore)) {
              const toInsert = ' ' + text.toUpperCase()
              const tr = state.tr.insertText(toInsert, from, to)
              view.dispatch(tr)
              return true
            }
            if (/[?!]\s+$/.test(textBefore)) {
              const upper = text.toUpperCase()
              if (upper !== text) {
                const tr = state.tr.insertText(upper, from, to)
                view.dispatch(tr)
                return true
              }
              return false
            }

            return false
          }
        }
      })
    ]
  }
})
