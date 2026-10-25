import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUiStore = defineStore('ui', () => {
  const isSidebarOpen = ref(true)
  const isSplashLoading = ref(true)

  function toggleSidebar(): void {
    isSidebarOpen.value = !isSidebarOpen.value
  }

  function setSplashLoading(val: boolean): void {
    isSplashLoading.value = val
  }

  return {
    isSidebarOpen,
    isSplashLoading,
    toggleSidebar,
    setSplashLoading
  }
})
