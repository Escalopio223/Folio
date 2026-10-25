import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { LoreItem, CreateLoreInput, UpdateLoreInput } from '@shared/types'

export const useLoreStore = defineStore('lore', () => {
  const items = ref<LoreItem[]>([])
  const trashedItems = ref<LoreItem[]>([])
  const activeLoreId = ref<string | null>(null)
  const selectedCategory = ref<string>('todos')
  const isLoading = ref(false)

  const activeLore = computed<LoreItem | null>(() => {
    if (!activeLoreId.value) return null
    return items.value.find((i) => i.id === activeLoreId.value) || null
  })

  // Dynamic categories list extracted from items + standard defaults
  const categories = computed<string[]>(() => {
    const defaults = ['personaje', 'lugar', 'objeto', 'idea', 'pensamiento']
    const existing = items.value.map((i) => i.category.toLowerCase().trim())
    const combined = Array.from(new Set([...defaults, ...existing]))
    return combined.sort()
  })

  const filteredItems = computed<LoreItem[]>(() => {
    if (selectedCategory.value === 'todos') {
      return items.value
    }
    return items.value.filter((i) => i.category.toLowerCase() === selectedCategory.value.toLowerCase())
  })

  function selectLore(id: string | null): void {
    activeLoreId.value = id
  }

  async function fetchLore(projectId?: string): Promise<void> {
    try {
      isLoading.value = true
      const [active, trashed] = await Promise.all([
        window.api.lore.getAll(projectId),
        window.api.lore.getTrash(projectId)
      ])
      items.value = active
      trashedItems.value = trashed

      if (activeLoreId.value && !active.some((i) => i.id === activeLoreId.value)) {
        activeLoreId.value = active[0]?.id || null
      }
    } catch (err) {
      console.error('[Lore Store] fetchLore failed:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function createLore(input: CreateLoreInput): Promise<LoreItem | null> {
    try {
      isLoading.value = true
      const created = await window.api.lore.create(input)
      items.value.unshift(created)
      selectLore(created.id)
      return created
    } catch (err) {
      console.error('[Lore Store] createLore failed:', err)
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function updateLore(input: UpdateLoreInput): Promise<LoreItem | null> {
    try {
      const updated = await window.api.lore.update(input)
      const index = items.value.findIndex((i) => i.id === updated.id)
      if (index !== -1) {
        if (updated.isArchived) {
          items.value.splice(index, 1)
          trashedItems.value.unshift(updated)
          if (activeLoreId.value === updated.id) {
            activeLoreId.value = items.value[0]?.id || null
          }
        } else {
          items.value[index] = updated
        }
      } else {
        const trashIndex = trashedItems.value.findIndex((i) => i.id === updated.id)
        if (trashIndex !== -1) {
          if (!updated.isArchived) {
            trashedItems.value.splice(trashIndex, 1)
            items.value.unshift(updated)
            selectLore(updated.id)
          } else {
            trashedItems.value[trashIndex] = updated
          }
        }
      }
      return updated
    } catch (err) {
      console.error('[Lore Store] updateLore failed:', err)
      return null
    }
  }

  async function moveToTrash(id: string): Promise<boolean> {
    const res = await updateLore({ id, isArchived: true })
    return Boolean(res)
  }

  async function restoreFromTrash(id: string): Promise<boolean> {
    const res = await updateLore({ id, isArchived: false })
    return Boolean(res)
  }

  async function deletePermanently(id: string): Promise<boolean> {
    try {
      const ok = await window.api.lore.deletePermanent(id)
      if (ok) {
        trashedItems.value = trashedItems.value.filter((i) => i.id !== id)
        items.value = items.value.filter((i) => i.id !== id)
        if (activeLoreId.value === id) {
          activeLoreId.value = items.value[0]?.id || null
        }
      }
      return ok
    } catch (err) {
      console.error('[Lore Store] deletePermanently failed:', err)
      return false
    }
  }

  return {
    items,
    trashedItems,
    activeLoreId,
    activeLore,
    selectedCategory,
    categories,
    filteredItems,
    isLoading,
    selectLore,
    fetchLore,
    createLore,
    updateLore,
    moveToTrash,
    restoreFromTrash,
    deletePermanently
  }
})
