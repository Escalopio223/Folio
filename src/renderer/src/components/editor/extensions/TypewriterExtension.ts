import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'

export const typewriterPluginKey = new PluginKey('typewriterExtension')

export interface TypewriterOptions {
  enabled: boolean | (() => boolean)
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

let activeScrollToCaret: ((view: EditorView, smooth?: boolean, force?: boolean) => void) | null = null

/**
 * Extensión de TipTap / ProseMirror para el Modo Máquina de Escribir estilo Scrivener / Typora
 * El texto inicia arriba normalmente sin huecos artificiales.
 * En cuanto el cursor alcanza o supera el 50% vertical, queda anclado en el centro
 * y el texto asciende suavemente a cada línea o Enter.
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
    const extension = this
    return {
      setTypewriterMode:
        (enabled: boolean) =>
        ({ tr, dispatch }) => {
          extension.options.enabled = enabled
          if (dispatch) {
            tr.setMeta(typewriterPluginKey, { enabled })
          }
          return true
        },
      recenterTypewriter:
        (smooth = true) =>
        ({ editor }) => {
          if (editor?.view) {
            activeScrollToCaret?.(editor.view, smooth, true)
          }
          return true
        }
    }
  },

  addProseMirrorPlugins() {
    const extension = this

    const isEnabled = (view?: EditorView): boolean => {
      if (typeof extension.options.enabled === 'function') {
        return extension.options.enabled()
      }
      if (view) {
        const pluginState = typewriterPluginKey.getState(view.state)
        if (pluginState?.enabled !== undefined) {
          return pluginState.enabled
        }
      }
      return !!extension.options.enabled
    }

    return [
      new Plugin({
        key: typewriterPluginKey,

        state: {
          init() {
            return {
              enabled: typeof extension.options.enabled === 'function' ? extension.options.enabled() : extension.options.enabled
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
            if (!isEnabled(view)) return
            // Si el usuario está usando la rueda para leer o arrastrando texto, no forzar recentrado automático
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

            // Umbral anti-jitter
            if (Math.abs(deltaY) > 2) {
              // Estilo Scrivener / Typora:
              // Si el cursor está por encima de la mitad de pantalla y ya estamos arriba (scrollTop <= 0),
              // se escribe con el diseño natural debajo del título sin forzar scroll.
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

          activeScrollToCaret = scrollToCaret

          // 1. Detección de Scroll Manual (wheel / touchmove):
          // Permite al usuario desplazarse libremente para releer sin que la vista salte al cursor
          const handleWheelOrTouch = () => {
            if (!isEnabled(editorView)) return
            userScrolledAway = true
          }

          // 2. Reactivación inmediata por teclado:
          const handleKeyDown = () => {
            if (userScrolledAway) {
              userScrolledAway = false
            }
          }

          // 3. Manejo de clics del ratón (mousedown / mouseup):
          const handleMouseDown = () => {
            isMouseDown = true
          }

          const handleMouseUp = () => {
            if (isMouseDown) {
              isMouseDown = false
              userScrolledAway = false
              if (isEnabled(editorView)) {
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

          // 4. ResizeObserver: Mantiene el centrado al redimensionar paneles o ventana
          if (scrollContainer && typeof ResizeObserver !== 'undefined') {
            resizeObserver = new ResizeObserver(() => {
              if (isEnabled(editorView) && !userScrolledAway && !isMouseDown) {
                scrollToCaret(editorView, false)
              }
            })
            resizeObserver.observe(scrollContainer)
          }

          return {
            update(view, prevState) {
              if (!isEnabled(view)) return

              const docChanged = !prevState.doc.eq(view.state.doc)
              const selChanged = !prevState.selection.eq(view.state.selection)

              if (docChanged) {
                // Al escribir una letra, salto de línea o borrado, reanudar centrado inmediatamente
                userScrolledAway = false
                scrollToCaret(view, false)
              } else if (selChanged && !userScrolledAway && !isMouseDown) {
                // Al mover el cursor con las flechas
                scrollToCaret(view, false)
              }
            },

            destroy() {
              if (rafId) cancelAnimationFrame(rafId)
              if (activeScrollToCaret === scrollToCaret) {
                activeScrollToCaret = null
              }

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
