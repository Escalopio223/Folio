import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { DbStatus, Item } from '@shared/types'

export const useDbStore = defineStore('db', () => {
  const status = ref<DbStatus | null>(null)
  const items = ref<Item[]>([])
  const loading = ref(false)
  const inserting = ref(false)
  const error = ref<string | null>(null)

  async function fetchStatus(): Promise<void> {
    try {
      loading.value = true
      error.value = null
      status.value = await window.api.getDbStatus()
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Error desconocido al conectar con SQLite'
      console.error('[Renderer Store] getDbStatus failed:', err)
    } finally {
      loading.value = false
    }
  }

  async function fetchItems(): Promise<void> {
    try {
      items.value = await window.api.getItems()
      if (status.value) {
        status.value.recordsCount = items.value.length
      }
    } catch (err: unknown) {
      console.error('[Renderer Store] getItems failed:', err)
    }
  }

  async function addItem(title: string, description?: string): Promise<Item | null> {
    if (!title.trim()) return null
    try {
      inserting.value = true
      const newItem = await window.api.createItem({
        title: title.trim(),
        description: description?.trim()
      })
      items.value.unshift(newItem)
      if (status.value) {
        status.value.recordsCount += 1
      }
      return newItem
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Error al insertar registro'
      console.error('[Renderer Store] addItem failed:', err)
      return null
    } finally {
      inserting.value = false
    }
  }

  async function removeItem(id: number): Promise<boolean> {
    try {
      const ok = await window.api.deleteItem(id)
      if (ok) {
        items.value = items.value.filter((i) => i.id !== id)
        if (status.value && status.value.recordsCount > 0) {
          status.value.recordsCount -= 1
        }
      }
      return ok
    } catch (err: unknown) {
      console.error('[Renderer Store] deleteItem failed:', err)
      return false
    }
  }

  return {
    status,
    items,
    loading,
    inserting,
    error,
    fetchStatus,
    fetchItems,
    addItem,
    removeItem
  }
})
