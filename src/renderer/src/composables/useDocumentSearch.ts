import { ref, type ShallowRef, type Ref } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import type { Folio } from '@shared/types'

export interface SearchMatch {
  id: string
  chapterId: string
  chapterTitle: string
  chapterOrderIndex: number
  matchIndex: number // 1-based index (ej. 3 de 15)
  from?: number // Posición ProseMirror si está disponible
  to?: number
  prefix: string
  matchText: string
  suffix: string
}

export interface UseDocumentSearchOptions {
  chapters: Ref<Folio[]> | (() => Folio[])
  activeEditor?: ShallowRef<Editor | null> | Ref<Editor | null>
  activeFolioId?: Ref<string | null> | (() => string | null)
}

/**
 * Escapa caracteres especiales de regex de forma segura
 */
export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Extrae texto plano de HTML de un capítulo
 */
function stripHtmlToText(html: string): string {
  if (!html) return ''
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Composable de búsqueda profunda en el manuscrito
 */
export function useDocumentSearch(options: UseDocumentSearchOptions) {
  const isSearching = ref(false)

  const getChaptersList = (): Folio[] => {
    return typeof options.chapters === 'function' ? options.chapters() : options.chapters.value
  }

  const getActiveFolioId = (): string | null => {
    if (!options.activeFolioId) return null
    return typeof options.activeFolioId === 'function'
      ? options.activeFolioId()
      : options.activeFolioId.value
  }

  const getActiveEditor = (): Editor | null => {
    return options.activeEditor?.value || null
  }

  /**
   * Extrae las posiciones exactas (from, to) de las coincidencias en el documento ProseMirror montado
   */
  function findProseMirrorMatches(
    editor: Editor,
    query: string
  ): Array<{ from: number; to: number; text: string }> {
    const matches: Array<{ from: number; to: number; text: string }> = []
    if (!query || !editor?.state?.doc) return matches

    const regex = new RegExp(escapeRegExp(query), 'gui')

    editor.state.doc.descendants((node, pos) => {
      if (node.isText && node.text) {
        regex.lastIndex = 0
        let match: RegExpExecArray | null
        while ((match = regex.exec(node.text)) !== null) {
          const from = pos + match.index
          const to = from + match[0].length
          matches.push({
            from,
            to,
            text: match[0]
          })
        }
      }
      return true
    })

    return matches
  }

  /**
   * Ejecuta la búsqueda en todo el manuscrito devolviendo matches con contexto ordinal
   */
  function search(query: string, maxResults = 80): { matches: SearchMatch[]; totalCount: number } {
    const trimmed = query.trim()
    if (!trimmed || trimmed.length < 2) {
      return { matches: [], totalCount: 0 }
    }

    const chapters = getChaptersList()
    const activeId = getActiveFolioId()
    const editor = getActiveEditor()
    const regex = new RegExp(escapeRegExp(trimmed), 'gui')

    const allMatches: SearchMatch[] = []
    let totalCount = 0

    // Ordenar capítulos por orderIndex
    const sortedChapters = [...chapters]
      .filter((c) => !c.isArchived)
      .sort((a, b) => a.orderIndex - b.orderIndex)

    for (const chap of sortedChapters) {
      const isActiveChapter = chap.id === activeId && !!editor
      let chapterMatches: Array<{ from?: number; to?: number; prefix: string; matchText: string; suffix: string }> = []

      if (isActiveChapter && editor) {
        // Usar ProseMirror doc directamente para posiciones exactas y contexto
        const pmMatches = findProseMirrorMatches(editor, trimmed)
        const docText = editor.getText()

        chapterMatches = pmMatches.map((m) => {
          // Extraer snippet contextual alrededor de la posición
          const matchIdxInDoc = docText.toLowerCase().indexOf(trimmed.toLowerCase())
          let prefix = ''
          let suffix = ''

          if (matchIdxInDoc !== -1) {
            const start = Math.max(0, matchIdxInDoc - 32)
            prefix = docText.slice(start, matchIdxInDoc).trimStart()
            if (start > 0) prefix = '…' + prefix

            const end = Math.min(docText.length, matchIdxInDoc + trimmed.length + 32)
            suffix = docText.slice(matchIdxInDoc + trimmed.length, end).trimEnd()
            if (end < docText.length) suffix = suffix + '…'
          }

          return {
            from: m.from,
            to: m.to,
            matchText: m.text,
            prefix: prefix || '',
            suffix: suffix || ''
          }
        })
      } else {
        // Para capítulos no montados en memoria, procesar texto plano del contenido HTML
        const plainText = stripHtmlToText(chap.content)
        regex.lastIndex = 0
        let match: RegExpExecArray | null

        while ((match = regex.exec(plainText)) !== null) {
          const matchIndex = match.index
          const matchLength = match[0].length

          const start = Math.max(0, matchIndex - 32)
          let prefix = plainText.slice(start, matchIndex).trimStart()
          if (start > 0) prefix = '…' + prefix

          const end = Math.min(plainText.length, matchIndex + matchLength + 32)
          let suffix = plainText.slice(matchIndex + matchLength, end).trimEnd()
          if (end < plainText.length) suffix = suffix + '…'

          chapterMatches.push({
            prefix,
            matchText: match[0],
            suffix
          })
        }
      }

      for (const cm of chapterMatches) {
        totalCount++
        if (allMatches.length < maxResults) {
          allMatches.push({
            id: `search-${chap.id}-${totalCount}`,
            chapterId: chap.id,
            chapterTitle: chap.title || `Capítulo ${chap.orderIndex}`,
            chapterOrderIndex: chap.orderIndex,
            matchIndex: totalCount,
            from: cm.from,
            to: cm.to,
            prefix: cm.prefix,
            matchText: cm.matchText,
            suffix: cm.suffix
          })
        }
      }
    }

    return {
      matches: allMatches,
      totalCount
    }
  }

  return {
    isSearching,
    search,
    findProseMirrorMatches
  }
}
