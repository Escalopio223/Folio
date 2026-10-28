import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const DEFAULT_LEFT_WIDTH = 260
export const MIN_LEFT_WIDTH = 200
export const MAX_LEFT_WIDTH = 480

export const DEFAULT_RIGHT_WIDTH = 340
export const MIN_RIGHT_WIDTH = 260
export const MAX_RIGHT_WIDTH = 640

export const useUiStore = defineStore('ui', () => {
  // Panel Izquierdo: Árbol del Manuscrito
  const savedLeft = localStorage.getItem('folio:left_sidebar')
  const isLeftSidebarOpen = ref(savedLeft !== 'false')

  const savedLeftWidth = Number(localStorage.getItem('folio:left_sidebar_width'))
  const leftSidebarWidth = ref(
    savedLeftWidth && !isNaN(savedLeftWidth) && savedLeftWidth >= MIN_LEFT_WIDTH
      ? Math.min(MAX_LEFT_WIDTH, savedLeftWidth)
      : DEFAULT_LEFT_WIDTH
  )

  // Panel Derecho: Wiki / Lore Inspector
  const savedRight = localStorage.getItem('folio:right_sidebar')
  const isRightSidebarOpen = ref(savedRight !== 'false')

  const savedRightWidth = Number(localStorage.getItem('folio:right_sidebar_width'))
  const rightSidebarWidth = ref(
    savedRightWidth && !isNaN(savedRightWidth) && savedRightWidth >= MIN_RIGHT_WIDTH
      ? Math.min(MAX_RIGHT_WIDTH, savedRightWidth)
      : DEFAULT_RIGHT_WIDTH
  )

  // Modo Oscuro / Espresso
  const isDark = ref(false)

  function initTheme(): void {
    const saved = localStorage.getItem('folio:theme')
    if (saved === 'dark') {
      isDark.value = true
      document.documentElement.classList.add('dark')
    } else {
      isDark.value = false
      document.documentElement.classList.remove('dark')
      if (!saved) {
        localStorage.setItem('folio:theme', 'light')
      }
    }
  }

  function toggleTheme(): void {
    isDark.value = !isDark.value
    if (isDark.value) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('folio:theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('folio:theme', 'light')
    }
  }

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


  function toggleFocusMode(): void {
    isFocusMode.value = !isFocusMode.value
  }

  // Pestaña activa en el Inspector Derecho: 'lore' (Entidades) | 'rules' (Reglas del Mundo)
  const activeWikiTab = ref<'lore' | 'rules'>('lore')

  function setActiveWikiTab(tab: 'lore' | 'rules'): void {
    activeWikiTab.value = tab
  }

  function openWikiRules(): void {
    activeWikiTab.value = 'rules'
    setRightSidebar(true)
  }

  function openWikiLore(): void {
    activeWikiTab.value = 'lore'
    setRightSidebar(true)
  }

  function setLeftSidebarWidth(width: number): void {
    const clamped = Math.max(MIN_LEFT_WIDTH, Math.min(MAX_LEFT_WIDTH, Math.round(width)))
    leftSidebarWidth.value = clamped
    localStorage.setItem('folio:left_sidebar_width', String(clamped))
  }

  function setRightSidebarWidth(width: number): void {
    const clamped = Math.max(MIN_RIGHT_WIDTH, Math.min(MAX_RIGHT_WIDTH, Math.round(width)))
    rightSidebarWidth.value = clamped
    localStorage.setItem('folio:right_sidebar_width', String(clamped))
  }

  function resetLeftSidebarWidth(): void {
    setLeftSidebarWidth(DEFAULT_LEFT_WIDTH)
  }

  function resetRightSidebarWidth(): void {
    setRightSidebarWidth(DEFAULT_RIGHT_WIDTH)
  }

  function resetSidebarWidths(): void {
    resetLeftSidebarWidth()
    resetRightSidebarWidth()
  }

  return {
    DEFAULT_LEFT_WIDTH,
    MIN_LEFT_WIDTH,
    MAX_LEFT_WIDTH,
    DEFAULT_RIGHT_WIDTH,
    MIN_RIGHT_WIDTH,
    MAX_RIGHT_WIDTH,
    leftSidebarWidth,
    rightSidebarWidth,
    setLeftSidebarWidth,
    setRightSidebarWidth,
    resetLeftSidebarWidth,
    resetRightSidebarWidth,
    resetSidebarWidths,
    isLeftSidebarOpen,
    isRightSidebarOpen,
    isSidebarOpen,
    isWikiOpen,
    activeWikiTab,
    isSplashLoading,
    isFocusMode,
    isDark,
    initTheme,
    toggleTheme,
    toggleLeftSidebar,
    setLeftSidebar,
    toggleSidebar,
    toggleRightSidebar,
    setRightSidebar,
    toggleWiki,
    setActiveWikiTab,
    openWikiRules,
    openWikiLore,
    setSplashLoading,
    toggleFocusMode
  }
})
