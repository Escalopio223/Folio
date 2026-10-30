<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { onClickOutside } from '@vueuse/core'
import {
  Download,
  ChevronDown,
  BookOpen,
  FileText,
  FilePenLine,
  Loader2,
  CheckCircle2
} from 'lucide-vue-next'
import { useProjectStore } from '../stores/projectStore'
import { useFolioStore } from '../stores/folioStore'
import {
  collectActiveManuscript,
  exportManuscriptToEpub,
  exportManuscriptToPdf,
  exportManuscriptToDocx,
  type ExportFormat
} from '../utils/manuscriptExporter'

const projectStore = useProjectStore()
const folioStore = useFolioStore()

const isMenuOpen = ref(false)
const exportingFormat = ref<ExportFormat | null>(null)
const exportFeedback = ref<string | null>(null)
const menuContainerRef = ref<HTMLElement | null>(null)

let feedbackTimer: ReturnType<typeof setTimeout> | null = null

onClickOutside(menuContainerRef, () => {
  isMenuOpen.value = false
})

function toggleMenu(): void {
  if (exportingFormat.value) return
  isMenuOpen.value = !isMenuOpen.value
}

function showTransientFeedback(message: string): void {
  if (feedbackTimer) clearTimeout(feedbackTimer)
  exportFeedback.value = message
  feedbackTimer = setTimeout(() => {
    exportFeedback.value = null
  }, 3200)
}

async function handleExportEpub(): Promise<void> {
  if (exportingFormat.value) return
  isMenuOpen.value = false
  exportingFormat.value = 'epub'

  try {
    const manuscript = collectActiveManuscript(projectStore.activeProject, folioStore.chapters)
    await new Promise((resolve) => setTimeout(resolve, 180))
    const filename = await exportManuscriptToEpub(manuscript)
    showTransientFeedback(`Descargado: ${filename}`)
  } catch (err) {
    console.error('[ExportManuscriptMenu] Error al exportar EPUB:', err)
    showTransientFeedback('Error al generar el archivo EPUB')
  } finally {
    exportingFormat.value = null
  }
}

async function handleExportPdf(): Promise<void> {
  if (exportingFormat.value) return
  isMenuOpen.value = false
  exportingFormat.value = 'pdf'

  try {
    const manuscript = collectActiveManuscript(projectStore.activeProject, folioStore.chapters)
    const filename = await exportManuscriptToPdf(manuscript)
    showTransientFeedback(`Descargado: ${filename}`)
  } catch (err) {
    console.error('[ExportManuscriptMenu] Error al exportar PDF:', err)
    showTransientFeedback('Error al generar el archivo PDF')
  } finally {
    exportingFormat.value = null
  }
}

async function handleExportDocx(): Promise<void> {
  if (exportingFormat.value) return
  isMenuOpen.value = false
  exportingFormat.value = 'docx'

  try {
    const manuscript = collectActiveManuscript(projectStore.activeProject, folioStore.chapters)
    await new Promise((resolve) => setTimeout(resolve, 180))
    const filename = await exportManuscriptToDocx(manuscript)
    showTransientFeedback(`Descargado: ${filename}`)
  } catch (err) {
    console.error('[ExportManuscriptMenu] Error al exportar DOCX:', err)
    showTransientFeedback('Error al generar el archivo Word (.docx)')
  } finally {
    exportingFormat.value = null
  }
}

function handleEscapeKey(e: KeyboardEvent): void {
  if (e.key === 'Escape' && isMenuOpen.value) {
    isMenuOpen.value = false
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleEscapeKey)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleEscapeKey)
  if (feedbackTimer) clearTimeout(feedbackTimer)
})
</script>

