<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useProjectStore } from '../stores/projectStore'
import { useFolioStore } from '../stores/folioStore'
import { useLoreStore } from '../stores/loreStore'
import { useUiStore } from '../stores/uiStore'
import { useDebounceFn, onClickOutside } from '@vueuse/core'
import ProjectModal from '../components/ProjectModal.vue'
import FolioLogo from '../components/FolioLogo.vue'
import BookSelector from '../components/BookSelector.vue'
import WikiInspector from '../components/WikiInspector.vue'
import {
  ChevronDown,
  ChevronRight,
  Plus,
  FileText,
  Bookmark,
  Trash2,
  Check,
  AlignVerticalSpaceAround,
  Eye,
  Flame
} from 'lucide-vue-next'
import { getCaretCoordinates } from '../utils/caret'
import type { Folio } from '@shared/types'

const projectStore = useProjectStore()
const folioStore = useFolioStore()
const loreStore = useLoreStore()
const uiStore = useUiStore()

const isProjectModalOpen = ref(false)
const expandedChapters = ref<Record<string, boolean>>({})

// Manuscript Editable States
const editFolioTitle = ref('')
const editFolioContent = ref('')
const editFolioSynopsis = ref('')
const editFolioStatus = ref('draft')
const isStatusDropdownOpen = ref(false)
const statusDropdownRef = ref<HTMLElement | null>(null)

onClickOutside(statusDropdownRef, () => {
  isStatusDropdownOpen.value = false
})

const statusOptions = [
  { value: 'draft', label: 'Borrador', color: 'bg-amber-500' },
  { value: 'in_progress', label: 'En curso', color: 'bg-sky-500' },
  { value: 'completed', label: 'Finalizado', color: 'bg-emerald-500' }
]

const currentStatusObj = computed(() => {
  return statusOptions.find((o) => o.value === editFolioStatus.value) || statusOptions[0]
})

function setFolioStatus(status: string): void {
  editFolioStatus.value = status
  isStatusDropdownOpen.value = false
  onEditorInput()
}

// Save states & indicators
type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error'
const saveStatus = ref<SaveStatus>('saved')
const lastSavedTime = ref<string>('')
const hasPendingChanges = ref(false)
let isSyncing = false

// Input DOM references for focus and scroll control
const titleInputRef = ref<HTMLInputElement | null>(null)
const contentInputRef = ref<HTMLTextAreaElement | null>(null)
const scrollContainerRef = ref<HTMLElement | null>(null)
const cursorPosition = ref(0)

// =========================================================================
// MODO MÁQUINA DE ESCRIBIR: CENTRADO BLOQUEADO DEL CURSOR EN EL MEDIO
// =========================================================================
function syncTypewriterCenter(instant = false): void {
  if (!uiStore.isTypewriterMode || !contentInputRef.value || !scrollContainerRef.value) return

  const container = scrollContainerRef.value
  const textarea = contentInputRef.value
  const pos = textarea.selectionStart ?? 0

  const coords = getCaretCoordinates(textarea, pos)
  const containerRect = container.getBoundingClientRect()
  const textareaRect = textarea.getBoundingClientRect()

  // Coordenada Y absoluta del cursor en el viewport
  const caretViewportY = textareaRect.top + coords.top + coords.height / 2
  // Coordenada Y del centro exacto del viewport del contenedor
  const containerCenterY = containerRect.top + container.clientHeight / 2

  // Desfase entre el cursor y el centro vertical exacto
  const deltaY = caretViewportY - containerCenterY

  // Si el cursor se ha desplazado del centro por más de 1.5px, corregir inmediatamente el scroll
  if (Math.abs(deltaY) > 1.5) {
    const targetScrollTop = Math.max(0, container.scrollTop + deltaY)
    if (instant) {
      container.scrollTop = targetScrollTop
    } else {
      container.scrollTo({
        top: targetScrollTop,
        behavior: 'smooth'
      })
    }
  }
}

