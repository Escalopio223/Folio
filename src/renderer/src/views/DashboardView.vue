<script setup lang="ts">
import { ref, shallowRef, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useProjectStore } from '../stores/projectStore'
import { useFolioStore } from '../stores/folioStore'
import { useLoreStore } from '../stores/loreStore'
import { useUiStore } from '../stores/uiStore'
import { useDebounceFn, onClickOutside, useWindowSize } from '@vueuse/core'
import ProjectModal from '../components/ProjectModal.vue'
import FolioLogo from '../components/FolioLogo.vue'
import BookSelector from '../components/BookSelector.vue'
import WikiInspector from '../components/WikiInspector.vue'
import PanelResizer from '../components/PanelResizer.vue'
import {
  ChevronDown,
  Plus,
  Bookmark,
  Trash2,
  Check,
  Eye,
  Flame,
  Pencil,
  GripVertical,
  Sparkles,
  Clock,
  MapPin
} from 'lucide-vue-next'
import TiptapEditor, { type SceneBreakAnchor } from '../components/editor/TiptapEditor.vue'
import EditorToolbar from '../components/editor/EditorToolbar.vue'
import EditorFindBar from '../components/editor/EditorFindBar.vue'
import WikiHoverPreview from '../components/editor/WikiHoverPreview.vue'
import ChapterTitleFormatPopover from '../components/editor/ChapterTitleFormatPopover.vue'
import type { WikiEntityTerm } from '../components/editor/extensions/WikiAutoLink'
import type { Editor } from '@tiptap/vue-3'
import type { Folio, FolioType, FolioStatus, ChapterTitleFormat } from '@shared/types'
import { useTrashStore } from '../stores/trashStore'
import { useScratchpadStore } from '../stores/scratchpadStore'
import { useRulesStore } from '../stores/rulesStore'
import { useGoalsStore } from '../stores/goalsStore'
import { usePaletteStore } from '../stores/paletteStore'
import GoalsProgressPill from '../components/goals/GoalsProgressPill.vue'
import {
  useChapterMetrics,
  type ChapterMetricsSnapshot
} from '../composables/useChapterMetrics'

const projectStore = useProjectStore()
const folioStore = useFolioStore()
const loreStore = useLoreStore()
const uiStore = useUiStore()
const trashStore = useTrashStore()
const scratchpadStore = useScratchpadStore()
const rulesStore = useRulesStore()
const goalsStore = useGoalsStore()
const paletteStore = usePaletteStore()

const isProjectModalOpen = ref(false)

// Dimensiones dinámicas y estado de arrastre para Manuscrito y Wiki
const { width: windowWidth } = useWindowSize()
const isDraggingLeft = ref(false)
const isDraggingRight = ref(false)

const maxAllowedLeftWidth = computed(() => {
  const rightWidth = uiStore.isRightSidebarOpen ? uiStore.rightSidebarWidth : 0
  const minCenter = 380
  const containerPadding = 48
  return Math.max(
    uiStore.MIN_LEFT_WIDTH,
    Math.min(uiStore.MAX_LEFT_WIDTH, windowWidth.value - rightWidth - minCenter - containerPadding)
  )
})

const maxAllowedRightWidth = computed(() => {
  const leftWidth = uiStore.isLeftSidebarOpen ? uiStore.leftSidebarWidth : 0
  const minCenter = 380
  const containerPadding = 48
  return Math.max(
    uiStore.MIN_RIGHT_WIDTH,
    Math.min(uiStore.MAX_RIGHT_WIDTH, windowWidth.value - leftWidth - minCenter - containerPadding)
  )
})

// =========================================================================
// ESTADOS REACTIVOS DEL CAPÍTULO ACTIVO (NIVEL ÚNICO)
// =========================================================================
const editFolioTitle = ref('')
const editFolioSubtitle = ref('')
const editFolioTimeline = ref('')
const editFolioLocation = ref('')
const editFolioTitleFormat = ref<ChapterTitleFormat | null>(null)
const editFolioContent = ref('')
const editFolioSynopsis = ref('')
const editFolioPovTag = ref('')
const editFolioTargetWords = ref<number>(0)
const editFolioIncludeInExport = ref<boolean>(true)
const editFolioType = ref<FolioType>('chapter')
const editFolioStatus = ref<FolioStatus>('draft')

// Formato efectivo del encabezado del capítulo (override del capítulo o global del libro)
const effectiveChapterTitleFormat = computed<ChapterTitleFormat>(() => {
  return editFolioTitleFormat.value ?? uiStore.chapterTitleFormat
})

function handleUpdateGlobalTitleFormat(format: ChapterTitleFormat): void {
  uiStore.updateChapterTitleFormat(format)
}

function handleUpdateChapterTitleFormat(format: ChapterTitleFormat | null): void {
  editFolioTitleFormat.value = format ? { ...format } : null
  onEditorInput()
}

// Estado no intrusivo para metadatos inline (Línea temporal y Ubicación)
const isTimelineFocused = ref(false)
const isLocationFocused = ref(false)
const timelineInputRef = ref<HTMLInputElement | null>(null)
const locationInputRef = ref<HTMLInputElement | null>(null)

function openTimelineInput(): void {
  isTimelineFocused.value = true
  nextTick(() => {
    timelineInputRef.value?.focus()
  })
}

function openLocationInput(): void {
  isLocationFocused.value = true
  nextTick(() => {
    locationInputRef.value?.focus()
  })
}

async function handleTimelineBlur(): Promise<void> {
  isTimelineFocused.value = false
  editFolioTimeline.value = editFolioTimeline.value.trim()
  onEditorInput()
  await flushSave()
}

async function handleLocationBlur(): Promise<void> {
  isLocationFocused.value = false
  editFolioLocation.value = editFolioLocation.value.trim()
  onEditorInput()
  await flushSave()
}

function formatSidebarReadingTime(words: number): string {
  const safeWords = Math.max(0, Math.floor(Number(words) || 0))
  if (safeWords === 0) return '0 min'
  return `~${Math.ceil(safeWords / 200)} min`
}

const isStatusDropdownOpen = ref(false)
const statusDropdownRef = ref<HTMLElement | null>(null)

onClickOutside(statusDropdownRef, () => {
  isStatusDropdownOpen.value = false
})

const statusOptions: Array<{ value: FolioStatus; label: string; color: string; dotClass: string }> =
  [
    { value: 'draft', label: 'Borrador', color: 'bg-amber-500', dotClass: 'bg-amber-500' },
    { value: 'in_progress', label: 'En curso', color: 'bg-sky-500', dotClass: 'bg-sky-500' },
    { value: 'done', label: 'Finalizado', color: 'bg-emerald-500', dotClass: 'bg-emerald-500' }
  ]

const currentStatusObj = computed(() => {
  return statusOptions.find((o) => o.value === editFolioStatus.value) || statusOptions[0]
})

