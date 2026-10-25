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
import {
  ChevronDown,
  ChevronRight,
  Plus,
  FileText,
  Bookmark,
  Trash2,
  Check,
  Compass,
  Tag,
  SlidersHorizontal,
  X,
  PanelLeft
} from 'lucide-vue-next'
import type { Folio, LoreItem } from '@shared/types'

const projectStore = useProjectStore()
const folioStore = useFolioStore()
const loreStore = useLoreStore()
const uiStore = useUiStore()

// View Mode: 'manuscript' (Chapters/Scenes) or 'lore' (Wiki)
const viewMode = ref<'manuscript' | 'lore'>('manuscript')
const isProjectModalOpen = ref(false)
const expandedChapters = ref<Record<string, boolean>>({})

// Canvas Active Target: 'folio' (Scene/Chapter) or 'lore' (Wiki entry)
const activeTargetType = ref<'folio' | 'lore'>('folio')

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
  return statusOptions.find(o => o.value === editFolioStatus.value) || statusOptions[0]
})

function setFolioStatus(status: string): void {
  editFolioStatus.value = status
  isStatusDropdownOpen.value = false
  onEditorInput()
}

// Lore Editable States
const editLoreName = ref('')
const editLoreCategory = ref('personaje')
const editLoreSummary = ref('')
const editLoreContent = ref('')
const editLoreAttributes = ref<Array<{ key: string; value: string }>>([])
const newAttrKey = ref('')
const newAttrValue = ref('')

// Save states & indicators
type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error'
const saveStatus = ref<SaveStatus>('saved')
const lastSavedTime = ref<string>('')
const hasPendingChanges = ref(false)
let isSyncing = false

// Input DOM references for focus control
const titleInputRef = ref<HTMLInputElement | null>(null)

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
    if (activeTargetType.value !== 'folio') return
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