// =========================================================================
// MODO ENFOQUE: SPOTLIGHT LUMINOSO SOBRE EL PÁRRAFO ACTIVO
// =========================================================================
function getParagraphBounds(content: string, pos: number): { start: number; end: number } {
  if (!content) return { start: 0, end: 0 }
  const clampedPos = Math.max(0, Math.min(pos, content.length))

  const lastNewline = content.lastIndexOf('\n', clampedPos > 0 ? clampedPos - 1 : 0)
  const start = lastNewline === -1 ? 0 : lastNewline + 1

  const nextNewline = content.indexOf('\n', clampedPos)
  const end = nextNewline === -1 ? content.length : nextNewline

  return { start, end }
}

const focusSpotlightTop = ref(0)
const focusSpotlightBottom = ref(40)

function updateSpotlightPosition(): void {
  if (!contentInputRef.value) return
  const textarea = contentInputRef.value
  const content = editFolioContent.value || ''
  const pos = textarea.selectionStart ?? 0

  const { start, end } = getParagraphBounds(content, pos)
  const startCoords = getCaretCoordinates(textarea, start)
  const endCoords = getCaretCoordinates(textarea, Math.max(start, end === 0 ? 0 : end - 1))

  focusSpotlightTop.value = Math.max(0, startCoords.top - 6)
  focusSpotlightBottom.value = endCoords.top + endCoords.height + 6
}

// Estilo del velo de enfoque: atenuación elegante del resto del documento al 18% de contraste
const focusSpotlightStyle = computed(() => {
  if (!uiStore.isFocusMode) {
    return { display: 'none' }
  }
  const top = focusSpotlightTop.value
  const bottom = focusSpotlightBottom.value

  return {
    background: `linear-gradient(to bottom,
      var(--bg-base) 0px,
      var(--bg-base) ${Math.max(0, top - 10)}px,
      transparent ${top}px,
      transparent ${bottom}px,
      var(--bg-base) ${bottom + 10}px,
      var(--bg-base) 100%)`,
    opacity: 0.82
  }
})

// Controlador central de eventos de cursor
function onCaretMove(instant = false): void {
  if (!contentInputRef.value) return
  cursorPosition.value = contentInputRef.value.selectionStart ?? 0
  updateSpotlightPosition()
  if (uiStore.isTypewriterMode) {
    syncTypewriterCenter(instant)
  }
}

function adjustTextareaHeight(): void {
  if (!contentInputRef.value) return
  const el = contentInputRef.value
  el.style.height = 'auto'
  el.style.height = `${Math.max(350, el.scrollHeight)}px`
}

watch(
  () => uiStore.isTypewriterMode,
  (active) => {
    if (active) {
      nextTick(() => {
        onCaretMove(false)
      })
    }
  }
)

watch(
  () => uiStore.isFocusMode,
  (active) => {
    if (active) {
      nextTick(() => {
        updateSpotlightPosition()
      })
    }
  }
)

// Word, character count and estimated reading time
const wordCount = computed(() => {
  const text = editFolioContent.value.trim()
  if (!text) return 0
  return text.split(/\s+/).length
})

const charCount = computed(() => editFolioContent.value.length)

const readingTime = computed(() => {
  const words = wordCount.value
  if (words === 0) return 0
  return Math.max(1, Math.ceil(words / 200))
})

