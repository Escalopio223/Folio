import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

export const focusModePluginKey = new PluginKey('focusMode')

export interface FocusModeOptions {
  className: string
}

export const FocusMode = Extension.create<FocusModeOptions>({
  name: 'focusMode',

  addOptions() {
    return {
      className: 'is-active-node is-active-paragraph'
    }
  },

  addProseMirrorPlugins() {
    const className = this.options.className

    return [
      new Plugin({
        key: focusModePluginKey,
        props: {
          decorations(state) {
            const { selection, doc } = state
            if (!doc || doc.childCount === 0) {
              return DecorationSet.empty
            }

            const { $from, $to } = selection
            const decorations: Decoration[] = []

            // Identificar el bloque de nivel superior (depth 1) que contiene el cursor o la selección
            if ($from.depth >= 1) {
              const startBlockPos = $from.before(1)
              const endBlockPos = $to.depth >= 1 ? $to.after(1) : $from.after(1)

              // Decorar todos los bloques de nivel superior entre startBlockPos y endBlockPos
              doc.nodesBetween(startBlockPos, endBlockPos, (node, pos) => {
                if (pos >= startBlockPos && pos < endBlockPos) {
                  const $pos = doc.resolve(pos + 1)
                  if ($pos.depth === 1) {
                    decorations.push(
                      Decoration.node(pos, pos + node.nodeSize, {
                        class: className
                      })
                    )
                    return false
                  }
                }
                return true
              })
            }

            // Fallback: si la selección es depth 0 (ej. inicio absoluto), decorar el primer bloque
            if (decorations.length === 0 && doc.firstChild) {
              decorations.push(
                Decoration.node(0, doc.firstChild.nodeSize, {
                  class: className
                })
              )
            }

            return DecorationSet.create(doc, decorations)
          }
        }
      })
    ]
  }
})

export const FocusParagraphExtension = FocusMode
