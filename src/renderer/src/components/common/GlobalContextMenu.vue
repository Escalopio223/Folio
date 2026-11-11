<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import {
  Copy,
  ClipboardPaste,
  Scissors,
  CheckSquare,
  Sparkles,
  BookMarked,
  BookmarkX
} from 'lucide-vue-next'
import { onClickOutside } from '@vueuse/core'
import { modKey } from '../../utils/platform'
import { useSpellcheck } from '../../composables/useSpellcheck'

const { checkAndSuggest, addCustomWord, removeCustomWord, isCustomWord } = useSpellcheck()

const isOpen = ref(false)
const coords = ref<{ x: number; y: number }>({ x: 0, y: 0 })
const menuRef = ref<HTMLElement | null>(null)
const activeTarget = ref<HTMLElement | null>(null)
const hasTextSelected = ref(false)
const isTargetEditable = ref(false)

// Estado para ortografía y sugerencias contextuales
const clickedWord = ref<string>('')
const spellingSuggestions = ref<string[]>([])
const isMisspelled = ref<boolean>(false)
const isWordInCustomDict = ref<boolean>(false)
let targetTextRange: { input?: HTMLInputElement | HTMLTextAreaElement; start: number; end: number } | null =
  null

function checkSelectionAndEditable(): void {
  const target = activeTarget.value
  const isInput = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
  const isEditor = Boolean(target?.closest('.ProseMirror'))
  isTargetEditable.value = isInput || isEditor || Boolean(target?.isContentEditable)

  if (isInput) {
    const input = target as HTMLInputElement | HTMLTextAreaElement
    const start = input.selectionStart || 0
    const end = input.selectionEnd || 0
    hasTextSelected.value = start !== end
  } else {
    const sel = window.getSelection()
    hasTextSelected.value = Boolean(sel && sel.toString().trim().length > 0)
  }
}

