import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Folio, LoreItem } from '@shared/types'
import { useFolioStore } from './folioStore'
import { useLoreStore } from './loreStore'

export const useTrashStore = defineStore('trash', () => {
  const isModalOpen = ref(false)

  const trashFolios = ref<Folio[]>([])
  const trashLore = ref<LoreItem[]>([])

  const selectedFolioId = ref<string | null>(null)
  const isLoading = ref(false)
  const isActionLoading = ref(false)

  const selectedFolio = computed<Folio | null>(() => {
    if (!selectedFolioId.value) return null
    return trashFolios.value.find((f) => f.id === selectedFolioId.value) || null
  })

  const totalCount = computed<number>(() => {
    return trashFolios.value.length + trashLore.value.length
  })

  // Count words helper
  function countWords(text: string): number {
    const cleanText = (text || '').replace(/<[^>]*>/g, ' ').trim()
    if (!cleanText) return 0
    return cleanText.split(/\s+/).length
  }

  // Extract snippet helper
  function getSnippet(content: string, maxLength = 160): string {
    const cleanText = (content || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    if (!cleanText) return 'Sin contenido de texto'
    return cleanText.length > maxLength ? cleanText.slice(0, maxLength) + '…' : cleanText
  }

  async function fetchTrash(projectId?: string | null): Promise<void> {
    isLoading.value = true
    try {
      const [folios, lore] = await Promise.all([
        window.api.folio.getTrash(projectId || undefined),
        window.api.lore.getTrash(projectId || undefined)
      ])
      trashFolios.value = folios
      trashLore.value = lore

      if (folios.length > 0) {
        if (!selectedFolioId.value || !folios.some((f) => f.id === selectedFolioId.value)) {
          selectedFolioId.value = folios[0].id
        }
      } else {
        selectedFolioId.value = null
      }
    } catch (err) {
      console.error('[TrashStore] fetchTrash failed:', err)
    } finally {
      isLoading.value = false
    }
  }

  function openModal(projectId?: string | null): void {
    isModalOpen.value = true
    fetchTrash(projectId)
  }

  function closeModal(): void {
    isModalOpen.value = false
  }

  function selectFolio(id: string): void {
    selectedFolioId.value = id
  }

  // Mover elemento a la papelera
  async function moveToTrash(id: string, type: 'folio' | 'lore'): Promise<boolean> {
    isActionLoading.value = true
    try {
      if (type === 'folio') {
        const folioStore = useFolioStore()
        const updated = await folioStore.updateFolio({ id, isArchived: true })
        if (updated) {
          if (!trashFolios.value.some((f) => f.id === id)) {
            trashFolios.value.unshift(updated)
          }
          if (!selectedFolioId.value) {
            selectedFolioId.value = updated.id
          }
          return true
        }
      } else {
        const loreStore = useLoreStore()
        const updated = await loreStore.updateLore({ id, isArchived: true })
        if (updated) {
          if (!trashLore.value.some((l) => l.id === id)) {
            trashLore.value.unshift(updated)
          }
          return true
        }
      }
      return false
    } catch (err) {
      console.error('[TrashStore] moveToTrash failed:', err)
      return false
    } finally {
      isActionLoading.value = false
    }
  }

  // Restaurar elemento desde papelera al manuscrito o wiki activa
  async function restoreItem(id: string, type: 'folio' | 'lore'): Promise<boolean> {
    isActionLoading.value = true
    try {
      if (type === 'folio') {
        const folioStore = useFolioStore()
        const restored = await window.api.folio.restore(id)
        if (restored) {
          trashFolios.value = trashFolios.value.filter((f) => f.id !== id)
          if (!folioStore.folios.some((f) => f.id === restored.id)) {
            folioStore.folios.push(restored)
          }
          folioStore.selectFolio(restored.id)

          if (selectedFolioId.value === id) {
            selectedFolioId.value = trashFolios.value[0]?.id || null
          }
          return true
        }
      } else {
        const loreStore = useLoreStore()
        const ok = await loreStore.restoreFromTrash(id)
        if (ok) {
          trashLore.value = trashLore.value.filter((l) => l.id !== id)
        }
        return ok
      }
      return false
    } catch (err) {
      console.error('[TrashStore] restoreItem failed:', err)
      return false
    } finally {
      isActionLoading.value = false
    }
  }

  // Purgar permanentemente un elemento individual
  async function deletePermanently(id: string, type: 'folio' | 'lore'): Promise<boolean> {
    isActionLoading.value = true
    try {
      if (type === 'folio') {
        const folioStore = useFolioStore()
        const ok = await folioStore.deletePermanently(id)
        if (ok) {
          trashFolios.value = trashFolios.value.filter((f) => f.id !== id)
          if (selectedFolioId.value === id) {
            selectedFolioId.value = trashFolios.value[0]?.id || null
          }
        }
        return ok
      } else {
        const loreStore = useLoreStore()
        const ok = await loreStore.deletePermanently(id)
        if (ok) {
          trashLore.value = trashLore.value.filter((l) => l.id !== id)
        }
        return ok
      }
    } catch (err) {
      console.error('[TrashStore] deletePermanently failed:', err)
      return false
    } finally {
      isActionLoading.value = false
    }
  }

  // Vaciar Papelera: Purga irreversible en SQLite de todos los elementos archivados en papelera
  async function emptyTrash(projectId: string): Promise<{ purgedFolios: number; purgedLore: number }> {
    isActionLoading.value = true
    try {
      const res = await window.api.folio.emptyTrash(projectId)
      trashFolios.value = []
      trashLore.value = []
      selectedFolioId.value = null

      // Sincronizar stores activos
      const folioStore = useFolioStore()
      folioStore.trashedFolios = []

      const loreStore = useLoreStore()
      loreStore.trashedItems = []

      return res
    } catch (err) {
      console.error('[TrashStore] emptyTrash failed:', err)
      return { purgedFolios: 0, purgedLore: 0 }
    } finally {
      isActionLoading.value = false
    }
  }

  return {
    isModalOpen,
    trashFolios,
    trashLore,
    selectedFolioId,
    selectedFolio,
    totalCount,
    isLoading,
    isActionLoading,
    countWords,
    getSnippet,
    openModal,
    closeModal,
    selectFolio,
    fetchTrash,
    moveToTrash,
    restoreItem,
    deletePermanently,
    emptyTrash
  }
})
