<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import {
  Feather,
  X,
  Search,
  Pin,
  Trash2,
  Copy,
  Check,
  ArrowRight,
  BookOpen,
  CornerDownLeft,
  Sparkles
} from 'lucide-vue-next'
import { onClickOutside } from '@vueuse/core'
import { useScratchpadStore } from '../../stores/scratchpadStore'
import { useFolioStore } from '../../stores/folioStore'

const scratchpadStore = useScratchpadStore()
const folioStore = useFolioStore()

const drawerRef = ref<HTMLElement | null>(null)
const quickInputRef = ref<HTMLTextAreaElement | null>(null)
const newIdeaText = ref('')

// Feedbacks visuales transitorios (toasts hápticos sutiles)
const copiedNoteId = ref<number | null>(null)
const sentNoteId = ref<number | null>(null)
const editingNoteId = ref<number | null>(null)

// Ancho redimensionable del cajón lateral con memoria
const drawerWidth = ref<number>(
  Number(localStorage.getItem('folio:scratchpad_width')) || 440
)
const isResizing = ref(false)

function onResizePointerDown(e: PointerEvent): void {
  if (e.button !== 0) return
  e.preventDefault()
  isResizing.value = true
  const startX = e.clientX
  const startW = drawerWidth.value

  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'

  const onPointerMove = (ev: PointerEvent) => {
    const deltaX = ev.clientX - startX
    const maxW = Math.round(window.innerWidth * 0.85)
    const newWidth = Math.max(340, Math.min(maxW, Math.round(startW - deltaX)))
    drawerWidth.value = newWidth
  }

  const onPointerUp = () => {
    isResizing.value = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    localStorage.setItem('folio:scratchpad_width', String(drawerWidth.value))
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', onPointerUp)
  }

  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerUp)
}

function resetDrawerWidth(): void {
  drawerWidth.value = 440
  localStorage.setItem('folio:scratchpad_width', '440')
}

// Cierre táctil al pulsar fuera del drawer
onClickOutside(drawerRef, () => {
  if (scratchpadStore.isOpen) {
    handleClose()
  }
})

function handleClose(): void {
  scratchpadStore.closeScratchpad()
  nextTick(() => {
    const editorEl = document.querySelector(
      '.tiptap-editor, .ProseMirror, textarea, [contenteditable="true"]'
    ) as HTMLElement | null
    editorEl?.focus()
  })
}

// Atajos globales: Ctrl+J / Cmd+J para abrir y Esc para salir
function handleKeydown(e: KeyboardEvent): void {
  const isCtrlOrCmd = e.ctrlKey || e.metaKey

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

  if (e.key === 'Escape' && scratchpadStore.isOpen) {
    e.preventDefault()
    if (editingNoteId.value) {
      editingNoteId.value = null
    } else {
      handleClose()
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown, true)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown, true)
})

// Focus inmediato al abrir el cajón: Cero fricción para teclear
watch(
  () => scratchpadStore.isOpen,
  (open) => {
    if (open) {
      nextTick(() => {
        quickInputRef.value?.focus()
      })
    }
  }
)

// Captura de nota: Enter o Cmd/Ctrl+Enter
async function handleQuickSubmit(e: KeyboardEvent): Promise<void> {
  // Enter sin shift o Cmd+Enter / Ctrl+Enter guarda de inmediato
  const isCtrlOrCmd = e.ctrlKey || e.metaKey
  const isPlainEnter = e.key === 'Enter' && !e.shiftKey
  const isModifierEnter = e.key === 'Enter' && isCtrlOrCmd

  if (isPlainEnter || isModifierEnter) {
    e.preventDefault()
    const text = newIdeaText.value.trim()
    if (!text) return

    newIdeaText.value = ''
    await scratchpadStore.addQuickIdea(text)

    // Reajustar altura del textarea
    if (quickInputRef.value) {
      quickInputRef.value.style.height = 'auto'
      quickInputRef.value.focus()
    }
  }
}

