<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { Copy, ClipboardPaste, Scissors, CheckSquare } from 'lucide-vue-next'
import { onClickOutside } from '@vueuse/core'
import { modKey } from '../../utils/platform'

const isOpen = ref(false)
const coords = ref<{ x: number; y: number }>({ x: 0, y: 0 })
const menuRef = ref<HTMLElement | null>(null)
const activeTarget = ref<HTMLElement | null>(null)
const hasTextSelected = ref(false)
const isTargetEditable = ref(false)

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

function onContextMenu(e: MouseEvent): void {
  // Si el clic ocurrió dentro de nuestro propio menú contextual, ignorar
  if (menuRef.value && menuRef.value.contains(e.target as Node)) {
    return
  }

  // Prevenir el menú por defecto y mostrar el menú contextual táctil de Folio
  e.preventDefault()

  activeTarget.value = e.target as HTMLElement | null
  checkSelectionAndEditable()

  // Calcular posición evitando salirse de los límites de la pantalla
  const menuWidth = 205
  const menuHeight = 180
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
        class="fixed z-[99999] neu-surface bg-[var(--bg-surface)] backdrop-blur-md p-1.5 min-w-[190px] shadow-2xl border border-[var(--groove-dark)]/60 rounded-xl space-y-0.5 text-xs text-[var(--text-primary)] select-none"
        :style="{ left: `${coords.x}px`, top: `${coords.y}px` }"
        role="menu"
        aria-label="Menú contextual"
        @click.stop
      >
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

