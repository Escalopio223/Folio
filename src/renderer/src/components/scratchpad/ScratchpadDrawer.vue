<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import {
  Feather,
  Plus,
  X,
  Search,
  Pin,
  Trash2,
  Copy,
  Check,
  BookOpen,
  Lightbulb,
  HelpCircle,
  Clock,
  ListFilter,
  Sparkles,
  CheckCircle2
} from 'lucide-vue-next'
import { onClickOutside } from '@vueuse/core'
import { useScratchpadStore, type ScratchpadColorTag } from '../../stores/scratchpadStore'

const scratchpadStore = useScratchpadStore()

const drawerRef = ref<HTMLElement | null>(null)
const titleInputRef = ref<HTMLInputElement | null>(null)
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const isListCollapsed = ref(false)
const copyToast = ref(false)
const promoteToast = ref<string | null>(null)

// Cerrar drawer al hacer clic fuera del panel
onClickOutside(drawerRef, () => {
  if (scratchpadStore.isOpen) {
    handleClose()
  }
})

function handleClose(): void {
  scratchpadStore.closeScratchpad()
  // Retorno inmediato de foco al editor TipTap central
  nextTick(() => {
    const editorEl = document.querySelector(
      '.tiptap-editor, .ProseMirror, textarea, [contenteditable="true"]'
    ) as HTMLElement | null
    editorEl?.focus()
  })
}

// Escuchar atajo global Ctrl+J / Cmd+J y Escape
function handleKeydown(e: KeyboardEvent): void {
  const isCtrlOrCmd = e.ctrlKey || e.metaKey

  // Ctrl+J / Cmd+J: Alternar Scratchpad desde cualquier lugar
  if (isCtrlOrCmd && !e.shiftKey && e.key.toLowerCase() === 'j') {
    e.preventDefault()
    e.stopPropagation()
    if (scratchpadStore.isOpen) {
      handleClose()
    } else {
      scratchpadStore.openScratchpad()
    }
    return
  }

  // Escape: Cerrar Scratchpad y devolver foco
  if (e.key === 'Escape' && scratchpadStore.isOpen) {
    e.preventDefault()
    handleClose()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown, true)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown, true)
})

// Auto-focus en el título o textarea cuando se abre el drawer o cambia la nota activa
watch(
  () => scratchpadStore.isOpen,
  (open) => {
    if (open) {
      nextTick(() => {
        focusInitialInput()
      })
    }
  }
)

watch(
  () => scratchpadStore.activeNoteId,
  () => {
    if (scratchpadStore.isOpen) {
      nextTick(() => {
        focusInitialInput()
      })
    }
  }
)

function focusInitialInput(): void {
  if (scratchpadStore.activeNote && !scratchpadStore.activeNote.title) {
    titleInputRef.value?.focus()
  } else if (textareaRef.value) {
    textareaRef.value.focus()
    const len = textareaRef.value.value.length
    textareaRef.value.setSelectionRange(len, len)
  }
}

// Configuración de Categorías / Color Tags (Sin diálogo)
interface TagOption {
  value: ScratchpadColorTag
  label: string
  icon: typeof Lightbulb
  badgeClass: string
  borderClass: string
  dotClass: string
}

const colorTagOptions: TagOption[] = [
  {
    value: 'idea',
    label: 'Idea',
    icon: Lightbulb,
    badgeClass: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
    borderClass: 'border-l-amber-500',
    dotClass: 'bg-amber-400'
  },
  {
    value: 'duda',
    label: 'Duda',
    icon: HelpCircle,
    badgeClass: 'text-purple-500 bg-purple-500/10 border-purple-500/30',
    borderClass: 'border-l-purple-500',
    dotClass: 'bg-purple-400'
  },
  {
    value: 'pendiente',
    label: 'Pendiente',
    icon: Clock,
    badgeClass: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
    borderClass: 'border-l-emerald-500',
    dotClass: 'bg-emerald-400'
  }
]

function getTagOption(tag: string | null): TagOption | undefined {
  return colorTagOptions.find((o) => o.value === tag)
}

