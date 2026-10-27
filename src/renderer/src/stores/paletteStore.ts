import { defineStore } from 'pinia'
import { ref } from 'vue'

export const usePaletteStore = defineStore('palette', () => {
  const isOpen = ref(false)
  const query = ref('')
  const selectedIndex = ref(0)
  const previousActiveElement = ref<HTMLElement | null>(null)

  function open(): void {
    if (isOpen.value) return
    previousActiveElement.value = document.activeElement as HTMLElement | null
    query.value = ''
    selectedIndex.value = 0
    isOpen.value = true
  }

  function close(): void {
    if (!isOpen.value) return
    isOpen.value = false

    // Devolver el foco al contexto previo (si se estaba editando en TipTap, reenfocar el editor)
    if (previousActiveElement.value && typeof previousActiveElement.value.focus === 'function') {
      setTimeout(() => {
        previousActiveElement.value?.focus()
      }, 30)
    } else {
      // Reenfoque de respaldo al editor TipTap si está presente
      const editorEl = document.querySelector('.ProseMirror') as HTMLElement | null
      if (editorEl) {
        setTimeout(() => {
          editorEl.focus()
        }, 30)
      }
    }
  }

  function toggle(): void {
    if (isOpen.value) {
      close()
    } else {
      open()
    }
  }

  function setQuery(q: string): void {
    query.value = q
    selectedIndex.value = 0
  }

  function setSelectedIndex(index: number): void {
    selectedIndex.value = index
  }

  function selectNext(total: number): void {
    if (total <= 0) return
    selectedIndex.value = (selectedIndex.value + 1) % total
  }

  function selectPrev(total: number): void {
    if (total <= 0) return
    selectedIndex.value = (selectedIndex.value - 1 + total) % total
  }

  return {
    isOpen,
    query,
    selectedIndex,
    open,
    close,
    toggle,
    setQuery,
    setSelectedIndex,
    selectNext,
    selectPrev
  }
})