<template>
  <div ref="menuContainerRef" class="no-drag relative inline-flex items-center">
    <!-- Botón compacto en el Header -->
    <button
      type="button"
      :disabled="exportingFormat !== null || folioStore.chapters.length === 0"
      class="neu-btn px-2.5 py-1 flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:!text-[var(--accent)] disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
      :class="{
        'neu-well !text-[var(--accent)] font-semibold': isMenuOpen || exportingFormat !== null
      }"
      title="Exportar manuscrito completo (EPUB, PDF o Word)"
      @click="toggleMenu"
    >
      <Loader2
        v-if="exportingFormat !== null"
        :size="13"
        class="animate-spin text-[var(--accent)] shrink-0"
      />
      <Download v-else :size="13" class="text-[var(--accent)] shrink-0" />

      <span class="text-[11px] font-medium">
        {{ exportingFormat !== null ? 'Generando archivo...' : 'Exportar' }}
      </span>

      <ChevronDown
        v-if="exportingFormat === null"
        :size="11"
        class="text-[var(--text-muted)] transition-transform duration-150 shrink-0"
        :class="{ 'rotate-180': isMenuOpen }"
      />
    </button>

    <!-- Toast / Feedback sutil no invasivo al finalizar la descarga -->
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 -translate-y-1 scale-95"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 -translate-y-1 scale-95"
    >
      <div
        v-if="exportFeedback && !isMenuOpen"
        class="absolute left-0 top-full mt-2 z-50 neu-surface px-3 py-1.5 rounded-xl border border-[var(--groove-dark)]/50 shadow-lg flex items-center gap-1.5 whitespace-nowrap pointer-events-none"
      >
        <CheckCircle2 :size="13" class="text-emerald-500 shrink-0" />
        <span class="text-[11px] font-mono text-[var(--text-primary)]">{{ exportFeedback }}</span>
      </div>
    </Transition>

    <!-- Menú Desplegable (Dropdown / Popover) -->
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 -translate-y-1 scale-95"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 -translate-y-1 scale-95"
    >
      <div
        v-if="isMenuOpen"
        class="absolute left-0 top-full mt-2 z-50 w-72 neu-surface p-2 rounded-2xl border border-[var(--groove-dark)]/50 shadow-xl space-y-1"
        role="menu"
        aria-label="Opciones de exportación del manuscrito"
      >
        <div
          class="px-2.5 py-1 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]"
        >
          <span>Compilar manuscrito</span>
          <span>{{ folioStore.chapters.length }} cap.</span>
        </div>

        <div class="neu-groove-h my-1"></div>

        <!-- Opción 1: Exportar a EPUB (.epub) -->
        <button
          type="button"
          role="menuitem"
          class="w-full p-2.5 rounded-xl text-left flex items-start gap-3 hover:bg-[var(--bg-base)] active:scale-[0.99] transition-all cursor-pointer group"
          @click="handleExportEpub"
        >
          <div
            class="w-8 h-8 rounded-xl neu-well-sm flex items-center justify-center text-[var(--accent)] shrink-0 group-hover:scale-105 transition-transform"
          >
            <BookOpen :size="15" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between gap-2">
              <span
                class="text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors"
              >
                Exportar a EPUB
              </span>
              <span class="text-[10px] font-mono text-[var(--text-muted)] neu-well-sm px-1.5 py-0.2 rounded">
                .epub
              </span>
            </div>
            <p class="text-[11px] text-[var(--text-muted)] leading-snug mt-0.5">
              Para lectores digitales / e-readers
            </p>
          </div>
        </button>

        <!-- Opción 2: Exportar a PDF (.pdf) -->
        <button
          type="button"
          role="menuitem"
          class="w-full p-2.5 rounded-xl text-left flex items-start gap-3 hover:bg-[var(--bg-base)] active:scale-[0.99] transition-all cursor-pointer group"
          @click="handleExportPdf"
        >
          <div
            class="w-8 h-8 rounded-xl neu-well-sm flex items-center justify-center text-[var(--accent)] shrink-0 group-hover:scale-105 transition-transform"
          >
            <FileText :size="15" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between gap-2">
              <span
                class="text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors"
              >
                Exportar a PDF
              </span>
              <span class="text-[10px] font-mono text-[var(--text-muted)] neu-well-sm px-1.5 py-0.2 rounded">
                .pdf
              </span>
            </div>
            <p class="text-[11px] text-[var(--text-muted)] leading-snug mt-0.5">
              Maquetado listo para lectura o impresión
            </p>
          </div>
        </button>

        <!-- Opción 3: Exportar a Word (.docx) -->
        <button
          type="button"
          role="menuitem"
          class="w-full p-2.5 rounded-xl text-left flex items-start gap-3 hover:bg-[var(--bg-base)] active:scale-[0.99] transition-all cursor-pointer group"
          @click="handleExportDocx"
        >
          <div
            class="w-8 h-8 rounded-xl neu-well-sm flex items-center justify-center text-[var(--accent)] shrink-0 group-hover:scale-105 transition-transform"
          >
            <FilePenLine :size="15" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between gap-2">
              <span
                class="text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors"
              >
                Exportar a Word
              </span>
              <span class="text-[10px] font-mono text-[var(--text-muted)] neu-well-sm px-1.5 py-0.2 rounded">
                .docx
              </span>
            </div>
            <p class="text-[11px] text-[var(--text-muted)] leading-snug mt-0.5">
              Borrador editable para corrección o editorial
            </p>
          </div>
        </button>
      </div>
    </Transition>
  </div>
</template>

