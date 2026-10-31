import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { escapeRegExp } from '../../../composables/useDocumentSearch'

export interface WikiEntityTerm {
  id: string
  name: string
  category: string
  summary: string
  icon?: string
}

export interface WikiAutoLinkOptions {
  entities: WikiEntityTerm[]
  onEntityClick?: (entity: WikiEntityTerm, event: MouseEvent) => void
}

export const wikiAutoLinkPluginKey = new PluginKey('wikiAutoLink')

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    wikiAutoLink: {
      setWikiEntities: (entities: WikiEntityTerm[]) => ReturnType
    }
  }
}

/**
 * Compila y construye un conjunto de decoraciones dinámicas para todas las menciones
 * de entidades de la wiki sin mutar el documento ni el almacenamiento SQLite.
 */
function buildWikiDecorations(
  doc: Parameters<DecorationSet['find']>[0] extends undefined ? any : any,
  entities: WikiEntityTerm[]
): DecorationSet {
  if (!entities || entities.length === 0 || !doc) {
    return DecorationSet.empty
  }

  // Filtrar entidades válidas y ordenarlas de mayor a menor longitud
  // para que si existe "Reino de Valoria" y "Valoria", coincida primero la frase más específica
  const validEntities = entities
    .filter((e) => e && e.name && e.name.trim().length >= 2)
    .sort((a, b) => b.name.trim().length - a.name.trim().length)

  if (validEntities.length === 0) {
    return DecorationSet.empty
  }

  // Mapa de búsqueda rápida por término normalizado en minúsculas
  const termMap = new Map<string, WikiEntityTerm>()
  const escapedTerms: string[] = []

  for (const ent of validEntities) {
    const termClean = ent.name.trim()
    const lowerKey = termClean.toLowerCase()
    if (!termMap.has(lowerKey)) {
      termMap.set(lowerKey, ent)
      escapedTerms.push(escapeRegExp(termClean))
    }
  }

  if (escapedTerms.length === 0) {
    return DecorationSet.empty
  }

  // Regex con límites de palabras (\b) y banderas global e insensible a mayúsculas/minúsculas
  // Usamos límites contextuales compatibles con caracteres internacionales y acentos
  const regexPattern = `(?<=^|[\\s.,;:¡!¿?«»"'\\[\\](){}<>—–-])(${escapedTerms.join('|')})(?=[\\s.,;:¡!¿?«»"'\\[\\](){}<>—–-]|\$)`
  let regex: RegExp
  try {
    regex = new RegExp(regexPattern, 'gui')
  } catch (err) {
    console.warn('[WikiAutoLink] Fallback regex error:', err)
    regex = new RegExp(`\\b(${escapedTerms.join('|')})\\b`, 'gui')
  }

  const decorations: Decoration[] = []

  doc.descendants((node: any, pos: number) => {
    if (node.isText && node.text) {
      regex.lastIndex = 0
      let match: RegExpExecArray | null

      while ((match = regex.exec(node.text)) !== null) {
        const matchText = match[1] || match[0]
        const entity = termMap.get(matchText.toLowerCase())
        if (!entity) continue

        // Calcular posición exacta en el offset de captura
        const offsetInMatch = match[0].indexOf(matchText)
        const from = pos + match.index + (offsetInMatch >= 0 ? offsetInMatch : 0)
        const to = from + matchText.length

        decorations.push(
          Decoration.inline(from, to, {
            class: 'wiki-entity-mention',
            'data-wiki-id': entity.id,
            'data-wiki-title': entity.name,
            'data-wiki-category': entity.category
          })
        )
      }
    }
    return true
  })

  return DecorationSet.create(doc, decorations)
}

export const WikiAutoLink = Extension.create<WikiAutoLinkOptions>({
  name: 'wikiAutoLink',

  addOptions() {
    return {
      entities: [],
      onEntityClick: undefined
    }
  },

  addCommands() {
    return {
      setWikiEntities:
        (entities: WikiEntityTerm[]) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            tr.setMeta(wikiAutoLinkPluginKey, { entities })
          }
          return true
        }
    }
  },

  addProseMirrorPlugins() {
    const extension = this

    return [
      new Plugin({
        key: wikiAutoLinkPluginKey,
        state: {
          init(_, state) {
            return {
              entities: extension.options.entities || [],
              decorations: buildWikiDecorations(state.doc, extension.options.entities || [])
            }
          },
          apply(tr, oldPluginState) {
            const meta = tr.getMeta(wikiAutoLinkPluginKey)
            let entities = oldPluginState.entities

            let entitiesChanged = false
            if (meta && meta.entities !== undefined) {
              entities = meta.entities
              entitiesChanged = true
            }

            if (!tr.docChanged && !entitiesChanged) {
              return oldPluginState
            }

            const decorations = buildWikiDecorations(tr.doc, entities)
            return {
              entities,
              decorations
            }
          }
        },
        props: {
          decorations(state) {
            return this.getState(state)?.decorations ?? DecorationSet.empty
          },
          handleClick(view, _pos, event) {
            const target = event.target as HTMLElement | null
            if (!target) return false

            const mentionEl = target.closest('.wiki-entity-mention') as HTMLElement | null
            if (!mentionEl) return false

            const isCtrlOrCmd = event.ctrlKey || event.metaKey
            if (isCtrlOrCmd) {
              event.preventDefault()
              event.stopPropagation()

              const entityId = mentionEl.getAttribute('data-wiki-id')
              const pluginState = wikiAutoLinkPluginKey.getState(view.state)
              const entity = pluginState?.entities.find((e: WikiEntityTerm) => e.id === entityId)

              if (entity && extension.options.onEntityClick) {
                extension.options.onEntityClick(entity, event)
                return true
              }
            }

            return false
          }
        }
      })
    ]
  }
})
