import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUiStore = defineStore('ui', () => {
  const isSidebarOpen = ref(true)
  const isSplashLoading = ref(true)

  // Modos de Escritura
  const isTypewriterMode = ref(false)
  const isFocusMode = ref(false)

  function toggleSidebar(): void {
    isSidebarOpen.value = !isSidebarOpen.value
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
    isSidebarOpen,
    isSplashLoading,
    isTypewriterMode,
    isFocusMode,
    toggleSidebar,
    setSplashLoading,
    toggleTypewriterMode,
    toggleFocusMode
  }
})
