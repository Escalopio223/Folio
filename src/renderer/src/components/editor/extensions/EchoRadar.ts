import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import {
  extractDocumentTokens,
  detectEchoClusters,
  type EchoCluster,
  type EchoOccurrence
} from '../../../composables/useEchoDetector'
import { resolveLanguagePack, type LanguagePack, type SupportedLanguageCode } from '../../../nlp/languageDetector'

export interface EchoRadarOptions {
  enabled: boolean
  windowSizeWords: number // 60 | 120 | 250
  minRepetitions: number // 2 | 3
  language: SupportedLanguageCode // 'auto' | 'es' | 'en' | 'universal'
  ignoredStems: Set<string>
  wikiExcludedStems: Set<string>
  onEchoClick?: (payload: {
    occurrence: EchoOccurrence
    cluster: EchoCluster
    event: MouseEvent
    targetEl: HTMLElement
    pack: LanguagePack
    windowSizeWords: number
  }) => void
  onClustersUpdate?: (clusters: EchoCluster[], pack: LanguagePack) => void
}

export interface EchoRadarPluginState {
  enabled: boolean
  decorations: DecorationSet
  clusters: EchoCluster[]
  occurrencesMap: Map<number, EchoCluster>
  pack: LanguagePack
}

export const echoRadarPluginKey = new PluginKey<EchoRadarPluginState>('echoRadar')

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    echoRadar: {
      setEchoRadarConfig: (config: Partial<EchoRadarOptions>) => ReturnType
      ignoreEchoStem: (stem: string) => ReturnType
    }
  }
}

/**
 * Extensión TipTap / ProseMirror para el Radar de Ecos
 * Cero contaminación en disco: opera 100% mediante DecorationSet en memoria
 */
