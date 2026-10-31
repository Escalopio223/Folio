<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import {
  Search,
  ChevronUp,
  ChevronDown,
  X,
  CaseSensitive,
  WholeWord
} from 'lucide-vue-next'
import { escapeRegExp } from '../../composables/useDocumentSearch'

const props = defineProps<{
  editor: Editor | null | undefined
}>()

const isVisible = ref(false)
const searchText = ref('')
const caseSensitive = ref(false)
const wholeWord = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)

interface MatchPos {
  from: number
  to: number
}

const matches = ref<MatchPos[]>([])
const currentIndex = ref(-1)

// Recalcular coincidencias en el documento TipTap
function updateMatches(): void {
  if (!props.editor || !searchText.value) {
    matches.value = []
    currentIndex.value = -1
    return
  }

  const query = searchText.value
  let pattern = escapeRegExp(query)
  if (wholeWord.value) {
    pattern = `\\b${pattern}\\b`
  }

  const flags = caseSensitive.value ? 'gu' : 'gui'
  let regex: RegExp
  try {
    regex = new RegExp(pattern, flags)
  } catch {
    matches.value = []
    currentIndex.value = -1
    return
  }

  const found: MatchPos[] = []
  props.editor.state.doc.descendants((node, pos) => {
    if (node.isText && node.text) {
      regex.lastIndex = 0
      let m: RegExpExecArray | null
      while ((m = regex.exec(node.text)) !== null) {
        found.push({
          from: pos + m.index,
          to: pos + m.index + m[0].length
        })
      }
    }
    return true
  })

  matches.value = found
  if (found.length > 0) {
    if (currentIndex.value < 0 || currentIndex.value >= found.length) {
      currentIndex.value = 0
    }
  } else {
    currentIndex.value = -1
  }

  // Sincronizar decoraciones en tiempo real con la extensión ProseMirror
  props.editor?.commands.setSearchOptions({
    searchTerm: searchText.value,
    caseSensitive: caseSensitive.value,
    wholeWord: wholeWord.value,
    currentIndex: currentIndex.value
  })
}

watch([searchText, caseSensitive, wholeWord], () => {
  updateMatches()
  if (matches.value.length > 0) {
    highlightAndScroll(currentIndex.value)
  }
})

// Moverse y enfocar la coincidencia seleccionada
function highlightAndScroll(idx: number): void {
  if (!props.editor || matches.value.length === 0 || idx < 0 || idx >= matches.value.length) return
  const match = matches.value[idx]

  // Actualizar la coincidencia activa en el plugin ProseMirror para que se pinte de color acento
  props.editor.commands.setSearchOptions({
    currentIndex: idx
  })

  props.editor
    .chain()
    .setTextSelection({ from: match.from, to: match.to })
    .run()

  nextTick(() => {
    try {
      const ed = props.editor
      if (!ed) return
      const domAtPos = ed.view.nodeDOM(match.from) || ed.view.domAtPos(match.from).node
      const targetElement = domAtPos instanceof HTMLElement ? domAtPos : domAtPos?.parentElement

      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        targetElement.classList.add('search-highlight-flash')
        setTimeout(() => {
          targetElement.classList.remove('search-highlight-flash')
        }, 1200)
      }
    } catch (e) {
      console.warn('[EditorFindBar] Error scrolling to match:', e)
    }
  })
}

function findNext(): void {
  if (matches.value.length === 0) return
  currentIndex.value = (currentIndex.value + 1) % matches.value.length
  highlightAndScroll(currentIndex.value)
}

function findPrev(): void {
  if (matches.value.length === 0) return
  currentIndex.value = (currentIndex.value - 1 + matches.value.length) % matches.value.length
  highlightAndScroll(currentIndex.value)
}

function open(initialQuery = ''): void {
  isVisible.value = true
  if (initialQuery) {
    searchText.value = initialQuery
  } else if (!searchText.value && props.editor) {
    // Si hay texto seleccionado en el editor, inicializar la búsqueda con esa palabra
    const { from, to } = props.editor.state.selection
    if (from !== to) {
      const selected = props.editor.state.doc.textBetween(from, to).trim()
      if (selected && selected.length < 50) {
        searchText.value = selected
      }
    }
  }

  nextTick(() => {
    updateMatches()
    inputRef.value?.focus()
    inputRef.value?.select()
    if (matches.value.length > 0) {
      highlightAndScroll(currentIndex.value >= 0 ? currentIndex.value : 0)
    }
  })
}

function close(): void {
  isVisible.value = false
  // Limpiar decoraciones de búsqueda al cerrar la barra
  props.editor?.commands.clearSearch()
  props.editor?.commands.focus()
}

