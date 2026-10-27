import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Folio, LoreItem } from '@shared/types'
import { useFolioStore } from './folioStore'
import { useLoreStore } from './loreStore'

export const useTrashStore = defineStore('trash', () => {
  const isModalOpen = ref(false)
  const activeTab = ref<'graveyard' | 'trash'>('graveyard')

  const graveyardFolios = ref<Folio[]>([])
  const trashFolios = ref<Folio[]>([])
  const trashLore = ref<LoreItem[]>([])

  const selectedGraveyardFolioId = ref<string | null>(null)
  const isLoading = ref(false)
  const isActionLoading = ref(false)

  const selectedGraveyardFolio = computed<Folio | null>(() => {
    if (!selectedGraveyardFolioId.value) return null
    return graveyardFolios.value.find((f) => f.id === selectedGraveyardFolioId.value) || null
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

  async function fetchGraveyard(projectId?: string | null): Promise<void> {
    try {
      const items = await window.api.folio.getGraveyard(projectId || undefined)
      graveyardFolios.value = items
      if (items.length > 0) {
        if (!selectedGraveyardFolioId.value || !items.some((f) => f.id === selectedGraveyardFolioId.value)) {
          selectedGraveyardFolioId.value = items[0].id
        }
      } else {
        selectedGraveyardFolioId.value = null
      }
    } catch (err) {
      console.error('[TrashStore] fetchGraveyard failed:', err)
    }
  }

  async function fetchTrash(projectId?: string | null): Promise<void> {
    try {
      const [folios, lore] = await Promise.all([
        window.api.folio.getTrash(projectId || undefined),
        window.api.lore.getTrash(projectId || undefined)
      ])
      trashFolios.value = folios
      trashLore.value = lore
    } catch (err) {
      console.error('[TrashStore] fetchTrash failed:', err)
    }
  }

  async function fetchAll(projectId?: string | null): Promise<void> {
    isLoading.value = true
    try {
      await Promise.all([
        fetchGraveyard(projectId),
        fetchTrash(projectId)
      ])
    } finally {
      isLoading.value = false
    }
  }

  function openModal(tab: 'graveyard' | 'trash' = 'graveyard', projectId?: string | null): void {
    activeTab.value = tab
    isModalOpen.value = true
    fetchAll(projectId)
  }

  function closeModal(): void {
    isModalOpen.value = false
  }

  function selectGraveyardFolio(id: string): void {
    selectedGraveyardFolioId.value = id
  }

  // Resucitar escena/capítulo
  async function resurrectFolio(id: string): Promise<boolean> {
    isActionLoading.value = true
    try {
      const folioStore = useFolioStore()
      const restored = await window.api.folio.restore(id)
      if (restored) {
        graveyardFolios.value = graveyardFolios.value.filter((f) => f.id !== id)
        trashFolios.value = trashFolios.value.filter((f) => f.id !== id)

        // Agregar a folios activos si no está
        if (!folioStore.folios.some((f) => f.id === restored.id)) {
          folioStore.folios.push(restored)
        }
        folioStore.selectFolio(restored.id)

        if (selectedGraveyardFolioId.value === id) {
          selectedGraveyardFolioId.value = graveyardFolios.value[0]?.id || null
        }
        return true
      }
      return false
    } catch (err) {
      console.error('[TrashStore] resurrectFolio failed:', err)
      return false
    } finally {
      isActionLoading.value = false
    }
  }

  // Mover folio al cementerio (Descarte narrativo)
  async function moveToGraveyard(id: string): Promise<boolean> {
    isActionLoading.value = true
    try {
      const folioStore = useFolioStore()
      const updated = await folioStore.updateFolio({ id, isArchived: true, isGraveyard: true })
      if (updated) {
        trashFolios.value = trashFolios.value.filter((f) => f.id !== id)
        if (!graveyardFolios.value.some((f) => f.id === id)) {
          graveyardFolios.value.unshift(updated)
        }
        return true
      }
      return false
    } catch (err) {
      console.error('[TrashStore] moveToGraveyard failed:', err)
      return false
    } finally {
      isActionLoading.value = false
    }
  }

  // Mover elemento a papelera (descarte definitivo previsto)
  async function moveToTrash(id: string, type: 'folio' | 'lore'): Promise<boolean> {
    isActionLoading.value = true
    try {
      if (type === 'folio') {
        const folioStore = useFolioStore()
        const updated = await folioStore.updateFolio({ id, isArchived: true, isGraveyard: false })
        if (updated) {
          graveyardFolios.value = graveyardFolios.value.filter((f) => f.id !== id)
          if (!trashFolios.value.some((f) => f.id === id)) {
            trashFolios.value.unshift(updated)
          }
          if (selectedGraveyardFolioId.value === id) {
            selectedGraveyardFolioId.value = graveyardFolios.value[0]?.id || null
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

  // Restaurar elemento desde papelera
  async function restoreItem(id: string, type: 'folio' | 'lore'): Promise<boolean> {
    isActionLoading.value = true
    try {
      if (type === 'folio') {
        return await resurrectFolio(id)
      } else {
        const loreStore = useLoreStore()
        const ok = await loreStore.restoreFromTrash(id)
        if (ok) {
          trashLore.value = trashLore.value.filter((l) => l.id !== id)
        }
        return ok
      }
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
          graveyardFolios.value = graveyardFolios.value.filter((f) => f.id !== id)
          if (selectedGraveyardFolioId.value === id) {
            selectedGraveyardFolioId.value = graveyardFolios.value[0]?.id || null
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

  // Vaciar Papelera: Purga irreversible en SQLite de elementos archivados en papelera
  // NUNCA toca el cementerio de capítulos
  async function emptyTrash(projectId: string): Promise<{ purgedFolios: number; purgedLore: number }> {
    isActionLoading.value = true
    try {
      const res = await window.api.folio.emptyTrash(projectId)
      trashFolios.value = []
      trashLore.value = []

      // Sincronizar stores
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
    activeTab,
    graveyardFolios,
    trashFolios,
    trashLore,
    selectedGraveyardFolioId,
    selectedGraveyardFolio,
    isLoading,
    isActionLoading,
    countWords,
    getSnippet,
    openModal,
    closeModal,
    selectGraveyardFolio,
    fetchAll,
    fetchGraveyard,
    fetchTrash,
    resurrectFolio,
    moveToGraveyard,
    moveToTrash,
    restoreItem,
    deletePermanently,
    emptyTrash
  }
})