function autoGrowTextarea(el: HTMLTextAreaElement | null): void {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 180)}px`
}

function onInputText(): void {
  autoGrowTextarea(quickInputRef.value)
}

// Acciones flotantes por nota
async function handleCopyNote(id: number): Promise<void> {
  const ok = await scratchpadStore.copyNote(id)
  if (ok) {
    copiedNoteId.value = id
    setTimeout(() => {
      copiedNoteId.value = null
    }, 1800)
  }
}

async function handleSendToChapter(id: number): Promise<void> {
  if (!folioStore.activeFolioId) return
  const ok = await scratchpadStore.sendToActiveChapter(id)
  if (ok) {
    sentNoteId.value = id
    setTimeout(() => {
      sentNoteId.value = null
    }, 1800)
  }
}

async function handlePromoteNote(id: number): Promise<void> {
  const chapter = await scratchpadStore.promoteToChapter(id)
  if (chapter) {
    handleClose()
  }
}

// Formateador de tiempo relativo suave
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
</script>

<template>
  <Teleport to="body">
    <!-- Backdrop de penumbra cálida -->
    <transition name="drawer-fade">
      <div
        v-if="scratchpadStore.isOpen"
        class="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px] transition-opacity duration-300"
        aria-hidden="true"
        @click="handleClose"
      />
    </transition>

    <!-- Drawer Lateral Derecho: Neumorfismo Cálido sin bordes duros -->
    <transition name="drawer-slide">
      <aside
        v-if="scratchpadStore.isOpen"
        ref="drawerRef"
        class="fixed right-0 top-0 bottom-0 z-50 h-full flex flex-col bg-[var(--bg-surface)] text-[var(--text-primary)] neu-surface border-l border-[var(--groove-dark)]/40 shadow-[-16px_0_40px_rgba(0,0,0,0.35)] overflow-hidden select-none"
        :style="{ width: `${drawerWidth}px`, maxWidth: '92vw' }"
        role="dialog"
        aria-label="Scratchpad Editorial"
      >
        <!-- Tirador táctil lateral para ajuste de ancho -->
        <div
          class="absolute left-0 top-0 bottom-0 w-2.5 -translate-x-1 cursor-col-resize z-50 flex items-center justify-center group hover:bg-[var(--accent)]/30 active:bg-[var(--accent)] transition-all"
          :class="{ 'bg-[var(--accent)]/40': isResizing }"
          title="Arrastrar para redimensionar (Doble clic para restablecer)"
          @pointerdown="onResizePointerDown"
          @dblclick="resetDrawerWidth"
        >
          <div
            class="w-1 h-8 rounded-full bg-[var(--groove-dark)]/70 group-hover:bg-[var(--accent)] transition-colors"
            :class="{ '!bg-[var(--accent)]': isResizing }"
          />
        </div>

        <!-- =============================================================== -->
        <!-- CABECERA CÁLIDA MINIMALISTA                                     -->
        <!-- =============================================================== -->
        <header
          class="px-4 py-3.5 border-b border-[var(--groove-dark)]/35 flex items-center justify-between shrink-0 bg-[var(--bg-surface)]"
        >
          <div class="flex items-center gap-2.5 min-w-0">
            <div
              class="w-8 h-8 rounded-xl neu-well flex items-center justify-center text-[var(--accent)] shrink-0 shadow-inner"
            >
              <Feather :size="15" class="stroke-[2.2]" />
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <h2 class="font-editorial text-sm font-bold text-[var(--text-primary)] tracking-tight">
                  Scratchpad
                </h2>
                <span
                  v-if="scratchpadStore.totalCount > 0"
                  class="text-[9px] font-mono px-1.5 py-0.2 rounded-full neu-well-sm text-[var(--accent)] font-semibold"
                >
                  {{ scratchpadStore.totalCount }}
                </span>
              </div>
              <p class="text-[10px] text-[var(--text-muted)] font-mono truncate">
                Captura rápida de pensamientos
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <!-- Estado de guardado discreto -->
            <span
              class="flex items-center gap-1 text-[10px] font-mono"
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
              <span class="text-[9px] opacity-80">{{
                scratchpadStore.saveStatus === 'saving' ? 'Guardando...' : 'Sincronizado'
              }}</span>
            </span>

            <!-- Botón cerrar con atajo Esc -->
            <button
              type="button"
              class="w-7 h-7 neu-btn rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:!text-[var(--accent)] transition-all cursor-pointer active:scale-95"
              title="Cerrar Scratchpad (Esc)"
              @click="handleClose"
            >
              <X :size="14" />
            </button>
          </div>
        </header>

        <!-- =============================================================== -->
        <!-- ZONA DE ENTRADA RÁPIDA: FOCO INMEDIATO (INSET SHADOW NEUMÓRFICO) -->
        <!-- =============================================================== -->
        <div class="p-3.5 pb-2 shrink-0 bg-[var(--bg-surface)]">
          <div
            class="neu-well p-3 rounded-2xl flex flex-col gap-2 border border-[var(--groove-dark)]/40 focus-within:ring-1 focus-within:ring-[var(--accent)]/60 transition-all shadow-inner"
          >
            <textarea
              ref="quickInputRef"
              v-model="newIdeaText"
              rows="2"
              placeholder="Escribe una idea fugaz y pulsa Enter para fijarla..."
              class="w-full bg-transparent border-none outline-none resize-none font-editorial text-xs md:text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)]/75 leading-relaxed cursor-text select-text custom-scrollbar"
              @keydown="handleQuickSubmit"
              @input="onInputText"
            />

            <!-- Pie de la entrada: Atajo y botón de fijado rápido -->
            <div class="flex items-center justify-between pt-1 border-t border-[var(--groove-dark)]/25 text-[10px] text-[var(--text-muted)] font-mono">
              <span class="opacity-70 flex items-center gap-1">
                <span>Enter</span>
                <span class="opacity-50">o</span>
                <span>Shift+Enter salto</span>
              </span>

              <button
                type="button"
                class="neu-btn px-2.5 py-1 text-[10px] text-[var(--accent)] font-semibold flex items-center gap-1 rounded-lg cursor-pointer transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                :disabled="!newIdeaText.trim()"
                @click="handleQuickSubmit({ key: 'Enter', preventDefault: () => {} } as any)"
              >
                <span>Fijar</span>
                <CornerDownLeft :size="10" />
              </button>
            </div>
          </div>
        </div>

        <!-- =============================================================== -->
        <!-- BÚSQUEDA FLUIDA INTEGRADA (SOLO SI HAY NOTAS)                   -->
        <!-- =============================================================== -->
        <div
          v-if="scratchpadStore.notes.length > 3"
          class="px-3.5 pb-2 shrink-0"
        >
          <div class="relative flex items-center">
            <Search :size="12" class="absolute left-3 text-[var(--text-muted)] pointer-events-none" />
            <input
              v-model="scratchpadStore.searchQuery"
              type="text"
              placeholder="Filtrar notas..."
              class="w-full pl-8 pr-7 py-1 text-[11px] rounded-xl neu-well-sm bg-transparent text-[var(--text-primary)] placeholder-[var(--text-muted)]/60 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/50 transition-all font-mono"
            />
            <button
              v-if="scratchpadStore.searchQuery"
              type="button"
              class="w-4 h-4 neu-btn rounded flex items-center justify-center absolute right-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              @click="scratchpadStore.searchQuery = ''"
            >
              <X :size="10" />
            </button>
          </div>
        </div>

        <!-- =============================================================== -->
        <!-- FEED CONTINUO DE NOTAS (OPCIÓN A: SIN TÍTULO, ACCIONES EN HOVER) -->
        <!-- =============================================================== -->
        <main class="flex-1 overflow-y-auto px-3.5 pb-4 space-y-2.5 editorial-scrollbar min-h-0">
          <transition-group name="note-list">
            <div
              v-for="note in scratchpadStore.filteredNotes"
              :key="note.id"
              class="group relative p-3 rounded-2xl neu-btn text-left transition-all duration-200 border-l-3"
              :class="[
                note.isPinned
                  ? 'border-l-[var(--accent)] bg-[var(--bg-base)]/40 shadow-sm'
                  : 'border-l-transparent hover:border-l-[var(--groove-dark)]'
              ]"
            >
              <!-- Contenido editable en línea o lectura fluida -->
              <div class="space-y-1.5">
                <textarea
                  v-if="editingNoteId === note.id"
                  :value="note.content"
                  rows="3"
                  class="w-full bg-transparent border-none outline-none resize-none font-editorial text-xs md:text-sm text-[var(--text-primary)] leading-relaxed cursor-text select-text"
                  autofocus
                  @input="scratchpadStore.updateNoteContent(note.id, ($event.target as HTMLTextAreaElement).value)"
                  @blur="editingNoteId = null"
                  @keydown.esc="editingNoteId = null"
                />

                <p
                  v-else
                  class="font-editorial text-xs md:text-sm text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed cursor-text select-text break-words"
                  @click="editingNoteId = note.id"
                >
                  {{ note.content }}
                </p>
              </div>

              <!-- Metadatos inferiores sutiles -->
              <div class="flex items-center justify-between mt-2 pt-1 border-t border-[var(--groove-dark)]/20 text-[9px] font-mono text-[var(--text-muted)] select-none">
                <span class="opacity-75 flex items-center gap-1.5">
                  <span v-if="note.isPinned" class="text-[var(--accent)] font-semibold flex items-center gap-0.5">
                    <Pin :size="9" class="fill-current rotate-45" />
                    <span>Fijada</span>
                  </span>
                  <span>{{ formatRelativeTime(note.updatedAt) }}</span>
                </span>

                <!-- Acciones flotantes (Visibles de forma limpia en hover del grupo) -->
                <div
                  class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                  @click.stop
                >
                  <!-- Copiar al portapapeles -->
                  <button
                    type="button"
                    class="p-1 rounded-md neu-well-sm text-[var(--text-muted)] hover:!text-[var(--text-primary)] cursor-pointer transition-colors"
                    :title="copiedNoteId === note.id ? '¡Copiado!' : 'Copiar texto'"
                    @click="handleCopyNote(note.id)"
                  >
                    <Check v-if="copiedNoteId === note.id" :size="11" class="text-emerald-500" />
                    <Copy v-else :size="11" />
                  </button>

                  <!-- Enviar al final del capítulo activo -->
                  <button
                    v-if="folioStore.activeFolioId"
                    type="button"
                    class="p-1 rounded-md neu-well-sm text-[var(--text-muted)] hover:!text-[var(--accent)] cursor-pointer transition-colors"
                    :title="sentNoteId === note.id ? '¡Añadido al capítulo!' : 'Enviar al capítulo activo'"
                    @click="handleSendToChapter(note.id)"
                  >
                    <Check v-if="sentNoteId === note.id" :size="11" class="text-emerald-500" />
                    <ArrowRight v-else :size="11" />
                  </button>

                  <!-- Promover a nuevo capítulo -->
                  <button
                    type="button"
                    class="p-1 rounded-md neu-well-sm text-[var(--text-muted)] hover:!text-[var(--accent)] cursor-pointer transition-colors"
                    title="Convertir en un nuevo capítulo"
                    @click="handlePromoteNote(note.id)"
                  >
                    <BookOpen :size="11" />
                  </button>

                  <!-- Alternar Pin -->
                  <button
                    type="button"
                    class="p-1 rounded-md neu-well-sm text-[var(--text-muted)] hover:!text-amber-500 cursor-pointer transition-colors"
                    :class="{ '!text-amber-500': note.isPinned }"
                    :title="note.isPinned ? 'Desfijar' : 'Fijar nota arriba'"
                    @click="scratchpadStore.togglePin(note.id)"
                  >
                    <Pin :size="11" :class="{ 'fill-current rotate-45': note.isPinned }" />
                  </button>

                  <!-- Eliminar -->
                  <button
                    type="button"
                    class="p-1 rounded-md neu-well-sm text-[var(--text-muted)] hover:!text-rose-500 cursor-pointer transition-colors"
                    title="Descartar nota"
                    @click="scratchpadStore.deleteNote(note.id)"
                  >
                    <Trash2 :size="11" />
                  </button>
                </div>
              </div>
            </div>
          </transition-group>

          <!-- Estado vacío minimalista e inspiracional -->
          <div
            v-if="scratchpadStore.filteredNotes.length === 0"
            class="h-44 flex flex-col items-center justify-center text-center p-6 neu-well rounded-2xl text-[var(--text-muted)] space-y-2 border border-[var(--groove-dark)]/30"
          >
            <div class="w-9 h-9 rounded-xl neu-surface flex items-center justify-center text-[var(--accent)]">
              <Sparkles :size="16" />
            </div>
            <p class="font-editorial text-xs font-semibold text-[var(--text-primary)]">
              Sin ideas capturadas aún
            </p>
            <p class="text-[10px] text-[var(--text-muted)] max-w-xs font-mono">
              Escribe arriba cualquier fragmento o apunte sin temor a perderlo.
            </p>
          </div>
        </main>
      </aside>
    </transition>
  </Teleport>
</template>

<style scoped>
/* Transición del Drawer */
.drawer-slide-enter-active,
.drawer-slide-leave-active {
  transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
}
.drawer-slide-enter-from,
.drawer-slide-leave-to {
  transform: translateX(100%);
}

.drawer-fade-enter-active,
.drawer-fade-leave-active {
  transition: opacity 0.25s ease;
}
.drawer-fade-enter-from,
.drawer-fade-leave-to {
  opacity: 0;
}

/* Transiciones del Feed de notas */
.note-list-enter-active,
.note-list-leave-active {
  transition: all 0.2s ease-out;
}
.note-list-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}
.note-list-leave-to {
  opacity: 0;
  transform: scale(0.96);
}
</style>