export const EchoRadar = Extension.create<EchoRadarOptions>({
  name: 'echoRadar',

  addOptions() {
    return {
      enabled: false,
      windowSizeWords: 120,
      minRepetitions: 2,
      language: 'auto',
      ignoredStems: new Set<string>(),
      wikiExcludedStems: new Set<string>(),
      onEchoClick: undefined,
      onClustersUpdate: undefined
    }
  },

  addCommands() {
    return {
      setEchoRadarConfig:
        (config: Partial<EchoRadarOptions>) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            tr.setMeta(echoRadarPluginKey, { config })
          }
          return true
        },
      ignoreEchoStem:
        (stem: string) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            tr.setMeta(echoRadarPluginKey, { ignoreStem: stem })
          }
          return true
        }
    }
  },

  addProseMirrorPlugins() {
    const extension = this
    let debounceTimer: ReturnType<typeof setTimeout> | null = null

    return [
      new Plugin({
        key: echoRadarPluginKey,
        state: {
          init(_, state) {
            const pack = resolveLanguagePack(extension.options.language, state.doc.textContent)
            if (!extension.options.enabled) {
              extension.options.onClustersUpdate?.([], pack)
              return {
                enabled: false,
                decorations: DecorationSet.empty,
                clusters: [],
                occurrencesMap: new Map(),
                pack
              }
            }

            const tokens = extractDocumentTokens(
              state.doc,
              pack,
              extension.options.ignoredStems,
              extension.options.wikiExcludedStems
            )
            const { clusters, occurrencesMap } = detectEchoClusters(
              tokens,
              extension.options.windowSizeWords,
              extension.options.minRepetitions
            )

            const decorations = buildDecorations(state.doc, occurrencesMap)
            extension.options.onClustersUpdate?.(clusters, pack)

            return {
              enabled: true,
              decorations,
              clusters,
              occurrencesMap,
              pack
            }
          },

          apply(tr, oldPluginState, _, newState) {
            const meta = tr.getMeta(echoRadarPluginKey)
            let enabled = oldPluginState.enabled
            let ignoredStems = new Set(extension.options.ignoredStems)
            let needsRecalc = false

            if (meta?.config) {
              if (meta.config.enabled !== undefined) {
                enabled = meta.config.enabled
                extension.options.enabled = enabled
              }
              if (meta.config.windowSizeWords !== undefined) {
                extension.options.windowSizeWords = meta.config.windowSizeWords
              }
              if (meta.config.minRepetitions !== undefined) {
                extension.options.minRepetitions = meta.config.minRepetitions
              }
              if (meta.config.language !== undefined) {
                extension.options.language = meta.config.language
              }
              if (meta.config.wikiExcludedStems !== undefined) {
                extension.options.wikiExcludedStems = meta.config.wikiExcludedStems
              }
              if (meta.config.ignoredStems !== undefined) {
                ignoredStems = meta.config.ignoredStems
                extension.options.ignoredStems = ignoredStems
              }
              needsRecalc = true
            }

            if (meta?.ignoreStem) {
              ignoredStems.add(meta.ignoreStem)
              extension.options.ignoredStems = ignoredStems
              needsRecalc = true
            }

            if (meta?.recalculate) {
              needsRecalc = true
            }

            // Si está desactivado, limpiar decoraciones y notificar
            if (!enabled) {
              if (oldPluginState.enabled) {
                extension.options.onClustersUpdate?.([], oldPluginState.pack)
              }
              return {
                enabled: false,
                decorations: DecorationSet.empty,
                clusters: [],
                occurrencesMap: new Map(),
                pack: oldPluginState.pack
              }
            }

            // Si el documento cambió pero aún no vence el debounce (meta no es recalculate ni config),
            // mapeamos las decoraciones existentes a las nuevas posiciones
            if (!needsRecalc) {
              return {
                ...oldPluginState,
                enabled,
                decorations: oldPluginState.decorations.map(tr.mapping, tr.doc)
              }
            }

            // Recalcular decoraciones con el paquete de idioma correspondiente
            const pack = resolveLanguagePack(extension.options.language, newState.doc.textContent)
            const tokens = extractDocumentTokens(
              newState.doc,
              pack,
              ignoredStems,
              extension.options.wikiExcludedStems
            )
            const { clusters, occurrencesMap } = detectEchoClusters(
              tokens,
              extension.options.windowSizeWords,
              extension.options.minRepetitions
            )
            const decorations = buildDecorations(newState.doc, occurrencesMap)
            extension.options.onClustersUpdate?.(clusters, pack)

            return {
              enabled: true,
              decorations,
              clusters,
              occurrencesMap,
              pack
            }
          }
        },

        view() {
          return {
            update(view, prevState) {
              if (!extension.options.enabled) return
              if (!view.state.doc.eq(prevState.doc)) {
                if (debounceTimer) {
                  clearTimeout(debounceTimer)
                }
                debounceTimer = setTimeout(() => {
                  if (!view.isDestroyed) {
                    view.dispatch(view.state.tr.setMeta(echoRadarPluginKey, { recalculate: true }))
                  }
                }, 350)
              }
            },
            destroy() {
              if (debounceTimer) {
                clearTimeout(debounceTimer)
                debounceTimer = null
              }
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

            const echoEl = target.closest('.echo-highlight') as HTMLElement | null
            if (!echoEl) return false

            const pluginState = echoRadarPluginKey.getState(view.state)
            if (!pluginState || !pluginState.enabled) return false

            const fromAttr = echoEl.getAttribute('data-echo-from')
            const from = fromAttr ? parseInt(fromAttr, 10) : NaN

            let cluster: EchoCluster | undefined
            if (!isNaN(from)) {
              cluster = pluginState.occurrencesMap.get(from)
            }

            if (!cluster) {
              const stemAttr = echoEl.getAttribute('data-echo-stem')
              cluster = pluginState.clusters.find((c) => c.stem === stemAttr)
            }

            if (cluster) {
              const occurrence =
                cluster.occurrences.find((o) => o.from === from) || cluster.occurrences[0]

              if (extension.options.onEchoClick) {
                event.preventDefault()
                event.stopPropagation()
                extension.options.onEchoClick({
                  occurrence,
                  cluster,
                  event,
                  targetEl: echoEl,
                  pack: pluginState.pack,
                  windowSizeWords: extension.options.windowSizeWords
                })
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

function buildDecorations(doc: any, occurrencesMap: Map<number, EchoCluster>): DecorationSet {
  const decorations: Decoration[] = []

  for (const [from, cluster] of occurrencesMap.entries()) {
    const occ = cluster.occurrences.find((o) => o.from === from)
    if (!occ) continue

    decorations.push(
      Decoration.inline(occ.from, occ.to, {
        class: 'echo-highlight',
        'data-echo-stem': cluster.stem,
        'data-echo-count': String(cluster.count),
        'data-echo-from': String(occ.from)
      })
    )
  }

  return DecorationSet.create(doc, decorations)
}
