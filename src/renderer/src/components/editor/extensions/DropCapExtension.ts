import { Extension } from '@tiptap/core'

export type DropCapStyle = 'classic' | 'terracotta' | 'boxed' | 'illuminated' | 'gothic'

export interface DropCapOptions {
  types: string[]
  defaultStyle: DropCapStyle
  defaultFont: string
  defaultLines: number
  defaultColor: string
}

export interface SetDropCapOptions {
  style?: DropCapStyle | string
  font?: string
  lines?: number | string
  color?: string
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    dropCap: {
      setDropCap: (options?: SetDropCapOptions) => ReturnType
      unsetDropCap: () => ReturnType
      toggleDropCap: (options?: SetDropCapOptions) => ReturnType
    }
  }
}

export const DropCapExtension = Extension.create<DropCapOptions>({
  name: 'dropCap',

  addOptions() {
    return {
      types: ['paragraph'],
      defaultStyle: 'classic',
      defaultFont: 'Cinzel Decorative',
      defaultLines: 3,
      defaultColor: ''
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          dropCap: {
            default: false,
            parseHTML: (element) =>
              element.getAttribute('data-drop-cap') === 'true' ||
              element.classList.contains('has-drop-cap'),
            renderHTML: (attributes) => {
              if (!attributes.dropCap) {
                return {}
              }
              const classes: string[] = ['has-drop-cap']
              if (attributes.dropCapStyle) {
                classes.push(`drop-cap-${attributes.dropCapStyle}`)
              }
              return {
                'data-drop-cap': 'true',
                'data-drop-cap-style': attributes.dropCapStyle || this.options.defaultStyle,
                'data-drop-cap-font': attributes.dropCapFont || this.options.defaultFont,
                'data-drop-cap-lines': String(attributes.dropCapLines || this.options.defaultLines),
                'data-drop-cap-color': attributes.dropCapColor || '',
                class: classes.join(' ')
              }
            }
          },
          dropCapStyle: {
            default: 'classic',
            parseHTML: (element) => element.getAttribute('data-drop-cap-style') || 'classic',
            renderHTML: () => ({})
          },
          dropCapFont: {
            default: 'Cinzel Decorative',
            parseHTML: (element) => element.getAttribute('data-drop-cap-font') || 'Cinzel Decorative',
            renderHTML: () => ({})
          },
          dropCapLines: {
            default: 3,
            parseHTML: (element) => {
              const val = element.getAttribute('data-drop-cap-lines')
              return val ? parseInt(val, 10) : 3
            },
            renderHTML: () => ({})
          },
          dropCapColor: {
            default: '',
            parseHTML: (element) => element.getAttribute('data-drop-cap-color') || '',
            renderHTML: () => ({})
          }
        }
      }
    ]
  },

  addCommands() {
    return {
      setDropCap:
        (options?: SetDropCapOptions) =>
        ({ tr, state, dispatch }) => {
          const { selection } = state
          let changed = false

          tr.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
            if (this.options.types.includes(node.type.name)) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                dropCap: true,
                dropCapStyle: options?.style ?? node.attrs.dropCapStyle ?? this.options.defaultStyle,
                dropCapFont: options?.font ?? node.attrs.dropCapFont ?? this.options.defaultFont,
                dropCapLines: options?.lines
                  ? Number(options.lines)
                  : (node.attrs.dropCapLines ?? this.options.defaultLines),
                dropCapColor: options?.color ?? node.attrs.dropCapColor ?? this.options.defaultColor
              })
              changed = true
            }
          })

          // Si el cursor está colapsado y no se encontró por rango, buscar ancestros inmediatos
          if (!changed && selection.$from) {
            for (let d = selection.$from.depth; d > 0; d--) {
              const node = selection.$from.node(d)
              if (this.options.types.includes(node.type.name)) {
                const pos = selection.$from.before(d)
                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  dropCap: true,
                  dropCapStyle: options?.style ?? node.attrs.dropCapStyle ?? this.options.defaultStyle,
                  dropCapFont: options?.font ?? node.attrs.dropCapFont ?? this.options.defaultFont,
                  dropCapLines: options?.lines
                    ? Number(options.lines)
                    : (node.attrs.dropCapLines ?? this.options.defaultLines),
                  dropCapColor: options?.color ?? node.attrs.dropCapColor ?? this.options.defaultColor
                })
                changed = true
                break
              }
            }
          }

          if (changed && dispatch) {
            dispatch(tr)
          }
          return changed
        },

      unsetDropCap:
        () =>
        ({ tr, state, dispatch }) => {
          const { selection } = state
          let changed = false

          tr.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
            if (this.options.types.includes(node.type.name)) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                dropCap: false
              })
              changed = true
            }
          })

          if (!changed && selection.$from) {
            for (let d = selection.$from.depth; d > 0; d--) {
              const node = selection.$from.node(d)
              if (this.options.types.includes(node.type.name)) {
                const pos = selection.$from.before(d)
                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  dropCap: false
                })
                changed = true
                break
              }
            }
          }

          if (changed && dispatch) {
            dispatch(tr)
          }
          return changed
        },

      toggleDropCap:
        (options?: SetDropCapOptions) =>
        ({ tr, state, dispatch }) => {
          const { selection } = state
          let changed = false

          tr.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
            if (this.options.types.includes(node.type.name)) {
              const current = Boolean(node.attrs.dropCap)
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                dropCap: !current,
                ...(current
                  ? {}
                  : {
                      dropCapStyle:
                        options?.style ?? node.attrs.dropCapStyle ?? this.options.defaultStyle,
                      dropCapFont:
                        options?.font ?? node.attrs.dropCapFont ?? this.options.defaultFont,
                      dropCapLines: options?.lines
                        ? Number(options.lines)
                        : (node.attrs.dropCapLines ?? this.options.defaultLines),
                      dropCapColor:
                        options?.color ?? node.attrs.dropCapColor ?? this.options.defaultColor
                    })
              })
              changed = true
            }
          })

          if (!changed && selection.$from) {
            for (let d = selection.$from.depth; d > 0; d--) {
              const node = selection.$from.node(d)
              if (this.options.types.includes(node.type.name)) {
                const pos = selection.$from.before(d)
                const current = Boolean(node.attrs.dropCap)
                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  dropCap: !current,
                  ...(current
                    ? {}
                    : {
                        dropCapStyle:
                          options?.style ?? node.attrs.dropCapStyle ?? this.options.defaultStyle,
                        dropCapFont:
                          options?.font ?? node.attrs.dropCapFont ?? this.options.defaultFont,
                        dropCapLines: options?.lines
                          ? Number(options.lines)
                          : (node.attrs.dropCapLines ?? this.options.defaultLines),
                        dropCapColor:
                          options?.color ?? node.attrs.dropCapColor ?? this.options.defaultColor
                      })
                })
                changed = true
                break
              }
            }
          }

          if (changed && dispatch) {
            dispatch(tr)
          }
          return changed
        }
    }
  }
})