// Sync active folio when changed
watch(
  () => folioStore.activeFolio,
  (folio) => {
    isSyncing = true
    if (folio) {
      editFolioTitle.value = folio.title
      editFolioContent.value = folio.content
      editFolioSynopsis.value = folio.synopsis || ''
      editFolioStatus.value = folio.status || 'draft'
      saveStatus.value = 'saved'
      hasPendingChanges.value = false
      lastSavedTime.value = new Date(folio.updatedAt).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
      folioStore.recordBaseline(folio.id, folio.content || '')
      cursorPosition.value = 0
      nextTick(() => {
        adjustTextareaHeight()
        onCaretMove(true)
      })
    } else {
      editFolioTitle.value = ''
      editFolioContent.value = ''
      editFolioSynopsis.value = ''
      saveStatus.value = 'saved'
      hasPendingChanges.value = false
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
      const contentToSave = editFolioContent.value
      const synopsisToSave = editFolioSynopsis.value
      const statusToSave = editFolioStatus.value

      // Actualizar réplica reactiva en el store para zero-lag en el árbol
      const item = folioStore.folios.find((f) => f.id === targetId)
      if (item) {
        item.title = titleToSave
        item.content = contentToSave
        item.synopsis = synopsisToSave
        item.status = statusToSave
      }

      await folioStore.updateFolio({
        id: targetId,
        title: titleToSave,
        content: contentToSave,
        synopsis: synopsisToSave,
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
      target.synopsis = editFolioSynopsis.value
      target.status = editFolioStatus.value
      target.content = editFolioContent.value
    }
    folioStore.updateSessionWords(folioStore.activeFolioId, editFolioContent.value)
  }

  adjustTextareaHeight()
  onCaretMove(true)
  debouncedSave()
}

// Manejo reactivo de teclas en el área de escritura de prosa
function handleTextareaKeydown(e: KeyboardEvent): void {
  if (e.key === 'Tab') {
    e.preventDefault()
    const textarea = e.target as HTMLTextAreaElement
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const value = textarea.value
    const indent = '  '

    textarea.value = value.substring(0, start) + indent + value.substring(end)
    editFolioContent.value = textarea.value
    textarea.selectionStart = textarea.selectionEnd = start + indent.length
    onEditorInput()
    return
  }

  // Teclas de navegación que desplazan el cursor (Enter, Flechas, Retroceso)
  if (['Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Backspace', 'Delete'].includes(e.key)) {
    nextTick(() => {
      onCaretMove(false)
    })
  }
}

function onTitleFocus(): void {
  if (uiStore.isTypewriterMode && titleInputRef.value && scrollContainerRef.value) {
    const container = scrollContainerRef.value
    const titleEl = titleInputRef.value
    const containerRect = container.getBoundingClientRect()
    const titleRect = titleEl.getBoundingClientRect()
    const deltaY = titleRect.top + titleRect.height / 2 - (containerRect.top + container.clientHeight / 2)
    container.scrollTo({ top: Math.max(0, container.scrollTop + deltaY), behavior: 'smooth' })
  }
}

// Forzar guardado manual (Ctrl+S / Cmd+S)
async function handleManualSave(): Promise<void> {
  await flushSave()
}

// Crear nuevo folio rápido con el teclado (Ctrl+N / Cmd+N)
async function handleQuickNewFolio(): Promise<void> {
  if (!projectStore.activeProjectId) return

  if (hasPendingChanges.value) {
    await flushSave()
  }

  let targetChapterId: string | null = null
  if (folioStore.activeFolio) {
    if (folioStore.activeFolio.type === 'chapter') {
      targetChapterId = folioStore.activeFolio.id
    } else if (folioStore.activeFolio.parentId) {
      targetChapterId = folioStore.activeFolio.parentId
    }
  }

  if (!targetChapterId && folioStore.chapters.length > 0) {
    targetChapterId = folioStore.chapters[0].id
  }

  if (targetChapterId) {
    await handleCreateScene(targetChapterId)
  } else {
    await handleCreateChapter()
  }

  nextTick(() => {
    titleInputRef.value?.focus()
    titleInputRef.value?.select()
  })
}

// Listener de atajos de teclado globales de productividad
function handleGlobalKeydown(e: KeyboardEvent): void {
  const isCtrlOrCmd = e.ctrlKey || e.metaKey

  // Ctrl+Shift+T / Cmd+Shift+T: Alternar Modo Máquina de Escribir
  if (isCtrlOrCmd && e.shiftKey && e.key.toLowerCase() === 't') {
    e.preventDefault()
    uiStore.toggleTypewriterMode()
    return
  }

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

  // Ctrl+Alt+N / Cmd+Alt+N: Nuevo folio sin usar el ratón
  if (isCtrlOrCmd && e.altKey && e.key.toLowerCase() === 'n') {
    e.preventDefault()
    handleQuickNewFolio()
    return
  }
}

// Chapter expansion toggle
function toggleChapter(chapterId: string): void {
  expandedChapters.value[chapterId] = !isChapterExpanded(chapterId)
}

function isChapterExpanded(chapterId: string): boolean {
  return expandedChapters.value[chapterId] !== false // default expanded
}

// Selection Handlers con flush forzado previo para garantizar CERO pérdida de datos
async function selectSceneOrChapter(folio: Folio): Promise<void> {
  if (folioStore.activeFolioId === folio.id) return

  if (hasPendingChanges.value) {
    await flushSave()
  }

  folioStore.selectFolio(folio.id)
}

// Creation Handlers
async function handleCreateChapter(): Promise<void> {
  if (!projectStore.activeProjectId) return
  if (hasPendingChanges.value) {
    await flushSave()
  }
  const chapter = await folioStore.createChapter(projectStore.activeProjectId)
  if (chapter) {
    expandedChapters.value[chapter.id] = true
    await selectSceneOrChapter(chapter)
  }
}

async function handleCreateScene(chapterId: string): Promise<void> {
  if (!projectStore.activeProjectId) return
  if (hasPendingChanges.value) {
    await flushSave()
  }
  const scene = await folioStore.createScene(projectStore.activeProjectId, chapterId)
  if (scene) {
    expandedChapters.value[chapterId] = true
    await selectSceneOrChapter(scene)
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
    loreStore.fetchLore(projectId)
  ])
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
      loreStore.fetchLore(projectStore.activeProjectId)
    ])
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
  <div class="flex h-full w-full gap-3 md:gap-4 overflow-hidden bg-[var(--bg-base)] relative p-3 md:p-4">
    <!-- Modal para nuevo proyecto/libro -->
    <ProjectModal
      v-if="isProjectModalOpen"
      @close="isProjectModalOpen = false"
      @created="handleProjectChange"
    />

    <!-- ================================================================= -->
    <!-- COLUMNA 1: ÁRBOL DEL MANUSCRITO (CAPÍTULOS Y ESCENAS - COLAPSIBLE) -->
    <!-- ================================================================= -->
    <aside
      class="neu-surface flex flex-col overflow-hidden transition-all duration-300 ease-in-out shrink-0"
      :class="uiStore.isLeftSidebarOpen ? 'w-72 xl:w-80 p-4 gap-3.5' : 'w-0 p-0 m-0 border-0 opacity-0 pointer-events-none'"
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
        class="neu-btn-terracotta w-full py-2 px-3 flex items-center justify-center gap-2 text-xs shrink-0 active:scale-95 transition-transform"
        @click="handleCreateChapter"
      >
        <Plus :size="14" />
        <span>Nuevo Capítulo</span>
      </button>

      <!-- Árbol jerárquico de Capítulos y Escenas -->
      <div class="flex-1 overflow-y-auto space-y-2 pr-1 editorial-scrollbar">
        <div
          v-for="chap in folioStore.chapters"
          :key="chap.id"
          class="space-y-1"
        >
          <!-- Cabecera de Capítulo -->
          <div
            class="neu-btn w-full p-2.5 flex items-center justify-between group transition-all cursor-pointer"
            :class="folioStore.activeFolioId === chap.id ? 'is-active !border-[#C85A32]' : ''"
            @click="selectSceneOrChapter(chap)"
          >
            <div class="flex items-center gap-2 min-w-0">
              <button
                type="button"
                class="p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                @click.stop="toggleChapter(chap.id)"
              >
                <ChevronDown v-if="isChapterExpanded(chap.id)" :size="14" />
                <ChevronRight v-else :size="14" />
              </button>
              <span class="font-editorial text-xs font-bold text-[var(--text-primary)] truncate">
                {{ chap.title }}
              </span>
            </div>

            <!-- Botón rápido para agregar escena al capítulo -->
            <div class="flex items-center gap-1 shrink-0" @click.stop>
              <button
                type="button"
                class="p-1 rounded text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors opacity-0 group-hover:opacity-100"
                title="Añadir escena a este capítulo"
                @click="handleCreateScene(chap.id)"
              >
                <Plus :size="12" />
              </button>
            </div>
          </div>

          <!-- Lista de Escenas anidadas dentro del Capítulo -->
          <div
            v-if="isChapterExpanded(chap.id)"
            class="pl-3 space-y-1.5 border-l border-[var(--groove-dark)]/40 ml-3.5 mt-1"
          >
            <div
              v-for="scene in folioStore.getScenesForChapter(chap.id)"
              :key="scene.id"
              class="transition-all"
            >
              <!-- Escena activa (Hundida) -->
              <div
                v-if="folioStore.activeFolioId === scene.id"
                class="neu-well p-2.5 border-l-4 border-[#C85A32] cursor-pointer flex items-center justify-between gap-2"
                @click="selectSceneOrChapter(scene)"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <FileText :size="13" class="text-[var(--accent)] shrink-0" />
                  <span class="text-xs font-medium text-[var(--text-primary)] truncate">
                    {{ scene.title }}
                  </span>
                </div>
                <span class="text-[9px] font-mono px-1.5 py-0.5 rounded neu-well-sm text-[var(--text-muted)] shrink-0 uppercase">
                  {{ scene.status }}
                </span>
              </div>

              <!-- Escena inactiva -->
              <div
                v-else
                role="button"
                tabindex="0"
                class="neu-btn w-full p-2 text-left flex items-center justify-between text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] group cursor-pointer"
                @click="selectSceneOrChapter(scene)"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <FileText :size="12" class="opacity-40 shrink-0" />
                  <span class="truncate">{{ scene.title }}</span>
                </div>
                <button
                  type="button"
                  class="p-1 opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-rose-400 transition-opacity"
                  title="Mover a papelera"
                  @click.stop="folioStore.moveToTrash(scene.id)"
                >
                  <Trash2 :size="11" />
                </button>
              </div>
            </div>

            <!-- Botón rápido para agregar escena si no hay -->
            <button
              v-if="folioStore.getScenesForChapter(chap.id).length === 0"
              type="button"
              class="w-full py-1.5 text-[11px] text-[var(--text-muted)] hover:text-[var(--accent)] italic text-left pl-2 transition-colors flex items-center gap-1.5"
              @click="handleCreateScene(chap.id)"
            >
              <Plus :size="11" />
              <span>Crear primera escena</span>
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
            @click="handleCreateChapter"
          >
            Comenzar Capítulo I
          </button>
        </div>
      </div>

      <!-- Pie del Sidebar Izquierdo con atajo de teclado visible -->
      <div class="neu-groove-h"></div>
      <div class="flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)] shrink-0">
        <span>{{ folioStore.chapters.length }} caps · {{ folioStore.folios.length }} docs</span>
        <span class="neu-well-sm px-1.5 py-0.5 text-[9px] text-[var(--text-secondary)] font-semibold flex items-center gap-1">
          <strong class="text-[var(--accent)]">Ctrl+B</strong>: Ocultar árbol
        </span>
      </div>
    </aside>

    <!-- ================================================================= -->
    <!-- COLUMNA 2: LIENZO EDITORIAL DE ESCRITURA (CENTRAL, max-w-3xl)     -->
    <!-- ================================================================= -->
    <main class="flex-1 h-full min-w-0 flex flex-col neu-surface p-4 md:p-6 gap-4 overflow-hidden relative">
      <template v-if="folioStore.activeFolio">
        <!-- Cabecera de Herramientas del Editor -->
        <header
          class="flex items-center justify-between gap-3 shrink-0 transition-opacity duration-300"
          :class="{ 'opacity-25 hover:opacity-100': uiStore.isFocusMode }"
        >
          <div class="flex items-center gap-2 min-w-0">
            <Bookmark :size="14" class="text-[var(--accent)] shrink-0" />
            <span class="text-xs text-[var(--text-muted)] font-mono shrink-0">
              {{ projectStore.activeProject?.title }} /
            </span>
            <span class="text-xs font-semibold text-[var(--text-primary)] truncate font-editorial">
              {{ folioStore.activeFolio.title || 'Sin título' }}
            </span>
          </div>

          <!-- Controles de Escena -->
          <div class="flex items-center gap-2 shrink-0">
            <!-- Selector de estado personalizado táctil -->
            <div ref="statusDropdownRef" class="relative">
              <button
                type="button"
                class="neu-well-sm px-2.5 py-1 text-xs text-[var(--text-secondary)] flex items-center gap-1.5 cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                @click="isStatusDropdownOpen = !isStatusDropdownOpen"
              >
                <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="currentStatusObj.color"></span>
                <span class="font-medium text-[11px]">{{ currentStatusObj.label }}</span>
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
                  class="absolute right-0 top-full mt-1.5 z-50 neu-surface p-1 min-w-[125px] shadow-xl border border-[var(--groove-dark)]/50 backdrop-blur-md"
                >
                  <button
                    v-for="opt in statusOptions"
                    :key="opt.value"
                    type="button"
                    class="w-full px-2 py-1.5 rounded-lg text-left text-xs flex items-center justify-between gap-2 hover:bg-[var(--bg-base)] transition-colors cursor-pointer"
                    :class="opt.value === editFolioStatus ? 'text-[var(--accent)] font-semibold neu-well-sm' : 'text-[var(--text-primary)]'"
                    @click="setFolioStatus(opt.value)"
                  >
                    <div class="flex items-center gap-2">
                      <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="opt.color"></span>
                      <span>{{ opt.label }}</span>
                    </div>
                    <Check v-if="opt.value === editFolioStatus" :size="12" class="text-[var(--accent)] shrink-0" />
                  </button>
                </div>
              </Transition>
            </div>

            <!-- Conmutador: Modo Máquina de Escribir -->
            <button
              type="button"
              class="neu-btn px-2.5 py-1 text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              :class="{
                'neu-well !text-[var(--accent)] font-semibold border-[var(--accent)]/40': uiStore.isTypewriterMode,
                'text-[var(--text-secondary)] hover:text-[var(--text-primary)]': !uiStore.isTypewriterMode
              }"
              :title="uiStore.isTypewriterMode ? 'Desactivar Modo Máquina de Escribir (Ctrl+Shift+T)' : 'Activar Modo Máquina de Escribir (Ctrl+Shift+T)'"
              @click="uiStore.toggleTypewriterMode"
            >
              <AlignVerticalSpaceAround :size="13" />
              <span class="text-[11px] font-medium hidden md:inline">Máquina</span>
            </button>

            <!-- Conmutador: Modo Enfoque por Párrafo -->
            <button
              type="button"
              class="neu-btn px-2.5 py-1 text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              :class="{
                'neu-well !text-[var(--accent)] font-semibold border-[var(--accent)]/40': uiStore.isFocusMode,
                'text-[var(--text-secondary)] hover:text-[var(--text-primary)]': !uiStore.isFocusMode
              }"
              :title="uiStore.isFocusMode ? 'Desactivar Modo Enfoque por Párrafo (Ctrl+Shift+F)' : 'Activar Modo Enfoque por Párrafo (Ctrl+Shift+F)'"
              @click="uiStore.toggleFocusMode"
            >
              <Eye :size="13" />
              <span class="text-[11px] font-medium hidden md:inline">Enfoque</span>
            </button>

            <button
              type="button"
              class="neu-btn p-2 text-[var(--text-secondary)] hover:!text-rose-400 cursor-pointer"
              title="Mover escena a papelera"
              @click="folioStore.moveToTrash(folioStore.activeFolio.id)"
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
                'text-[var(--text-secondary)] hover:text-[var(--text-primary)]': saveStatus === 'saved'
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
                <template v-else>Guardado local {{ lastSavedTime ? `· ${lastSavedTime}` : '' }}</template>
              </span>

              <span class="text-[9px] font-mono px-1 py-0.2 rounded neu-well-sm text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors opacity-75">
                Ctrl+S
              </span>
            </button>
          </div>
        </header>

        <div class="neu-groove-h"></div>

        <!-- Papel / Lienzo Hundido con scrollbar editorial delgado y centrado en Modo Máquina -->
        <div
          ref="scrollContainerRef"
          class="flex-1 flex flex-col neu-well p-6 md:p-8 overflow-y-auto editorial-scrollbar transition-all duration-300"
          :class="{ 'typewriter-active': uiStore.isTypewriterMode }"
        >
          <div class="max-w-3xl mx-auto w-full flex-1 flex flex-col transition-all duration-300 relative">
            <!-- Insignia flotante sutil de Modo Enfoque -->
            <Transition
              enter-active-class="transition duration-200 ease-out"
              enter-from-class="opacity-0 translate-y-[-4px]"
              enter-to-class="opacity-100 translate-y-0"
              leave-active-class="transition duration-150 ease-in"
              leave-from-class="opacity-100 translate-y-0"
              leave-to-class="opacity-0 translate-y-[-4px]"
            >
              <div
                v-if="uiStore.isFocusMode"
                class="absolute -top-3 right-0 z-20 pointer-events-none flex items-center gap-1.5 px-2.5 py-1 rounded-full neu-well-sm text-[10px] font-mono text-[var(--accent)] tracking-wide shadow-sm"
              >
                <span class="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse"></span>
                <span>Enfoque en párrafo</span>
              </div>
            </Transition>

            <!-- Título de la escena / capítulo -->
            <input
              ref="titleInputRef"
              v-model="editFolioTitle"
              type="text"
              placeholder="Título del capítulo o escena..."
              class="font-editorial text-3xl md:text-4xl font-bold text-[var(--text-primary)] bg-transparent border-none focus:outline-none mb-2 placeholder:text-[var(--text-muted)]/50 w-full tracking-tight"
              @input="onEditorInput"
              @focus="onTitleFocus"
            />

            <!-- Sinopsis o nota de la escena (opcional) -->
            <input
              v-model="editFolioSynopsis"
              type="text"
              placeholder="Sinopsis o nota de la escena..."
              class="text-xs font-mono text-[var(--text-muted)] bg-transparent border-none focus:outline-none mb-4 placeholder:text-[var(--text-muted)]/50 w-full italic transition-opacity duration-300"
              :class="{ 'opacity-25 focus:opacity-100': uiStore.isFocusMode }"
              @input="onEditorInput"
            />

            <div class="neu-groove-h mb-6 opacity-60"></div>

            <!-- Contenedor de Prosa con Modo Enfoque Spotlight sobre el Párrafo Activo -->
            <div class="relative w-full flex-1 flex flex-col">
              <!-- Velo de Enfoque que atenúa todos los párrafos excepto el activo -->
              <div
                v-if="uiStore.isFocusMode"
                aria-hidden="true"
                class="pointer-events-none absolute inset-0 z-10 transition-all duration-300"
                :style="focusSpotlightStyle"
              ></div>

              <!-- Área de Escritura Prosa -->
              <textarea
                ref="contentInputRef"
                v-model="editFolioContent"
                placeholder="Escribe la prosa de tu libro aquí..."
                class="w-full p-0 m-0 bg-transparent border-none resize-none focus:outline-none font-editorial text-lg md:text-[18px] leading-relaxed md:leading-loose text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/40 select-text caret-[var(--accent)] relative z-0"
                style="field-sizing: content; min-height: 350px; overflow-y: hidden;"
                @input="onEditorInput"
                @keydown="handleTextareaKeydown"
                @keyup="onCaretMove(false)"
                @click="onCaretMove(false)"
                @select="onCaretMove(false)"
              ></textarea>
            </div>
          </div>
        </div>

        <!-- Barra de Estado Inferior ANCLADA AL BOTTOM DE LA CAJA CENTRAL -->
        <div class="neu-groove-h"></div>
        <footer
          class="shrink-0 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-[var(--text-muted)] select-none pt-0.5 transition-opacity duration-300"
          :class="{ 'opacity-25 hover:opacity-100': uiStore.isFocusMode }"
        >
          <div class="flex items-center gap-3">
            <span>{{ wordCount }} palabras</span>
            <span>·</span>
            <span
              class="inline-flex items-center gap-1 font-semibold text-[var(--accent)]"
              title="Palabras netas añadidas en la sesión activa"
            >
              <Flame :size="12" class="text-[var(--accent)] shrink-0" />
              +{{ folioStore.sessionWordsAdded }} sesión
            </span>
            <span>·</span>
            <span>{{ charCount }} caracteres</span>
            <span>·</span>
            <span class="text-[var(--accent)] opacity-85">~{{ readingTime }} min de lectura</span>
          </div>

          <div class="flex items-center gap-2">
            <span class="text-[10px] px-1.5 py-0.5 rounded neu-well-sm text-[var(--text-muted)] uppercase">
              {{ folioStore.activeFolio.type === 'chapter' ? 'Capítulo' : 'Escena' }}
            </span>
            <span class="neu-well-sm px-2 py-0.5 text-[9px] text-[var(--text-secondary)] font-semibold flex items-center gap-2">
              <span><strong class="text-[var(--accent)]">Ctrl+S</strong>: Guardar</span>
              <span>·</span>
              <span><strong class="text-[var(--accent)]">Ctrl+Shift+T</strong>: Máquina</span>
              <span>·</span>
              <span><strong class="text-[var(--accent)]">Ctrl+Shift+F</strong>: Enfoque</span>
            </span>
          </div>
        </footer>
      </template>

      <!-- Estado Vacío cuando no hay folio activo -->
      <div
        v-else
        class="flex-1 flex flex-col items-center justify-center neu-well p-8 text-center"
      >
        <div class="w-24 h-24 mb-4 flex items-center justify-center shrink-0 drop-shadow-xl">
          <FolioLogo />
        </div>
        <h3 class="font-editorial text-2xl font-bold text-[var(--text-primary)] mb-1">
          {{ projectStore.activeProject?.title || 'Bienvenido a Folio' }}
        </h3>
        <p class="text-xs text-[var(--text-muted)] max-w-sm mb-6">
          Selecciona un capítulo o escena en el árbol del manuscrito a la izquierda para comenzar a escribir.
        </p>

        <button
          type="button"
          class="neu-btn-terracotta py-2 px-5 text-xs flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
          @click="handleCreateChapter"
        >
          <Plus :size="14" />
          <span>Crear Primer Capítulo</span>
        </button>
      </div>
    </main>

    <!-- ================================================================= -->
    <!-- COLUMNA 3: WIKI / LORE INSPECTOR (COLAPSIBLE)                     -->
    <!-- ================================================================= -->
    <aside
      class="neu-surface flex flex-col overflow-hidden transition-all duration-300 ease-in-out shrink-0"
      :class="uiStore.isRightSidebarOpen ? 'w-80 lg:w-96 xl:w-[390px] p-4 gap-3.5' : 'w-0 p-0 m-0 border-0 opacity-0 pointer-events-none'"
    >
      <WikiInspector />
    </aside>
  </div>
</template>