async function onContextMenu(e: MouseEvent): Promise<void> {
  // Si el clic ocurrió dentro de nuestro propio menú contextual, ignorar
  if (menuRef.value && menuRef.value.contains(e.target as Node)) {
    return
  }

  // Prevenir el menú por defecto y mostrar el menú contextual táctil de Folio
  e.preventDefault()

  activeTarget.value = e.target as HTMLElement | null
  checkSelectionAndEditable()

  // 1. Extraer palabra bajo el puntero del ratón
  clickedWord.value = ''
  spellingSuggestions.value = []
  isMisspelled.value = false
  isWordInCustomDict.value = false
  targetTextRange = null

  let detectedWord = ''
  const target = activeTarget.value
  const isInput = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement

  if (isInput) {
    const input = target as HTMLInputElement | HTMLTextAreaElement
    const pos = input.selectionStart ?? 0
    const val = input.value || ''
    const matchBefore = val.slice(0, pos).match(/[\p{L}'’\-]+$/u)
    const matchAfter = val.slice(pos).match(/^[\p{L}'’\-]+/u)
    const beforeStr = matchBefore ? matchBefore[0] : ''
    const afterStr = matchAfter ? matchAfter[0] : ''
    detectedWord = beforeStr + afterStr
    if (detectedWord) {
      targetTextRange = {
        input,
        start: pos - beforeStr.length,
        end: pos + afterStr.length
      }
    }
  } else {
    let range: Range | null = null
    if (document.caretRangeFromPoint) {
      range = document.caretRangeFromPoint(e.clientX, e.clientY)
    } else if ((document as any).caretPositionFromPoint) {
      const pos = (document as any).caretPositionFromPoint(e.clientX, e.clientY)
      if (pos) {
        range = document.createRange()
        range.setStart(pos.offsetNode, pos.offset)
      }
    }

    if (range && range.startContainer.nodeType === Node.TEXT_NODE) {
      const text = range.startContainer.textContent || ''
      const offset = range.startOffset
      const matchBefore = text.slice(0, offset).match(/[\p{L}'’\-]+$/u)
      const matchAfter = text.slice(offset).match(/^[\p{L}'’\-]+/u)
      const beforeStr = matchBefore ? matchBefore[0] : ''
      const afterStr = matchAfter ? matchAfter[0] : ''
      detectedWord = beforeStr + afterStr
    }
  }

  // Si no se detectó por caret, verificar selección activa
  if (!detectedWord) {
    const sel = window.getSelection()
    if (sel && sel.toString().trim().length > 0 && !sel.toString().trim().includes(' ')) {
      detectedWord = sel.toString().trim()
    }
  }

  detectedWord = detectedWord.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '').trim()

  if (detectedWord.length >= 2) {
    clickedWord.value = detectedWord
    isWordInCustomDict.value = isCustomWord(detectedWord)

    // Consultar el corrector ortográfico para comprobar si es una falta y obtener sugerencias
    try {
      const res = await checkAndSuggest(detectedWord)
      if (clickedWord.value === detectedWord) {
        isMisspelled.value = res.isMisspelled
        spellingSuggestions.value = res.suggestions.slice(0, 3)
      }
    } catch {
      // Ignorar error de sugerencias
    }
  }

  // Calcular posición evitando salirse de los límites de la pantalla
  const menuWidth = 240
  const menuHeight = clickedWord.value ? 280 : 190
  const padding = 12

  let x = e.clientX
  let y = e.clientY

  if (x + menuWidth > window.innerWidth - padding) {
    x = Math.max(padding, window.innerWidth - menuWidth - padding)
  }

  if (y + menuHeight > window.innerHeight - padding) {
    y = Math.max(padding, window.innerHeight - menuHeight - padding)
  }

  coords.value = { x, y }
  isOpen.value = true
}

function closeMenu(): void {
  isOpen.value = false
}

onClickOutside(menuRef, () => {
  if (isOpen.value) closeMenu()
})

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape' && isOpen.value) {
    closeMenu()
  }
}

function handleReplaceWithSuggestion(suggestion: string): void {
  closeMenu()
  const target = activeTarget.value
  const isInput = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement

  if (isInput && targetTextRange?.input) {
    const input = targetTextRange.input
    input.focus()
    input.setRangeText(suggestion, targetTextRange.start, targetTextRange.end, 'end')
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
  } else {
    window.dispatchEvent(
      new CustomEvent('folio:replace-misspelling', {
        detail: {
          word: clickedWord.value,
          replacement: suggestion
        }
      })
    )
  }
}

async function handleAddToCustomDictionary(word: string): Promise<void> {
  closeMenu()
  await addCustomWord(word)
  window.dispatchEvent(
    new CustomEvent('folio:dictionary-updated', {
      detail: { word, action: 'add' }
    })
  )
}

async function handleRemoveFromCustomDictionary(word: string): Promise<void> {
  closeMenu()
  await removeCustomWord(word)
  window.dispatchEvent(
    new CustomEvent('folio:dictionary-updated', {
      detail: { word, action: 'remove' }
    })
  )
}

async function handleCopy(): Promise<void> {
  const target = activeTarget.value
  const isInput = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement

  try {
    if (isInput) {
      const input = target as HTMLInputElement | HTMLTextAreaElement
      const start = input.selectionStart || 0
      const end = input.selectionEnd || 0
      const text = input.value.substring(start, end)
      if (text) {
        await navigator.clipboard.writeText(text)
      }
    } else {
      const sel = window.getSelection()
      const text = sel ? sel.toString() : ''
      if (text) {
        await navigator.clipboard.writeText(text)
      }
      document.execCommand('copy')
    }
  } catch {
    document.execCommand('copy')
  }
  closeMenu()
}

async function handleCut(): Promise<void> {
  const target = activeTarget.value
  const isInput = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement

  await handleCopy()
  if (isInput) {
    const input = target as HTMLInputElement | HTMLTextAreaElement
    const start = input.selectionStart || 0
    const end = input.selectionEnd || 0
    input.setRangeText('', start, end, 'end')
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
  } else {
    document.execCommand('delete')
  }
  closeMenu()
}

async function handlePaste(): Promise<void> {
  const target = activeTarget.value
  const isInput = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
  const isEditor = Boolean(target?.closest('.ProseMirror'))

  closeMenu()

  try {
    let clipboardText = ''
    if (navigator.clipboard && navigator.clipboard.readText) {
      clipboardText = await navigator.clipboard.readText()
    }
    if (!clipboardText) return

    if (isInput) {
      const input = target as HTMLInputElement | HTMLTextAreaElement
      input.focus()
      const start = input.selectionStart || 0
      const end = input.selectionEnd || 0
      input.setRangeText(clipboardText, start, end, 'end')
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new Event('change', { bubbles: true }))
    } else if (isEditor) {
      const editorEl = target?.closest('.ProseMirror') as HTMLElement | null
      if (editorEl) {
        editorEl.focus()
        document.execCommand('insertText', false, clipboardText)
      }
    } else if (target?.isContentEditable) {
      target.focus()
      document.execCommand('insertText', false, clipboardText)
    }
  } catch (err) {
    console.warn('[ContextMenu] Paste failed:', err)
  }
}

function handleSelectAll(): void {
  const target = activeTarget.value
  const isInput = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
  const isEditor = Boolean(target?.closest('.ProseMirror'))

  if (isInput) {
    const input = target as HTMLInputElement | HTMLTextAreaElement
    input.select()
  } else if (isEditor) {
    const editorEl = target?.closest('.ProseMirror') as HTMLElement | null
    if (editorEl) {
      editorEl.focus()
      const range = document.createRange()
      range.selectNodeContents(editorEl)
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(range)
    }
  } else {
    document.execCommand('selectAll')
  }
  closeMenu()
}

onMounted(() => {
  window.addEventListener('contextmenu', onContextMenu)
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('scroll', closeMenu, { capture: true, passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('contextmenu', onContextMenu)
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('scroll', closeMenu, { capture: true })
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-75 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="isOpen"
        ref="menuRef"
        class="fixed z-[99999] neu-surface bg-[var(--bg-surface)] backdrop-blur-md p-1.5 min-w-[210px] max-w-[280px] shadow-2xl border border-[var(--groove-dark)]/60 rounded-xl space-y-0.5 text-xs text-[var(--text-primary)] select-none"
        :style="{ left: `${coords.x}px`, top: `${coords.y}px` }"
        role="menu"
        aria-label="Menú contextual"
        @click.stop
      >
        <!-- SECCIÓN DE CORRECCIÓN ORTOGRÁFICA (Hasta 3 sugerencias) -->
        <div v-if="spellingSuggestions.length > 0" class="space-y-0.5">
          <div
            class="px-2.5 py-1 text-[10px] font-semibold text-[var(--accent)] tracking-wider uppercase flex items-center gap-1.5"
          >
            <Sparkles :size="11" />
            <span class="truncate">Sugerencias para "{{ clickedWord }}"</span>
          </div>
          <button
            v-for="sug in spellingSuggestions"
            :key="sug"
            type="button"
            class="w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors cursor-pointer hover:bg-[var(--accent)]/15 text-[var(--text-primary)] hover:text-[var(--accent)] font-semibold text-left"
            @click="handleReplaceWithSuggestion(sug)"
          >
            <span>{{ sug }}</span>
            <span class="text-[10px] text-[var(--text-muted)] font-normal">Corregir</span>
          </button>
          <div class="neu-groove-h my-1"></div>
        </div>

        <!-- OPCIÓN PRINCIPAL SOLICITADA: Dejar de marcar como falta de ortografía -->
        <button
          v-if="clickedWord && !isWordInCustomDict"
          type="button"
          class="w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors cursor-pointer hover:bg-[var(--bg-base)] text-[var(--text-primary)] hover:text-[var(--accent)]"
          :title="`Añade '${clickedWord}' al diccionario para que deje de marcarse como error`"
          @click="handleAddToCustomDictionary(clickedWord)"
        >
          <div class="flex items-center gap-2 min-w-0">
            <BookMarked :size="13" class="text-[var(--accent)] shrink-0" />
            <span class="font-medium truncate">Dejar de marcar "{{ clickedWord }}" como falta</span>
          </div>
        </button>

        <button
          v-else-if="clickedWord && isWordInCustomDict"
          type="button"
          class="w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors cursor-pointer hover:bg-[var(--bg-base)] text-[var(--text-secondary)] hover:text-red-500"
          :title="`Quitar '${clickedWord}' del diccionario personal`"
          @click="handleRemoveFromCustomDictionary(clickedWord)"
        >
          <div class="flex items-center gap-2 min-w-0">
            <BookmarkX :size="13" class="text-red-400 shrink-0" />
            <span class="font-medium truncate">Quitar "{{ clickedWord }}" del diccionario</span>
          </div>
        </button>

        <div v-if="clickedWord" class="neu-groove-h my-1"></div>

        <!-- Cortar -->
        <button
          v-if="isTargetEditable"
          type="button"
          class="w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--bg-base)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          :disabled="!hasTextSelected"
          @click="handleCut"
        >
          <div class="flex items-center gap-2">
            <Scissors :size="13" class="text-[var(--accent)]" />
            <span class="font-medium">Cortar</span>
          </div>
          <span class="text-[10px] font-mono text-[var(--text-muted)]">{{ modKey }}+X</span>
        </button>

        <!-- Copiar -->
        <button
          type="button"
          class="w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--bg-base)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          :disabled="!hasTextSelected"
          @click="handleCopy"
        >
          <div class="flex items-center gap-2">
            <Copy :size="13" class="text-[var(--accent)]" />
            <span class="font-medium">Copiar</span>
          </div>
          <span class="text-[10px] font-mono text-[var(--text-muted)]">{{ modKey }}+C</span>
        </button>

        <!-- Pegar -->
        <button
          type="button"
          class="w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--bg-base)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          :disabled="!isTargetEditable"
          @click="handlePaste"
        >
          <div class="flex items-center gap-2">
            <ClipboardPaste :size="13" class="text-[var(--accent)]" />
            <span class="font-medium">Pegar</span>
          </div>
          <span class="text-[10px] font-mono text-[var(--text-muted)]">{{ modKey }}+V</span>
        </button>

        <div class="neu-groove-h my-1"></div>

        <!-- Seleccionar todo -->
        <button
          type="button"
          class="w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors cursor-pointer hover:bg-[var(--bg-base)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          @click="handleSelectAll"
        >
          <div class="flex items-center gap-2">
            <CheckSquare :size="13" class="text-[var(--text-muted)]" />
            <span class="font-medium">Seleccionar todo</span>
          </div>
          <span class="text-[10px] font-mono text-[var(--text-muted)]">{{ modKey }}+A</span>
        </button>
      </div>
    </Transition>
  </Teleport>
</template>