// Sync active lore item when changed
watch(
  () => loreStore.activeLore,
  (item) => {
    if (activeTargetType.value !== 'lore') return
    isSyncing = true
    if (item) {
      editLoreName.value = item.name
      editLoreCategory.value = item.category
      editLoreSummary.value = item.summary
      editLoreContent.value = item.content
      editLoreAttributes.value = Object.entries(item.attributes || {}).map(([key, value]) => ({
        key,
        value
      }))
      saveStatus.value = 'saved'
      hasPendingChanges.value = false
      lastSavedTime.value = new Date(item.updatedAt).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    } else {
      editLoreName.value = ''
      editLoreCategory.value = 'personaje'
      editLoreSummary.value = ''
      editLoreContent.value = ''
      editLoreAttributes.value = []
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
    if (activeTargetType.value === 'folio' && folioStore.activeFolioId) {
      const targetId = folioStore.activeFolioId
      const titleToSave = editFolioTitle.value.trim() || 'Sin título'
      const contentToSave = editFolioContent.value
      const synopsisToSave = editFolioSynopsis.value
      const statusToSave = editFolioStatus.value

      // Actualizar réplica reactiva en el store para zero-lag en el sidebar
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
    } else if (activeTargetType.value === 'lore' && loreStore.activeLoreId) {
      const targetId = loreStore.activeLoreId
      const nameToSave = editLoreName.value.trim() || 'Sin nombre'
      const categoryToSave = editLoreCategory.value.trim() || 'personaje'
      const summaryToSave = editLoreSummary.value
      const contentToSave = editLoreContent.value
      const attrsObj: Record<string, string> = {}
      for (const attr of editLoreAttributes.value) {
        if (attr.key.trim()) attrsObj[attr.key.trim()] = attr.value.trim()
      }

      const item = loreStore.items.find((l) => l.id === targetId)
      if (item) {
        item.name = nameToSave
        item.category = categoryToSave
        item.summary = summaryToSave
        item.content = contentToSave
        item.attributes = attrsObj
      }

      await loreStore.updateLore({
        id: targetId,
        name: nameToSave,
        category: categoryToSave,
        summary: summaryToSave,
        content: contentToSave,
        attributes: attrsObj
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
  if (activeTargetType.value === 'folio' && folioStore.activeFolioId) {
    const target = folioStore.folios.find((f) => f.id === folioStore.activeFolioId)
    if (target) {
      target.title = editFolioTitle.value.trim() || 'Sin título'
      target.synopsis = editFolioSynopsis.value
      target.status = editFolioStatus.value
      target.content = editFolioContent.value
    }
  } else if (activeTargetType.value === 'lore' && loreStore.activeLoreId) {
    const target = loreStore.items.find((l) => l.id === loreStore.activeLoreId)
    if (target) {
      target.name = editLoreName.value.trim() || 'Sin nombre'
      target.summary = editLoreSummary.value
      target.content = editLoreContent.value
      target.category = editLoreCategory.value
    }
  }

  debouncedSave()
}

// Manejador de tecla Tab en el área de escritura de prosa (2 espacios)
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

  // Ctrl+S / Cmd+S: Guardado forzado instantáneo
  if (isCtrlOrCmd && e.key.toLowerCase() === 's') {
    e.preventDefault()
    handleManualSave()
    return
  }

  // Ctrl+N / Cmd+N: Nuevo folio sin usar el ratón
  if (isCtrlOrCmd && e.key.toLowerCase() === 'n') {
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
  if (folioStore.activeFolioId === folio.id && activeTargetType.value === 'folio') return

  if (hasPendingChanges.value) {
    await flushSave()
  }

  activeTargetType.value = 'folio'
  folioStore.selectFolio(folio.id)
}

async function selectLoreEntry(item: LoreItem): Promise<void> {
  if (loreStore.activeLoreId === item.id && activeTargetType.value === 'lore') return

  if (hasPendingChanges.value) {
    await flushSave()
  }

  activeTargetType.value = 'lore'
  loreStore.selectLore(item.id)
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

async function handleCreateLoreItem(categoryPreset?: string): Promise<void> {
  if (!projectStore.activeProjectId) return
  if (hasPendingChanges.value) {
    await flushSave()
  }
  const created = await loreStore.createLore({
    projectId: projectStore.activeProjectId,
    category: categoryPreset || loreStore.selectedCategory === 'todos' ? 'personaje' : loreStore.selectedCategory,
    name: 'Nuevo Registro de Wiki',
    summary: '',
    content: ''
  })
  if (created) {
    activeTargetType.value = 'lore'
  }
}

// Dynamic attributes helper for Lore
function addAttribute(): void {
  if (!newAttrKey.value.trim()) return
  editLoreAttributes.value.push({
    key: newAttrKey.value.trim(),
    value: newAttrValue.value.trim()
  })
  newAttrKey.value = ''
  newAttrValue.value = ''
  onEditorInput()
}

function removeAttribute(index: number): void {
  editLoreAttributes.value.splice(index, 1)
  onEditorInput()
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
  <div class="flex h-full w-full p-4 gap-4 overflow-hidden bg-[var(--bg-base)] relative">
    <!-- Modal para nuevo proyecto/libro -->
    <ProjectModal
      v-if="isProjectModalOpen"
      @close="isProjectModalOpen = false"
      @created="handleProjectChange"
    />

    <!-- ================================================================= -->
    <!-- COLUMNA 1: SIDEBAR LATERAL DINÁMICO (COLAPSIBLE)                   -->
    <!-- ================================================================= -->
    <aside
      class="neu-surface flex flex-col overflow-hidden transition-all duration-300 ease-in-out shrink-0"
      :class="uiStore.isSidebarOpen ? 'w-80 p-4 gap-3.5' : 'w-0 p-0 m-0 border-0 opacity-0 pointer-events-none'"
    >
      <!-- Selector Personalizado de Libros -->
      <BookSelector
        @open-create-modal="isProjectModalOpen = true"
        @project-changed="handleProjectChange"
      />

      <!-- Conmutador Principal de Modo: Manuscrito vs Librería de Datos -->
      <div class="neu-well-sm p-1 grid grid-cols-2 gap-1 shrink-0 text-xs font-medium">
        <button
          type="button"
          class="flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all"
          :class="viewMode === 'manuscript' ? 'neu-btn is-active font-bold text-[var(--accent)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'"
          @click="viewMode = 'manuscript'"
        >
          <Bookmark :size="13" />
          <span>Manuscrito</span>
        </button>

        <button
          type="button"
          class="flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all"
          :class="viewMode === 'lore' ? 'neu-btn is-active font-bold text-[var(--accent)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'"
          @click="viewMode = 'lore'"
        >
          <Compass :size="13" />
          <span>Librería / Wiki</span>
        </button>
      </div>

      <div class="neu-groove-h"></div>

      <!-- =============================================================== -->
      <!-- VISTA 1: MANUSCRITO (CAPÍTULOS Y ESCENAS)                       -->
      <!-- =============================================================== -->
      <template v-if="viewMode === 'manuscript'">
        <!-- Botón para añadir capítulo -->
        <button
          type="button"
          class="neu-btn-terracotta w-full py-2 px-3 flex items-center justify-center gap-2 text-xs shrink-0"
          @click="handleCreateChapter"
        >
          <Plus :size="14" />
          <span>Nuevo Capítulo</span>
        </button>

        <!-- Árbol jerárquico de Capítulos y Escenas -->
        <div class="flex-1 overflow-y-auto space-y-2 pr-1">
          <div
            v-for="chap in folioStore.chapters"
            :key="chap.id"
            class="space-y-1"
          >
            <!-- Cabecera de Capítulo -->
            <div
              class="neu-btn w-full p-2.5 flex items-center justify-between group transition-all"
              :class="activeTargetType === 'folio' && folioStore.activeFolioId === chap.id ? 'is-active !border-[#C85A32]' : ''"
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
              class="pl-4 space-y-1.5 border-l border-white/5 ml-3 mt-1"
            >
              <div
                v-for="scene in folioStore.getScenesForChapter(chap.id)"
                :key="scene.id"
                class="transition-all"
              >
                <!-- Escena activa (Hundida) -->
                <div
                  v-if="activeTargetType === 'folio' && folioStore.activeFolioId === scene.id"
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
            class="h-40 flex flex-col items-center justify-center text-center p-4 text-[var(--text-muted)] space-y-2"
          >
            <Bookmark :size="20" class="opacity-40" />
            <p class="text-xs">No hay capítulos en este libro</p>
            <button
              type="button"
              class="text-xs text-[var(--accent)] hover:underline"
              @click="handleCreateChapter"
            >
              Comenzar Capítulo I
            </button>
          </div>
        </div>
      </template>

      <!-- =============================================================== -->
      <!-- VISTA 2: LIBRERÍA DE DATOS (WIKI DEL MUNDO / CODEX)             -->
      <!-- =============================================================== -->
      <template v-else>
        <!-- Botón para añadir registro de wiki -->
        <button
          type="button"
          class="neu-btn-terracotta w-full py-2 px-3 flex items-center justify-center gap-2 text-xs shrink-0"
          @click="handleCreateLoreItem()"
        >
          <Plus :size="14" />
          <span>Nueva Entrada Wiki</span>
        </button>

        <!-- Filtro de Categorías Dinámicas -->
        <div class="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none text-[11px] shrink-0">
          <button
            type="button"
            class="px-2.5 py-1 rounded-lg shrink-0 transition-all font-medium"
            :class="loreStore.selectedCategory === 'todos' ? 'neu-btn is-active text-[var(--accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'"
            @click="loreStore.selectedCategory = 'todos'"
          >
            Todos ({{ loreStore.items.length }})
          </button>

          <button
            v-for="cat in loreStore.categories"
            :key="cat"
            type="button"
            class="px-2.5 py-1 rounded-lg shrink-0 transition-all capitalize"
            :class="loreStore.selectedCategory === cat ? 'neu-btn is-active text-[var(--accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'"
            @click="loreStore.selectedCategory = cat"
          >
            {{ cat }}
          </button>
        </div>

        <!-- Lista de Entradas de la Wiki -->
        <div class="flex-1 overflow-y-auto space-y-2 pr-1">
          <div
            v-for="item in loreStore.filteredItems"
            :key="item.id"
            class="transition-all"
          >
            <!-- Entrada Activa -->
            <div
              v-if="activeTargetType === 'lore' && loreStore.activeLoreId === item.id"
              class="neu-well p-3 border-l-4 border-[#C85A32] cursor-pointer"
              @click="selectLoreEntry(item)"
            >
              <div class="flex items-start justify-between gap-2">
                <h4 class="text-xs font-bold text-[var(--text-primary)] truncate font-editorial">
                  {{ item.name }}
                </h4>
                <span class="text-[9px] font-mono px-1.5 py-0.5 rounded neu-well-sm text-[var(--accent)] uppercase shrink-0">
                  {{ item.category }}
                </span>
              </div>
              <p v-if="item.summary" class="text-[11px] text-[var(--text-muted)] truncate mt-1">
                {{ item.summary }}
              </p>
            </div>

            <!-- Entrada Inactiva -->
            <div
              v-else
              role="button"
              tabindex="0"
              class="neu-btn w-full p-2.5 text-left flex items-center justify-between group transition-all cursor-pointer"
              @click="selectLoreEntry(item)"
            >
              <div class="min-w-0 pr-2">
                <div class="flex items-center gap-1.5">
                  <span class="text-xs font-medium text-[var(--text-primary)] truncate">
                    {{ item.name }}
                  </span>
                </div>
                <div class="flex items-center gap-2 mt-0.5">
                  <span class="text-[9px] font-mono uppercase text-[var(--accent)] opacity-80">
                    {{ item.category }}
                  </span>
                  <span v-if="item.summary" class="text-[10px] text-[var(--text-muted)] truncate">
                    · {{ item.summary }}
                  </span>
                </div>
              </div>

              <button
                type="button"
                class="p-1 opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-rose-400 transition-opacity shrink-0"
                title="Mover a papelera"
                @click.stop="loreStore.moveToTrash(item.id)"
              >
                <Trash2 :size="12" />
              </button>
            </div>
          </div>

          <!-- Empty state para wiki -->
          <div
            v-if="loreStore.filteredItems.length === 0"
            class="h-40 flex flex-col items-center justify-center text-center p-4 text-[var(--text-muted)] space-y-2"
          >
            <Compass :size="20" class="opacity-40" />
            <p class="text-xs">No hay entradas en esta categoría</p>
            <button
              type="button"
              class="text-xs text-[var(--accent)] hover:underline"
              @click="handleCreateLoreItem()"
            >
              Crear primer personaje o lugar
            </button>
          </div>
        </div>
      </template>

      <!-- Pie del Sidebar -->
      <div class="neu-groove-h"></div>
      <div class="flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)]">
        <span>{{ folioStore.chapters.length }} caps · {{ folioStore.folios.length }} docs</span>
        <span>{{ loreStore.items.length }} en wiki</span>
      </div>
    </aside>

    <!-- ================================================================= -->
    <!-- BOTÓN FLOTANTE PARA REABRIR EL SIDEBAR CUANDO ESTÁ COLAPSADO       -->
    <!-- ================================================================= -->
    <button
      v-if="!uiStore.isSidebarOpen"
      type="button"
      class="neu-btn px-2.5 py-1.5 absolute top-6 left-6 z-20 flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:!text-[var(--accent)] shadow-md"
      title="Mostrar barra lateral (Ctrl+B)"
      @click="uiStore.toggleSidebar"
    >
      <PanelLeft :size="14" />
      <span class="font-medium text-[11px]">Navegación</span>
    </button>

    <!-- ================================================================= -->
    <!-- COLUMNA 2: LIENZO EDITORIAL DE ESCRITURA Y FICHA DE WIKI           -->
    <!-- ================================================================= -->
    <main class="flex-1 flex flex-col neu-surface p-6 gap-4 overflow-hidden relative">
      <!-- --------------------------------------------------------------- -->
      <!-- CASO A: EDITANDO ESCENA O CAPÍTULO (MANUSCRITO)                 -->
      <!-- --------------------------------------------------------------- -->
      <template v-if="activeTargetType === 'folio' && folioStore.activeFolio">
        <!-- Cabecera de Herramientas -->
        <header class="flex items-center justify-between gap-3 shrink-0">
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

            <button
              type="button"
              class="neu-btn p-2 text-[var(--text-secondary)] hover:!text-rose-400"
              title="Mover a papelera"
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
              <!-- Punto indicador reactivo -->
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

        <!-- Papel / Lienzo Hundido con scrollbar editorial delgado -->
        <div class="flex-1 flex flex-col neu-well p-6 md:p-8 overflow-y-auto editorial-scrollbar">
          <div class="max-w-3xl mx-auto w-full flex-1 flex flex-col">
            <!-- Título de la escena / capítulo -->
            <input
              ref="titleInputRef"
              v-model="editFolioTitle"
              type="text"
              placeholder="Título del capítulo o escena..."
              class="font-editorial text-3xl md:text-4xl font-bold text-[var(--text-primary)] bg-transparent border-none focus:outline-none mb-2 placeholder:text-[var(--text-muted)]/50 w-full tracking-tight"
              @input="onEditorInput"
            />

            <!-- Sinopsis o nota de la escena (opcional) -->
            <input
              v-model="editFolioSynopsis"
              type="text"
              placeholder="Sinopsis o nota de la escena..."
              class="text-xs font-mono text-[var(--text-muted)] bg-transparent border-none focus:outline-none mb-4 placeholder:text-[var(--text-muted)]/50 w-full italic"
              @input="onEditorInput"
            />

            <div class="neu-groove-h mb-6 opacity-60"></div>

            <!-- Área de Escritura Prosa -->
            <textarea
              ref="contentInputRef"
              v-model="editFolioContent"
              placeholder="Escribe la prosa de tu libro aquí..."
              class="flex-1 w-full bg-transparent border-none resize-none focus:outline-none font-editorial text-lg md:text-[18px] leading-relaxed md:leading-loose text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/40 select-text caret-[var(--accent)] editorial-scrollbar"
              @input="onEditorInput"
              @keydown="handleTextareaKeydown"
            ></textarea>

            <!-- Barra de Estado Inferior: Palabras, Caracteres, Tiempo de Lectura y Atajos -->
            <div class="pt-4 mt-4 border-t border-[var(--groove-dark)]/40 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-[var(--text-muted)] select-none">
              <div class="flex items-center gap-3">
                <span>{{ wordCount }} palabras</span>
                <span>·</span>
                <span>{{ charCount }} caracteres</span>
                <span>·</span>
                <span class="text-[var(--accent)] opacity-85">~{{ readingTime }} min de lectura</span>
              </div>

              <div class="flex items-center gap-2">
                <span class="text-[10px] px-1.5 py-0.5 rounded neu-well-sm text-[var(--text-muted)]">
                  {{ folioStore.activeFolio.type === 'chapter' ? 'Capítulo' : 'Escena' }}
                </span>
                <span class="text-[9px] opacity-60">Ctrl+N: Nueva escena · Tab: Indentar</span>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- --------------------------------------------------------------- -->
      <!-- CASO B: EDITANDO ENTRADA DE LA WIKI / LIBRERÍA DE DATOS          -->
      <!-- --------------------------------------------------------------- -->
      <template v-else-if="activeTargetType === 'lore' && loreStore.activeLore">
        <!-- Cabecera de Entrada Wiki -->
        <header class="flex items-center justify-between gap-3 shrink-0">
          <div class="flex items-center gap-2 min-w-0">
            <Compass :size="14" class="text-[var(--accent)] shrink-0" />
            <span class="text-xs text-[var(--text-muted)] font-mono shrink-0">
              Librería de Datos /
            </span>
            <span class="text-xs font-semibold text-[var(--text-primary)] truncate font-editorial">
              {{ loreStore.activeLore.name || 'Sin nombre' }}
            </span>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <button
              type="button"
              class="neu-btn p-2 text-[var(--text-secondary)] hover:!text-rose-400"
              title="Eliminar de la wiki"
              @click="loreStore.moveToTrash(loreStore.activeLore.id)"
            >
              <Trash2 :size="13" />
            </button>

            <!-- Indicador sutil de Autoguardado & Guardado Manual Wiki -->
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

        <!-- Ficha de Registro de la Wiki con scrollbar delgado -->
        <div class="flex-1 flex flex-col neu-well p-6 md:p-8 overflow-y-auto editorial-scrollbar space-y-5">
          <!-- Nombre y Categoría -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <input
              v-model="editLoreName"
              type="text"
              placeholder="Nombre del personaje, lugar, objeto, idea..."
              class="font-editorial text-3xl font-bold text-[var(--text-primary)] bg-transparent border-none focus:outline-none placeholder:text-[var(--text-muted)] flex-1"
              @input="onEditorInput"
            />

            <!-- Selector de Categoría Dinámica -->
            <div class="flex items-center gap-1.5 neu-well-sm px-3 py-1.5 shrink-0">
              <Tag :size="13" class="text-[var(--accent)]" />
              <input
                v-model="editLoreCategory"
                type="text"
                placeholder="Categoría (ej. personaje, lugar)"
                class="bg-transparent border-none text-xs font-medium text-[var(--accent)] focus:outline-none capitalize w-28"
                @input="onEditorInput"
              />
            </div>
          </div>

          <!-- Resumen breve -->
          <input
            v-model="editLoreSummary"
            type="text"
            placeholder="Resumen descriptivo en una línea..."
            class="text-xs text-[var(--text-secondary)] bg-transparent border-none focus:outline-none w-full italic"
            @input="onEditorInput"
          />

          <!-- Atributos Dinámicos (Clave / Valor) -->
          <div class="neu-surface p-4 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                <SlidersHorizontal :size="13" class="text-[var(--accent)]" />
                <span>Atributos y Datos Específicos</span>
              </span>
              <span class="text-[10px] text-[var(--text-muted)] font-mono">
                Campos dinámicos del personaje u objeto
              </span>
            </div>

            <!-- Chips de atributos existentes -->
            <div class="flex flex-wrap gap-2">
              <div
                v-for="(attr, idx) in editLoreAttributes"
                :key="idx"
                class="neu-well-sm px-2.5 py-1 text-xs flex items-center gap-2 group"
              >
                <span class="font-semibold text-[var(--accent)]">{{ attr.key }}:</span>
                <span class="text-[var(--text-primary)]">{{ attr.value }}</span>
                <button
                  type="button"
                  class="text-[var(--text-muted)] hover:text-rose-400 ml-1 opacity-60 group-hover:opacity-100"
                  @click="removeAttribute(idx)"
                >
                  <X :size="11" />
                </button>
              </div>
            </div>

            <!-- Formulario para añadir nuevo atributo dinámico -->
            <div class="flex items-center gap-2 pt-1">
              <input
                v-model="newAttrKey"
                type="text"
                placeholder="Propiedad (ej. Rol, Edad, Clima)"
                class="neu-well-sm px-2.5 py-1 text-xs bg-transparent border-none text-[var(--text-primary)] focus:outline-none w-36"
                @keydown.enter.prevent="addAttribute"
              />
              <input
                v-model="newAttrValue"
                type="text"
                placeholder="Valor (ej. Protagonista, 28, Frío)"
                class="neu-well-sm px-2.5 py-1 text-xs bg-transparent border-none text-[var(--text-primary)] focus:outline-none flex-1"
                @keydown.enter.prevent="addAttribute"
              />
              <button
                type="button"
                class="neu-btn px-3 py-1 text-xs text-[var(--accent)] font-medium flex items-center gap-1 shrink-0"
                @click="addAttribute"
              >
                <Plus :size="12" />
                <span>Añadir</span>
              </button>
            </div>
          </div>

          <div class="neu-groove-h opacity-60"></div>

          <!-- Descripción detallada / Notas / Lore -->
          <div class="flex-1 flex flex-col space-y-1">
            <label class="text-[11px] font-mono text-[var(--text-muted)]">
              Información Detallada / Historia / Biografía:
            </label>
            <textarea
              v-model="editLoreContent"
              placeholder="Escribe aquí los antecedentes, historia, psicología o características completas de esta entrada..."
              class="flex-1 w-full min-h-[220px] bg-transparent border-none resize-none focus:outline-none text-base leading-relaxed text-[var(--text-primary)] placeholder:text-[var(--text-muted)] select-text caret-[#C85A32]"
              @input="onEditorInput"
            ></textarea>
          </div>
        </div>
      </template>

      <!-- --------------------------------------------------------------- -->
      <!-- CASO C: ESTADO VACÍO (NINGÚN ELEMENTO SELECCIONADO)             -->
      <!-- --------------------------------------------------------------- -->
      <div
        v-else
        class="flex-1 flex flex-col items-center justify-center neu-well p-8 text-center"
      >
        <div class="w-28 h-28 mb-5 flex items-center justify-center shrink-0 drop-shadow-xl">
          <FolioLogo />
        </div>
        <h3 class="font-editorial text-2xl font-bold text-[var(--text-primary)] mb-1">
          {{ projectStore.activeProject?.title || 'Bienvenido a Folio' }}
        </h3>
        <p class="text-xs text-[var(--text-muted)] max-w-sm mb-6">
          Selecciona un capítulo o escena en el manuscrito, o navega por la wiki de tu mundo literario.
        </p>

        <div class="flex items-center gap-3">
          <button
            type="button"
            class="neu-btn-terracotta py-2 px-5 text-xs flex items-center gap-2 active:scale-95 transition-all"
            @click="handleCreateChapter"
          >
            <Plus :size="14" />
            <span>Crear Capítulo</span>
          </button>

          <button
            type="button"
            class="neu-btn py-2 px-5 text-xs flex items-center gap-2 active:scale-95 transition-all"
            @click="handleCreateLoreItem()"
          >
            <Compass :size="14" />
            <span>Nueva Entrada Wiki</span>
          </button>
        </div>
      </div>
    </main>
  </div>
</template>
