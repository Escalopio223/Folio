import type { Editor } from '@tiptap/vue-3'
import type { EditorState } from '@tiptap/pm/state'
import { TextSelection } from '@tiptap/pm/state'
import { lift, wrapIn, setBlockType } from '@tiptap/pm/commands'

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
 * Comprueba si la selección actual se encuentra dentro de un nodo blockquote.
 */
export function isInsideBlockquote(state: EditorState): boolean {
  const { $from } = state.selection
  for (let d = $from.depth; d > 0; d--) {
    if ($from.node(d).type === state.schema.nodes.blockquote) return true
  }
  return false
}

/**
 * Aplica un encabezado (H1, H2, H3) de manera inteligente:
 * 1. Si está dentro de un blockquote, lo levanta primero a nivel raíz.
 * 2. Si ya es este mismo encabezado sin selección, lo alterna a párrafo normal.
 * 3. Si hay texto seleccionado dentro de un bloque, separa ese fragmento exacto
 *    en su propio encabezado manteniendo el resto como párrafos y reubicando
 *    la selección sobre el nuevo encabezado.
 * 4. Si el cursor está en una línea o hay múltiples bloques seleccionados,
 *    transforma los bloques mediante setBlockType estándar de ProseMirror.
 */
export function setHeadingSmart(editor: Editor | null | undefined, level: 1 | 2 | 3): boolean {
  if (!editor || !editor.view) return false
  const view = editor.view
  const targetType = view.state.schema.nodes.heading
  const targetAttrs = { level }

  // 1. Si está dentro de una cita en bloque, sacarlo a nivel raíz
  if (isInsideBlockquote(view.state)) {
    lift(view.state, view.dispatch.bind(view))
  }

  const { selection } = view.state
  const { from, to, empty, $from, $to } = selection

  // 2. Si el bloque actual ya es este encabezado y no hay selección, alternar a párrafo
  if (empty && $from.parent.type === targetType && $from.parent.attrs.level === level) {
    return setParagraphSmart(editor)
  }

  // 3. Selección parcial dentro de un mismo bloque de texto -> división atómica
  if (!empty && $from.sameParent($to) && $from.parent.isTextblock) {
    const blockStart = $from.start()
    const blockEnd = $from.end()

    if (from > blockStart || to < blockEnd) {
      const tr = view.state.tr
      if (to < blockEnd) {
        tr.split(to, 1, [{ type: view.state.schema.nodes.paragraph }])
      }
      if (from > blockStart) {
        tr.split(from, 1, [{ type: targetType, attrs: targetAttrs }])
      } else {
        tr.setNodeMarkup($from.before(), targetType, targetAttrs)
      }

      const mappedFrom = tr.mapping.map(from, 1)
      const mappedTo = tr.mapping.map(to, -1)
      tr.setSelection(TextSelection.create(tr.doc, mappedFrom, mappedTo))
      view.dispatch(tr)
      editor.commands.focus()
      return true
    }
  }

  // 4. Cursor en un bloque completo o selección multilineal
  const success = setBlockType(targetType, targetAttrs)(view.state, view.dispatch.bind(view))
  editor.commands.focus()
  return success
}

/**
 * Convierte a párrafo normal el fragmento seleccionado o el bloque activo:
 * 1. Si está dentro de blockquote, lo levanta a párrafo.
 * 2. Si hay texto seleccionado dentro de un encabezado o bloque, separa ese fragmento.
 * 3. Si no hay selección, convierte el encabezado o bloque actual a párrafo.
 */
export function setParagraphSmart(editor: Editor | null | undefined): boolean {
  if (!editor || !editor.view) return false
  const view = editor.view

  // 1. Si está dentro de un blockquote, levantarlo
  if (isInsideBlockquote(view.state)) {
    lift(view.state, view.dispatch.bind(view))
  }

  const targetType = view.state.schema.nodes.paragraph
  const { selection } = view.state
  const { from, to, empty, $from, $to } = selection

  // 2. Selección parcial dentro de un bloque de texto
  if (!empty && $from.sameParent($to) && $from.parent.isTextblock) {
    const blockStart = $from.start()
    const blockEnd = $from.end()

    if (from > blockStart || to < blockEnd) {
      const tr = view.state.tr
      if (to < blockEnd) {
        tr.split(to, 1, [{ type: targetType }])
      }
      if (from > blockStart) {
        tr.split(from, 1, [{ type: targetType, attrs: {} }])
      } else {
        tr.setNodeMarkup($from.before(), targetType, {})
      }

      const mappedFrom = tr.mapping.map(from, 1)
      const mappedTo = tr.mapping.map(to, -1)
      tr.setSelection(TextSelection.create(tr.doc, mappedFrom, mappedTo))
      view.dispatch(tr)
      editor.commands.focus()
      return true
    }
  }

  // 3. Bloque completo o selección múltiple
  const success = setBlockType(targetType, {})(view.state, view.dispatch.bind(view))
  editor.commands.focus()
  return success
}

/**
 * Convierte a cita en bloque (blockquote) el fragmento seleccionado o el bloque activo:
 * 1. Si ya está dentro de una cita, la levanta (toggle off).
 * 2. Si hay texto seleccionado parcialmente, lo separa primero en su propio bloque.
 * 3. Envuelve el bloque en un nodo blockquote editorial.
 */
export function setBlockquoteSmart(editor: Editor | null | undefined): boolean {
  if (!editor || !editor.view) return false
  const view = editor.view

  // 1. Si ya es blockquote, alternar apagándolo (lift)
  if (isInsideBlockquote(view.state)) {
    const success = lift(view.state, view.dispatch.bind(view))
    editor.commands.focus()
    return success
  }

  // 2. Si es una selección parcial, dividir primero
  const { from, to, empty, $from, $to } = view.state.selection
  if (!empty && $from.sameParent($to) && $from.parent.isTextblock) {
    const blockStart = $from.start()
    const blockEnd = $from.end()

    if (from > blockStart || to < blockEnd) {
      const tr = view.state.tr
      if (to < blockEnd) {
        tr.split(to, 1)
      }
      if (from > blockStart) {
        tr.split(from, 1)
      }
      const mappedFrom = tr.mapping.map(from, 1)
      const mappedTo = tr.mapping.map(to, -1)
      tr.setSelection(TextSelection.create(tr.doc, mappedFrom, mappedTo))
      view.dispatch(tr)
    }
  }

  const success = wrapIn(view.state.schema.nodes.blockquote)(view.state, view.dispatch.bind(view))
  editor.commands.focus()
  return success
}
