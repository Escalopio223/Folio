<script setup lang="ts">
import { watch, onBeforeUnmount, onMounted, nextTick, computed } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import type { Editor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import { TextStyle, FontSize, FontFamily, Color } from '@tiptap/extension-text-style'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import { SceneBreak } from './extensions/SceneBreak'
import { TabIndent } from './extensions/TabIndent'
import { FocusMode } from './extensions/FocusMode'
import { Indent } from './extensions/Indent'
import { BlockLineHeight } from './extensions/LineHeightExtension'
import { DropCapExtension } from './extensions/DropCapExtension'
import { SearchHighlight } from './extensions/SearchHighlight'
import { CustomBulletList, CustomOrderedList } from './extensions/ListExtensions'
import { WikiAutoLink, type WikiEntityTerm } from './extensions/WikiAutoLink'
import { TypewriterExtension } from './extensions/TypewriterExtension'
import { AutoCapitalizeExtension } from './extensions/AutoCapitalizeExtension'
import { detectLanguage } from '../../nlp/languageDetector'
import { useSpellcheck } from '../../composables/useSpellcheck'
import EditorBubbleMenu from './EditorBubbleMenu.vue'
import SpellingSuggestionsPopover from './SpellingSuggestionsPopover.vue'
import { normalizeHtml } from './utils/blockFormatting'
import { useUiStore } from '../../stores/uiStore'
import { useTypewriterAudio } from '../../composables/useTypewriterAudio'
import {
  computeMetricsFromText,
  type ChapterMetricsSnapshot
} from '../../composables/useChapterMetrics'

export interface SceneBreakAnchor {
  index: number
  romanLabel: string
  pos: number
  snippet: string
}

const props = withDefaults(
  defineProps<{
    content?: string
    placeholder?: string
    scrollContainer?: HTMLElement | null
    wikiEntities?: WikiEntityTerm[]
  }>(),
  {
    content: '',
    placeholder: 'Empieza a escribir tu capítulo...',
    scrollContainer: null,
    wikiEntities: () => []
  }
)

const emit = defineEmits<{
  (e: 'update:content', value: string): void
  (e: 'change'): void
  (e: 'save'): void
  (e: 'open-find'): void
  (e: 'wiki-click', entity: WikiEntityTerm, event: MouseEvent): void
  (e: 'wiki-hover', payload: { entityId: string; targetEl: HTMLElement }): void
  (e: 'wiki-leave'): void
  (e: 'stats', value: ChapterMetricsSnapshot): void
  (e: 'scene-breaks', value: SceneBreakAnchor[]): void
  (e: 'ready', editor: Editor): void
}>()

const uiStore = useUiStore()
const { handleTypingSound, playBell } = useTypewriterAudio()

function toRoman(num: number): string {
  const romans: Array<[number, string]> = [
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I']
  ]
  let n = Math.max(1, num)
  let res = ''
  for (const [val, sym] of romans) {
    while (n >= val) {
      res += sym
      n -= val
    }
  }
  return res
}

function calculateStats(text: string): ChapterMetricsSnapshot {
  return computeMetricsFromText(text)
}

function scanSceneBreaks(ed: { state: Editor['state'] }): SceneBreakAnchor[] {
  const anchors: SceneBreakAnchor[] = []
  const doc = ed.state.doc

  // Recoger posiciones de los nodos sceneBreak
  const breakPositions: number[] = []
  doc.descendants((node, pos) => {
    if (node.type.name === 'sceneBreak') {
      breakPositions.push(pos)
    }
  })

  if (breakPositions.length === 0) {
    return []
  }

  // Tramo I = inicio del capítulo (pos 0) + Tramo II, III... tras cada * * *
  const allTramoStarts = [0, ...breakPositions]
  allTramoStarts.forEach((startPos, idx) => {
    const nextBreakPos = idx + 1 < allTramoStarts.length ? allTramoStarts[idx + 1] : doc.content.size
    let snippet = ''
    doc.nodesBetween(startPos, nextBreakPos, (node) => {
      if (snippet.length >= 44) return false
      if (node.isText && node.text) {
        const clean = node.text.trim()
        if (clean) {
          snippet += (snippet ? ' ' : '') + clean
        }
      }
      return true
    })
    const trimmed = snippet.replace(/\s+/g, ' ').trim()
    const displaySnippet = trimmed
      ? trimmed.slice(0, 34) + (trimmed.length > 34 ? '…' : '')
      : 'Sin texto posterior'

    anchors.push({
      index: idx,
      romanLabel: `Tramo ${toRoman(idx + 1)}`,
      pos: startPos,
      snippet: displaySnippet
    })
  })

  return anchors
}

const { activeSpellcheckCode, setDetectedLanguage } = useSpellcheck()

const currentLanguageCode = computed<'en-US' | 'es-ES'>(() => {
  return activeSpellcheckCode.value
})

function applySpellcheckDOM(ed: { view?: { dom?: HTMLElement } } | null | undefined, langCode: 'en-US' | 'es-ES'): void {
  if (!ed || !ed.view?.dom) return
  const dom = ed.view.dom
  dom.setAttribute('lang', langCode)
  // Forzar a Chromium a reanalizar de inmediato las palabras existentes con el nuevo diccionario
  dom.setAttribute('spellcheck', 'false')
  requestAnimationFrame(() => {
    if (dom) {
      dom.setAttribute('spellcheck', 'true')
    }
  })
  if (window.api?.spellcheck) {
    const single = langCode === 'en-US' ? ['en-US'] : ['es-ES']
    window.api.spellcheck.setLanguages(single).catch(() => {})
  }
}

const editor = useEditor({
  content: normalizeHtml(props.content),
  extensions: [
    StarterKit.configure({
      horizontalRule: false, // Reemplazado por SceneBreak (* * *)
      bulletList: false,
      orderedList: false,
      heading: {
        levels: [1, 2, 3]
      }
    }),
    CustomBulletList,
    CustomOrderedList,
    Underline,
    TextStyle,
    FontSize,
    FontFamily,
    Color,
    Highlight.configure({ multicolor: true }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Placeholder.configure({
      placeholder: () => props.placeholder
    }),
    SceneBreak,
    TabIndent,
    FocusMode,
    Indent,
    BlockLineHeight,
    DropCapExtension,
    SearchHighlight,
    WikiAutoLink.configure({
      entities: props.wikiEntities,
      onEntityClick: (entity, event) => {
        emit('wiki-click', entity, event)
      }
    }),
    TypewriterExtension.configure({
      enabled: () => uiStore.isTypewriterMode,
      getScrollContainer: () => props.scrollContainer
    }),
    AutoCapitalizeExtension.configure({
      enabled: () => uiStore.isSmartCapitalizationEnabled
    })
  ],
  editorProps: {
    attributes: () => ({
      class:
        'ProseMirror font-editorial text-lg md:text-[19px] leading-relaxed md:leading-loose text-[var(--text-primary)] focus:outline-none min-h-[350px] w-full select-text caret-[var(--accent)]',
      lang: currentLanguageCode.value,
      spellcheck: 'true'
    }),
    handleKeyDown(_view, event) {
      const isCtrlOrCmd = event.ctrlKey || event.metaKey

      // Atajo de Búsqueda rápida (Ctrl+F) en el capítulo activo
      if (
        isCtrlOrCmd &&
        !event.shiftKey &&
        !event.altKey &&
        (event.key.toLowerCase() === 'f' || event.code === 'KeyF')
      ) {
        event.preventDefault()
        emit('open-find')
        return true
      }

      // Salir de Modo Zen con tecla Escape
      if (event.key === 'Escape' && uiStore.isFocusMode) {
        event.preventDefault()
        uiStore.exitFocusMode()
        return true
      }

      // Efecto sonoro de máquina de escribir mecánica
      handleTypingSound(event.key, event.code, isCtrlOrCmd)

      return false
    }
  },
  onUpdate: ({ editor: ed }) => {
    const html = ed.getHTML()
    const text = ed.getText()

    // Sincronizar automáticamente el idioma detectado y el atributo lang para que Chromium aplique el corrector adecuado
    const detected = detectLanguage(text)
    setDetectedLanguage(detected)

    if (ed.view?.dom) {
      const targetLang = activeSpellcheckCode.value
      if (ed.view.dom.getAttribute('lang') !== targetLang) {
        applySpellcheckDOM(ed, targetLang)
      }
    }

    // 1. Emitir estadísticas y tramos (* * *) en tiempo real (Zero-Lag)
    emit('stats', calculateStats(text))
    emit('scene-breaks', scanSceneBreaks(ed))

    // 2. Emitir contenido actualizado para persistencia reactiva
    emit('update:content', html)
    emit('change')
  }
})

// Sincronizar contenido si cambia desde el exterior (ej. cambio de capítulo activo)
watch(
  () => props.content,
  (newContent) => {
    // Detectar idioma inicial o actualizado del contenido
    const detected = detectLanguage(newContent || '')
    setDetectedLanguage(detected)

    if (!editor.value) return
    const currentHtml = editor.value.getHTML()
    if (currentHtml !== newContent) {
      // Reemplaza contenido sin disparar ciclo de eventos onUpdate
      editor.value.commands.setContent(normalizeHtml(newContent || ''), { emitUpdate: false })
      const text = editor.value.getText()
      emit('stats', calculateStats(text))
      emit('scene-breaks', scanSceneBreaks(editor.value))
    }
  },
  { immediate: true }
)

watch(
  editor,
  (ed) => {
    if (ed) {
      emit('ready', ed)
      emit('scene-breaks', scanSceneBreaks(ed))
    }
  },
  { immediate: true }
)

// Sincronizar entidades wiki si cambian en el store/base de datos
watch(
  () => props.wikiEntities,
  (entities) => {
    if (!editor.value) return
    editor.value.commands.setWikiEntities(entities || [])
  },
  { deep: true, immediate: true }
)

// Sincronizar idioma del corrector ortográfico en el DOM
watch(
  [currentLanguageCode, editor],
  ([langCode, ed]) => {
    if (!ed || !ed.view?.dom) return
    applySpellcheckDOM(ed, langCode)
  },
  { immediate: true }
)

// Sincronizar al activar/desactivar el Modo Máquina de Escribir
watch(
  () => uiStore.isTypewriterMode,
  async (enabled) => {
    if (!editor.value) return

    editor.value.commands.setTypewriterMode(enabled)
    await nextTick()

    if (enabled && editor.value) {
      editor.value.commands.recenterTypewriter(true)
    }
  }
)

// Delegación de eventos mouseover y mouseout en el DOM de ProseMirror para Hover Preview
let currentHoveredMentionEl: HTMLElement | null = null

function handleEditorMouseOver(event: MouseEvent): void {
  const target = event.target as HTMLElement | null
  if (!target) return

  const mentionEl = target.closest('.wiki-entity-mention') as HTMLElement | null
  if (mentionEl) {
    if (currentHoveredMentionEl === mentionEl) return
    currentHoveredMentionEl = mentionEl
    const entityId = mentionEl.getAttribute('data-wiki-id')
    if (entityId) {
      emit('wiki-hover', { entityId, targetEl: mentionEl })
    }
  }
}

function handleEditorMouseOut(event: MouseEvent): void {
  const target = event.target as HTMLElement | null
  const related = event.relatedTarget as HTMLElement | null

  const fromMention = target?.closest('.wiki-entity-mention') as HTMLElement | null
  const toMention = related?.closest('.wiki-entity-mention') as HTMLElement | null

  if (fromMention && fromMention !== toMention) {
    currentHoveredMentionEl = null
    emit('wiki-leave')
  }
}

function handleReplaceMisspellingEvent(e: Event): void {
  const detail = (e as CustomEvent).detail
  if (!editor.value || !detail?.replacement) return

  const word = (detail.word || '').trim()
  const replacement = detail.replacement
  const state = editor.value.state
  const { from, to } = state.selection

  let replaced = false

  // 1. Si hay texto seleccionado y coincide con la palabra
  if (!state.selection.empty) {
    const selectedText = state.doc.textBetween(from, to).trim()
    if (selectedText.toLowerCase() === word.toLowerCase()) {
      editor.value.chain().focus().insertContentAt({ from, to }, replacement).run()
      replaced = true
    }
  }

  // 2. Si el cursor está posicionado en la palabra
  if (!replaced) {
    const $from = state.selection.$from
    const parentText = $from.parent.textContent
    const offset = $from.parentOffset
    const textBefore = parentText.slice(0, offset)
    const textAfter = parentText.slice(offset)
    const matchBefore = textBefore.match(/[\p{L}'’\-]+$/u)
    const matchAfter = textAfter.match(/^[\p{L}'’\-]+/u)
    const currentWord = (matchBefore ? matchBefore[0] : '') + (matchAfter ? matchAfter[0] : '')
    if (currentWord.toLowerCase() === word.toLowerCase()) {
      const startDocPos = $from.pos - (matchBefore ? matchBefore[0].length : 0)
      const endDocPos = $from.pos + (matchAfter ? matchAfter[0].length : 0)
      editor.value.chain().focus().insertContentAt({ from: startDocPos, to: endDocPos }, replacement).run()
      replaced = true
    }
  }

  // 3. Búsqueda de la coincidencia más próxima si se hizo clic derecho sin enfocar previamente
  if (!replaced && word) {
    state.doc.descendants((node, pos) => {
      if (replaced || !node.isText || !node.text) return true
      const idx = node.text.toLowerCase().indexOf(word.toLowerCase())
      if (idx !== -1) {
        editor.value
          ?.chain()
          .focus()
          .insertContentAt({ from: pos + idx, to: pos + idx + word.length }, replacement)
          .run()
        replaced = true
        return false
      }
      return true
    })
  }
}

function handleDictionaryUpdatedEvent(): void {
  applySpellcheckDOM(editor.value, currentLanguageCode.value)
}

onMounted(() => {
  window.addEventListener('folio:replace-misspelling', handleReplaceMisspellingEvent)
  window.addEventListener('folio:dictionary-updated', handleDictionaryUpdatedEvent)
  if (editor.value) {
    emit('ready', editor.value)
    emit('scene-breaks', scanSceneBreaks(editor.value))
    editor.value.view.dom.addEventListener('mouseover', handleEditorMouseOver)
    editor.value.view.dom.addEventListener('mouseout', handleEditorMouseOut)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('folio:replace-misspelling', handleReplaceMisspellingEvent)
  window.removeEventListener('folio:dictionary-updated', handleDictionaryUpdatedEvent)
  if (editor.value) {
    editor.value.view.dom.removeEventListener('mouseover', handleEditorMouseOver)
    editor.value.view.dom.removeEventListener('mouseout', handleEditorMouseOut)
    editor.value.destroy()
  }
})

function scrollToSceneBreak(anchorIndex: number): void {
  if (!editor.value) return
  const proseMirrorEl = editor.value.view.dom as HTMLElement
  if (anchorIndex <= 0) {
    if (props.scrollContainer) {
      props.scrollContainer.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      proseMirrorEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    editor.value.commands.focus('start')
    return
  }

  const breaks = proseMirrorEl.querySelectorAll('div[data-type="scene-break"], .scene-break')
  const targetEl = breaks[anchorIndex - 1] as HTMLElement | undefined
  if (targetEl) {
    targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}

/**
 * Selecciona una posición o término específico, hace scroll suave hacia él y aplica feedback visual temporal
 */
function navigateToMatch(options: { from?: number; to?: number; query?: string }): void {
  if (!editor.value) return
  const ed = editor.value

  let targetFrom = options.from
  let targetTo = options.to

  // Si no disponemos de posiciones absolutas o han cambiado, buscar la primera ocurrencia en el documento
  if (typeof targetFrom !== 'number' || typeof targetTo !== 'number') {
    if (options.query) {
      const q = options.query.toLowerCase()
      ed.state.doc.descendants((node, pos) => {
        if (targetFrom !== undefined) return false
        if (node.isText && node.text) {
          const idx = node.text.toLowerCase().indexOf(q)
          if (idx !== -1) {
            targetFrom = pos + idx
            targetTo = targetFrom + options.query!.length
            return false
          }
        }
        return true
      })
    }
  }

  if (typeof targetFrom === 'number' && typeof targetTo === 'number') {
    const docSize = ed.state.doc.content.size
    const safeFrom = Math.max(0, Math.min(docSize, targetFrom))
    const safeTo = Math.max(safeFrom, Math.min(docSize, targetTo))

    // 1. Establecer selección de texto y enfocar
    ed.chain().focus().setTextSelection({ from: safeFrom, to: safeTo }).run()

    // 2. Scroll suave centrado
    nextTick(() => {
      try {
        const domAtPos = ed.view.nodeDOM(safeFrom) || ed.view.domAtPos(safeFrom).node
        const targetElement = domAtPos instanceof HTMLElement ? domAtPos : domAtPos?.parentElement

        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' })

          // 3. Highlight temporal / feedback visual
          targetElement.classList.add('search-highlight-flash')
          setTimeout(() => {
            targetElement.classList.remove('search-highlight-flash')
          }, 2000)
        }
      } catch (e) {
        console.warn('[TiptapEditor] Error al centrar nodo encontrado:', e)
      }
    })
  }
}

defineExpose({
  editor,
  getHTML: () => editor.value?.getHTML() || '',
  getText: () => editor.value?.getText() || '',
  focus: (pos: 'start' | 'end' | 'all' | null = 'end') => {
    if (editor.value) {
      editor.value.commands.focus(pos)
      const dom = editor.value.view?.dom as HTMLElement | undefined
      dom?.focus()
    }
  },
  scrollToSceneBreak,
  navigateToMatch,
  recenterTypewriter: (smooth = true) => editor.value?.commands.recenterTypewriter(smooth),
  playBell
})
</script>

<template>
  <div
    class="tiptap-wrapper w-full flex-1 flex flex-col relative"
    :class="{
      'focus-mode-active': uiStore.isFocusMode,
      'typewriter-mode-active': uiStore.isTypewriterMode
    }"
  >
    <!-- Menú flotante contextual neumórfico -->
    <EditorBubbleMenu :editor="editor" />

    <!-- Popover con 3 sugerencias ortográficas cuando el cursor está en una palabra errónea -->
    <SpellingSuggestionsPopover :editor="editor" />

    <!-- Contenedor del Editor TipTap / ProseMirror -->
    <EditorContent :editor="editor" class="tiptap-editor-content w-full flex-1" />
  </div>
</template>

<style>
/* TipTap ProseMirror Estilos Editoriales Base */
.ProseMirror {
  outline: none;
  word-break: break-word;
}

.ProseMirror p {
  margin-bottom: var(--editorial-paragraph-gap, 1.25rem);
  line-height: var(--editorial-line-height, 1.65);
}

.ProseMirror p:last-child {
  margin-bottom: 0;
}

.ProseMirror h1 {
  font-size: 1.85rem;
  font-weight: 700;
  margin-top: 2rem;
  margin-bottom: 1rem;
  color: var(--text-primary);
  line-height: 1.3;
}

.ProseMirror h2 {
  font-size: 1.45rem;
  font-weight: 700;
  margin-top: 1.75rem;
  margin-bottom: 0.75rem;
  color: var(--text-primary);
  line-height: 1.35;
}

.ProseMirror h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-top: 1.5rem;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
  line-height: 1.4;
}

.ProseMirror blockquote {
  border-left: 3px solid var(--accent);
  padding: 0.75rem 1.25rem;
  margin: 1.5rem 0;
  background-color: var(--bg-surface);
  box-shadow: var(--neu-inset-sm);
  border-radius: 0 10px 10px 0;
  font-style: italic;
  color: var(--text-secondary);
}

.ProseMirror s {
  text-decoration: line-through;
  opacity: 0.75;
}

.ProseMirror u {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.ProseMirror strong {
  font-weight: 700;
  color: var(--text-primary);
}

.ProseMirror em {
  font-style: italic;
}

/* Florón de descanso de escena narrativo (* * *) */
.ProseMirror div[data-type='scene-break'],
.ProseMirror .scene-break {
  display: block;
  text-align: center;
  margin: 2.5rem auto;
  color: var(--accent);
  letter-spacing: 0.6em;
  font-family: 'Newsreader', 'Playfair Display', Georgia, serif;
  font-size: 1.15rem;
  font-weight: 600;
  user-select: none;
  cursor: default;
}

/* Placeholder */
.ProseMirror p.is-editor-empty:first-child::before {
  color: var(--text-muted);
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
  font-style: italic;
  opacity: 0.45;
}

/* Listas Desordenadas */
.ProseMirror ul {
  list-style-type: disc;
  padding-left: 1.5rem;
  margin: 1rem 0;
}

.ProseMirror ul[data-list-style='disc'],
.ProseMirror ul[type='disc'] {
  list-style-type: disc;
}

.ProseMirror ul[data-list-style='circle'],
.ProseMirror ul[type='circle'] {
  list-style-type: circle;
}

.ProseMirror ul[data-list-style='square'],
.ProseMirror ul[type='square'] {
  list-style-type: square;
}

.ProseMirror ul[data-list-style='dash'],
.ProseMirror ul[type='dash'] {
  list-style-type: '- ';
}

/* Listas Ordenadas */
.ProseMirror ol {
  list-style-type: decimal;
  padding-left: 1.5rem;
  margin: 1rem 0;
}

.ProseMirror ol[type='1'],
.ProseMirror ol[data-list-style='decimal'] {
  list-style-type: decimal;
}

.ProseMirror ol[type='a'],
.ProseMirror ol[data-list-style='lower-alpha'] {
  list-style-type: lower-alpha;
}

.ProseMirror ol[type='A'],
.ProseMirror ol[data-list-style='upper-alpha'] {
  list-style-type: upper-alpha;
}

.ProseMirror ol[type='i'],
.ProseMirror ol[data-list-style='lower-roman'] {
  list-style-type: lower-roman;
}

.ProseMirror ol[type='I'],
.ProseMirror ol[data-list-style='upper-roman'] {
  list-style-type: upper-roman;
}

.ProseMirror li {
  margin-bottom: 0.35rem;
}

/* Resaltado */
.ProseMirror mark {
  background-color: #fef08a;
  border-radius: 3px;
  padding: 0.1em 0.25em;
  color: inherit;
}

/* Alineaciones de texto */
.ProseMirror [style*='text-align: right'],
.ProseMirror [data-text-align='right'] {
  text-align: right;
}
.ProseMirror [style*='text-align: center'],
.ProseMirror [data-text-align='center'] {
  text-align: center;
}
.ProseMirror [style*='text-align: justify'],
.ProseMirror [data-text-align='justify'] {
  text-align: justify;
}
.ProseMirror [style*='text-align: left'],
.ProseMirror [data-text-align='left'] {
  text-align: left;
}

/* Modo Enfoque en Párrafo (Focus Mode) */
.focus-mode-active .ProseMirror > * {
  opacity: 0.22;
  transition: opacity 0.25s ease;
}

.focus-mode-active .ProseMirror > .is-active-node,
.focus-mode-active .ProseMirror > .is-active-paragraph {
  opacity: 1 !important;
}

/* Modo Máquina de Escribir (Typewriter Scrolling Mode) estilo Scrivener / Typora */
.typewriter-mode-active .ProseMirror {
  padding-bottom: 75vh !important;
  transition: padding-bottom 0.25s ease;
}

/* Remarcado de coincidencias estilo VS Code */
.ProseMirror .search-match {
  background-color: color-mix(in oklab, #fef08a 65%, transparent);
  border-radius: 2px;
  box-shadow: 0 0 0 1px color-mix(in oklab, #ca8a04 40%, transparent);
  transition: background-color 0.15s ease, box-shadow 0.15s ease;
}

/* Coincidencia activa/enfocada actual (Destacado naranja cálido editorial) */
.ProseMirror .search-match.search-match-current {
  background-color: var(--accent) !important;
  color: #ffffff !important;
  font-weight: 600;
  border-radius: 3px;
  box-shadow: 0 0 0 2px color-mix(in oklab, var(--accent) 70%, transparent), 0 2px 6px rgba(0, 0, 0, 0.15);
}

/* Detección automática y vinculación interactiva con la Wiki de lore */
.ProseMirror .wiki-entity-mention {
  text-decoration: underline;
  text-decoration-style: solid;
  text-decoration-thickness: 1.5px;
  text-underline-offset: 3.5px;
  text-decoration-color: color-mix(in oklab, var(--accent) 65%, transparent);
  border-radius: 3px;
  padding: 0.05em 0.2em;
  background-color: color-mix(in oklab, var(--accent) 8%, transparent);
  cursor: pointer;
  transition: all 0.18s ease-in-out;
}

.ProseMirror .wiki-entity-mention:hover {
  background-color: color-mix(in oklab, var(--accent) 18%, transparent);
  text-decoration-color: var(--accent);
  box-shadow: 0 0 0 1px color-mix(in oklab, var(--accent) 30%, transparent);
}

/* Feedback visual de búsqueda profunda */
.search-highlight-flash {
  animation: searchFlash 2s ease-out;
  border-radius: 4px;
}

@keyframes searchFlash {
  0% {
    background-color: color-mix(in oklab, var(--accent) 38%, transparent);
    box-shadow: 0 0 0 4px color-mix(in oklab, var(--accent) 30%, transparent);
  }
  50% {
    background-color: color-mix(in oklab, var(--accent) 22%, transparent);
    box-shadow: 0 0 0 2px color-mix(in oklab, var(--accent) 15%, transparent);
  }
  100% {
    background-color: transparent;
    box-shadow: none;
  }
}
</style>