function toggle(): void {
  if (isVisible.value) {
    close()
  } else {
    open()
  }
}

function handleInputKeydown(e: KeyboardEvent): void {
  if (e.key === 'Enter') {
    e.preventDefault()
    if (e.shiftKey) {
      findPrev()
    } else {
      findNext()
    }
  } else if (e.key === 'Escape') {
    e.preventDefault()
    close()
  }
}

// Global handler de Ctrl+F dentro del editor o de la vista
function handleGlobalKeydown(e: KeyboardEvent): void {
  const isCtrlOrCmd = e.ctrlKey || e.metaKey
  if (isCtrlOrCmd && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'f') {
    // Si no hay modal bloqueante abierto
    e.preventDefault()
    open()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
})

defineExpose({
  open,
  close,
  toggle,
  isVisible
})
</script>

<template>
  <Transition
    enter-active-class="transition duration-150 ease-out"
    enter-from-class="opacity-0 -translate-y-2 scale-98"
    enter-to-class="opacity-100 translate-y-0 scale-100"
    leave-active-class="transition duration-100 ease-in"
    leave-from-class="opacity-100 translate-y-0 scale-100"
    leave-to-class="opacity-0 -translate-y-2 scale-98"
  >
    <div
      v-if="isVisible"
      class="absolute right-6 top-3 z-40 neu-surface px-2.5 py-1.5 rounded-xl border border-[var(--groove-dark)]/70 shadow-xl flex items-center gap-1.5 text-xs select-none backdrop-blur-md"
    >
      <!-- Icono de Búsqueda -->
      <Search :size="13" class="text-[var(--accent)] shrink-0 opacity-80" />

      <!-- Input de búsqueda -->
      <div class="relative flex items-center min-w-[170px] max-w-[220px]">
        <input
          ref="inputRef"
          v-model="searchText"
          type="text"
          placeholder="Buscar palabra..."
          class="w-full bg-transparent border-none outline-none text-xs font-sans text-[var(--text-primary)] placeholder-[var(--text-muted)] pr-12"
          spellcheck="false"
          @keydown="handleInputKeydown"
        />

        <!-- Conmutadores de Modo: Mayúsculas/Minúsculas y Palabra Completa -->
        <div class="absolute right-0 flex items-center gap-0.5">
          <button
            type="button"
            class="w-4 h-4 rounded flex items-center justify-center text-[10px] cursor-pointer transition-colors"
            :class="
              caseSensitive
                ? 'neu-well text-[var(--accent)] font-bold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            "
            title="Coincidir mayúsculas y minúsculas (Alt+C)"
            @click="caseSensitive = !caseSensitive"
          >
            <CaseSensitive :size="11" />
          </button>

          <button
            type="button"
            class="w-4 h-4 rounded flex items-center justify-center text-[10px] cursor-pointer transition-colors"
            :class="
              wholeWord
                ? 'neu-well text-[var(--accent)] font-bold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            "
            title="Solo palabras completas (Alt+W)"
            @click="wholeWord = !wholeWord"
          >
            <WholeWord :size="11" />
          </button>
        </div>
      </div>

      <!-- Divisor sutil -->
      <div class="neu-groove-v h-4 mx-0.5"></div>

      <!-- Contador de Coincidencias tipo VS Code: 1 de 5 / Sin resultados -->
      <span class="text-[10px] font-mono text-[var(--text-muted)] whitespace-nowrap min-w-[50px] text-center">
        <template v-if="!searchText">
          0/0
        </template>
        <template v-else-if="matches.length === 0">
          Sin resultados
        </template>
        <template v-else>
          {{ currentIndex + 1 }} de {{ matches.length }}
        </template>
      </span>

      <!-- Divisor sutil -->
      <div class="neu-groove-v h-4 mx-0.5"></div>

      <!-- Botón Anterior (Shift+Enter) -->
      <button
        type="button"
        :disabled="matches.length === 0"
        class="neu-btn w-6 h-6 rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all active:scale-95"
        title="Coincidencia anterior (Shift+Enter)"
        @click="findPrev"
      >
        <ChevronUp :size="13" />
      </button>

      <!-- Botón Siguiente (Enter) -->
      <button
        type="button"
        :disabled="matches.length === 0"
        class="neu-btn w-6 h-6 rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all active:scale-95"
        title="Coincidencia siguiente (Enter)"
        @click="findNext"
      >
        <ChevronDown :size="13" />
      </button>

      <!-- Botón Cerrar (Escape) -->
      <button
        type="button"
        class="neu-btn w-6 h-6 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer transition-all active:scale-95 ml-0.5"
        title="Cerrar barra de búsqueda (Escape)"
        @click="close"
      >
        <X :size="12" />
      </button>
    </div>
  </Transition>
</template>
