<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, type Component } from 'vue'
import {
  Trash2,
  Undo2,
  Copy,
  Check,
  X,
  Search,
  FileText,
  Bookmark,
  Sparkles,
  User,
  MapPin,
  Box,
  Lightbulb,
  AlertTriangle,
  Clock,
  BookOpen
} from 'lucide-vue-next'
import { onClickOutside } from '@vueuse/core'
import { useTrashStore } from '../../stores/trashStore'
import { useProjectStore } from '../../stores/projectStore'
import { useFolioStore } from '../../stores/folioStore'
import { useLoreStore } from '../../stores/loreStore'
import type { Folio } from '@shared/types'

const trashStore = useTrashStore()
const projectStore = useProjectStore()
const folioStore = useFolioStore()
const loreStore = useLoreStore()

const modalRef = ref<HTMLElement | null>(null)
const searchQuery = ref('')
const copyFeedback = ref(false)
const filterType = ref<'all' | 'folio' | 'lore'>('all')

// Estado para diálogo de confirmación de purga física (doble verificación)
interface PurgeConfirmState {
  isOpen: boolean
  mode: 'single' | 'all'
  item?: { id: string; title: string; type: 'folio' | 'lore' }
}

const purgeConfirm = ref<PurgeConfirmState>({
  isOpen: false,
  mode: 'all'
})

// Cerrar al hacer clic fuera
onClickOutside(modalRef, () => {
  if (trashStore.isModalOpen && !purgeConfirm.value.isOpen) {
    handleCloseModal()
  }
})

function handleCloseModal(): void {
  trashStore.closeModal()
  // Retorno de foco al editor central
  const editorEl = document.querySelector(
    '.tiptap-editor, .ProseMirror, textarea, [contenteditable="true"]'
  ) as HTMLElement | null
  editorEl?.focus()
}