// Extractor del extracto o título resumido de una nota
function getNoteSummary(note: { title?: string; content?: string }): { title: string; subtitle: string } {
  const noteTitle = note.title?.trim()
  const content = note.content?.trim() || ''
  const lines = content.split('\n').filter((l) => l.trim().length > 0)
  const firstLine = lines[0]?.replace(/^[#*\-•\s]+/, '').trim() || ''

  const displayTitle = noteTitle || firstLine || 'Nota sin título'
  const displaySubtitle = noteTitle
    ? (firstLine || 'Sin contenido adicional')
    : (lines[1]?.trim() || 'Sin contenido adicional')

  return {
    title: displayTitle.slice(0, 36) + (displayTitle.length > 36 ? '…' : ''),
    subtitle: displaySubtitle.slice(0, 48) + (displaySubtitle.length > 48 ? '…' : '')
  }
}

// Formateador de tiempo relativo
function formatRelativeTime(dateVal: Date | string | number): string {
  try {
    const d = new Date(dateVal)
    const diff = Math.floor((Date.now() - d.getTime()) / 1000)
    if (diff < 45) return 'ahora'
    if (diff < 3600) return `${Math.floor(diff / 60)}m`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`
    if (diff < 172800) return 'ayer'
    return d.toLocaleDateString([], { day: '2-digit', month: 'short' })
  } catch {
    return ''
  }
}

// Métricas de la nota activa
const noteWords = computed(() => {
  const content = scratchpadStore.activeNote?.content || ''
  const clean = content.replace(/<[^>]*>/g, ' ').trim()
  if (!clean) return 0
  return clean.split(/\s+/).length
})

const noteChars = computed(() => {
  return (scratchpadStore.activeNote?.content || '').length
})

// Acciones con feedback
async function handleCopy(): Promise<void> {
  if (!scratchpadStore.activeNoteId) return
  const ok = await scratchpadStore.copyNote(scratchpadStore.activeNoteId)
  if (ok) {
    copyToast.value = true
    setTimeout(() => {
      copyToast.value = false
    }, 2000)
  }
}

async function handlePromote(): Promise<void> {
  if (!scratchpadStore.activeNoteId) return
  const noteContent = scratchpadStore.activeNote?.content || ''
  if (!noteContent.trim()) return

  const scene = await scratchpadStore.promoteToScene(scratchpadStore.activeNoteId)
  if (scene) {
    promoteToast.value = `¡Promovida a "${scene.title}"!`
    setTimeout(() => {
      promoteToast.value = null
      handleClose()
    }, 1200)
  }
}

async function handleCreateNewNote(): Promise<void> {
  await scratchpadStore.createQuickNote('', '', null)
  nextTick(() => {
    focusInitialInput()
  })
}
</script>

<template>
  <Teleport to="body">
    <!-- Backdrop con desenfoque suave -->
    <transition name="drawer-fade">
      <div
        v-if="scratchpadStore.isOpen"
        class="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity duration-300"
        aria-hidden="true"
        @click="handleClose"
      />
    </transition>

    <!-- Slide-over Drawer lateral derecho neumórfico cálido -->
    <transition name="drawer-slide">
      <aside
        v-if="scratchpadStore.isOpen"
        ref="drawerRef"
        class="fixed right-0 top-0 bottom-0 z-50 w-[410px] max-w-[95vw] h-full flex flex-col bg-[var(--bg-surface)] text-[var(--text-primary)] neu-surface border-l border-[var(--groove-dark)]/60 shadow-[-12px_0_36px_rgba(0,0,0,0.35)] overflow-hidden select-none"
        role="dialog"
        aria-label="Scratchpad - Bloc de Captura Rápida"
      >
        <!-- =============================================================== -->
        <!-- 1. CABECERA DEL SCRATCHPAD                                      -->
        <!-- =============================================================== -->
        <header class="p-3.5 border-b border-[var(--groove-dark)]/40 flex items-center justify-between shrink-0 bg-[var(--bg-surface)]">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-8 h-8 rounded-xl neu-well flex items-center justify-center text-[var(--accent)] shrink-0">
              <Feather :size="16" class="stroke-[2.2]" />
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <h2 class="font-editorial text-sm font-bold text-[var(--text-primary)] truncate">
                  Scratchpad
                </h2>
                <span class="text-[9px] font-mono px-1.5 py-0.2 rounded-full neu-well-sm text-[var(--accent)] font-semibold">
                  {{ scratchpadStore.totalCount }}
                </span>
              </div>
              <p class="text-[10px] text-[var(--text-muted)] truncate">
                Bloc de Captura Rápida
              </p>
            </div>
          </div>

          <div class="flex items-center gap-1.5 shrink-0">
            <!-- Botón Añadir Nota Rápida -->
            <button
              type="button"
              class="neu-btn px-2.5 py-1 text-xs flex items-center gap-1 text-[var(--accent)] hover:scale-102 transition-all cursor-pointer font-medium"
              title="Nueva Nota Rápida (+)"
              @click="handleCreateNewNote"
            >
              <Plus :size="13" />
              <span class="text-[11px]">Nueva</span>
            </button>

            <!-- Botón Cerrar -->
            <button
              type="button"
              class="neu-btn p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              title="Cerrar panel"
              @click="handleClose"
            >
              <X :size="14" />
            </button>
          </div>
        </header>

        <!-- =============================================================== -->
        <!-- 2. MINI BARRA DE BÚSQUEDA Y FILTRO DE CATEGORÍAS                -->
        <!-- =============================================================== -->
        <div class="px-3 py-2 border-b border-[var(--groove-dark)]/30 space-y-2 shrink-0 bg-[var(--bg-base)]/40">
          <div class="relative flex items-center">
            <Search :size="12" class="absolute left-2.5 text-[var(--text-muted)] pointer-events-none" />
            <input
              v-model="scratchpadStore.searchQuery"
              type="text"
              placeholder="Buscar notas rápidas..."
              class="w-full pl-7 pr-7 py-1 text-xs rounded-xl neu-well bg-transparent text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-all font-sans"
            />
            <button
              v-if="scratchpadStore.searchQuery"
              type="button"
              class="absolute right-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs cursor-pointer"
              @click="scratchpadStore.searchQuery = ''"
            >
              <X :size="11" />
            </button>
          </div>

          <!-- Filtro rápido por chips de etiquetas -->
          <div class="flex items-center gap-1 overflow-x-auto editorial-scrollbar pb-0.5 text-[10px]">
            <button
              type="button"
              class="px-2 py-0.5 rounded-md transition-colors whitespace-nowrap cursor-pointer shrink-0 font-mono"
              :class="scratchpadStore.selectedColorFilter === 'all' ? 'neu-btn is-active text-[var(--accent)] font-bold' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'"
              @click="scratchpadStore.selectedColorFilter = 'all'"
            >
              Todas ({{ scratchpadStore.notes.length }})
            </button>

            <button
              v-for="opt in colorTagOptions"
              :key="opt.value || ''"
              type="button"
              class="px-2 py-0.5 rounded-md transition-colors whitespace-nowrap cursor-pointer shrink-0 flex items-center gap-1"
              :class="scratchpadStore.selectedColorFilter === opt.value ? 'neu-btn is-active font-bold text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'"
              @click="scratchpadStore.selectedColorFilter = opt.value || 'all'"
            >
              <span class="w-1.5 h-1.5 rounded-full" :class="opt.dotClass"></span>
              <span>{{ opt.label }}</span>
            </button>
          </div>
        </div>

        <!-- =============================================================== -->
        <!-- 3. LISTA MINIATURA DE NOTAS (Colapsable / Deslizable)          -->
        <!-- =============================================================== -->
        <div class="border-b border-[var(--groove-dark)]/30 shrink-0">
          <div class="px-3 py-1.5 flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)] bg-[var(--bg-surface)]">
            <span class="flex items-center gap-1">
              <ListFilter :size="10" />
              <span>Notas guardadas ({{ scratchpadStore.filteredNotes.length }})</span>
            </span>
            <button
              type="button"
              class="text-[9px] hover:text-[var(--accent)] cursor-pointer"
              @click="isListCollapsed = !isListCollapsed"
            >
              {{ isListCollapsed ? 'Mostrar lista ▲' : 'Ocultar lista ▼' }}
            </button>
          </div>

          <!-- Carrusel / Lista compacta superior de notas -->
          <div
            v-if="!isListCollapsed"
            class="max-h-[145px] overflow-y-auto px-2.5 py-1.5 space-y-1 editorial-scrollbar bg-[var(--bg-base)]/25"
          >
            <div
              v-for="note in scratchpadStore.filteredNotes"
              :key="note.id"
              class="p-2 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-2 border-l-4 group"
              :class="[
                scratchpadStore.activeNoteId === note.id
                  ? 'neu-well border-[var(--accent)] shadow-inner'
                  : 'neu-btn hover:text-[var(--text-primary)] border-transparent',
                note.colorTag ? getTagOption(note.colorTag)?.borderClass : 'border-l-stone-400/40'
              ]"
              @click="scratchpadStore.selectNote(note.id)"
            >
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5">
                  <span
                    v-if="note.isPinned"
                    class="text-amber-500 shrink-0"
                    title="Nota fijada al inicio"
                  >
                    <Pin :size="10" class="fill-current rotate-45" />
                  </span>
                  <span class="text-xs font-medium truncate text-[var(--text-primary)]">
                    {{ getNoteSummary(note).title }}
                  </span>
                </div>
                <div class="flex items-center gap-2 mt-0.5 text-[9px] text-[var(--text-muted)] font-mono">
                  <span>{{ formatRelativeTime(note.updatedAt) }}</span>
                  <span v-if="note.colorTag" class="px-1 py-0.1 rounded text-[8px] font-sans" :class="getTagOption(note.colorTag)?.badgeClass">
                    {{ getTagOption(note.colorTag)?.label }}
                  </span>
                </div>
              </div>

              <!-- Acciones rápidas de la miniatura -->
              <div class="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity" @click.stop>
                <button
                  type="button"
                  class="p-1 rounded-md hover:text-amber-500 transition-colors cursor-pointer"
                  :class="note.isPinned ? 'text-amber-500' : 'text-[var(--text-muted)]'"
                  :title="note.isPinned ? 'Desfijar' : 'Fijar nota arriba'"
                  @click="scratchpadStore.togglePin(note.id)"
                >
                  <Pin :size="11" :class="{ 'fill-current rotate-45': note.isPinned }" />
                </button>
                <button
                  type="button"
                  class="p-1 rounded-md text-[var(--text-muted)] hover:text-rose-500 transition-colors cursor-pointer"
                  title="Eliminar nota"
                  @click="scratchpadStore.deleteNote(note.id)"
                >
                  <Trash2 :size="11" />
                </button>
              </div>
            </div>

            <!-- Empty State si no hay notas que coincidan -->
            <div
              v-if="scratchpadStore.filteredNotes.length === 0"
              class="py-3 text-center text-xs text-[var(--text-muted)] italic"
            >
              No hay notas para este filtro
            </div>
          </div>
        </div>

        <!-- =============================================================== -->
        <!-- 4. ÁREA DE REDACCIÓN DE LA NOTA ACTIVA (ZERO-LAG / AUTOGUARDADO) -->
        <!-- =============================================================== -->
        <main class="flex-1 flex flex-col p-3 gap-2 overflow-hidden bg-[var(--bg-surface)] min-h-0">
          <template v-if="scratchpadStore.activeNote">
            <!-- Barra superior de la nota activa: Etiquetas de categoría -->
            <div class="flex items-center justify-between gap-2 shrink-0">
              <div class="flex items-center gap-1 overflow-x-auto editorial-scrollbar text-[11px]">
                <span class="text-[10px] font-mono text-[var(--text-muted)] mr-1">Etiqueta:</span>
                <button
                  type="button"
                  class="px-2 py-0.5 rounded-lg text-[10px] font-mono transition-all cursor-pointer"
                  :class="!scratchpadStore.activeNote.colorTag ? 'neu-well font-bold text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'"
                  @click="scratchpadStore.setColorTag(scratchpadStore.activeNote.id, null)"
                >
                  Ninguna
                </button>
                <button
                  v-for="opt in colorTagOptions"
                  :key="opt.value || ''"
                  type="button"
                  class="px-2 py-0.5 rounded-lg text-[10px] font-medium transition-all flex items-center gap-1 cursor-pointer"
                  :class="scratchpadStore.activeNote.colorTag === opt.value ? 'neu-well font-bold ' + opt.badgeClass : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'"
                  @click="scratchpadStore.setColorTag(scratchpadStore.activeNote.id, opt.value)"
                >
                  <component :is="opt.icon" :size="10" />
                  <span>{{ opt.label }}</span>
                </button>
              </div>

              <!-- Indicador de Pin para la nota activa -->
              <button
                type="button"
                class="neu-btn px-2 py-1 rounded-lg text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                :class="scratchpadStore.activeNote.isPinned ? 'text-amber-500 font-bold' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'"
                :title="scratchpadStore.activeNote.isPinned ? 'Desfijar de la parte superior' : 'Fijar nota arriba'"
                @click="scratchpadStore.togglePin(scratchpadStore.activeNote.id)"
              >
                <Pin :size="11" :class="{ 'fill-current rotate-45': scratchpadStore.activeNote.isPinned }" />
                <span class="hidden sm:inline">{{ scratchpadStore.activeNote.isPinned ? 'Fijada' : 'Fijar' }}</span>
              </button>
            </div>

            <!-- 1. Bloque pequeño: Nombre / Título de la idea o apunte -->
            <div class="neu-well-sm rounded-xl px-3 py-1.5 border border-[var(--groove-dark)]/40 focus-within:ring-1 focus-within:ring-[var(--accent)] transition-all shrink-0">
              <input
                ref="titleInputRef"
                :value="scratchpadStore.activeNote.title"
                type="text"
                placeholder="Nombre o concepto de la idea (ej. 'Giro en el capítulo III')..."
                class="w-full bg-transparent border-none outline-none font-editorial font-bold text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)]/60"
                @input="scratchpadStore.updateActiveTitle(($event.target as HTMLInputElement).value)"
              />
            </div>

            <!-- 2. Bloque principal: Contenido / Desarrollo de la idea -->
            <div class="flex-1 neu-well rounded-2xl p-3 flex flex-col overflow-hidden relative border border-[var(--groove-dark)]/40">
              <textarea
                ref="textareaRef"
                :value="scratchpadStore.activeNote.content"
                placeholder="Desarrolla aquí tu idea, nota o pensamiento...

(Se autoguarda cada 400ms en SQLite)."
                class="w-full h-full bg-transparent resize-none border-none outline-none font-sans text-xs md:text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)]/70 leading-relaxed editorial-scrollbar"
                @input="scratchpadStore.updateActiveContent(($event.target as HTMLTextAreaElement).value)"
              />

              <!-- Toast de copia háptica/visual -->
              <transition name="fade">
                <div
                  v-if="copyToast"
                  class="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-[var(--accent)] text-white text-xs font-mono shadow-lg flex items-center gap-1.5 animate-bounce"
                >
                  <Check :size="12" />
                  <span>¡Copiado al portapapeles!</span>
                </div>
              </transition>

              <!-- Toast de promoción -->
              <transition name="fade">
                <div
                  v-if="promoteToast"
                  class="absolute inset-x-4 top-4 px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-mono shadow-xl flex items-center justify-center gap-2"
                >
                  <CheckCircle2 :size="14" />
                  <span>{{ promoteToast }}</span>
                </div>
              </transition>
            </div>
          </template>

          <!-- Empty State si no hay ninguna nota en el proyecto -->
          <div
            v-else
            class="flex-1 flex flex-col items-center justify-center text-center p-6 neu-well rounded-2xl text-[var(--text-muted)] space-y-3"
          >
            <div class="w-12 h-12 rounded-2xl neu-surface flex items-center justify-center text-[var(--accent)]">
              <Sparkles :size="22" />
            </div>
            <div>
              <p class="text-sm font-editorial font-bold text-[var(--text-primary)]">
                Tu bloc está en blanco
              </p>
              <p class="text-xs text-[var(--text-muted)] max-w-xs mt-1">
                Captura tus pensamientos sin interrumpir tu flujo de escritura en el manuscrito.
              </p>
            </div>
            <button
              type="button"
              class="neu-btn px-4 py-2 text-xs text-[var(--accent)] font-semibold flex items-center gap-1.5 cursor-pointer"
              @click="handleCreateNewNote"
            >
              <Plus :size="13" />
              <span>Crear primera nota rápida</span>
            </button>
          </div>
        </main>

        <!-- =============================================================== -->
        <!-- 5. PIE DEL DRAWER: MÉTRICAS Y ACCIONES PRINCIPALES              -->
        <!-- =============================================================== -->
        <footer class="p-3 border-t border-[var(--groove-dark)]/40 bg-[var(--bg-surface)] shrink-0 flex items-center justify-between gap-2">
          <!-- Métricas de texto e indicador de autoguardado -->
          <div class="flex items-center gap-2 text-[10px] font-mono text-[var(--text-muted)] min-w-0">
            <span class="truncate">{{ noteWords }} palabras · {{ noteChars }} car.</span>
            <span class="opacity-40">|</span>
            <span
              class="flex items-center gap-1 truncate"
              :class="{
                'text-amber-500': scratchpadStore.saveStatus === 'saving',
                'text-emerald-500': scratchpadStore.saveStatus === 'saved',
                'text-rose-500': scratchpadStore.saveStatus === 'error'
              }"
            >
              <span
                class="w-1.5 h-1.5 rounded-full"
                :class="{
                  'bg-amber-400 animate-pulse': scratchpadStore.saveStatus === 'saving',
                  'bg-emerald-500': scratchpadStore.saveStatus === 'saved',
                  'bg-rose-500': scratchpadStore.saveStatus === 'error'
                }"
              ></span>
              <template v-if="scratchpadStore.saveStatus === 'saving'">Guardando...</template>
              <template v-else-if="scratchpadStore.saveStatus === 'saved'">Guardado</template>
              <template v-else>Error</template>
            </span>
          </div>

          <!-- Acciones clave: Promover a Escena & Copiar -->
          <div class="flex items-center gap-1.5 shrink-0">
            <!-- Copiar -->
            <button
              type="button"
              class="neu-btn px-2.5 py-1 text-xs flex items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer active:scale-95"
              title="Copiar contenido de la nota al portapapeles"
              :disabled="!scratchpadStore.activeNote?.content"
              @click="handleCopy"
            >
              <Copy :size="12" />
              <span class="text-[11px] hidden sm:inline">Copiar</span>
            </button>

            <!-- Promover a Escena -->
            <button
              type="button"
              class="neu-btn px-3 py-1 text-xs flex items-center gap-1.5 text-[var(--accent)] hover:scale-102 transition-all cursor-pointer active:scale-95 font-medium"
              title="Convertir esta nota en una nueva escena dentro del manuscrito activo"
              :disabled="!scratchpadStore.activeNote?.content"
              @click="handlePromote"
            >
              <BookOpen :size="12" />
              <span class="text-[11px]">Promover a Escena</span>
            </button>
          </div>
        </footer>
      </aside>
    </transition>
  </Teleport>
</template>

<style scoped>
/* Transición del Drawer lateral */
.drawer-slide-enter-active,
.drawer-slide-leave-active {
  transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
}

.drawer-slide-enter-from,
.drawer-slide-leave-to {
  transform: translateX(100%);
}

.drawer-slide-enter-to,
.drawer-slide-leave-from {
  transform: translateX(0);
}

/* Transición del Backdrop */
.drawer-fade-enter-active,
.drawer-fade-leave-active {
  transition: opacity 0.25s ease;
}

.drawer-fade-enter-from,
.drawer-fade-leave-to {
  opacity: 0;
}

.drawer-fade-enter-to,
.drawer-fade-leave-from {
  opacity: 1;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
