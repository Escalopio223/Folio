import type { Editor } from '@tiptap/vue-3'
import { TextSelection } from '@tiptap/pm/state'
import { setBlockType, wrapIn, lift } from '@tiptap/pm/commands'

/**
 * Normaliza el contenido HTML/texto para asegurar que los saltos de línea
 * y párrafos heredados de campos planos o importaciones se estructuren en
 * nodos <p> reales en lugar de un único bloque con texto continuo.
 */
export function normalizeHtml(raw: string): string {
  if (!raw) return '<p></p>'
  const trimmed = raw.trim()
  if (!trimmed) return '<p></p>'

  // Si no contiene etiquetas HTML de bloque, convertir cada línea en un párrafo
  if (!/<(p|h[1-6]|blockquote|div|ul|ol|table|hr)[\s>]/i.test(trimmed)) {
    return trimmed
      .split(/\r?\n+/)
      .map((line) => `<p>${line || '<br>'}</p>`)
      .join('')
  }

  // Si contiene etiquetas HTML pero tiene saltos \n sueltos dentro de <p>
  return trimmed.replace(/<p([^>]*)>([\s\S]*?)<\/p>/gi, (match, attrs, inner) => {
    if (inner.includes('\n')) {
      const lines = inner.split(/\r?\n+/).filter(Boolean)
      if (lines.length > 1) {
        return lines.map((l) => `<p${attrs}>${l}</p>`).join('')
      }
    }
    return match
  })
}

/**
 * Aplica un encabezado (H1, H2, H3) de manera inteligente:
 * 1. Si hay texto seleccionado (incluso dentro de un párrafo), separa ese fragmento
 *    exacto en su propio bloque de encabezado sin afectar al resto del texto.
 * 2. Si el cursor está en una línea dentro de un bloque con saltos de línea, aísla dicha línea.
 * 3. Si el bloque completo ya es un encabezado del mismo nivel, lo alterna a párrafo.
 */
export function setHeadingSmart(editor: Editor | null | undefined, level: 1 | 2 | 3): boolean {
  if (!editor || !editor.view) return false
  const { state, view } = editor
  const { selection, doc, schema } = state
  const { from, to, empty } = selection

  // Si ya tiene este nivel de encabezado, alternar a párrafo
  if (editor.isActive('heading', { level })) {
    return setParagraphSmart(editor)
  }

  const targetType = schema.nodes.heading
  const targetAttrs = { level }

  // 1. TEXTO SELECCIONADO (empty === false)
  if (!empty) {
    const resFrom = doc.resolve(from)
    const resTo = doc.resolve(to)

    // Si la selección está dentro de un mismo bloque de texto
    if (resFrom.parent === resTo.parent && resFrom.parent.isTextblock) {
      const blockStart = resFrom.start()
      const blockEnd = resFrom.end()

      // Si la selección es un subconjunto del bloque (no abarca todo el bloque)
      if (from > blockStart || to < blockEnd) {
        let tr = state.tr
        if (to < blockEnd) {
          tr = tr.split(to)
        }
        if (from > blockStart) {
          tr = tr.split(from)
        }
        view.dispatch(tr)

        // Aplicar el encabezado únicamente al bloque seleccionado resultante
        const newState = view.state
        const newDoc = newState.doc
        const midPos = from + (from > blockStart ? 2 : 1)
        const safePos = Math.min(Math.max(1, midPos), newDoc.content.size - 1)
        const newSel = TextSelection.create(newDoc, safePos)
        let headingTr = newState.tr.setSelection(newSel)

        setBlockType(targetType, targetAttrs)(newState, (t) => {
          headingTr = t
        })
        view.dispatch(headingTr)
        editor.commands.focus()
        return true
      }
    }

    // Si abarca el bloque completo o múltiples bloques completos
    return editor.chain().focus().setHeading({ level }).run()
  }

  // 2. CURSOR SIN SELECCIÓN (empty === true)
  const res = doc.resolve(from)
  const parent = res.parent
  if (parent.isTextblock) {
    const text = parent.textContent
    const offset = res.parentOffset

    // Si el bloque contiene saltos de línea \n sueltos alrededor del cursor
    if (text.includes('\n')) {
      const lastNl = text.lastIndexOf('\n', Math.max(0, offset - 1))
      const lineStart = lastNl === -1 ? 0 : lastNl + 1
      const nextNl = text.indexOf('\n', offset)
      const lineEnd = nextNl === -1 ? text.length : nextNl

      const docStart = res.start() + lineStart
      const docEnd = res.start() + lineEnd

      if (docStart > res.start() || docEnd < res.end()) {
        let tr = state.tr
        if (docEnd < res.end()) {
          tr = tr.split(docEnd)
        }
        if (docStart > res.start()) {
          tr = tr.split(docStart)
        }
        view.dispatch(tr)

        const newState = view.state
        const newDoc = newState.doc
        const midPos = docStart + (docStart > res.start() ? 2 : 1)
        const safePos = Math.min(Math.max(1, midPos), newDoc.content.size - 1)
        const newSel = TextSelection.create(newDoc, safePos)
        let headingTr = newState.tr.setSelection(newSel)

        setBlockType(targetType, targetAttrs)(newState, (t) => {
          headingTr = t
        })
        view.dispatch(headingTr)
        editor.commands.focus()
        return true
      }
    }
  }

  // Bloque estándar sin saltos internos
  return editor.chain().focus().toggleHeading({ level }).run()
}