// Escuchar tecla Escape
function handleKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape' && trashStore.isModalOpen) {
    e.preventDefault()
    if (purgeConfirm.value.isOpen) {
      purgeConfirm.value.isOpen = false
    } else {
      handleCloseModal()
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

// Normalizador para búsqueda
function normalize(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

// Elementos unificados de papelera
export interface TrashedListItem {
  id: string
  title: string
  type: 'folio' | 'lore'
  subType: string
  content: string
  updatedAt: Date
  icon: Component
  rawFolio?: Folio
}

const allTrashItems = computed<TrashedListItem[]>(() => {
  const items: TrashedListItem[] = []

  for (const f of trashStore.trashFolios) {
    const subTypeLabel =
      f.type === 'frontmatter'
        ? 'Preliminar'
        : f.type === 'backmatter'
          ? 'Anexo'
          : 'Capítulo'
    items.push({
      id: f.id,
      title: f.title || 'Sin título',
      type: 'folio',
      subType: subTypeLabel,
      content: f.content || '',
      updatedAt: new Date(f.updatedAt),
      icon: f.type === 'chapter' ? Bookmark : FileText,
      rawFolio: f
    })
  }

  for (const l of trashStore.trashLore) {
    let icon: Component = Sparkles
    const cat = (l.category || '').toLowerCase()
    if (cat.includes('personaje')) icon = User
    else if (cat.includes('lugar')) icon = MapPin
    else if (cat.includes('objeto')) icon = Box
    else if (cat.includes('idea') || cat.includes('pensamiento')) icon = Lightbulb

    items.push({
      id: l.id,
      title: l.name || 'Sin nombre',
      type: 'lore',
      subType: `Wiki: ${l.category || 'General'}`,
      content: l.content || l.summary || '',
      updatedAt: new Date(l.updatedAt),
      icon
    })
  }

  // Ordenar por fecha de descarte más reciente
  items.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())

  const q = normalize(searchQuery.value)
  return items.filter((item) => {
    if (filterType.value !== 'all' && item.type !== filterType.value) {
      return false
    }
    if (!q) return true
    return normalize(item.title).includes(q) || normalize(item.content).includes(q)
  })
})

// Elemento actualmente seleccionado para previsualización
const selectedItem = computed<TrashedListItem | null>(() => {
  if (!trashStore.selectedFolioId && allTrashItems.value.length > 0) {
    return allTrashItems.value[0]
  }
  return allTrashItems.value.find((i) => i.id === trashStore.selectedFolioId) || null
})

// Formateador de fecha
function formatDate(dateVal: Date | string | number): string {
  try {
    const d = new Date(dateVal)
    return d.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  } catch {
    return 'Fecha desconocida'
  }
}

// Limpiar HTML para previsualización
function formatPreviewText(htmlOrText: string): string {
  if (!htmlOrText) return ''
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = htmlOrText
  return tempDiv.innerText || tempDiv.textContent || ''
}

// Copiar texto al portapapeles
async function copyFragment(text: string): Promise<void> {
  const plainText = formatPreviewText(text)
  try {
    await navigator.clipboard.writeText(plainText)
    copyFeedback.value = true
    setTimeout(() => {
      copyFeedback.value = false
    }, 2000)
  } catch (err) {
    console.error('Error al copiar al portapapeles:', err)
  }
}

// Restaurar elemento
async function handleRestore(item: TrashedListItem): Promise<void> {
  const ok = await trashStore.restoreItem(item.id, item.type)
  if (ok && projectStore.activeProjectId) {
    if (item.type === 'folio') {
      await folioStore.fetchFolios(projectStore.activeProjectId)
    } else {
      await loreStore.fetchLore(projectStore.activeProjectId)
    }
  }
}

// Doble confirmación para purga individual
function promptDeleteSingle(item: TrashedListItem): void {
  purgeConfirm.value = {
    isOpen: true,
    mode: 'single',
    item: {
      id: item.id,
      title: item.title,
      type: item.type
    }
  }
}

// Doble confirmación para vaciar papelera
function promptEmptyTrash(): void {
  purgeConfirm.value = {
    isOpen: true,
    mode: 'all'
  }
}

async function confirmPurge(): Promise<void> {
  if (!purgeConfirm.value.isOpen) return

  if (purgeConfirm.value.mode === 'single' && purgeConfirm.value.item) {
    const { id, type } = purgeConfirm.value.item
    await trashStore.deletePermanently(id, type)
  } else if (purgeConfirm.value.mode === 'all') {
    if (projectStore.activeProjectId) {
      await trashStore.emptyTrash(projectStore.activeProjectId)
    }
  }

  purgeConfirm.value.isOpen = false
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="trashStore.isModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <!-- Contenedor Principal del Modal Neumórfico Cálido -->
      <div
        ref="modalRef"
        class="max-w-4xl w-full h-[640px] max-h-[92vh] rounded-2xl neu-surface border border-[var(--groove-dark)]/60 shadow-2xl overflow-hidden flex flex-col bg-[var(--bg-surface)] text-[var(--text-primary)] relative"
      >
        <!-- =============================================================== -->
        <!-- CABECERA: TÍTULO, SUBTÍTULO Y BOTÓN DE CIERRE                   -->
        <!-- =============================================================== -->
        <header
          class="p-4 border-b border-[var(--groove-dark)]/40 flex items-center justify-between shrink-0 bg-[var(--bg-surface)]"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-xl neu-well flex items-center justify-center text-[var(--accent)] shrink-0"
            >
              <Trash2 :size="20" class="stroke-[1.8]" />
            </div>
            <div>
              <h2
                id="modal-title"
                class="font-editorial text-base font-bold text-[var(--text-primary)] flex items-center gap-2"
              >
                <span>Papelera de Reciclaje</span>
                <span
                  class="text-[10px] font-mono px-2 py-0.5 rounded-full neu-well-sm text-[var(--accent)] font-semibold uppercase"
                >
                  {{ allTrashItems.length }}
                  {{ allTrashItems.length === 1 ? 'elemento' : 'elementos' }}
                </span>
              </h2>
              <p class="text-xs text-[var(--text-muted)]">
                Inspecciona o recupera capítulos y fichas de lore descartadas, o vacía la papelera.
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <kbd
              class="neu-btn px-2 py-1 text-[10px] font-mono text-[var(--text-muted)] rounded flex items-center gap-1 cursor-pointer hover:text-[var(--text-primary)]"
              @click="handleCloseModal"
            >
              <span>ESC</span>
            </kbd>
            <button
              type="button"
              class="neu-btn p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              title="Cerrar ventana"
              @click="handleCloseModal"
            >
              <X :size="16" />
            </button>
          </div>
        </header>

        <!-- =============================================================== -->
        <!-- BARRA DE HERRAMIENTAS: BÚSQUEDA, FILTRO Y VACIAR                -->
        <!-- =============================================================== -->
        <div
          class="px-4 py-2.5 flex items-center justify-between gap-3 border-b border-[var(--groove-dark)]/30 shrink-0"
        >
          <div class="flex items-center gap-2">
            <!-- Filtro por tipo -->
            <div class="neu-well p-1 rounded-xl flex items-center gap-1 text-[11px] font-mono">
              <button
                type="button"
                class="px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                :class="
                  filterType === 'all'
                    ? 'neu-btn is-active font-bold text-[var(--accent)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                "
                @click="filterType = 'all'"
              >
                Todos ({{ trashStore.trashFolios.length + trashStore.trashLore.length }})
              </button>
              <button
                type="button"
                class="px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                :class="
                  filterType === 'folio'
                    ? 'neu-btn is-active font-bold text-[var(--accent)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                "
                @click="filterType = 'folio'"
              >
                Capítulos ({{ trashStore.trashFolios.length }})
              </button>
              <button
                type="button"
                class="px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                :class="
                  filterType === 'lore'
                    ? 'neu-btn is-active font-bold text-[var(--accent)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                "
                @click="filterType = 'lore'"
              >
                Wiki ({{ trashStore.trashLore.length }})
              </button>
            </div>

            <!-- Buscador -->
            <div class="neu-well px-3 py-1.5 rounded-xl flex items-center gap-2 w-56">
              <Search :size="13" class="text-[var(--text-muted)] shrink-0" />
              <input
                v-model="searchQuery"
                type="text"
                class="bg-transparent border-none outline-none w-full text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                placeholder="Buscar en papelera..."
              />
              <button
                v-if="searchQuery"
                type="button"
                class="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                @click="searchQuery = ''"
              >
                <X :size="12" />
              </button>
            </div>
          </div>

          <!-- Botón Destructivo: Vaciar Papelera -->
          <button
            type="button"
            class="px-3.5 py-1.5 text-xs font-editorial font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            :class="
              allTrashItems.length > 0
                ? 'bg-rose-900/40 hover:bg-rose-900/60 border border-rose-700/50 text-rose-200 active:scale-95'
                : 'opacity-40 pointer-events-none neu-btn text-[var(--text-muted)]'
            "
            :disabled="allTrashItems.length === 0"
            @click="promptEmptyTrash"
          >
            <Trash2 :size="13" />
            <span>Vaciar Papelera</span>
          </button>
        </div>

        <!-- =============================================================== -->
        <!-- CUERPO DE DOS COLUMNAS: LISTA + PANEL DE PREVISUALIZACIÓN       -->
        <!-- =============================================================== -->
        <main class="flex-1 flex flex-col md:flex-row overflow-hidden relative">
          <!-- Columna Izquierda: Listado de Elementos Descartados -->
          <section
            class="w-full md:w-5/12 border-b md:border-b-0 md:border-r border-[var(--groove-dark)]/40 p-3 overflow-y-auto space-y-2 editorial-scrollbar"
            aria-label="Listado de elementos en papelera"
          >
            <div
              v-if="allTrashItems.length === 0"
              class="h-64 flex flex-col items-center justify-center text-center p-6 text-[var(--text-muted)] space-y-3 neu-well rounded-xl"
            >
              <Trash2 :size="28" class="opacity-30 stroke-[1.5]" />
              <div class="space-y-1">
                <p class="text-xs font-editorial font-bold text-[var(--text-secondary)]">
                  {{ searchQuery ? 'No hay elementos coincidentes' : 'La papelera está vacía' }}
                </p>
                <p class="text-[11px] text-[var(--text-muted)] max-w-xs leading-relaxed">
                  {{
                    searchQuery
                      ? 'Prueba con otro término de búsqueda.'
                      : 'No hay capítulos descartados ni fichas de lore archivadas en este proyecto.'
                  }}
                </p>
              </div>
            </div>

            <article
              v-for="item in allTrashItems"
              :key="item.id"
              class="p-3 rounded-xl cursor-pointer transition-all border group relative"
              :class="
                selectedItem?.id === item.id
                  ? 'neu-well border-l-4 !border-l-[var(--accent)] border-[var(--groove-dark)]/40'
                  : 'neu-btn border-transparent hover:border-[var(--groove-dark)]/30'
              "
              @click="trashStore.selectFolio(item.id)"
            >
              <div class="flex items-start justify-between gap-2 mb-1.5">
                <div class="flex items-center gap-2 min-w-0">
                  <component
                    :is="item.icon"
                    :size="13"
                    class="shrink-0"
                    :class="item.type === 'folio' ? 'text-[var(--accent)]' : 'text-sky-400'"
                  />
                  <h3 class="font-editorial text-xs font-bold text-[var(--text-primary)] truncate">
                    {{ item.title }}
                  </h3>
                </div>

                <!-- Chip de tipo -->
                <span
                  class="neu-well-sm px-1.5 py-0.5 text-[9px] font-mono shrink-0 rounded"
                  :class="item.type === 'folio' ? 'text-amber-500' : 'text-sky-400'"
                >
                  {{ item.subType }}
                </span>
              </div>

              <!-- Extracto del contenido -->
              <p
                class="text-[11px] text-[var(--text-secondary)] line-clamp-2 leading-relaxed mb-2 font-serif"
              >
                {{ formatPreviewText(item.content) || 'Sin contenido de texto' }}
              </p>

              <div
                class="flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)]"
              >
                <span class="flex items-center gap-1">
                  <Clock :size="10" />
                  {{ formatDate(item.updatedAt) }}
                </span>
                <span v-if="item.type === 'folio'" class="text-[9px]">
                  {{ trashStore.countWords(item.content) }} palabras
                </span>
              </div>
            </article>
          </section>

          <!-- Columna Derecha: Panel de Inspección y Lectura Rápida -->
          <section
            class="w-full md:w-7/12 p-4 flex flex-col justify-between overflow-hidden bg-[var(--bg-base)]/40"
            aria-label="Panel de previsualización y lectura"
          >
            <div v-if="selectedItem" class="flex-1 flex flex-col overflow-hidden space-y-3">
              <!-- Barra superior de acciones para el elemento seleccionado -->
              <div
                class="flex items-center justify-between gap-2 pb-2 border-b border-[var(--groove-dark)]/30 shrink-0"
              >
                <div class="min-w-0">
                  <span class="text-[10px] font-mono uppercase text-[var(--accent)] font-semibold">
                    {{ selectedItem.subType }}
                  </span>
                  <h3 class="font-editorial text-sm font-bold text-[var(--text-primary)] truncate">
                    {{ selectedItem.title }}
                  </h3>
                </div>

                <div class="flex items-center gap-2 shrink-0">
                  <!-- Copiar Contenido -->
                  <button
                    type="button"
                    class="neu-btn px-2.5 py-1.5 text-xs flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
                    title="Copiar texto al portapapeles"
                    @click="copyFragment(selectedItem.content)"
                  >
                    <Check v-if="copyFeedback" :size="13" class="text-emerald-500" />
                    <Copy v-else :size="13" />
                    <span>{{ copyFeedback ? '¡Copiado!' : 'Copiar' }}</span>
                  </button>

                  <!-- Eliminar definitivamente -->
                  <button
                    type="button"
                    class="neu-btn px-2.5 py-1.5 text-xs text-[var(--text-muted)] hover:text-rose-500 transition-all cursor-pointer"
                    title="Eliminar permanentemente este registro"
                    @click="promptDeleteSingle(selectedItem)"
                  >
                    <Trash2 :size="13" />
                  </button>

                  <!-- Restaurar elemento -->
                  <button
                    type="button"
                    class="neu-btn-terracotta px-3 py-1.5 text-xs flex items-center gap-1.5 font-bold cursor-pointer active:scale-95 transition-transform"
                    title="Restaurar este elemento de vuelta al manuscrito o wiki"
                    @click="handleRestore(selectedItem)"
                  >
                    <Undo2 :size="13" />
                    <span>Restaurar</span>
                  </button>
                </div>
              </div>

              <!-- Contenedor Neu-well de Lectura Rápida de Sólo Lectura -->
              <div
                class="flex-1 neu-well rounded-xl p-4 overflow-y-auto editorial-scrollbar font-serif text-sm leading-relaxed text-[var(--text-primary)] select-text border border-[var(--groove-dark)]/40"
              >
                <div
                  v-if="selectedItem.content"
                  class="space-y-3 whitespace-pre-wrap selection:bg-[var(--accent)] selection:text-white"
                >
                  {{ formatPreviewText(selectedItem.content) }}
                </div>
                <div
                  v-else
                  class="h-full flex items-center justify-center text-xs italic text-[var(--text-muted)] font-sans"
                >
                  Este elemento no contiene cuerpo de texto.
                </div>
              </div>

              <!-- Pie de métricas -->
              <div
                class="flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)] shrink-0 pt-1"
              >
                <span v-if="selectedItem.type === 'folio'">
                  {{ trashStore.countWords(selectedItem.content) }} palabras ·
                  {{ selectedItem.content.length }} caracteres
                </span>
                <span v-else> Ficha de Lore archivada </span>
                <span>No afecta el conteo de palabras del manuscrito activo</span>
              </div>
            </div>

            <!-- Estado sin selección -->
            <div
              v-else
              class="h-full flex flex-col items-center justify-center text-center p-6 text-[var(--text-muted)] space-y-2 neu-well rounded-xl"
            >
              <BookOpen :size="32" class="opacity-20" />
              <p class="text-xs font-editorial">Selecciona un elemento para previsualizarlo</p>
            </div>
          </section>
        </main>

        <!-- =============================================================== -->
        <!-- DIÁLOGO MODAL DE DOBLE VERIFICACIÓN (CONFIRMACIÓN DE PURGA)     -->
        <!-- =============================================================== -->
        <div
          v-if="purgeConfirm.isOpen"
          class="absolute inset-0 z-20 flex items-center justify-center p-6 bg-black/75 backdrop-blur-sm transition-all"
        >
          <div
            class="max-w-md w-full rounded-2xl neu-surface border border-rose-500/40 p-5 space-y-4 shadow-2xl bg-[var(--bg-surface)] text-[var(--text-primary)]"
            role="alertdialog"
            aria-labelledby="confirm-purge-title"
          >
            <div class="flex items-start gap-3">
              <div
                class="w-10 h-10 rounded-xl neu-well flex items-center justify-center text-rose-500 shrink-0"
              >
                <AlertTriangle :size="22" />
              </div>
              <div>
                <h3
                  id="confirm-purge-title"
                  class="font-editorial text-sm font-bold text-[var(--text-primary)]"
                >
                  {{
                    purgeConfirm.mode === 'all'
                      ? '¿Vaciar papelera permanentemente?'
                      : '¿Eliminar registro físico irreversible?'
                  }}
                </h3>
                <p class="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                  <template v-if="purgeConfirm.mode === 'all'">
                    Esta acción purgará físicamente todos los capítulos y fichas archivadas en la
                    papelera de SQLite. Esta acción no se puede deshacer.
                  </template>
                  <template v-else>
                    ¿Deseas purgar de forma permanente
                    <span class="font-bold text-[var(--text-primary)]"
                      >"{{ purgeConfirm.item?.title }}"</span
                    >? Esta acción es irreversible.
                  </template>
                </p>
              </div>
            </div>

            <div
              class="flex items-center justify-end gap-2 pt-2 border-t border-[var(--groove-dark)]/40"
            >
              <button
                type="button"
                class="neu-btn px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                @click="purgeConfirm.isOpen = false"
              >
                Cancelar
              </button>
              <button
                type="button"
                class="px-4 py-1.5 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-lg active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                @click="confirmPurge"
              >
                <Trash2 :size="13" />
                <span>Confirmar y Purgar</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.editorial-scrollbar::-webkit-scrollbar {
  width: 5px;
}
.editorial-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.editorial-scrollbar::-webkit-scrollbar-thumb {
  background: var(--groove-dark);
  border-radius: 4px;
}
</style>
