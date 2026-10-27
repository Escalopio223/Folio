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
      className: 'is-active-paragraph'
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
            const { from } = selection
            const resolved = doc.resolve(from)

            // Identificar el bloque de nivel superior (depth 1) que contiene el cursor
            const depth = Math.min(1, resolved.depth)
            if (depth === 0) return DecorationSet.empty

            const startPos = resolved.before(depth)
            const node = doc.nodeAt(startPos)
            if (!node) return DecorationSet.empty

            const decoration = Decoration.node(startPos, startPos + node.nodeSize, {
              class: className
            })

            return DecorationSet.create(doc, [decoration])
          }
        }
      })
    ]
  }
})