/**
 * Convierte a párrafo normal el fragmento seleccionado o el bloque activo.
 */
export function setParagraphSmart(editor: Editor | null | undefined): boolean {
  if (!editor || !editor.view) return false
  const { state, view } = editor
  const { selection, doc, schema } = state
  const { from, to, empty } = selection

  const targetType = schema.nodes.paragraph

  if (!empty) {
    const resFrom = doc.resolve(from)
    const resTo = doc.resolve(to)

    if (resFrom.parent === resTo.parent && resFrom.parent.isTextblock) {
      const blockStart = resFrom.start()
      const blockEnd = resFrom.end()

      if (from > blockStart || to < blockEnd) {
        let tr = state.tr
        if (to < blockEnd) {
          tr = tr.split(to)
        }
        if (from > blockStart) {
          tr = tr.split(from)
        }
        view.dispatch(tr)

        const newState = view.state
        const newDoc = newState.doc
        const midPos = from + (from > blockStart ? 2 : 1)
        const safePos = Math.min(Math.max(1, midPos), newDoc.content.size - 1)
        const newSel = TextSelection.create(newDoc, safePos)
        let pTr = newState.tr.setSelection(newSel)

        setBlockType(targetType)(newState, (t) => {
          pTr = t
        })
        view.dispatch(pTr)
        editor.commands.focus()
        return true
      }
    }
  }

  return editor.chain().focus().setParagraph().run()
}

/**
 * Convierte a cita en bloque (blockquote) el fragmento seleccionado o el bloque activo.
 */
export function setBlockquoteSmart(editor: Editor | null | undefined): boolean {
  if (!editor || !editor.view) return false
  const { state, view } = editor
  const { selection, doc, schema } = state
  const { from, to, empty } = selection

  // Si ya es blockquote, levantarlo a párrafo
  if (editor.isActive('blockquote')) {
    lift(state, view.dispatch)
    editor.commands.focus()
    return true
  }

  if (!empty) {
    const resFrom = doc.resolve(from)
    const resTo = doc.resolve(to)

    if (resFrom.parent === resTo.parent && resFrom.parent.isTextblock) {
      const blockStart = resFrom.start()
      const blockEnd = resFrom.end()

      if (from > blockStart || to < blockEnd) {
        let tr = state.tr
        if (to < blockEnd) {
          tr = tr.split(to)
        }
        if (from > blockStart) {
          tr = tr.split(from)
        }
        view.dispatch(tr)

        const newState = view.state
        const newDoc = newState.doc
        const midPos = from + (from > blockStart ? 2 : 1)
        const safePos = Math.min(Math.max(1, midPos), newDoc.content.size - 1)
        const newSel = TextSelection.create(newDoc, safePos)
        let bqTr = newState.tr.setSelection(newSel)

        wrapIn(schema.nodes.blockquote)(newState, (t) => {
          bqTr = t
        })
        view.dispatch(bqTr)
        editor.commands.focus()
        return true
      }
    }
  }

  return editor.chain().focus().toggleBlockquote().run()
}