function getStatusDotColor(status: string): string {
  if (status === 'done') return 'bg-emerald-500'
  if (status === 'in_progress') return 'bg-sky-500'
  return 'bg-amber-500'
}

function getStatusLabel(status: string): string {
  if (status === 'done') return 'Finalizado'
  if (status === 'in_progress') return 'En curso'
  return 'Borrador'
}

function setFolioStatus(status: FolioStatus): void {
  editFolioStatus.value = status
  isStatusDropdownOpen.value = false
  onEditorInput()
}

// =========================================================================
// EDICIÓN RÁPIDA EN LÍNEA DEL TÍTULO EN EL ÁRBOL DEL MANUSCRITO
// =========================================================================
const inlineEditingId = ref<string | null>(null)
const inlineTitleDraft = ref('')

function startInlineEdit(chap: Folio): void {
  inlineEditingId.value = chap.id
  inlineTitleDraft.value = chap.title
  nextTick(() => {
    const inputEl = document.getElementById(`inline-title-${chap.id}`) as HTMLInputElement | null
    inputEl?.focus()
    inputEl?.select()
  })
}

async function commitInlineEdit(chap: Folio): Promise<void> {
  if (inlineEditingId.value !== chap.id) return
  const clean = inlineTitleDraft.value.trim() || 'Sin título'
  inlineEditingId.value = null
  if (clean === chap.title) return

  if (folioStore.activeFolioId === chap.id) {
    editFolioTitle.value = clean
  }
  await folioStore.updateChapterMeta(chap.id, { title: clean })
}

function cancelInlineEdit(): void {
  inlineEditingId.value = null
}

// =========================================================================
// DRAG & DROP DE UN SOLO NIVEL PARA REORDENAR CAPÍTULOS
// =========================================================================
const draggedChapterId = ref<string | null>(null)
const dragOverChapterId = ref<string | null>(null)

function onDragStartChapter(e: DragEvent, chapId: string): void {
  draggedChapterId.value = chapId
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', chapId)
  }
}

function onDragOverChapter(e: DragEvent, chapId: string): void {
  e.preventDefault()
  if (draggedChapterId.value && draggedChapterId.value !== chapId) {
    dragOverChapterId.value = chapId
  }
}

function onDragLeaveChapter(chapId: string): void {
  if (dragOverChapterId.value === chapId) {
    dragOverChapterId.value = null
  }
}

async function onDropChapter(e: DragEvent, targetChapId: string): Promise<void> {
  e.preventDefault()
  const sourceId = draggedChapterId.value
  draggedChapterId.value = null
  dragOverChapterId.value = null

  if (!sourceId || sourceId === targetChapId) return

  const currentList = folioStore.chapters.map((c) => c.id)
  const fromIdx = currentList.indexOf(sourceId)
  const toIdx = currentList.indexOf(targetChapId)
  if (fromIdx === -1 || toIdx === -1) return

  currentList.splice(fromIdx, 1)
  currentList.splice(toIdx, 0, sourceId)

  await folioStore.reorderChapters(currentList)
}

function onDragEndChapter(): void {
  draggedChapterId.value = null
  dragOverChapterId.value = null
}

// =========================================================================
// SUB-NAVEGACIÓN DINÁMICA POR SCENEBREAK (* * *) EN EL CAPÍTULO ACTIVO
// =========================================================================
const activeTramoAnchors = ref<SceneBreakAnchor[]>([])

function handleSceneBreakAnchors(anchors: SceneBreakAnchor[]): void {
  activeTramoAnchors.value = anchors
}

function scrollToTramo(anchorIndex: number): void {
  tiptapEditorRef.value?.scrollToSceneBreak(anchorIndex)
}

// =========================================================================
// ESTADOS DE GUARDADO & AUTOGUARDADO
// =========================================================================
type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error'
const saveStatus = ref<SaveStatus>('saved')
const lastSavedTime = ref<string>('')
const hasPendingChanges = ref(false)
let isSyncing = false

// Input DOM references for focus and scroll control
const titleInputRef = ref<HTMLInputElement | null>(null)
const scrollContainerRef = ref<HTMLElement | null>(null)
const tiptapEditorRef = ref<InstanceType<typeof TiptapEditor> | null>(null)
const findBarRef = ref<InstanceType<typeof EditorFindBar> | null>(null)
const wikiHoverPreviewRef = ref<InstanceType<typeof WikiHoverPreview> | null>(null)
const activeEditor = shallowRef<Editor | null>(null)

// Entidades activas de la Wiki sincronizadas para escaneo y autolink en ProseMirror
const wikiAutoLinkEntities = computed<WikiEntityTerm[]>(() => {
  return loreStore.items
    .filter((item) => !item.isArchived && item.name && item.name.trim().length >= 2)
    .map((item) => ({
      id: item.id,
      name: item.name.trim(),
      category: item.category,
      summary: item.summary || '',
      icon: item.icon
    }))
})

// Control de Hover Preview al pasar el ratón sobre una entidad mencionada
function handleWikiHover(payload: { entityId: string; targetEl: HTMLElement }): void {
  const entity = loreStore.items.find((i) => i.id === payload.entityId)
  if (entity) {
    wikiHoverPreviewRef.value?.show({
      entity,
      targetEl: payload.targetEl
    }, 900)
  }
}

function handleWikiLeave(): void {
  wikiHoverPreviewRef.value?.scheduleHide(200)
}

// Navegación con Ctrl+Clic o desde la tarjeta flotante hacia la ficha completa de la Wiki
function handleWikiNavigate(entity: { id: string }): void {
  wikiHoverPreviewRef.value?.hideImmediately()
  uiStore.setActiveWikiTab('lore')
  uiStore.setRightSidebar(true)
  loreStore.selectLore(entity.id)
}

function onEditorReady(ed: Editor): void {
  activeEditor.value = ed
}

function handleOpenFindBar(): void {
  findBarRef.value?.open()
}

// Métricas reactivas del capítulo activo mediante composable useChapterMetrics
const {
  wordCount,
  charCount,
  readingTimeLabel,
  formattedWordCount,
  charDetailsTooltip,
  applySnapshot,
  updateFromHtmlImmediate,
  resetMetrics
} = useChapterMetrics({
  targetWords: editFolioTargetWords,
  wpm: 210
})

function handleEditorStats(stats: ChapterMetricsSnapshot): void {
  applySnapshot(stats)
  if (folioStore.activeFolioId) {
    const item = folioStore.folios.find((f) => f.id === folioStore.activeFolioId)
    if (item) {
      item.wordCount = stats.wordCount
    }
    folioStore.updateSessionWords(folioStore.activeFolioId, stats.plainText)
  }
}

