import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUiStore = defineStore('ui', () => {
  // Panel Izquierdo: Árbol del Manuscrito
  const savedLeft = localStorage.getItem('folio:left_sidebar')
  const isLeftSidebarOpen = ref(savedLeft !== 'false')

  // Panel Derecho: Wiki / Lore Inspector
  const savedRight = localStorage.getItem('folio:right_sidebar')
  const isRightSidebarOpen = ref(savedRight !== 'false')

  // Compatibilidad hacia atrás con referencias existentes a isSidebarOpen
  const isSidebarOpen = computed({
    get: () => isLeftSidebarOpen.value,
    set: (val: boolean) => setLeftSidebar(val)
  })

  const isWikiOpen = computed({
    get: () => isRightSidebarOpen.value,
    set: (val: boolean) => setRightSidebar(val)
  })

  const isSplashLoading = ref(true)

  // Modos de Escritura
  const isTypewriterMode = ref(false)
  const isFocusMode = ref(false)

  function toggleLeftSidebar(): void {
    isLeftSidebarOpen.value = !isLeftSidebarOpen.value
    localStorage.setItem('folio:left_sidebar', String(isLeftSidebarOpen.value))
  }

  function setLeftSidebar(val: boolean): void {
    isLeftSidebarOpen.value = val
    localStorage.setItem('folio:left_sidebar', String(val))
  }

  function toggleSidebar(): void {
    toggleLeftSidebar()
  }

  function toggleRightSidebar(): void {
    isRightSidebarOpen.value = !isRightSidebarOpen.value
    localStorage.setItem('folio:right_sidebar', String(isRightSidebarOpen.value))
  }

  function setRightSidebar(val: boolean): void {
    isRightSidebarOpen.value = val
    localStorage.setItem('folio:right_sidebar', String(val))
  }

  function toggleWiki(): void {
    toggleRightSidebar()
  }

  function setSplashLoading(val: boolean): void {
    isSplashLoading.value = val
  }

  function toggleTypewriterMode(): void {
    isTypewriterMode.value = !isTypewriterMode.value
  }

  function toggleFocusMode(): void {
    isFocusMode.value = !isFocusMode.value
  }

  return {
    isLeftSidebarOpen,
    isRightSidebarOpen,
    isSidebarOpen,
    isWikiOpen,
    isSplashLoading,
    isTypewriterMode,
    isFocusMode,
    toggleLeftSidebar,
    setLeftSidebar,
    toggleSidebar,
    toggleRightSidebar,
    setRightSidebar,
    toggleWiki,
    setSplashLoading,
    toggleTypewriterMode,
    toggleFocusMode
  }
})
