import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  Folio,
  FolioType,
  FolioStatus,
  ChapterTitleFormat,
  CreateFolioInput,
  UpdateFolioInput
} from '@shared/types'
import { useGoalsStore } from './goalsStore'

const LAST_ACTIVE_FOLIO_KEY = 'folio:lastActiveFolio'

export interface CreateChapterOptions {
  type?: FolioType
  title?: string
  subtitle?: string
  synopsis?: string
  povTag?: string
  timeline?: string | null
  location?: string | null
  chapterTitleFormat?: ChapterTitleFormat | null
  targetWords?: number
  includeInExport?: boolean
  content?: string
  status?: FolioStatus
}

export const useFolioStore = defineStore('folio', () => {
  const folios = ref<Folio[]>([])
  const trashedFolios = ref<Folio[]>([])
  const activeFolioId = ref<string | null>(localStorage.getItem(LAST_ACTIVE_FOLIO_KEY))
  const isLoading = ref(false)

  // Selección activa de Capítulo (Folio)
  const activeFolio = computed<Folio | null>(() => {
    if (!activeFolioId.value) return null
    return folios.value.find((f) => f.id === activeFolioId.value) || null
  })

  // Alias semántico para claridad en componentes
  const activeChapter = computed<Folio | null>(() => activeFolio.value)

  // Lista plana de capítulos activos ordenados por orderIndex
  const chapters = computed<Folio[]>(() => {
    return folios.value
      .filter((f) => !f.isArchived)
      .slice()
      .sort((a, b) => a.orderIndex - b.orderIndex)
  })

  // Total de palabras del manuscrito activo (excluyendo papelera / archivados)
  const totalManuscriptWords = computed<number>(() => {
    return chapters.value.reduce((acc, f) => acc + countWords(f.content || ''), 0)
  })

  // Seguimiento de palabras de sesión y capítulos finalizados hoy
  const sessionWordsAdded = ref<number>(0)
  const baselineWordCounts = new Map<string, number>()
  const folioDeltas = new Map<string, number>()
  const completedInSessionIds = new Set<string>()

  function countWords(text: string): number {
    const withoutBreaks = (text || '').replace(
      /<div[^>]*data-type=["']scene-break["'][^>]*>[\s\S]*?<\/div>/gi,
      ' '
    )
    const cleanText = withoutBreaks.replace(/<[^>]*>/g, ' ').trim()
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

    // Sincronizar en tiempo real con el store de metas y sesión activa
    useGoalsStore().syncLiveSessionWords(total)
  }

  function selectFolio(id: string): void {
    activeFolioId.value = id || null
    if (id) {
      localStorage.setItem(LAST_ACTIVE_FOLIO_KEY, id)
      const target = folios.value.find((f) => f.id === id)
      if (target) {
        recordBaseline(id, target.content || '')
      }
    } else {
      localStorage.removeItem(LAST_ACTIVE_FOLIO_KEY)
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

      // Registrar líneas base de todos los capítulos activos
      for (const f of active) {
        recordBaseline(f.id, f.content || '')
        if (f.status === 'done') {
          completedInSessionIds.add(f.id)
        }
      }

      const exists = active.some((f) => f.id === activeFolioId.value)
      if (!exists) {
        if (active.length > 0) {
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

  async function createChapter(
    projectId: string,
    titleOrOptions?: string | CreateChapterOptions
  ): Promise<Folio | null> {
    const opts: CreateChapterOptions =
      typeof titleOrOptions === 'string'
        ? { title: titleOrOptions }
        : titleOrOptions || {}

    const type: FolioType = opts.type || 'chapter'
    const nextOrder =
      chapters.value.reduce((max, c) => Math.max(max, c.orderIndex), 0) + 1

    const standardChaptersCount = chapters.value.filter((c) => c.type === 'chapter').length
    const defaultTitle =
      type === 'frontmatter'
        ? 'Prólogo'
        : type === 'backmatter'
          ? 'Epílogo'
          : `Capítulo ${standardChaptersCount + 1}`

    const content = opts.content ?? ''
    const wordCount = countWords(content)

    const chapter = await createFolio({
      projectId,
      type,
      title: opts.title?.trim() || defaultTitle,
      subtitle: opts.subtitle ?? '',
      synopsis: opts.synopsis ?? '',
      povTag: opts.povTag ?? '',
      timeline: opts.timeline ?? null,
      location: opts.location ?? null,
      chapterTitleFormat: opts.chapterTitleFormat ?? null,
      targetWords: opts.targetWords ?? 0,
      includeInExport: opts.includeInExport ?? true,
      content,
      wordCount,
      status: opts.status ?? 'draft',
      orderIndex: nextOrder
    })

    if (chapter) {
      completedInSessionIds.add(chapter.id)
      await useGoalsStore().recordProgress({ chapterDelta: 1 })
    }
    return chapter
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

  async function updateChapterMeta(
    id: string,
    meta: Partial<
      Pick<
        UpdateFolioInput,
        | 'title'
        | 'subtitle'
        | 'synopsis'
        | 'povTag'
        | 'timeline'
        | 'location'
        | 'chapterTitleFormat'
        | 'type'
        | 'status'
        | 'targetWords'
        | 'includeInExport'
      >
    >
  ): Promise<Folio | null> {
    return updateFolio({
      id,
      ...meta
    })
  }

  async function updateChapterContent(
    id: string,
    content: string,
    wordCount?: number
  ): Promise<Folio | null> {
    return updateFolio({
      id,
      content,
      wordCount: wordCount !== undefined ? wordCount : countWords(content)
    })
  }

  async function reorderChapters(orderedIds: string[]): Promise<boolean> {
    try {
      // Actualización optimista en memoria
      const orderMap = new Map<string, number>()
      orderedIds.forEach((id, idx) => {
        orderMap.set(id, idx + 1)
      })
      folios.value = folios.value.map((f) => {
        const nextOrder = orderMap.get(f.id)
        if (nextOrder !== undefined) {
          return { ...f, orderIndex: nextOrder }
        }
        return f
      })

      return await window.api.folio.reorder(orderedIds)
    } catch (err) {
      console.error('[Folio Store] reorderChapters failed:', err)
      return false
    }
  }

  async function updateFolio(input: UpdateFolioInput): Promise<Folio | null> {
    try {
      const existingBefore = folios.value.find((f) => f.id === input.id)
      const wasDoneBefore = existingBefore?.status === 'done'

      const updated = await window.api.folio.update(input)

      const index = folios.value.findIndex((f) => f.id === updated.id)
      if (index !== -1) {
        if (updated.isArchived) {
          folios.value.splice(index, 1)
          trashedFolios.value.unshift(updated)
          if (activeFolioId.value === updated.id) {
            const remaining = chapters.value
            activeFolioId.value = remaining[0]?.id || null
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

      const goalsStore = useGoalsStore()

      // Si un capítulo existente pasa a 'done' (Finalizado) hoy por primera vez
      if (
        updated.status === 'done' &&
        !wasDoneBefore &&
        !completedInSessionIds.has(updated.id)
      ) {
        completedInSessionIds.add(updated.id)
        await goalsStore.recordProgress({ chapterDelta: 1 })
      } else {
        await goalsStore.checkAchievements()
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

  async function restoreFolio(id: string): Promise<boolean> {
    try {
      const restored = await window.api.folio.restore(id)
      if (restored) {
        trashedFolios.value = trashedFolios.value.filter((f) => f.id !== id)
        const exists = folios.value.some((f) => f.id === id)
        if (!exists) {
          folios.value.push(restored)
        }
        selectFolio(restored.id)
        await useGoalsStore().checkAchievements()
        return true
      }
      return false
    } catch (err) {
      console.error('[Folio Store] restoreFolio failed:', err)
      return false
    }
  }

  async function restoreFromTrash(id: string): Promise<boolean> {
    return restoreFolio(id)
  }

  async function deletePermanently(id: string): Promise<boolean> {
    try {
      const ok = await window.api.folio.deletePermanent(id)
      if (ok) {
        trashedFolios.value = trashedFolios.value.filter((f) => f.id !== id)
        folios.value = folios.value.filter((f) => f.id !== id)
        if (activeFolioId.value === id) {
          activeFolioId.value = chapters.value[0]?.id || null
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
    fields?: Partial<
      Pick<
        UpdateFolioInput,
        | 'content'
        | 'wordCount'
        | 'title'
        | 'subtitle'
        | 'synopsis'
        | 'povTag'
        | 'timeline'
        | 'location'
        | 'chapterTitleFormat'
        | 'type'
        | 'status'
        | 'targetWords'
        | 'includeInExport'
      >
    >
  ): Promise<Folio | null> {
    if (!activeFolioId.value) return null
    await useGoalsStore().flushSessionWordsToDb()
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
    activeChapter,
    chapters,
    totalManuscriptWords,
    isLoading,
    sessionWordsAdded,
    countWords,
    recordBaseline,
    updateSessionWords,
    selectFolio,
    fetchFolios,
    createChapter,
    createFolio,
    updateChapterMeta,
    updateChapterContent,
    reorderChapters,
    updateFolio,
    saveCurrentFolio,
    moveToTrash,
    restoreFolio,
    restoreFromTrash,
    deletePermanently
  }
})