// Sync active folio when changed with flush save safeguard
watch(
  () => folioStore.activeFolio,
  async (folio, oldFolio) => {
    if (oldFolio && oldFolio.id !== folio?.id && hasPendingChanges.value) {
      await flushSave()
    }
    isSyncing = true
    if (folio) {
      editFolioTitle.value = folio.title
      editFolioSubtitle.value = folio.subtitle || ''
      editFolioTimeline.value = folio.timeline || ''
      editFolioLocation.value = folio.location || ''
      editFolioTitleFormat.value = folio.chapterTitleFormat
        ? { ...folio.chapterTitleFormat }
        : null
      isTimelineFocused.value = false
      isLocationFocused.value = false
      editFolioContent.value = folio.content
      editFolioSynopsis.value = folio.synopsis || ''
      editFolioPovTag.value = folio.povTag || ''
      editFolioTargetWords.value = folio.targetWords || 0
      editFolioIncludeInExport.value = folio.includeInExport ?? true
      editFolioType.value = folio.type || 'chapter'
      editFolioStatus.value = folio.status || 'draft'
      saveStatus.value = 'saved'
      hasPendingChanges.value = false
      lastSavedTime.value = new Date(folio.updatedAt).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
      folioStore.recordBaseline(folio.id, folio.content || '')
      updateFromHtmlImmediate(folio.content || '')

      // Comprobar si hay una navegación pendiente desde el Command Palette
      if (paletteStore.pendingNavigation && paletteStore.pendingNavigation.chapterId === folio.id) {
        const target = paletteStore.pendingNavigation
        paletteStore.clearPendingNavigation()
        nextTick(() => {
          setTimeout(() => {
            tiptapEditorRef.value?.navigateToMatch({
              from: target.from,
              to: target.to,
              query: target.query
            })
          }, 80)
        })
      }
    } else {
      editFolioTitle.value = ''
      editFolioSubtitle.value = ''
      editFolioTimeline.value = ''
      editFolioLocation.value = ''
      editFolioTitleFormat.value = null
      isTimelineFocused.value = false
      isLocationFocused.value = false
      editFolioContent.value = ''
      editFolioSynopsis.value = ''
      editFolioPovTag.value = ''
      editFolioTargetWords.value = 0
      editFolioIncludeInExport.value = true
      editFolioType.value = 'chapter'
      editFolioStatus.value = 'draft'
      activeTramoAnchors.value = []
      saveStatus.value = 'saved'
      hasPendingChanges.value = false
      resetMetrics()
    }
    setTimeout(() => {
      isSyncing = false
    }, 50)
  },
  { immediate: true }
)

// Flush & Save inmediato en SQLite
async function flushSave(): Promise<void> {
  if (!hasPendingChanges.value) return

  saveStatus.value = 'saving'
  hasPendingChanges.value = false

  try {
    if (folioStore.activeFolioId) {
      const targetId = folioStore.activeFolioId
      const titleToSave = editFolioTitle.value.trim() || 'Sin título'
      const subtitleToSave = editFolioSubtitle.value.trim()
      const timelineToSave = editFolioTimeline.value.trim() || null
      const locationToSave = editFolioLocation.value.trim() || null
      const titleFormatToSave = editFolioTitleFormat.value
        ? { ...editFolioTitleFormat.value }
        : null
      const contentToSave = tiptapEditorRef.value?.getHTML() ?? editFolioContent.value
      const synopsisToSave = editFolioSynopsis.value
      const povTagToSave = editFolioPovTag.value.trim()
      const targetWordsToSave = Math.max(0, Number(editFolioTargetWords.value) || 0)
      const includeInExportToSave = editFolioIncludeInExport.value
      const typeToSave = editFolioType.value
      const statusToSave = editFolioStatus.value
      const currentWords = folioStore.countWords(contentToSave)

      // Actualizar réplica reactiva en el store para zero-lag en el árbol
      const item = folioStore.folios.find((f) => f.id === targetId)
      if (item) {
        item.title = titleToSave
        item.subtitle = subtitleToSave
        item.timeline = timelineToSave
        item.location = locationToSave
        item.chapterTitleFormat = titleFormatToSave
        item.content = contentToSave
        item.synopsis = synopsisToSave
        item.povTag = povTagToSave
        item.targetWords = targetWordsToSave
        item.includeInExport = includeInExportToSave
        item.type = typeToSave
        item.status = statusToSave
        item.wordCount = currentWords
      }

      // Sincronizar balance neto de palabras de sesión con SQLite
      folioStore.updateSessionWords(targetId, contentToSave)
      if (projectStore.activeProjectId) {
        await goalsStore.flushSessionWordsToDb()
      }

      await folioStore.updateFolio({
        id: targetId,
        title: titleToSave,
        subtitle: subtitleToSave,
        timeline: timelineToSave,
        location: locationToSave,
        chapterTitleFormat: titleFormatToSave,
        content: contentToSave,
        wordCount: currentWords,
        synopsis: synopsisToSave,
        povTag: povTagToSave,
        targetWords: targetWordsToSave,
        includeInExport: includeInExportToSave,
        type: typeToSave,
        status: statusToSave
      })
    }

    saveStatus.value = 'saved'
    lastSavedTime.value = new Date().toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  } catch (err) {
    console.error('[DashboardView] Error al guardar en SQLite:', err)
    saveStatus.value = 'error'
  }
}

// Debounced auto-save inteligente a 500ms
const debouncedSave = useDebounceFn(async () => {
  if (isSyncing) return
  await flushSave()
}, 500)

function onEditorInput(): void {
  if (isSyncing) return

  hasPendingChanges.value = true
  saveStatus.value = 'pending'

  // Actualización instantánea en memoria (Zero-Lag)
  if (folioStore.activeFolioId) {
    const target = folioStore.folios.find((f) => f.id === folioStore.activeFolioId)
    if (target) {
      target.title = editFolioTitle.value.trim() || 'Sin título'
      target.subtitle = editFolioSubtitle.value
      target.timeline = editFolioTimeline.value.trim() || null
      target.location = editFolioLocation.value.trim() || null
      target.chapterTitleFormat = editFolioTitleFormat.value
        ? { ...editFolioTitleFormat.value }
        : null
      target.synopsis = editFolioSynopsis.value
      target.povTag = editFolioPovTag.value
      target.targetWords = Math.max(0, Number(editFolioTargetWords.value) || 0)
      target.includeInExport = editFolioIncludeInExport.value
      target.type = editFolioType.value
      target.status = editFolioStatus.value
      target.content = editFolioContent.value
      target.wordCount = wordCount.value
    }
    folioStore.updateSessionWords(folioStore.activeFolioId, editFolioContent.value)
  }

  debouncedSave()
}

// Forzar guardado manual (Ctrl+S / Cmd+S)
async function handleManualSave(): Promise<void> {
  await flushSave()
}

// Escuchar solicitudes de navegación inmediata en el capítulo actual si ya está montado
watch(
  () => paletteStore.pendingNavigation,
  (nav) => {
    if (nav && nav.chapterId === folioStore.activeFolioId) {
      const target = { ...nav }
      paletteStore.clearPendingNavigation()
      nextTick(() => {
        tiptapEditorRef.value?.navigateToMatch({
          from: target.from,
          to: target.to,
          query: target.query
        })
      })
    }
  }
)

