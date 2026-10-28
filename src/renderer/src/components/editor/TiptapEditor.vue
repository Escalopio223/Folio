<script setup lang="ts">
import { watch, onBeforeUnmount, onMounted } from 'vue'
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
import EditorBubbleMenu from './EditorBubbleMenu.vue'
import { normalizeHtml } from './utils/blockFormatting'
import { useUiStore } from '../../stores/uiStore'

const props = withDefaults(
  defineProps<{
    content?: string
    placeholder?: string
    scrollContainer?: HTMLElement | null
  }>(),
  {
    content: '',
    placeholder: 'Empieza a escribir tu escena...',
    scrollContainer: null
  }
)

const emit = defineEmits<{
  (e: 'update:content', value: string): void
  (e: 'change'): void
  (e: 'save'): void
  (
    e: 'stats',
    value: { wordCount: number; charCount: number; readingTime: number; plainText: string }
  ): void
  (e: 'ready', editor: Editor): void
}>()

const uiStore = useUiStore()

function calculateStats(text: string): {
  wordCount: number
  charCount: number
  readingTime: number
  plainText: string
} {
  const plain = (text || '').trim()
  const wordCount = plain ? plain.split(/\s+/).length : 0
  const charCount = text.length
  const readingTime = wordCount === 0 ? 0 : Math.max(1, Math.ceil(wordCount / 200))
  return { wordCount, charCount, readingTime, plainText: text }
}


const editor = useEditor({
  content: normalizeHtml(props.content),
  extensions: [
    StarterKit.configure({
      horizontalRule: false, // Reemplazado por SceneBreak (* * *)
      heading: {
        levels: [1, 2, 3]
      }
    }),
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
    Indent
  ],
  editorProps: {
    attributes: {
      class:
        'ProseMirror font-editorial text-lg md:text-[19px] leading-relaxed md:leading-loose text-[var(--text-primary)] focus:outline-none min-h-[350px] w-full select-text caret-[var(--accent)]'
    },
    handleKeyDown(_view, event) {
      const isCtrlOrCmd = event.ctrlKey || event.metaKey

      // Atajo de Modo Enfoque dentro del editor
      if (isCtrlOrCmd && event.shiftKey && event.key.toLowerCase() === 'f') {
        event.preventDefault()
        uiStore.toggleFocusMode()
        return true
      }
      return false
    }
  },
  onUpdate: ({ editor: ed }) => {
    const html = ed.getHTML()
    const text = ed.getText()

    // 1. Emitir estadísticas en tiempo real (Zero-Lag)
    emit('stats', calculateStats(text))

    // 2. Emitir contenido actualizado para persistencia reactiva
    emit('update:content', html)
    emit('change')
  }
})

// Sincronizar contenido si cambia desde el exterior (ej. cambio de escena activa)
watch(
  () => props.content,
  (newContent) => {
    if (!editor.value) return
    const currentHtml = editor.value.getHTML()
    if (currentHtml !== newContent) {
      // Reemplaza contenido sin disparar ciclo de eventos onUpdate
      editor.value.commands.setContent(normalizeHtml(newContent || ''), { emitUpdate: false })
      const text = editor.value.getText()
      emit('stats', calculateStats(text))
    }
  }
)

watch(
  editor,
  (ed) => {
    if (ed) {
      emit('ready', ed)
    }
  },
  { immediate: true }
)

onMounted(() => {
  if (editor.value) {
    emit('ready', editor.value)
  }
})

onBeforeUnmount(() => {
  editor.value?.destroy()
})

defineExpose({
  editor,
  getHTML: () => editor.value?.getHTML() || '',
  getText: () => editor.value?.getText() || '',
  focus: () => editor.value?.commands.focus()
})
</script>

<template>
  <div
    class="tiptap-wrapper w-full flex-1 flex flex-col relative"
    :class="{
      'focus-mode-active': uiStore.isFocusMode
    }"
  >
    <!-- Menú flotante contextual neumórfico -->
    <EditorBubbleMenu :editor="editor" />

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
  margin-bottom: 1.25rem;
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

/* Listas */
.ProseMirror ul {
  list-style-type: disc;
  padding-left: 1.5rem;
  margin: 1rem 0;
}

.ProseMirror ol {
  list-style-type: decimal;
  padding-left: 1.5rem;
  margin: 1rem 0;
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
</style>
