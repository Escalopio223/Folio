<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { Sparkles, BookMarked, Check } from 'lucide-vue-next'
import { useSpellcheck } from '../../composables/useSpellcheck'

const props = defineProps<{
  editor: Editor | null | undefined
}>()

const { checkAndSuggest, addCustomWord, isCustomWord } = useSpellcheck()

const isVisible = ref(false)
const suggestions = ref<string[]>([])
const activeWord = ref<string>('')
const wordRange = ref<{ from: number; to: number }>({ from: 0, to: 0 })
const popoverCoords = ref<{ top: number; left: number }>({ top: 0, left: 0 })
const isAddedFeedback = ref(false)

let checkTimeout: ReturnType<typeof setTimeout> | null = null

function hidePopover(): void {
  isVisible.value = false
  suggestions.value = []
  activeWord.value = ''
  isAddedFeedback.value = false
  if (checkTimeout) {
    clearTimeout(checkTimeout)
    checkTimeout = null
  }
}

function updatePopoverPosition(): void {
  if (!props.editor || !props.editor.view || !isVisible.value) return

  try {
    const coords = props.editor.view.coordsAtPos(wordRange.value.from)
    const endCoords = props.editor.view.coordsAtPos(wordRange.value.to)
    const popoverWidth = 280
    const popoverHeight = 44

    // Centrar horizontalmente respecto a la palabra
    const wordCenterX = (coords.left + endCoords.right) / 2
    let left = wordCenterX - popoverWidth / 2
    left = Math.max(16, Math.min(window.innerWidth - popoverWidth - 16, left))

    // Posicionar arriba de la palabra, o abajo si no hay espacio arriba
    let top = coords.top - popoverHeight - 8
    if (top < 60) {
      top = coords.bottom + 8
    }

    popoverCoords.value = { top, left }
  } catch {
    // Si no se pueden calcular las coordenadas, ocultar
    hidePopover()
  }
}

