import { Extension } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    indent: {
      indent: () => ReturnType
      outdent: () => ReturnType
    }
  }
}

export interface IndentOptions {
  types: string[]
  minLevel: number
  maxLevel: number
}

export const Indent = Extension.create<IndentOptions>({
  name: 'indent',

  addOptions() {
    return {
      types: ['paragraph', 'heading', 'blockquote'],
      minLevel: 0,
      maxLevel: 6
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element) => {
              const indent = element.getAttribute('data-indent')
              return indent ? parseInt(indent, 10) : 0
            },
            renderHTML: (attributes) => {
              if (!attributes.indent || attributes.indent === 0) {
                return {}
              }
              return {
                'data-indent': attributes.indent,
                style: `margin-left: ${attributes.indent * 1.75}rem;`
              }
            }
          }
        }
      }
    ]
  },

  addCommands() {
    return {
      indent:
        () =>
        ({ tr, state, dispatch }) => {
          const { selection } = state
          let changed = false
          tr.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
            if (this.options.types.includes(node.type.name)) {
              const currentIndent = node.attrs.indent || 0
              if (currentIndent < this.options.maxLevel) {
                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  indent: currentIndent + 1
                })
                changed = true
              }
            }
          })
          if (changed && dispatch) {
            dispatch(tr)
          }
          return changed
        },
      outdent:
        () =>
        ({ tr, state, dispatch }) => {
          const { selection } = state
          let changed = false
          tr.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
            if (this.options.types.includes(node.type.name)) {
              const currentIndent = node.attrs.indent || 0
              if (currentIndent > this.options.minLevel) {
                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  indent: currentIndent - 1
                })
                changed = true
              }
            }
          })
          if (changed && dispatch) {
            dispatch(tr)
          }
          return changed
        }
    }
  },

  addKeyboardShortcuts() {
    return {
      'Shift-Tab': () => this.editor.commands.outdent()
    }
  }
})
