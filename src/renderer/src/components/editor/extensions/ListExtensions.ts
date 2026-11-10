import BulletList from '@tiptap/extension-bullet-list'
import OrderedList from '@tiptap/extension-ordered-list'

export type BulletListStyle = 'disc' | 'circle' | 'square' | 'dash'
export type OrderedListType = '1' | 'a' | 'A' | 'i' | 'I'

export const CustomBulletList = BulletList.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      listStyle: {
        default: 'disc',
        parseHTML: (element: HTMLElement) => {
          const dataStyle = element.getAttribute('data-list-style')
          const inlineStyle = element.style?.listStyleType
          const type = element.getAttribute('type')
          let style = dataStyle || inlineStyle || type || 'disc'
          if (style === '-' || style === "'- '" || style === "'-'") style = 'dash'
          return style
        },
        renderHTML: (attributes) => {
          const style = attributes.listStyle || 'disc'
          const cssStyle = style === 'dash' ? "list-style-type: '- ';" : `list-style-type: ${style};`
          return {
            'data-list-style': style,
            style: cssStyle
          }
        }
      }
    }
  }
})

export const CustomOrderedList = OrderedList.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      type: {
        default: '1',
        parseHTML: (element: HTMLElement) => {
          const htmlType = element.getAttribute('type')
          if (htmlType) return htmlType
          const dataStyle = element.getAttribute('data-list-style')
          if (dataStyle === 'lower-alpha') return 'a'
          if (dataStyle === 'upper-alpha') return 'A'
          if (dataStyle === 'lower-roman') return 'i'
          if (dataStyle === 'upper-roman') return 'I'
          const style = element.style?.listStyleType
          if (style === 'lower-alpha' || style === 'lower-latin') return 'a'
          if (style === 'upper-alpha' || style === 'upper-latin') return 'A'
          if (style === 'lower-roman') return 'i'
          if (style === 'upper-roman') return 'I'
          return '1'
        },
        renderHTML: (attributes) => {
          const type = attributes.type || '1'
          let listStyle = 'decimal'
          if (type === 'a') listStyle = 'lower-alpha'
          else if (type === 'A') listStyle = 'upper-alpha'
          else if (type === 'i') listStyle = 'lower-roman'
          else if (type === 'I') listStyle = 'upper-roman'

          return {
            type,
            'data-list-style': listStyle,
            style: `list-style-type: ${listStyle};`
          }
        }
      }
    }
  }
})