function inspectCursorWord(): void {
  if (!props.editor || props.editor.isDestroyed) {
    hidePopover()
    return
  }

  const state = props.editor.state
  const { selection } = state

  // Solo actuar si el cursor es un punto (no una selección amplia de texto)
  if (!selection.empty) {
    hidePopover()
    return
  }

  const $from = selection.$from
  // Omitir bloques de código
  if ($from.parent.type.spec.code) {
    hidePopover()
    return
  }

  const parentText = $from.parent.textContent
  const offset = $from.parentOffset

  // Extraer el token de palabra que envuelve la posición del cursor
  const textBefore = parentText.slice(0, offset)
  const textAfter = parentText.slice(offset)

  const matchBefore = textBefore.match(/[\p{L}'’\-]+$/u)
  const matchAfter = textAfter.match(/^[\p{L}'’\-]+/u)

  const beforeStr = matchBefore ? matchBefore[0] : ''
  const afterStr = matchAfter ? matchAfter[0] : ''
  const rawWord = beforeStr + afterStr

  const clean = rawWord.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '').trim()

  // Si la palabra tiene menos de 2 letras o está en el diccionario personalizado, ignorar
  if (clean.length < 2 || isCustomWord(clean)) {
    hidePopover()
    return
  }

  const startDocPos = $from.pos - beforeStr.length
  const endDocPos = $from.pos + afterStr.length

  // Si ya estamos mostrando sugerencias para esta misma palabra en esta posición, solo refrescar coordenadas
  if (isVisible.value && activeWord.value === clean && wordRange.value.from === startDocPos) {
    updatePopoverPosition()
    return
  }

  if (checkTimeout) {
    clearTimeout(checkTimeout)
  }

  // Pequeño debounce (180ms) para no saturar mientras el usuario teclea rápido
  checkTimeout = setTimeout(async () => {
    // Verificar que el cursor sigue en la misma posición
    if (!props.editor || props.editor.isDestroyed) return
    const currentSel = props.editor.state.selection
    if (currentSel.from < startDocPos || currentSel.from > endDocPos) {
      hidePopover()
      return
    }

    const res = await checkAndSuggest(clean)
    if (res.isMisspelled && res.suggestions.length > 0) {
      activeWord.value = clean
      suggestions.value = res.suggestions.slice(0, 3)
      wordRange.value = { from: startDocPos, to: endDocPos }
      isVisible.value = true
      updatePopoverPosition()
    } else {
      hidePopover()
    }
  }, 180)
}

function applySuggestion(suggestion: string): void {
  if (!props.editor || !wordRange.value) return

  props.editor
    .chain()
    .focus()
    .insertContentAt(
      {
        from: wordRange.value.from,
        to: wordRange.value.to
      },
      suggestion
    )
    .run()

  hidePopover()
}

async function handleIgnoreOrAddToDictionary(): Promise<void> {
  if (!activeWord.value) return
  const word = activeWord.value
  isAddedFeedback.value = true
  await addCustomWord(word)

  // Notificar al sistema y forzar re-renderizado de ortografía
  window.dispatchEvent(
    new CustomEvent('folio:dictionary-updated', {
      detail: { word, action: 'add' }
    })
  )

  setTimeout(() => {
    hidePopover()
  }, 700)
}

function onKeyDown(e: KeyboardEvent): void {
  if (e.key === 'Escape' && isVisible.value) {
    hidePopover()
  }
}

watch(
  () => props.editor?.state.selection,
  () => {
    inspectCursorWord()
  }
)

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('scroll', updatePopoverPosition, { passive: true, capture: true })
  window.addEventListener('resize', updatePopoverPosition)
})

onBeforeUnmount(() => {
  if (checkTimeout) clearTimeout(checkTimeout)
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('scroll', updatePopoverPosition)
  window.removeEventListener('resize', updatePopoverPosition)
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 translate-y-1 scale-95"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 translate-y-1 scale-95"
    >
      <div
        v-if="isVisible"
        class="fixed z-[99990] flex items-center gap-1.5 p-1.5 rounded-xl neu-surface bg-[var(--bg-surface)] backdrop-blur-md shadow-xl border border-[var(--groove-dark)]/60 text-xs select-none max-w-[95vw]"
        :style="{ top: `${popoverCoords.top}px`, left: `${popoverCoords.left}px` }"
        role="tooltip"
        aria-label="Sugerencias de ortografía"
        @mousedown.prevent
      >
        <!-- Icono identificador -->
        <div
          class="flex items-center gap-1 text-[var(--accent)] font-semibold text-[11px] px-1 py-0.5"
          :title="`Falta de ortografía en: ${activeWord}`"
        >
          <Sparkles :size="13" />
        </div>

        <!-- 3 Sugerencias directas en chiclets -->
        <div class="flex items-center gap-1">
          <button
            v-for="sug in suggestions"
            :key="sug"
            type="button"
            class="px-2 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all bg-[var(--bg-base)] hover:bg-[var(--accent)] hover:text-white text-[var(--text-primary)] shadow-sm active:scale-95"
            :title="`Reemplazar por: ${sug}`"
            @click="applySuggestion(sug)"
          >
            {{ sug }}
          </button>
        </div>

        <div class="neu-groove-v h-4 my-auto mx-0.5"></div>

        <!-- Botón para añadir al diccionario personal / dejar de marcar como falta -->
        <button
          type="button"
          class="px-2 py-1 rounded-lg text-[11px] font-medium cursor-pointer transition-all flex items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-[var(--bg-base)]"
          :class="{ '!text-emerald-600 font-bold': isAddedFeedback }"
          :title="`Dejar de marcar '${activeWord}' como falta de ortografía y añadir al diccionario`"
          @click="handleIgnoreOrAddToDictionary"
        >
          <Check v-if="isAddedFeedback" :size="12" />
          <BookMarked v-else :size="12" />
          <span>{{ isAddedFeedback ? 'Guardado' : 'Añadir' }}</span>
        </button>
      </div>
    </Transition>
  </Teleport>
</template>
