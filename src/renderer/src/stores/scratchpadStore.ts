import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import type { ScratchpadNote, SaveScratchpadNoteInput, Folio } from '@shared/types'
import { useProjectStore } from './projectStore'
import { useFolioStore } from './folioStore'
import { useGoalsStore } from './goalsStore'

export const useScratchpadStore = defineStore('scratchpad', () => {
  const isOpen = ref(false)
  const notes = ref<ScratchpadNote[]>([])
  const activeNoteId = ref<number | null>(null)
  const searchQuery = ref('')
  const isLoading = ref(false)
  const saveStatus = ref<'idle' | 'saving' | 'saved' | 'error'>('saved')
  const lastSavedTime = ref('')

  // Referencia para guardado con debounce al editar notas
  let pendingSavePayload: SaveScratchpadNoteInput | null = null

  const activeNote = computed<ScratchpadNote | null>(() => {
    if (!activeNoteId.value) return null
    return notes.value.find((n) => n.id === activeNoteId.value) || null
  })

  // Normalizador para búsqueda rápida
  function normalize(str: string): string {
    return (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
  }

  // Lista ordenada de notas: fijadas arriba, luego por fecha descendente
  const filteredNotes = computed<ScratchpadNote[]>(() => {
    const q = normalize(searchQuery.value)

    return notes.value
      .filter((note) => {
        if (!q) return true
        return normalize(note.content).includes(q) || normalize(note.title).includes(q)
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
  // AUTOGUARDADO DEBOUNCED A 350ms
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
      lastSavedTime.value = now.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (err) {
      console.error('[ScratchpadStore] Error al guardar en SQLite:', err)
      saveStatus.value = 'error'
    }
  }

  const debouncedSave = useDebounceFn(async () => {
    await flushSave()
  }, 350)

  // Actualización en caliente de contenido de una nota existente
  function updateNoteContent(id: number, content: string): void {
    const note = notes.value.find((n) => n.id === id)
    if (!note) return

    note.content = content
    note.updatedAt = new Date()

    pendingSavePayload = {
      id: note.id,
      projectId: note.projectId,
      title: note.title || '',
      content: note.content,
      isPinned: note.isPinned,
      colorTag: note.colorTag
    }

    saveStatus.value = 'saving'
    debouncedSave()
  }

  // ---------------------------------------------------------------------------
  // ACCIONES DE CAPTURA RÁPIDA (FRICCIÓN CERO)
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
      if (fetched.length > 0 && !activeNoteId.value) {
        activeNoteId.value = fetched[0].id
      }
    } catch (err) {
      console.error('[ScratchpadStore] Error al listar notas:', err)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Captura instantánea de idea.
   * Guarda de inmediato en SQLite sin requerir título ni categorías.
   */
  async function addQuickIdea(rawContent: string): Promise<ScratchpadNote | null> {
    const clean = rawContent.trim()
    if (!clean) return null

    const projectStore = useProjectStore()
    if (!projectStore.activeProjectId) return null

    saveStatus.value = 'saving'
    try {
      const newNote = await window.api.scratchpad.save({
        projectId: projectStore.activeProjectId,
        title: '',
        content: clean,
        isPinned: false,
        colorTag: null
      })

      notes.value.unshift(newNote)
      activeNoteId.value = newNote.id
      saveStatus.value = 'saved'

      // Registrar métricas de logros si aplica
      await useGoalsStore().checkAchievements()
      return newNote
    } catch (err) {
      console.error('[ScratchpadStore] Error al añadir nota rápida:', err)
      saveStatus.value = 'error'
      return null
    }
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

  function toggleScratchpad(): void {
    if (isOpen.value) {
      closeScratchpad()
    } else {
      openScratchpad()
    }
  }

  async function openScratchpad(): Promise<void> {
    const projectStore = useProjectStore()
    if (projectStore.activeProjectId && notes.value.length === 0) {
      await fetchNotes(projectStore.activeProjectId)
    }
    isOpen.value = true
  }

  async function closeScratchpad(): Promise<void> {
    await flushSave()
    isOpen.value = false
  }

  /**
   * Enviar fragmento al final del capítulo activo en el editor central TipTap.
   */
  async function sendToActiveChapter(noteId: number): Promise<boolean> {
    const note = notes.value.find((n) => n.id === noteId)
    if (!note || !note.content.trim()) return false

    window.dispatchEvent(
      new CustomEvent('folio:scratchpad-append-chapter', {
        detail: { content: note.content }
      })
    )
    return true
  }

  /**
   * Promover nota a un capítulo independiente en el manuscrito.
   */
  async function promoteToChapter(noteId: number): Promise<Folio | null> {
    const projectStore = useProjectStore()
    const folioStore = useFolioStore()

    if (!projectStore.activeProjectId) return null
    const note = notes.value.find((n) => n.id === noteId)
    if (!note || !note.content.trim()) return null

    await flushSave()

    const firstLine = note.content.trim().split('\n')[0] || ''
    const cleanTitle =
      firstLine.replace(/^[#*\-•\s]+/, '').slice(0, 48).trim() ||
      'Nueva Escena (Scratchpad)'

    const htmlContent = note.content
      .trim()
      .split(/\n{2,}/)
      .map((para) => `<p>${para.trim().replace(/\n/g, '<br>')}</p>`)
      .join('')

    try {
      const chapter = await folioStore.createChapter(projectStore.activeProjectId, {
        type: 'chapter',
        title: cleanTitle,
        content: htmlContent
      })

      if (chapter) {
        folioStore.selectFolio(chapter.id)
        await deleteNote(noteId)
      }

      return chapter
    } catch (err) {
      console.error('[ScratchpadStore] Error al promover nota a capítulo:', err)
      return null
    }
  }

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
    addQuickIdea,
    updateNoteContent,
    flushSave,
    deleteNote,
    togglePin,
    sendToActiveChapter,
    promoteToChapter,
    copyNote
  }
})
