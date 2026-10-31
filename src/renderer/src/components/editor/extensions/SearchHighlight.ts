import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { escapeRegExp } from '../../../composables/useDocumentSearch'

export interface SearchDecorationOptions {
  searchTerm: string
  caseSensitive: boolean
  wholeWord: boolean
  currentIndex: number
}

export const searchPluginKey = new PluginKey('searchHighlight')

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    searchHighlight: {
      setSearchTerm: (searchTerm: string) => ReturnType
      setSearchOptions: (options: Partial<SearchDecorationOptions>) => ReturnType
      clearSearch: () => ReturnType
    }
  }
}

export const SearchHighlight = Extension.create<SearchDecorationOptions>({
  name: 'searchHighlight',

  addOptions() {
    return {
      searchTerm: '',
      caseSensitive: false,
      wholeWord: false,
      currentIndex: -1
    }
  },

  addCommands() {
    return {
      setSearchTerm:
        (searchTerm: string) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            tr.setMeta(searchPluginKey, { searchTerm })
          }
          return true
        },
      setSearchOptions:
        (options: Partial<SearchDecorationOptions>) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            tr.setMeta(searchPluginKey, options)
          }
          return true
        },
      clearSearch:
        () =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            tr.setMeta(searchPluginKey, { searchTerm: '', currentIndex: -1 })
          }
          return true
        }
    }
  },

  addProseMirrorPlugins() {
    const extension = this

    return [
      new Plugin({
        key: searchPluginKey,
        state: {
          init() {
            return {
              searchTerm: extension.options.searchTerm,
              caseSensitive: extension.options.caseSensitive,
              wholeWord: extension.options.wholeWord,
              currentIndex: extension.options.currentIndex,
              decorations: DecorationSet.empty
            }
          },
          apply(tr, oldState) {
            const meta = tr.getMeta(searchPluginKey)
            let { searchTerm, caseSensitive, wholeWord, currentIndex } = oldState

            let changed = false
            if (meta) {
              if (meta.searchTerm !== undefined && meta.searchTerm !== searchTerm) {
                searchTerm = meta.searchTerm
                changed = true
              }
              if (meta.caseSensitive !== undefined && meta.caseSensitive !== caseSensitive) {
                caseSensitive = meta.caseSensitive
                changed = true
              }
              if (meta.wholeWord !== undefined && meta.wholeWord !== wholeWord) {
                wholeWord = meta.wholeWord
                changed = true
              }
              if (meta.currentIndex !== undefined && meta.currentIndex !== currentIndex) {
                currentIndex = meta.currentIndex
                changed = true
              }
            }

            if (!tr.docChanged && !changed) {
              return oldState
            }

            if (!searchTerm || searchTerm.trim().length === 0) {
              return {
                searchTerm: '',
                caseSensitive,
                wholeWord,
                currentIndex: -1,
                decorations: DecorationSet.empty
              }
            }

            let pattern = escapeRegExp(searchTerm)
            if (wholeWord) {
              pattern = `\\b${pattern}\\b`
            }
            const flags = caseSensitive ? 'gu' : 'gui'

            let regex: RegExp
            try {
              regex = new RegExp(pattern, flags)
            } catch {
              return {
                searchTerm,
                caseSensitive,
                wholeWord,
                currentIndex,
                decorations: DecorationSet.empty
              }
            }

            const decos: Decoration[] = []
            let matchIdx = 0

            tr.doc.descendants((node, pos) => {
              if (node.isText && node.text) {
                regex.lastIndex = 0
                let match: RegExpExecArray | null
                while ((match = regex.exec(node.text)) !== null) {
                  const from = pos + match.index
                  const to = from + match[0].length
                  const isCurrent = matchIdx === currentIndex

                  decos.push(
                    Decoration.inline(from, to, {
                      class: isCurrent ? 'search-match search-match-current' : 'search-match',
                      'data-search-index': String(matchIdx)
                    })
                  )
                  matchIdx++
                }
              }
              return true
            })

            return {
              searchTerm,
              caseSensitive,
              wholeWord,
              currentIndex,
              decorations: DecorationSet.create(tr.doc, decos)
            }
          }
        },
        props: {
          decorations(state) {
            return this.getState(state)?.decorations ?? DecorationSet.empty
          }
        }
      })
    ]
  }
})
