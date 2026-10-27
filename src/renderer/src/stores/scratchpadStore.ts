import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import type { ScratchpadNote, SaveScratchpadNoteInput, Folio } from '@shared/types'
import { useProjectStore } from './projectStore'
import { useFolioStore } from './folioStore'

export type ScratchpadColorTag = 'idea' | 'dialogo' | 'duda' | 'pendiente' | null

export const useScratchpadStore = defineStore('scratchpad', () => {
  const isOpen = ref(false)
  const notes = ref<ScratchpadNote[]>([])
  const activeNoteId = ref<number | null>(null)
  const searchQuery = ref('')
  const selectedColorFilter = ref<string>('all')
  const isLoading = ref(false)
  const saveStatus = ref<'idle' | 'saving' | 'saved' | 'error'>('saved')
  const lastSavedTime = ref('')

  // Referencia al contenido pendiente de persistir
  let pendingSavePayload: SaveScratchpadNoteInput | null = null

  const activeNote = computed<ScratchpadNote | null>(() => {
    if (!activeNoteId.value) return null
    return notes.value.find((n) => n.id === activeNoteId.value) || null
  })

  // Normalizador para búsqueda insensible a mayúsculas y diacríticos
  function normalize(str: string): string {
    return (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
  }

  // Lista filtrada con orden: fijados primero (isPinned DESC), luego updatedAt DESC
  const filteredNotes = computed<ScratchpadNote[]>(() => {
    const q = normalize(searchQuery.value)
    const filterTag = selectedColorFilter.value

    return notes.value
      .filter((note) => {
        if (filterTag !== 'all' && note.colorTag !== filterTag) {
          return false
        }
        if (!q) return true
        return normalize(note.content).includes(q)
      })
      .sort((a, b) => {
        if (a.isPinned !== b.isPinned) {
          return a.isPinned ? -1 : 1
        }
        const timeA = new Date(a.updatedAt).getTime()
        const timeB = new Date(b.updatedAt).getTime()
        return timeB - timeA
      })
  })

  const pinnedCount = computed<number>(() => {
    return notes.value.filter((n) => n.isPinned).length
  })

  const totalCount = computed<number>(() => {
    return notes.value.length
  })

  // ---------------------------------------------------------------------------
  // AUTOGUARDADO DEBOUNCED A 400ms
  // ---------------------------------------------------------------------------
  async function flushSave(): Promise<void> {
    if (!pendingSavePayload) return
    const payload = pendingSavePayload
    pendingSavePayload = null
    saveStatus.value = 'saving'

    try {
      const saved = await window.api.scratchpad.save(payload)
      const index = notes.value.findIndex((n) => n.id === saved.id)
      if (index !== -1) {
        notes.value[index] = saved
      }
      saveStatus.value = 'saved'
      const now = new Date()
      lastSavedTime.value = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    } catch (err) {
      console.error('[ScratchpadStore] Error al guardar nota en SQLite:', err)
      saveStatus.value = 'error'
    }
  }

  const debouncedSave = useDebounceFn(async () => {
    await flushSave()
  }, 400)

  // Actualización instantánea en memoria (Zero-Lag) + Debounce a SQLite
  function updateActiveContent(content: string): void {
    if (!activeNoteId.value) return
    const note = activeNote.value
    if (!note) return

    note.content = content
    note.updatedAt = new Date()

    pendingSavePayload = {
      id: note.id,
      projectId: note.projectId,
      content: note.content,
      isPinned: note.isPinned,
      colorTag: note.colorTag
    }

    saveStatus.value = 'saving'
    debouncedSave()
  }

  // ---------------------------------------------------------------------------
  // ACCIONES CRUD
  // ---------------------------------------------------------------------------

  async function fetchNotes(projectId?: string | null): Promise<void> {
    const projectStore = useProjectStore()
    const targetProject = projectId || projectStore.activeProjectId
    if (!targetProject) {
      notes.value = []
      activeNoteId.value = null
      return
    }

    isLoading.value = true
    try {
      const fetched = await window.api.scratchpad.list(targetProject)
      notes.value = fetched

      if (fetched.length > 0) {
        // Mantener nota activa si aún existe, o seleccionar la primera
        const exists = fetched.some((n) => n.id === activeNoteId.value)
        if (!exists || !activeNoteId.value) {
          activeNoteId.value = fetched[0].id
        }
      } else {
        activeNoteId.value = null
      }
    } catch (err) {
      console.error('[ScratchpadStore] Error al listar notas:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function createQuickNote(initialContent = '', colorTag: ScratchpadColorTag = null): Promise<ScratchpadNote | null> {
    const projectStore = useProjectStore()
    if (!projectStore.activeProjectId) return null

    // Forzar guardado previo de cambios pendientes
    await flushSave()

    try {
      const newNote = await window.api.scratchpad.save({
        projectId: projectStore.activeProjectId,
        content: initialContent,
        isPinned: false,
        colorTag
      })

      notes.value.unshift(newNote)
      activeNoteId.value = newNote.id
      saveStatus.value = 'saved'
      return newNote
    } catch (err) {
      console.error('[ScratchpadStore] Error al crear nota rápida:', err)
      return null
    }
  }

  function selectNote(id: number): void {
    if (activeNoteId.value === id) return
    flushSave()
    activeNoteId.value = id
  }

  async function deleteNote(id: number): Promise<boolean> {
    try {
      const ok = await window.api.scratchpad.delete(id)
      if (ok) {
        const index = notes.value.findIndex((n) => n.id === id)
        if (index !== -1) {
          notes.value.splice(index, 1)
        }
        if (activeNoteId.value === id) {
          activeNoteId.value = notes.value[0]?.id || null
        }
      }
      return ok
    } catch (err) {
      console.error('[ScratchpadStore] Error al eliminar nota:', err)
      return false
    }
  }

  async function togglePin(id: number): Promise<void> {
    const note = notes.value.find((n) => n.id === id)
    if (!note) return

    await flushSave()
    const nextPinned = !note.isPinned

    try {
      const updated = await window.api.scratchpad.save({
        id: note.id,
        projectId: note.projectId,
        isPinned: nextPinned
      })

      const index = notes.value.findIndex((n) => n.id === id)
      if (index !== -1) {
        notes.value[index] = updated
      }
    } catch (err) {
      console.error('[ScratchpadStore] Error al alternar pin:', err)
    }
  }

  async function setColorTag(id: number, colorTag: ScratchpadColorTag): Promise<void> {
    const note = notes.value.find((n) => n.id === id)
    if (!note) return

    await flushSave()

    try {
      const updated = await window.api.scratchpad.save({
        id: note.id,
        projectId: note.projectId,
        colorTag
      })

      const index = notes.value.findIndex((n) => n.id === id)
      if (index !== -1) {
        notes.value[index] = updated
      }
    } catch (err) {
      console.error('[ScratchpadStore] Error al cambiar etiqueta de color:', err)
    }
  }

  // ---------------------------------------------------------------------------
  // APERTURA / CIERRE
  // ---------------------------------------------------------------------------

  async function toggleScratchpad(forceState?: boolean): Promise<void> {
    const targetState = forceState !== undefined ? forceState : !isOpen.value

    if (targetState) {
      await openScratchpad()
    } else {
      await closeScratchpad()
    }
  }

  async function openScratchpad(): Promise<void> {
    const projectStore = useProjectStore()
    if (projectStore.activeProjectId && notes.value.length === 0) {
      await fetchNotes(projectStore.activeProjectId)
    }

    // Si aún no hay notas, crear automáticamente la primera para captura inmediata sin clics
    if (notes.value.length === 0 && projectStore.activeProjectId) {
      await createQuickNote()
    }

    isOpen.value = true
  }

  async function closeScratchpad(): Promise<void> {
    await flushSave()
    isOpen.value = false
  }

  // ---------------------------------------------------------------------------
  // PROMOVER A ESCENA DEL MANUSCRITO
  // ---------------------------------------------------------------------------
  async function promoteToScene(noteId: number): Promise<Folio | null> {
    const projectStore = useProjectStore()
    const folioStore = useFolioStore()

    if (!projectStore.activeProjectId) return null
    const note = notes.value.find((n) => n.id === noteId)
    if (!note || !note.content.trim()) return null

    await flushSave()

    // Extraer título limpio de la primera línea (máx 50 caracteres)
    const firstLine = note.content.trim().split('\n')[0] || ''
    const cleanTitle = firstLine.replace(/^[#*\-•\s]+/, '').slice(0, 50).trim() || 'Nueva Escena (Scratchpad)'

    // Determinar capítulo de destino:
    // 1. Si el folio activo es un capítulo, usarlo.
    // 2. Si el folio activo es una escena, usar su parentId (capítulo).
    // 3. Si existen capítulos en el manuscrito, usar el primero.
    // 4. Si no hay capítulos, crear uno nuevo.
    let targetChapterId: string | null = null

    if (folioStore.activeFolio) {
      if (folioStore.activeFolio.type === 'chapter') {
        targetChapterId = folioStore.activeFolio.id
      } else if (folioStore.activeFolio.parentId) {
        targetChapterId = folioStore.activeFolio.parentId
      }
    }

    if (!targetChapterId) {
      if (folioStore.chapters.length > 0) {
        targetChapterId = folioStore.chapters[0].id
      } else {
        const newChapter = await folioStore.createChapter(projectStore.activeProjectId, 'Capítulo I')
        if (newChapter) {
          targetChapterId = newChapter.id
        }
      }
    }

    if (!targetChapterId) {
      console.error('[ScratchpadStore] No fue posible determinar o crear un capítulo de destino')
      return null
    }

    try {
      const scene = await folioStore.createFolio({
        projectId: projectStore.activeProjectId,
        parentId: targetChapterId,
        type: 'scene',
        title: cleanTitle,
        content: note.content,
        sortOrder: folioStore.getScenesForChapter(targetChapterId).length + 1
      })

      if (scene) {
        // Seleccionar la nueva escena en el editor
        folioStore.selectFolio(scene.id)
        // Eliminar nota del Scratchpad ya que ha sido promovida
        await deleteNote(noteId)
      }

      return scene
    } catch (err) {
      console.error('[ScratchpadStore] Error al promover nota a escena:', err)
      return null
    }
  }

  // ---------------------------------------------------------------------------
  // COPIAR AL PORTAPAPELES
  // ---------------------------------------------------------------------------
  async function copyNote(noteId: number): Promise<boolean> {
    const note = notes.value.find((n) => n.id === noteId)
    if (!note || !note.content) return false

    try {
      await navigator.clipboard.writeText(note.content)
      return true
    } catch (err) {
      console.error('[ScratchpadStore] Error al copiar al portapapeles:', err)
      return false
    }
  }

  return {
    isOpen,
    notes,
    activeNoteId,
    searchQuery,
    selectedColorFilter,
    isLoading,
    saveStatus,
    lastSavedTime,
    activeNote,
    filteredNotes,
    pinnedCount,
    totalCount,
    fetchNotes,
    toggleScratchpad,
    openScratchpad,
    closeScratchpad,
    createQuickNote,
    selectNote,
    updateActiveContent,
    flushSave,
    deleteNote,
    togglePin,
    setColorTag,
    promoteToScene,
    copyNote
  }
})
