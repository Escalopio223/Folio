import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Folio, CreateFolioInput, UpdateFolioInput } from '@shared/types'

const LAST_ACTIVE_FOLIO_KEY = 'folio:lastActiveFolio'

export const useFolioStore = defineStore('folio', () => {
  const folios = ref<Folio[]>([])
  const trashedFolios = ref<Folio[]>([])
  const activeFolioId = ref<string | null>(localStorage.getItem(LAST_ACTIVE_FOLIO_KEY))
  const isLoading = ref(false)

  const activeFolio = computed<Folio | null>(() => {
    if (!activeFolioId.value) return null
    return folios.value.find((f) => f.id === activeFolioId.value) || null
  })

  // Chapters: items with parentId === null
  const chapters = computed<Folio[]>(() => {
    return folios.value
      .filter((f) => f.parentId === null)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  })

  // Get scenes for a given chapter
  function getScenesForChapter(chapterId: string): Folio[] {
    return folios.value
      .filter((f) => f.parentId === chapterId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }

  // Session Words Tracking
  const sessionWordsAdded = ref<number>(0)
  const baselineWordCounts = new Map<string, number>()
  const folioDeltas = new Map<string, number>()

  function countWords(text: string): number {
    const cleanText = (text || '').replace(/<[^>]*>/g, ' ').trim()
    if (!cleanText) return 0
    return cleanText.split(/\s+/).length
  }


  function recordBaseline(folioId: string, content: string): void {
    if (!baselineWordCounts.has(folioId)) {
      baselineWordCounts.set(folioId, countWords(content))
    }
  }

  function updateSessionWords(folioId: string, currentContent: string): void {
    const currentWords = countWords(currentContent)
    if (!baselineWordCounts.has(folioId)) {
      baselineWordCounts.set(folioId, currentWords)
    }
    const baseline = baselineWordCounts.get(folioId) || 0
    const delta = Math.max(0, currentWords - baseline)
    folioDeltas.set(folioId, delta)

    let total = 0
    folioDeltas.forEach((d) => {
      total += d
    })
    sessionWordsAdded.value = total
  }

  function selectFolio(id: string): void {
    activeFolioId.value = id
    localStorage.setItem(LAST_ACTIVE_FOLIO_KEY, id)
    const target = folios.value.find((f) => f.id === id)
    if (target) {
      recordBaseline(id, target.content || '')
    }
  }

  async function fetchFolios(projectId?: string): Promise<void> {
    try {
      isLoading.value = true
      const [active, trashed] = await Promise.all([
        window.api.folio.getAll(projectId),
        window.api.folio.getTrash(projectId)
      ])

      folios.value = active
      trashedFolios.value = trashed

      const exists = active.some((f) => f.id === activeFolioId.value)
      if (!exists) {
        // Try to select first scene, or first chapter
        const firstScene = active.find((f) => f.parentId !== null)
        if (firstScene) {
          selectFolio(firstScene.id)
        } else if (active.length > 0) {
          selectFolio(active[0].id)
        } else {
          activeFolioId.value = null
          localStorage.removeItem(LAST_ACTIVE_FOLIO_KEY)
        }
      }
    } catch (err) {
      console.error('[Folio Store] fetchFolios failed:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function createChapter(projectId: string, title?: string): Promise<Folio | null> {
    const nextOrder = chapters.value.length + 1
    const chapter = await createFolio({
      projectId,
      parentId: null,
      type: 'chapter',
      title: title || `Capítulo ${nextOrder}`,
      sortOrder: nextOrder,
      content: ''
    })
    return chapter
  }

  async function createScene(projectId: string, chapterId: string, title?: string): Promise<Folio | null> {
    const scenes = getScenesForChapter(chapterId)
    const nextOrder = scenes.length + 1
    const scene = await createFolio({
      projectId,
      parentId: chapterId,
      type: 'scene',
      title: title || `Escena ${nextOrder}`,
      sortOrder: nextOrder,
      content: ''
    })
    return scene
  }

  async function createFolio(input: CreateFolioInput): Promise<Folio | null> {
    try {
      isLoading.value = true
      const created = await window.api.folio.create(input)
      folios.value.push(created)
      selectFolio(created.id)
      return created
    } catch (err) {
      console.error('[Folio Store] createFolio failed:', err)
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function updateFolio(input: UpdateFolioInput): Promise<Folio | null> {
    try {
      const updated = await window.api.folio.update(input)

      const index = folios.value.findIndex((f) => f.id === updated.id)
      if (index !== -1) {
        if (updated.isArchived) {
          folios.value.splice(index, 1)
          trashedFolios.value.unshift(updated)
          if (activeFolioId.value === updated.id) {
            activeFolioId.value = folios.value[0]?.id || null
            if (activeFolioId.value) {
              localStorage.setItem(LAST_ACTIVE_FOLIO_KEY, activeFolioId.value)
            } else {
              localStorage.removeItem(LAST_ACTIVE_FOLIO_KEY)
            }
          }
        } else {
          folios.value[index] = updated
        }
      } else {
        const trashIndex = trashedFolios.value.findIndex((f) => f.id === updated.id)
        if (trashIndex !== -1) {
          if (!updated.isArchived) {
            trashedFolios.value.splice(trashIndex, 1)
            folios.value.push(updated)
            selectFolio(updated.id)
          } else {
            trashedFolios.value[trashIndex] = updated
          }
        }
      }

      return updated
    } catch (err) {
      console.error('[Folio Store] updateFolio failed:', err)
      return null
    }
  }

  async function moveToTrash(id: string): Promise<boolean> {
    const res = await updateFolio({ id, isArchived: true })
    return Boolean(res)
  }

  async function restoreFromTrash(id: string): Promise<boolean> {
    const res = await updateFolio({ id, isArchived: false })
    return Boolean(res)
  }

  async function deletePermanently(id: string): Promise<boolean> {
    try {
      const ok = await window.api.folio.deletePermanent(id)
      if (ok) {
        trashedFolios.value = trashedFolios.value.filter((f) => f.id !== id)
        folios.value = folios.value.filter((f) => f.id !== id)
        if (activeFolioId.value === id) {
          activeFolioId.value = folios.value[0]?.id || null
          if (activeFolioId.value) {
            localStorage.setItem(LAST_ACTIVE_FOLIO_KEY, activeFolioId.value)
          } else {
            localStorage.removeItem(LAST_ACTIVE_FOLIO_KEY)
          }
        }
      }
      return ok
    } catch (err) {
      console.error('[Folio Store] deletePermanently failed:', err)
      return false
    }
  }

  async function saveCurrentFolio(
    fields?: Partial<Pick<UpdateFolioInput, 'content' | 'title' | 'synopsis' | 'status'>>
  ): Promise<Folio | null> {
    if (!activeFolioId.value) return null
    return updateFolio({
      id: activeFolioId.value,
      ...fields
    })
  }

  return {
    folios,
    trashedFolios,
    activeFolioId,
    activeFolio,
    chapters,
    isLoading,
    sessionWordsAdded,
    countWords,
    recordBaseline,
    updateSessionWords,
    getScenesForChapter,
    selectFolio,
    fetchFolios,
    createChapter,
    createScene,
    createFolio,
    updateFolio,
    saveCurrentFolio,
    moveToTrash,
    restoreFromTrash,
    deletePermanently
  }
})