// Crear nuevo capítulo rápido con el teclado (Ctrl+Alt+N / Cmd+Alt+N)
async function handleQuickNewChapter(): Promise<void> {
  if (!projectStore.activeProjectId) return

  if (hasPendingChanges.value) {
    await flushSave()
  }

  await handleCreateChapter()

  nextTick(() => {
    titleInputRef.value?.focus()
    titleInputRef.value?.select()
  })
}

// Listener de atajos de teclado globales de productividad
function handleGlobalKeydown(e: KeyboardEvent): void {
  const isCtrlOrCmd = e.ctrlKey || e.metaKey

  // Ctrl+Shift+F / Cmd+Shift+F: Alternar Modo Enfoque
  if (isCtrlOrCmd && e.shiftKey && e.key.toLowerCase() === 'f') {
    e.preventDefault()
    uiStore.toggleFocusMode()
    return
  }

  // Ctrl+S / Cmd+S: Guardado forzado instantáneo (sin shift)
  if (isCtrlOrCmd && !e.shiftKey && e.key.toLowerCase() === 's') {
    e.preventDefault()
    handleManualSave()
    return
  }

  // Ctrl+Alt+N / Cmd+Alt+N: Nuevo capítulo sin usar el ratón
  if (isCtrlOrCmd && e.altKey && e.key.toLowerCase() === 'n') {
    e.preventDefault()
    handleQuickNewChapter()
    return
  }

  // Ctrl+J / Cmd+J: Alternar Scratchpad / Bloc Rápido
  if (isCtrlOrCmd && !e.shiftKey && e.key.toLowerCase() === 'j') {
    e.preventDefault()
    scratchpadStore.toggleScratchpad()
    return
  }
}

// Selection Handler con flush forzado previo para garantizar CERO pérdida de datos
async function selectChapter(folio: Folio): Promise<void> {
  if (folioStore.activeFolioId === folio.id) return

  if (hasPendingChanges.value) {
    await flushSave()
  }

  folioStore.selectFolio(folio.id)
}

// Creation Handler
async function handleCreateChapter(type: FolioType = 'chapter'): Promise<void> {
  if (!projectStore.activeProjectId) return
  if (hasPendingChanges.value) {
    await flushSave()
  }
  const chapter = await folioStore.createChapter(projectStore.activeProjectId, { type })
  if (chapter) {
    await selectChapter(chapter)
  }
}

// Project Change con salvaguarda de datos pendientes
async function handleProjectChange(projectId: string): Promise<void> {
  if (hasPendingChanges.value) {
    await flushSave()
  }
  projectStore.selectProject(projectId)
  await Promise.all([
    folioStore.fetchFolios(projectId),
    loreStore.fetchLore(projectId),
    trashStore.fetchTrash(projectId),
    scratchpadStore.fetchNotes(projectId),
    rulesStore.fetchRules(projectId)
  ])
  await goalsStore.fetchGoals(projectId)
}

// Project Delete
async function handleProjectDeleted(): Promise<void> {
  if (projectStore.activeProjectId) {
    await handleProjectChange(projectStore.activeProjectId)
  } else {
    folioStore.folios = []
    folioStore.trashedFolios = []
    folioStore.selectFolio('')
    loreStore.items = []
    trashStore.trashFolios = []
    trashStore.trashLore = []
    scratchpadStore.notes = []
    scratchpadStore.activeNoteId = null
    rulesStore.rules = []
    rulesStore.selectedRuleId = null
  }
}

// Initial boot & listeners
onMounted(async () => {
  window.addEventListener('keydown', handleGlobalKeydown)
  window.addEventListener('beforeunload', () => {
    if (hasPendingChanges.value) {
      flushSave()
    }
  })

  await projectStore.fetchProjects()
  if (projectStore.activeProjectId) {
    await Promise.all([
      folioStore.fetchFolios(projectStore.activeProjectId),
      loreStore.fetchLore(projectStore.activeProjectId),
      trashStore.fetchTrash(projectStore.activeProjectId),
      scratchpadStore.fetchNotes(projectStore.activeProjectId),
      rulesStore.fetchRules(projectStore.activeProjectId)
    ])
    await goalsStore.fetchGoals(projectStore.activeProjectId)
  }
  // Smoothly hide splash screen after initial load
  setTimeout(() => {
    uiStore.setSplashLoading(false)
  }, 650)
})

onBeforeUnmount(async () => {
  window.removeEventListener('keydown', handleGlobalKeydown)
  if (hasPendingChanges.value) {
    await flushSave()
  }
})
</script>

