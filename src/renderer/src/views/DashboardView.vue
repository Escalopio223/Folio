<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useProjectStore } from '../stores/projectStore'
import { useFolioStore } from '../stores/folioStore'
import { useLoreStore } from '../stores/loreStore'
import { useUiStore } from '../stores/uiStore'
import { useDebounceFn } from '@vueuse/core'
import ProjectModal from '../components/ProjectModal.vue'
import FolioLogo from '../components/FolioLogo.vue'
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Plus,
  FileText,
  Bookmark,
  Trash2,
  Check,
  Save,
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

// Lore Editable States
const editLoreName = ref('')
const editLoreCategory = ref('personaje')
const editLoreSummary = ref('')
const editLoreContent = ref('')
const editLoreAttributes = ref<Array<{ key: string; value: string }>>([])
const newAttrKey = ref('')
const newAttrValue = ref('')

// Save states
const isSaving = ref(false)
const lastSavedTime = ref<string>('')
let isSyncing = false

// Word and character count for manuscript
const wordCount = computed(() => {
  const text = editFolioContent.value.trim()
  if (!text) return 0
  return text.split(/\s+/).length
})

const charCount = computed(() => editFolioContent.value.length)

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
      lastSavedTime.value = new Date(folio.updatedAt).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
      })
    } else {
      editFolioTitle.value = ''
      editFolioContent.value = ''
      editFolioSynopsis.value = ''
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
      lastSavedTime.value = new Date(item.updatedAt).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
      })
    } else {
      editLoreName.value = ''
      editLoreCategory.value = 'personaje'
      editLoreSummary.value = ''
      editLoreContent.value = ''
      editLoreAttributes.value = []
    }
    setTimeout(() => {
      isSyncing = false
    }, 50)
  },
  { immediate: true }
)

// Debounced auto-save (400ms)
const debouncedSave = useDebounceFn(async () => {
  if (isSyncing) return
  isSaving.value = true

  if (activeTargetType.value === 'folio' && folioStore.activeFolioId) {
    await folioStore.updateFolio({
      id: folioStore.activeFolioId,
      title: editFolioTitle.value.trim() || 'Sin título',
      content: editFolioContent.value,
      synopsis: editFolioSynopsis.value,
      status: editFolioStatus.value
    })
  } else if (activeTargetType.value === 'lore' && loreStore.activeLoreId) {
    const attrsObj: Record<string, string> = {}
    for (const attr of editLoreAttributes.value) {
      if (attr.key.trim()) attrsObj[attr.key.trim()] = attr.value.trim()
    }
    await loreStore.updateLore({
      id: loreStore.activeLoreId,
      name: editLoreName.value.trim() || 'Sin nombre',
      category: editLoreCategory.value.trim() || 'personaje',
      summary: editLoreSummary.value,
      content: editLoreContent.value,
      attributes: attrsObj
    })
  }

  isSaving.value = false
  lastSavedTime.value = new Date().toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit'
  })
}, 400)

function onEditorInput(): void {
  if (!isSyncing) {
    debouncedSave()
  }
}

// Chapter expansion toggle
function toggleChapter(chapterId: string): void {
  expandedChapters.value[chapterId] = !isChapterExpanded(chapterId)
}

function isChapterExpanded(chapterId: string): boolean {
  return expandedChapters.value[chapterId] !== false // default expanded
}

// Selection Handlers
function selectSceneOrChapter(folio: Folio): void {
  activeTargetType.value = 'folio'
  folioStore.selectFolio(folio.id)
}

function selectLoreEntry(item: LoreItem): void {
  activeTargetType.value = 'lore'
  loreStore.selectLore(item.id)
}

// Creation Handlers
async function handleCreateChapter(): Promise<void> {
  if (!projectStore.activeProjectId) return
  const chapter = await folioStore.createChapter(projectStore.activeProjectId)
  if (chapter) {
    expandedChapters.value[chapter.id] = true
    selectSceneOrChapter(chapter)
  }
}

async function handleCreateScene(chapterId: string): Promise<void> {
  if (!projectStore.activeProjectId) return
  const scene = await folioStore.createScene(projectStore.activeProjectId, chapterId)
  if (scene) {
    expandedChapters.value[chapterId] = true
    selectSceneOrChapter(scene)
  }
}

async function handleCreateLoreItem(categoryPreset?: string): Promise<void> {
  if (!projectStore.activeProjectId) return
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
  debouncedSave()
}

function removeAttribute(index: number): void {
  editLoreAttributes.value.splice(index, 1)
  debouncedSave()
}

// Project Change
async function handleProjectChange(projectId: string): Promise<void> {
  projectStore.selectProject(projectId)
  await Promise.all([
    folioStore.fetchFolios(projectId),
    loreStore.fetchLore(projectId)
  ])
}

