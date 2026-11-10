import { Extension } from '@tiptap/core'

export interface LineHeightOptions {
  types: string[]
  defaultLineHeight: string | null
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    blockLineHeight: {
      setLineHeight: (lineHeight: string) => ReturnType
      unsetLineHeight: () => ReturnType
      setAllLineHeight: (lineHeight: string) => ReturnType
    }
  }
}

export const BlockLineHeight = Extension.create<LineHeightOptions>({
  name: 'blockLineHeight',

  addOptions() {
    return {
      types: ['paragraph', 'heading', 'blockquote', 'listItem'],
      defaultLineHeight: null
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            default: this.options.defaultLineHeight,
            parseHTML: (element) => element.style.lineHeight || null,
            renderHTML: (attributes) => {
              if (!attributes.lineHeight) {
                return {}
              }
              return {
                style: `line-height: ${attributes.lineHeight}`
              }
            }
          }
        }
      }
    ]
  },

  addCommands() {
    return {
      setLineHeight:
        (lineHeight: string) =>
        ({ tr, state, dispatch }) => {
          const { selection } = state
          let changed = false
          tr.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
            if (this.options.types.includes(node.type.name)) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                lineHeight
              })
              changed = true
            }
          })
          if (changed && dispatch) {
            dispatch(tr)
          }
          return changed
        },

      unsetLineHeight:
        () =>
        ({ tr, state, dispatch }) => {
          const { selection } = state
          let changed = false
          tr.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
            if (this.options.types.includes(node.type.name)) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                lineHeight: null
              })
              changed = true
            }
          })
          if (changed && dispatch) {
            dispatch(tr)
          }
          return changed
        },

      setAllLineHeight:
        (lineHeight: string) =>
        ({ tr, dispatch }) => {
          let changed = false
          tr.doc.descendants((node, pos) => {
            if (this.options.types.includes(node.type.name)) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                lineHeight
              })
              changed = true
            }
          })
          if (changed && dispatch) {
            dispatch(tr)
          }
          return changed
        }
    }
  }
})