<template>
  <div class="flex h-full w-full overflow-hidden bg-[var(--bg-base)] relative p-3 md:p-4">
    <!-- Modal para nuevo proyecto/libro -->
    <ProjectModal
      v-if="isProjectModalOpen"
      @close="isProjectModalOpen = false"
      @created="handleProjectChange"
    />

    <!-- ================================================================= -->
    <!-- COLUMNA 1: ÁRBOL DEL MANUSCRITO (CAPÍTULOS PLANOS - COLAPSIBLE)   -->
    <!-- ================================================================= -->
    <aside
      class="app-sidebar neu-surface flex flex-col overflow-hidden shrink-0"
      :class="[
        isDraggingLeft ? '' : 'transition-[width,padding,opacity,margin] duration-300 ease-in-out',
        uiStore.isLeftSidebarOpen
          ? 'p-3.5 gap-3'
          : 'w-0 p-0 m-0 border-0 opacity-0 pointer-events-none'
      ]"
      :style="{
        width: uiStore.isLeftSidebarOpen ? `${uiStore.leftSidebarWidth}px` : '0px'
      }"
    >
      <!-- Selector Personalizado de Libros -->
      <BookSelector
        @open-create-modal="isProjectModalOpen = true"
        @project-changed="handleProjectChange"
        @project-deleted="handleProjectDeleted"
      />

      <!-- Botón para añadir capítulo -->
      <button
        type="button"
        class="neu-btn-terracotta w-full py-2 px-3 flex items-center justify-center gap-2 text-xs shrink-0 active:scale-95 transition-transform cursor-pointer"
        title="Crear un nuevo capítulo en el manuscrito (Ctrl+Alt+N)"
        @click="handleCreateChapter('chapter')"
      >
        <Plus :size="14" />
        <span>Nuevo Capítulo</span>
      </button>

      <!-- Lista plana de Capítulos con Drag & Drop y Sub-navegación por * * * -->
      <div class="flex-1 overflow-y-auto space-y-2 pr-1 editorial-scrollbar">
        <div
          v-for="chap in folioStore.chapters"
          :key="chap.id"
          class="space-y-1 transition-all"
          draggable="true"
          @dragstart="onDragStartChapter($event, chap.id)"
          @dragover="onDragOverChapter($event, chap.id)"
          @dragleave="onDragLeaveChapter(chap.id)"
          @drop="onDropChapter($event, chap.id)"
          @dragend="onDragEndChapter"
        >
          <!-- Fila de Capítulo -->
          <div
            class="w-full p-2.5 rounded-xl flex flex-col gap-1.5 group transition-all cursor-pointer relative"
            :class="[
              folioStore.activeFolioId === chap.id
                ? 'neu-well border-l-4 !border-l-[var(--accent)] shadow-inner'
                : 'neu-btn',
              dragOverChapterId === chap.id ? 'ring-2 ring-[var(--accent)]/60 scale-[1.01]' : '',
              draggedChapterId === chap.id ? 'opacity-50' : ''
            ]"
            @click="selectChapter(chap)"
            @dblclick.stop="startInlineEdit(chap)"
          >
            <!-- Línea 1: Drag handle, Punto de Estado, Icono de Tipo, Título editable y Acciones -->
            <div class="flex items-center justify-between gap-2 min-w-0">
              <div class="flex items-center gap-1.5 min-w-0 flex-1">
                <GripVertical
                  :size="12"
                  class="text-[var(--text-muted)] opacity-40 group-hover:opacity-90 shrink-0 cursor-grab"
                  title="Arrastrar para reordenar capítulo"
                />

                <!-- Punto de color según estado (Borrador/En curso/Finalizado) -->
                <span
                  class="w-2 h-2 rounded-full shrink-0"
                  :class="getStatusDotColor(chap.status)"
                  :title="`Estado: ${getStatusLabel(chap.status)}`"
                ></span>

                <!-- Edición rápida en línea o título truncado -->
                <input
                  v-if="inlineEditingId === chap.id"
                  :id="`inline-title-${chap.id}`"
                  v-model="inlineTitleDraft"
                  type="text"
                  class="w-full bg-[var(--bg-base)] px-1.5 py-0.5 rounded text-xs font-editorial font-bold text-[var(--text-primary)] border border-[var(--accent)] focus:outline-none"
                  @click.stop
                  @keydown.enter.prevent="commitInlineEdit(chap)"
                  @keydown.esc.prevent="cancelInlineEdit"
                  @blur="commitInlineEdit(chap)"
                />
                <span
                  v-else
                  class="font-editorial text-xs font-bold text-[var(--text-primary)] truncate"
                  :title="`${chap.title} (Doble clic para renombrar)`"
                >
                  {{ chap.title }}
                </span>
              </div>

              <!-- Botones rápidos del capítulo: Renombrar y Papelera -->
              <div class="flex items-center gap-1 shrink-0" @click.stop>
                <button
                  type="button"
                  class="w-6 h-6 rounded-lg neu-btn flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--accent)] opacity-0 group-hover:opacity-100 transition-all cursor-pointer active:scale-95"
                  title="Renombrar título del capítulo"
                  @click="startInlineEdit(chap)"
                >
                  <Pencil :size="10" />
                </button>
                <button
                  type="button"
                  class="w-6 h-6 rounded-lg neu-btn flex items-center justify-center text-[var(--text-muted)] hover:!text-rose-400 transition-all cursor-pointer active:scale-95"
                  title="Mover capítulo a papelera"
                  @click="trashStore.moveToTrash(chap.id, 'folio')"
                >
                  <Trash2 :size="11" />
                </button>
              </div>
            </div>

            <!-- Línea 2: Estado y conteo de palabras + tiempo estimado de lectura -->
            <div class="flex items-center justify-between gap-2 pl-4 text-[10px] font-mono">
              <span class="text-[var(--text-muted)] truncate">
                {{ getStatusLabel(chap.status) }}
              </span>

              <!-- Conteo de palabras y tiempo de lectura estimado -->
              <span class="text-[var(--text-muted)] shrink-0">
                {{
                  (folioStore.activeFolioId === chap.id ? wordCount : chap.wordCount).toLocaleString(
                    'es-ES'
                  )
                }}
                pal. ·
                {{
                  formatSidebarReadingTime(
                    folioStore.activeFolioId === chap.id ? wordCount : chap.wordCount
                  )
                }}
              </span>
            </div>
          </div>

          <!-- Sub-navegación Dinámica por SceneBreak (* * *) para el capítulo activo -->
          <div
            v-if="folioStore.activeFolioId === chap.id && activeTramoAnchors.length > 0"
            class="pl-3.5 ml-3.5 border-l border-[var(--groove-dark)]/50 space-y-1 pt-0.5"
          >
            <button
              v-for="tramo in activeTramoAnchors"
              :key="tramo.index"
              type="button"
              class="w-full px-2.5 py-1.5 rounded-lg text-left text-[11px] flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-[var(--bg-base)]/50 transition-all cursor-pointer group/tramo"
              :title="`Saltar a ${tramo.romanLabel}: ${tramo.snippet}`"
              @click.stop="scrollToTramo(tramo.index)"
            >
              <Sparkles :size="10" class="text-[var(--accent)] opacity-70 shrink-0" />
              <span class="font-mono text-[10px] font-bold text-[var(--accent)] shrink-0">
                {{ tramo.romanLabel }}
              </span>
              <span class="truncate italic text-[10px] text-[var(--text-muted)] group-hover/tramo:text-[var(--text-secondary)]">
                {{ tramo.snippet }}
              </span>
            </button>
          </div>
        </div>

        <!-- Empty State si no hay capítulos -->
        <div
          v-if="folioStore.chapters.length === 0"
          class="h-40 flex flex-col items-center justify-center text-center p-4 text-[var(--text-muted)] space-y-2 neu-well rounded-xl"
        >
          <Bookmark :size="20" class="opacity-40" />
          <p class="text-xs">No hay capítulos en este libro</p>
          <button
            type="button"
            class="text-xs text-[var(--accent)] hover:underline cursor-pointer"
            @click="handleCreateChapter('chapter')"
          >
            Comenzar Capítulo I
          </button>
        </div>
      </div>

      <!-- Botón sutil neumórfico: Papelera de Reciclaje -->
      <button
        type="button"
        class="neu-btn w-full py-2 px-2.5 flex items-center justify-between text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] shrink-0 transition-all active:scale-[0.98] group cursor-pointer"
        title="Abrir Papelera de Reciclaje"
        @click="trashStore.openModal(projectStore.activeProjectId)"
      >
        <div class="flex items-center gap-2 min-w-0">
          <Trash2
            :size="13"
            class="text-[var(--accent)] shrink-0 group-hover:scale-110 transition-transform"
          />
          <span class="truncate font-editorial font-medium">Papelera de Reciclaje</span>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <span
            v-if="trashStore.totalCount > 0"
            class="neu-well-sm px-1.5 py-0.2 text-[9px] font-mono text-[var(--accent)] rounded-full"
            title="Elementos en la papelera"
          >
            {{ trashStore.totalCount }}
          </span>
        </div>
      </button>

      <!-- Pie del Sidebar Izquierdo con atajo de teclado visible -->
      <div class="neu-groove-h"></div>
      <div
        class="flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)] shrink-0"
      >
        <span>
          {{ folioStore.chapters.length }}
          {{ folioStore.chapters.length === 1 ? 'capítulo' : 'capítulos' }} ·
          {{ folioStore.totalManuscriptWords.toLocaleString('es-ES') }} pal.
        </span>
        <span
          class="neu-well-sm px-1.5 py-0.5 text-[9px] text-[var(--text-secondary)] font-semibold flex items-center gap-1"
        >
          <strong class="text-[var(--accent)]">Ctrl+1</strong>: Panel
        </span>
      </div>
    </aside>

    <!-- SEPARADOR / RESIZER REDIMENSIONABLE: MANUSCRITO (IZQUIERDA) -->
    <Transition
      enter-active-class="transition-[width,opacity] duration-300 ease-in-out overflow-hidden"
      enter-from-class="!w-0 opacity-0"
      enter-to-class="w-3 md:w-3.5 opacity-100"
      leave-active-class="transition-[width,opacity] duration-300 ease-in-out overflow-hidden"
      leave-from-class="w-3 md:w-3.5 opacity-100"
      leave-to-class="!w-0 opacity-0"
    >
      <PanelResizer
        v-if="uiStore.isLeftSidebarOpen"
        class="app-sidebar"
        side="left"
        :current-width="uiStore.leftSidebarWidth"
        :min-width="uiStore.MIN_LEFT_WIDTH"
        :max-width="maxAllowedLeftWidth"
        label="Ajustar ancho del árbol de manuscrito"
        @update:width="uiStore.setLeftSidebarWidth"
        @drag-start="isDraggingLeft = true"
        @drag-end="isDraggingLeft = false"
        @reset="uiStore.resetLeftSidebarWidth"
      />
    </Transition>

    <!-- ================================================================= -->
    <!-- COLUMNA 2: LIENZO EDITORIAL DE ESCRITURA (CENTRAL, max-w-3xl)     -->
    <!-- ================================================================= -->
    <main
      class="flex-1 h-full min-w-0 flex flex-col neu-surface p-4 md:p-6 gap-4 overflow-hidden relative"
    >
      <template v-if="folioStore.activeFolio">
        <!-- Cabecera de Herramientas del Editor -->
        <header class="editor-metadata flex items-center justify-between gap-3 shrink-0">
          <div class="flex items-center gap-2 min-w-0">
            <Bookmark :size="14" class="text-[var(--accent)] shrink-0" />
            <span class="text-xs text-[var(--text-muted)] font-mono shrink-0">
              {{ projectStore.activeProject?.title }} /
            </span>
            <span class="text-xs font-semibold text-[var(--text-primary)] truncate font-editorial">
              {{ editFolioTitle || 'Sin título' }}
            </span>
          </div>

          <!-- Controles Superiores de Capítulo y Guardado -->
          <div class="flex items-center gap-2 shrink-0">
            <!-- Conmutador: Modo Enfoque por Párrafo -->
            <button
              type="button"
              class="neu-btn px-2.5 py-1 text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              :class="{
                'neu-well !text-[var(--accent)] font-semibold border-[var(--accent)]/40':
                  uiStore.isFocusMode,
                'text-[var(--text-secondary)] hover:text-[var(--text-primary)]':
                  !uiStore.isFocusMode
              }"
              :title="
                uiStore.isFocusMode
                  ? 'Desactivar Modo Enfoque por Párrafo (Ctrl+Shift+F)'
                  : 'Activar Modo Enfoque por Párrafo (Ctrl+Shift+F)'
              "
              @click="uiStore.toggleFocusMode"
            >
              <Eye :size="13" />
              <span class="text-[11px] font-medium hidden md:inline">Enfoque</span>
            </button>

            <!-- Botón Buscar en capítulo (Ctrl+F) -->
            <button
              type="button"
              class="neu-btn px-2.5 py-1 text-xs flex items-center gap-1.5 transition-all cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              :class="{
                'neu-well !text-[var(--accent)] font-semibold': findBarRef?.isVisible
              }"
              title="Buscar palabra en el capítulo actual (Ctrl+F)"
              @click="handleOpenFindBar"
            >
              <Search :size="13" />
              <span class="text-[11px] font-medium hidden md:inline">Buscar</span>
              <kbd class="neu-well-sm text-[9px] font-mono px-1 text-[var(--text-muted)]">Ctrl+F</kbd>
            </button>

            <button
              type="button"
              class="neu-btn p-2 text-[var(--text-secondary)] hover:!text-rose-400 cursor-pointer"
              title="Mover capítulo a papelera"
              @click="trashStore.moveToTrash(folioStore.activeFolio.id, 'folio')"
            >
              <Trash2 :size="13" />
            </button>

            <!-- Indicador sutil de Autoguardado & Guardado Manual -->
            <button
              type="button"
              class="neu-btn px-3 py-1.5 text-xs flex items-center gap-2 transition-all cursor-pointer group"
              :class="{
                'neu-well border-amber-500/40 text-amber-500': saveStatus === 'pending',
                'neu-well border-[var(--accent)]/40 text-[var(--accent)]': saveStatus === 'saving',
                'text-[var(--text-secondary)] hover:text-[var(--text-primary)]':
                  saveStatus === 'saved'
              }"
              title="Forzar guardado manual inmediato (Ctrl+S)"
              @click="handleManualSave"
            >
              <span class="relative flex h-2 w-2">
                <span
                  v-if="saveStatus === 'saving'"
                  class="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75"
                ></span>
                <span
                  class="relative inline-flex rounded-full h-2 w-2 transition-colors duration-200"
                  :class="{
                    'bg-amber-400': saveStatus === 'pending',
                    'bg-[var(--accent)]': saveStatus === 'saving',
                    'bg-emerald-500': saveStatus === 'saved',
                    'bg-rose-500': saveStatus === 'error'
                  }"
                ></span>
              </span>

              <span class="text-[11px] font-mono select-none">
                <template v-if="saveStatus === 'saving'">Guardando...</template>
                <template v-else-if="saveStatus === 'pending'">Sin guardar...</template>
                <template v-else-if="saveStatus === 'error'">Error en SQLite</template>
                <template v-else
                  >Guardado local {{ lastSavedTime ? `· ${lastSavedTime}` : '' }}</template
                >
              </span>

              <span
                class="text-[9px] font-mono px-1 py-0.2 rounded neu-well-sm text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors opacity-75"
              >
                Ctrl+S
              </span>
            </button>
          </div>
        </header>

        <div class="neu-groove-h"></div>

        <!-- Barra de Herramientas Editorial Superior -->
        <EditorToolbar class="editor-toolbar" :editor="activeEditor" />

        <div class="neu-groove-h"></div>

        <!-- Papel / Lienzo Hundido Editorial -->
        <div class="flex-1 flex flex-col neu-well overflow-hidden relative min-h-0">
          <!-- Barra de Búsqueda Rápida en Capítulo (Ctrl+F estilo VS Code) -->
          <EditorFindBar ref="findBarRef" :editor="activeEditor" />

          <!-- Popover flotante Hover Preview para entidades de la Wiki de Lore -->
          <WikiHoverPreview
            ref="wikiHoverPreviewRef"
            @navigate="handleWikiNavigate"
          />

          <!-- Cabecera Editorial de Capítulo Integrada (con formato sincronizado con PDF) -->
          <div
            class="shrink-0 px-6 md:px-8 pt-5 md:pt-6 pb-3.5 bg-[var(--bg-base)] transition-colors"
            :class="
              effectiveChapterTitleFormat.showDivider
                ? 'border-b border-[var(--groove-dark)]/40'
                : 'border-b-0'
            "
          >
            <div class="max-w-3xl mx-auto w-full relative space-y-2">
              <!-- 1. Título del Capítulo (Alineación, Fuente, Tamaño decimal y Color configurables) -->
              <input
                ref="titleInputRef"
                v-model="editFolioTitle"
                type="text"
                placeholder="Título del capítulo..."
                class="chapter-title font-editorial font-bold bg-transparent border-none focus:outline-none placeholder:text-[var(--text-muted)]/50 w-full tracking-tight leading-tight transition-all"
                :style="{
                  textAlign: effectiveChapterTitleFormat.alignment,
                  fontFamily: effectiveChapterTitleFormat.fontFamily || undefined,
                  fontSize: `${effectiveChapterTitleFormat.fontSize}px`,
                  color: effectiveChapterTitleFormat.color || 'var(--text-primary)'
                }"
                @input="onEditorInput"
                @keydown.enter.prevent="tiptapEditorRef?.focus()"
                @keydown.down="tiptapEditorRef?.focus()"
              />

              <!-- 2. Subtítulo / Epígrafe Opcional en cursiva sutil debajo del título -->
              <input
                v-model="editFolioSubtitle"
                type="text"
                placeholder="Subtítulo o epígrafe opcional (ej. «Donde las cenizas hablan...»)"
                class="editor-metadata font-editorial italic text-sm md:text-base text-[var(--text-secondary)] bg-transparent border-none focus:outline-none placeholder:text-[var(--text-muted)]/45 w-full transition-all"
                :style="{
                  textAlign: effectiveChapterTitleFormat.alignment
                }"
                @input="onEditorInput"
                @keydown.enter.prevent="tiptapEditorRef?.focus()"
              />

              <!-- 3. Fila de Estado, Diseño de Título y Metadatos Discretos (Línea temporal / Fecha y Ubicación) -->
              <div
                class="editor-metadata flex flex-wrap items-center gap-2 pt-0.5 select-none"
                :class="{
                  'justify-start': effectiveChapterTitleFormat.alignment === 'left',
                  'justify-center': effectiveChapterTitleFormat.alignment === 'center',
                  'justify-end': effectiveChapterTitleFormat.alignment === 'right'
                }"
              >
                <div ref="statusDropdownRef" class="relative inline-flex items-center">
                  <button
                    type="button"
                    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg neu-btn text-[11px] font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                    title="Cambiar estado del capítulo"
                    @click="isStatusDropdownOpen = !isStatusDropdownOpen"
                  >
                    <span
                      class="w-2 h-2 rounded-full shrink-0"
                      :class="currentStatusObj.color"
                    ></span>
                    <span>{{ currentStatusObj.label }}</span>
                    <ChevronDown
                      :size="11"
                      class="text-[var(--text-muted)] transition-transform duration-150 shrink-0"
                      :class="{ 'rotate-180': isStatusDropdownOpen }"
                    />
                  </button>

                  <Transition
                    enter-active-class="transition duration-100 ease-out"
                    enter-from-class="opacity-0 scale-95"
                    enter-to-class="opacity-100 scale-100"
                    leave-active-class="transition duration-75 ease-in"
                    leave-from-class="opacity-100 scale-100"
                    leave-to-class="opacity-0 scale-95"
                  >
                    <div
                      v-if="isStatusDropdownOpen"
                      class="absolute left-0 top-full mt-1.5 z-50 neu-surface p-1 min-w-[135px] shadow-xl border border-[var(--groove-dark)]/50"
                    >
                      <button
                        v-for="opt in statusOptions"
                        :key="opt.value"
                        type="button"
                        class="w-full px-2.5 py-1.5 rounded-lg text-left text-xs flex items-center justify-between gap-2 hover:bg-[var(--bg-base)] transition-colors cursor-pointer"
                        :class="
                          opt.value === editFolioStatus
                            ? 'text-[var(--accent)] font-semibold neu-well-sm'
                            : 'text-[var(--text-primary)]'
                        "
                        @click="setFolioStatus(opt.value)"
                      >
                        <div class="flex items-center gap-2">
                          <span
                            class="w-2 h-2 rounded-full shrink-0"
                            :class="opt.color"
                          ></span>
                          <span>{{ opt.label }}</span>
                        </div>
                        <Check
                          v-if="opt.value === editFolioStatus"
                          :size="12"
                          class="text-[var(--accent)] shrink-0"
                        />
                      </button>
                    </div>
                  </Transition>
                </div>

                <!-- Ajustes de Formato para el Título del Capítulo (Libro Global / Capítulo Individual) -->
                <ChapterTitleFormatPopover
                  :global-format="uiStore.chapterTitleFormat"
                  :chapter-override="editFolioTitleFormat"
                  @update:global-format="handleUpdateGlobalTitleFormat"
                  @update:chapter-override="handleUpdateChapterTitleFormat"
                />

                <!-- Separador sutil -->
                <span class="text-[var(--text-muted)]/35 font-mono text-xs select-none">·</span>

                <!-- Metadato discreto 1: Línea temporal / Fecha -->
                <div class="inline-flex items-center">
                  <button
                    v-if="!editFolioTimeline && !isTimelineFocused"
                    type="button"
                    class="inline-flex items-center justify-center w-6 h-6 rounded-md text-[var(--text-muted)]/70 hover:text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]/60 transition-all cursor-pointer"
                    title="Añadir fecha o línea temporal..."
                    @click="openTimelineInput"
                  >
                    <Clock :size="12" />
                  </button>
                  <label
                    v-else
                    class="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-md text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]/40 focus-within:bg-[var(--bg-surface)]/70 transition-colors"
                  >
                    <Clock :size="12" class="text-[var(--text-muted)] shrink-0" />
                    <input
                      ref="timelineInputRef"
                      v-model="editFolioTimeline"
                      type="text"
                      placeholder="Añadir fecha/momento..."
                      class="bg-transparent border-none focus:outline-none text-xs text-[var(--text-secondary)] focus:text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/50 font-sans min-w-[90px]"
                      :style="{
                        width: editFolioTimeline
                          ? `${Math.min(28, Math.max(8, editFolioTimeline.length + 1))}ch`
                          : '16ch'
                      }"
                      @focus="isTimelineFocused = true"
                      @input="onEditorInput"
                      @blur="handleTimelineBlur"
                      @keydown.enter.prevent="($event.target as HTMLInputElement).blur()"
                    />
                  </label>
                </div>

                <!-- Metadato discreto 2: Ubicación -->
                <div class="inline-flex items-center">
                  <button
                    v-if="!editFolioLocation && !isLocationFocused"
                    type="button"
                    class="inline-flex items-center justify-center w-6 h-6 rounded-md text-[var(--text-muted)]/70 hover:text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]/60 transition-all cursor-pointer"
                    title="Añadir ubicación..."
                    @click="openLocationInput"
                  >
                    <MapPin :size="12" />
                  </button>
                  <label
                    v-else
                    class="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-md text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]/40 focus-within:bg-[var(--bg-surface)]/70 transition-colors"
                  >
                    <MapPin :size="12" class="text-[var(--text-muted)] shrink-0" />
                    <input
                      ref="locationInputRef"
                      v-model="editFolioLocation"
                      type="text"
                      placeholder="Añadir ubicación..."
                      class="bg-transparent border-none focus:outline-none text-xs text-[var(--text-secondary)] focus:text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/50 font-sans min-w-[80px]"
                      :style="{
                        width: editFolioLocation
                          ? `${Math.min(28, Math.max(8, editFolioLocation.length + 1))}ch`
                          : '14ch'
                      }"
                      @focus="isLocationFocused = true"
                      @input="onEditorInput"
                      @blur="handleLocationBlur"
                      @keydown.enter.prevent="($event.target as HTMLInputElement).blur()"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          <!-- Contenedor con Scroll SÓLO para el texto del editor -->
          <div
            ref="scrollContainerRef"
            class="flex-1 overflow-y-auto editorial-scrollbar px-6 md:px-8 py-5 md:py-6"
          >
            <div class="max-w-3xl mx-auto w-full flex-1 flex flex-col relative">
              <TiptapEditor
                ref="tiptapEditorRef"
                v-model:content="editFolioContent"
                :scroll-container="scrollContainerRef"
                :wiki-entities="wikiAutoLinkEntities"
                placeholder="Empieza a escribir tu capítulo..."
                @ready="onEditorReady"
                @stats="handleEditorStats"
                @scene-breaks="handleSceneBreakAnchors"
                @change="onEditorInput"
                @save="handleManualSave"
                @open-find="handleOpenFindBar"
                @wiki-hover="handleWikiHover"
                @wiki-leave="handleWikiLeave"
                @wiki-click="(entity) => handleWikiNavigate(entity)"
              />
            </div>
          </div>
        </div>

        <!-- Barra de Estado Inferior ANCLADA AL BOTTOM DE LA CAJA CENTRAL -->
        <div class="neu-groove-h"></div>
        <footer
          class="status-bar editor-metadata shrink-0 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-[var(--text-muted)] select-none pt-0.5"
        >
          <div class="flex items-center gap-3">
            <span>{{ formattedWordCount }} palabras</span>
            <span>·</span>
            <span
              class="inline-flex items-center gap-1 font-semibold text-[var(--accent)]"
              title="Palabras netas añadidas en la sesión activa"
            >
              <Flame :size="12" class="text-[var(--accent)] shrink-0" />
              +{{ folioStore.sessionWordsAdded }} sesión
            </span>
            <span>·</span>
            <!-- Píldora de Progreso y Racha Diaria -->
            <GoalsProgressPill />
            <span>·</span>
            <span :title="charDetailsTooltip">{{ charCount.toLocaleString('es-ES') }} caracteres</span>
            <span>·</span>
            <span class="text-[var(--accent)] opacity-85">{{ readingTimeLabel }}</span>
          </div>

          <div class="flex items-center gap-2">
            <span
              class="neu-well-sm px-2 py-0.5 text-[9px] text-[var(--text-secondary)] font-semibold flex items-center gap-2"
            >
              <span><strong class="text-[var(--accent)]">Ctrl+S</strong>: Guardar</span>
              <span>·</span>
              <span><strong class="text-[var(--accent)]">Ctrl+Shift+F</strong>: Enfoque</span>
            </span>
          </div>
        </footer>
      </template>

      <!-- Estado Vacío cuando no hay capítulo activo -->
      <div v-else class="flex-1 flex flex-col items-center justify-center neu-well p-8 text-center">
        <div class="w-24 h-24 mb-4 flex items-center justify-center shrink-0 drop-shadow-xl">
          <FolioLogo />
        </div>
        <h3 class="font-editorial text-2xl font-bold text-[var(--text-primary)] mb-1">
          {{ projectStore.activeProject?.title || 'Bienvenido a Folio' }}
        </h3>
        <p class="text-xs text-[var(--text-muted)] max-w-sm mb-6">
          Selecciona un capítulo en el panel del manuscrito a la izquierda para comenzar a escribir.
        </p>

        <button
          type="button"
          class="neu-btn-terracotta py-2 px-5 text-xs flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
          @click="handleCreateChapter('chapter')"
        >
          <Plus :size="14" />
          <span>Crear Primer Capítulo</span>
        </button>
      </div>
    </main>

    <!-- SEPARADOR / RESIZER REDIMENSIONABLE: WIKI (DERECHA) -->
    <Transition
      enter-active-class="transition-[width,opacity] duration-300 ease-in-out overflow-hidden"
      enter-from-class="!w-0 opacity-0"
      enter-to-class="w-3 md:w-3.5 opacity-100"
      leave-active-class="transition-[width,opacity] duration-300 ease-in-out overflow-hidden"
      leave-from-class="w-3 md:w-3.5 opacity-100"
      leave-to-class="!w-0 opacity-0"
    >
      <PanelResizer
        v-if="uiStore.isRightSidebarOpen"
        class="app-sidebar"
        side="right"
        :current-width="uiStore.rightSidebarWidth"
        :min-width="uiStore.MIN_RIGHT_WIDTH"
        :max-width="maxAllowedRightWidth"
        label="Ajustar ancho de la wiki de lore y reglas"
        @update:width="uiStore.setRightSidebarWidth"
        @drag-start="isDraggingRight = true"
        @drag-end="isDraggingRight = false"
        @reset="uiStore.resetRightSidebarWidth"
      />
    </Transition>

    <!-- ================================================================= -->
    <!-- COLUMNA 3: WIKI / LORE INSPECTOR (COLAPSIBLE)                     -->
    <!-- ================================================================= -->
    <aside
      class="app-sidebar neu-surface flex flex-col overflow-hidden shrink-0"
      :class="[
        isDraggingRight ? '' : 'transition-[width,padding,opacity,margin] duration-300 ease-in-out',
        uiStore.isRightSidebarOpen
          ? 'p-3.5 gap-3'
          : 'w-0 p-0 m-0 border-0 opacity-0 pointer-events-none'
      ]"
      :style="{
        width: uiStore.isRightSidebarOpen ? `${uiStore.rightSidebarWidth}px` : '0px'
      }"
    >
      <WikiInspector />
    </aside>
  </div>
</template>