// Initial boot
onMounted(async () => {
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
      <!-- Cabecera de Proyecto / Selector de Libro -->
      <div class="neu-well p-3 flex flex-col gap-2 shrink-0">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 min-w-0">
            <BookOpen :size="15" class="text-[var(--accent)] shrink-0" />
            <span class="text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
              Libro Activo
            </span>
          </div>

          <button
            type="button"
            class="neu-btn px-2 py-0.5 text-[10px] text-[var(--accent)] hover:!text-[var(--accent-hover)] font-medium flex items-center gap-1"
            title="Crear nuevo proyecto de novela"
            @click="isProjectModalOpen = true"
          >
            <Plus :size="11" />
            <span>Nuevo Libro</span>
          </button>
        </div>

        <!-- Selector desplegable de proyectos -->
        <select
          v-if="projectStore.projects.length > 0"
          :value="projectStore.activeProjectId"
          class="w-full bg-transparent border-none font-editorial text-sm font-bold text-[var(--text-primary)] focus:outline-none cursor-pointer"
          @change="handleProjectChange(($event.target as HTMLSelectElement).value)"
        >
          <option
            v-for="p in projectStore.projects"
            :key="p.id"
            :value="p.id"
            class="bg-[var(--bg-surface)] text-[var(--text-primary)]"
          >
            {{ p.title }}
          </option>
        </select>
        <span v-else class="text-xs text-[var(--text-muted)] italic">Sin proyectos creados</span>

        <p v-if="projectStore.activeProject?.genre" class="text-[10px] text-[var(--text-muted)] font-mono truncate">
          {{ projectStore.activeProject.genre }}
        </p>
      </div>

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
            <!-- Estado selector -->
            <select
              v-model="editFolioStatus"
              class="neu-well-sm px-2.5 py-1 text-xs text-[var(--text-secondary)] bg-transparent border-none focus:outline-none cursor-pointer"
              @change="onEditorInput"
            >
              <option value="draft" class="bg-[var(--bg-surface)] text-[var(--text-primary)]">Borrador</option>
              <option value="in_progress" class="bg-[var(--bg-surface)] text-[var(--text-primary)]">En curso</option>
              <option value="completed" class="bg-[var(--bg-surface)] text-[var(--text-primary)]">Finalizado</option>
            </select>

            <button
              type="button"
              class="neu-btn p-2 text-[var(--text-secondary)] hover:!text-rose-400"
              title="Mover a papelera"
              @click="folioStore.moveToTrash(folioStore.activeFolio.id)"
            >
              <Trash2 :size="13" />
            </button>

            <!-- Guardar -->
            <button
              type="button"
              class="neu-btn-terracotta px-4 py-1.5 text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
              @click="debouncedSave"
            >
              <Check v-if="!isSaving && lastSavedTime" :size="13" />
              <Save v-else :size="13" />
              <span>{{ isSaving ? 'Guardando...' : `Guardado ${lastSavedTime}` }}</span>
            </button>
          </div>
        </header>

        <div class="neu-groove-h"></div>

        <!-- Papel / Lienzo Hundido -->
        <div class="flex-1 flex flex-col neu-well p-8 overflow-y-auto">
          <!-- Título -->
          <input
            v-model="editFolioTitle"
            type="text"
            placeholder="Título del capítulo o escena..."
            class="font-editorial text-3xl font-bold text-[var(--text-primary)] bg-transparent border-none focus:outline-none mb-3 placeholder:text-[var(--text-muted)] w-full"
            @input="onEditorInput"
          />

          <!-- Sinopsis de la escena (opcional) -->
          <input
            v-model="editFolioSynopsis"
            type="text"
            placeholder="Sinopsis o nota de la escena..."
            class="text-xs text-[var(--text-muted)] bg-transparent border-none focus:outline-none mb-4 placeholder:text-[var(--text-muted)] w-full italic"
            @input="onEditorInput"
          />

          <div class="neu-groove-h mb-6 opacity-60"></div>

          <!-- Área de Escritura Prosa -->
          <textarea
            v-model="editFolioContent"
            placeholder="Escribe la prosa de tu libro aquí..."
            class="flex-1 w-full bg-transparent border-none resize-none focus:outline-none text-base leading-relaxed text-[var(--text-primary)] placeholder:text-[var(--text-muted)] select-text caret-[#C85A32]"
            @input="onEditorInput"
          ></textarea>

          <!-- Contador de Palabras y Caracteres -->
          <div class="pt-4 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
            <span>{{ wordCount }} palabras · {{ charCount }} caracteres</span>
            <span>Tipo: {{ folioStore.activeFolio.type === 'chapter' ? 'Capítulo' : 'Escena' }}</span>
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

            <!-- Guardar -->
            <button
              type="button"
              class="neu-btn-terracotta px-4 py-1.5 text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
              @click="debouncedSave"
            >
              <Check v-if="!isSaving && lastSavedTime" :size="13" />
              <Save v-else :size="13" />
              <span>{{ isSaving ? 'Guardando...' : `Guardado ${lastSavedTime}` }}</span>
            </button>
          </div>
        </header>

        <div class="neu-groove-h"></div>

        <!-- Ficha de Registro de la Wiki -->
        <div class="flex-1 flex flex-col neu-well p-8 overflow-y-auto space-y-5">
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
        <div class="w-20 h-20 mb-4 flex items-center justify-center shrink-0 drop-shadow-md">
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
