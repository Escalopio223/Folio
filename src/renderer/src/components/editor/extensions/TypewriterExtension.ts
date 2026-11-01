import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'

export const typewriterPluginKey = new PluginKey('typewriterExtension')

export interface TypewriterOptions {
  enabled: boolean
  getScrollContainer?: () => HTMLElement | null
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    typewriter: {
      setTypewriterMode: (enabled: boolean) => ReturnType
      recenterTypewriter: (smooth?: boolean) => ReturnType
    }
  }
}

/**
 * Extensión de TipTap / ProseMirror para el Modo Máquina de Escribir (Typewriter Scrolling Mode)
 * Mantiene la línea del cursor centrada al 50% vertical exacto del contenedor visible.
 */
export const TypewriterExtension = Extension.create<TypewriterOptions>({
  name: 'typewriter',

  addOptions() {
    return {
      enabled: false,
      getScrollContainer: undefined
    }
  },

  addCommands() {
    return {
      setTypewriterMode:
        (enabled: boolean) =>
        ({ tr, dispatch }) => {
          this.options.enabled = enabled
          if (dispatch) {
            tr.setMeta(typewriterPluginKey, { enabled })
          }
          return true
        },
      recenterTypewriter:
        (smooth = true) =>
        ({ editor, tr, dispatch }) => {
          if (dispatch) {
            tr.setMeta(typewriterPluginKey, { recenter: true, smooth })
          }
          if (editor.view) {
            const pluginState = typewriterPluginKey.getState(editor.view.state)
            pluginState?.scrollToCaret?.(editor.view, smooth, true)
          }
          return true
        }
    }
  },

  addProseMirrorPlugins() {
    const extension = this

    return [
      new Plugin({
        key: typewriterPluginKey,

        state: {
          init() {
            return {
              enabled: extension.options.enabled,
              scrollToCaret: null as
                | null
                | ((view: EditorView, smooth?: boolean, force?: boolean) => void)
            }
          },
          apply(tr, prev) {
            const meta = tr.getMeta(typewriterPluginKey)
            if (meta?.enabled !== undefined) {
              return { ...prev, enabled: meta.enabled }
            }
            return prev
          }
        },

        view(editorView: EditorView) {
          let userScrolledAway = false
          let isMouseDown = false
          let rafId: number | null = null
          let resizeObserver: ResizeObserver | null = null

          const getContainer = (): HTMLElement | null => {
            if (extension.options.getScrollContainer) {
              const el = extension.options.getScrollContainer()
              if (el) return el
            }
            return (
              (editorView.dom.closest('.overflow-y-auto') as HTMLElement | null) ||
              (editorView.dom.parentElement as HTMLElement | null)
            )
          }

          const scrollToCaret = (view: EditorView, smooth = false, force = false) => {
            if (!extension.options.enabled) return
            // Si el usuario está scrolleando libremente para leer o arrastrando texto, no forzar a menos que sea comando directo
            if (!force && (userScrolledAway || isMouseDown)) return

            const scrollContainer = getContainer()
            if (!scrollContainer) return

            const { selection } = view.state
            const { head } = selection
            if (head == null) return

            let caretCoords: { top: number; bottom: number } | null = null
            try {
              caretCoords = view.coordsAtPos(head)
            } catch {
              return
            }
            if (!caretCoords) return

            const viewportRect = scrollContainer.getBoundingClientRect()
            const targetY = viewportRect.top + viewportRect.height / 2
            const caretCenterY = caretCoords.top + (caretCoords.bottom - caretCoords.top) / 2
            const deltaY = caretCenterY - targetY

            // Umbral anti-jitter: ignorar variaciones subpíxel de la tipografía
            if (Math.abs(deltaY) > 2) {
              // Si el cursor está por encima del centro objetivo y el contenedor ya está al inicio (scrollTop <= 0), no hay que forzar scroll negativo
              if (deltaY < 0 && scrollContainer.scrollTop <= 0) {
                return
              }

              if (rafId) cancelAnimationFrame(rafId)
              rafId = requestAnimationFrame(() => {
                if (smooth) {
                  const safeDelta =
                    deltaY < 0 ? Math.max(deltaY, -scrollContainer.scrollTop) : deltaY
                  scrollContainer.scrollBy({ top: safeDelta, behavior: 'smooth' })
                } else {
                  scrollContainer.scrollTop = Math.max(0, scrollContainer.scrollTop + deltaY)
                }
              })
            }
          }

          // Vincular método al estado para llamadas externas
          const pluginState = typewriterPluginKey.getState(editorView.state)
          if (pluginState) {
            pluginState.scrollToCaret = scrollToCaret
          }

          // 1. Detección de Scroll Manual (wheel / touchmove):
          // Permite al usuario desplazarse libremente con la rueda para leer sin que la vista vuelva sola al cursor
          const handleWheelOrTouch = () => {
            if (!extension.options.enabled) return
            userScrolledAway = true
          }

          // 2. Reactivación inmediata por teclado:
          // Al volver a pulsar cualquier tecla de escritura o navegación, reactiva el anclaje al centro
          const handleKeyDown = () => {
            if (userScrolledAway) {
              userScrolledAway = false
            }
          }

          // 3. Manejo de clics y arrastre de texto con el ratón (mousedown / mouseup):
          // Espera a soltar el ratón (mouseup) para no interferir en selecciones por arrastre
          const handleMouseDown = () => {
            isMouseDown = true
          }

          const handleMouseUp = () => {
            if (isMouseDown) {
              isMouseDown = false
              userScrolledAway = false
              if (extension.options.enabled) {
                setTimeout(() => {
                  scrollToCaret(editorView, true, true)
                }, 30)
              }
            }
          }

          const scrollContainer = getContainer()
          if (scrollContainer) {
            scrollContainer.addEventListener('wheel', handleWheelOrTouch, { passive: true })
            scrollContainer.addEventListener('touchmove', handleWheelOrTouch, { passive: true })
          }
          window.addEventListener('mouseup', handleMouseUp)
          editorView.dom.addEventListener('keydown', handleKeyDown)
          editorView.dom.addEventListener('mousedown', handleMouseDown)

          // 4. ResizeObserver: Mantiene el centrado si el usuario redimensiona la ventana o paneles laterales
          if (scrollContainer && typeof ResizeObserver !== 'undefined') {
            resizeObserver = new ResizeObserver(() => {
              if (extension.options.enabled && !userScrolledAway && !isMouseDown) {
                scrollToCaret(editorView, false)
              }
            })
            resizeObserver.observe(scrollContainer)
          }

          return {
            update(view, prevState) {
              if (!extension.options.enabled) return

              const docChanged = !prevState.doc.eq(view.state.doc)
              const selChanged = !prevState.selection.eq(view.state.selection)

              if (docChanged || selChanged) {
                // Centrado inmediato al escribir o desplazarse por teclado
                scrollToCaret(view, false)
              }
            },

            destroy() {
              if (rafId) cancelAnimationFrame(rafId)

              if (scrollContainer) {
                scrollContainer.removeEventListener('wheel', handleWheelOrTouch)
                scrollContainer.removeEventListener('touchmove', handleWheelOrTouch)
              }
              window.removeEventListener('mouseup', handleMouseUp)
              editorView.dom.removeEventListener('keydown', handleKeyDown)
              editorView.dom.removeEventListener('mousedown', handleMouseDown)

              if (resizeObserver) {
                resizeObserver.disconnect()
                resizeObserver = null
              }
            }
          }
        }
      })
    ]
  }
})
