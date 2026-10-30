<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import {
  Minus,
  Square,
  Copy,
  X,
  Palette,
  PanelLeft,
  PanelLeftClose,
  PanelRight,
  PanelRightClose,
  Search,
  Feather
} from 'lucide-vue-next'
import FolioLogo from './FolioLogo.vue'
import ExportManuscriptMenu from './ExportManuscriptMenu.vue'
import { useUiStore } from '../stores/uiStore'
import { usePaletteStore } from '../stores/paletteStore'
import { useScratchpadStore } from '../stores/scratchpadStore'
import type { WindowAction } from '@shared/types'

const uiStore = useUiStore()
const paletteStore = usePaletteStore()
const scratchpadStore = useScratchpadStore()
const isMaximized = ref(false)

async function handleAction(action: WindowAction): Promise<void> {
  const result = await window.api.window.action(action)
  if (action === 'maximize' || action === 'isMaximized') {
    if (typeof result === 'boolean') {
      isMaximized.value = result
    }
  }
}

function handleKeydown(e: KeyboardEvent): void {
  const isCtrlOrCmd = e.ctrlKey || e.metaKey

  // Ctrl+1 / Cmd+1: Alternar panel izquierdo (Manuscrito)
  if (isCtrlOrCmd && !e.shiftKey && !e.altKey && e.key === '1') {
    e.preventDefault()
    uiStore.toggleLeftSidebar()
    return
  }

  // Ctrl+2 / Cmd+2: Enfocar lienzo central (Editor)
  if (isCtrlOrCmd && !e.shiftKey && !e.altKey && e.key === '2') {
    e.preventDefault()
    const editorEl = document.querySelector('.ProseMirror') as HTMLElement | null
    editorEl?.focus()
    return
  }

  // Ctrl+3 / Cmd+3: Alternar panel derecho (Wiki / Reglas)
  if (isCtrlOrCmd && !e.shiftKey && !e.altKey && e.key === '3') {
    e.preventDefault()
    uiStore.toggleRightSidebar()
    return
  }
}

onMounted(async () => {
  window.addEventListener('keydown', handleKeydown)
  const max = await window.api.window.action('isMaximized')
  if (typeof max === 'boolean') {
    isMaximized.value = max
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="w-full flex flex-col shrink-0 select-none bg-[var(--bg-base)]">
    <header class="drag-region h-11 w-full flex items-center justify-between px-3.5 text-xs">
      <!-- Left: Brand / Title / Logo / Manuscript Tree Toggle -->
      <div class="flex items-center gap-2.5">
        <!-- Tree Toggle Button con texto referente al apartado -->
        <button
          type="button"
          class="no-drag neu-btn px-2.5 py-1 flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:!text-[var(--accent)] transition-all cursor-pointer"
          :class="{ 'neu-well !text-[var(--accent)] font-semibold': uiStore.isLeftSidebarOpen }"
          :title="
            uiStore.isLeftSidebarOpen
              ? 'Ocultar panel de manuscrito (Ctrl+1)'
              : 'Mostrar panel de manuscrito (Ctrl+1)'
          "
          @click="uiStore.toggleLeftSidebar"
        >
          <PanelLeftClose v-if="uiStore.isLeftSidebarOpen" :size="13" />
          <PanelLeft v-else :size="13" />
          <span class="text-[11px] font-medium hidden sm:inline">Manuscrito</span>
        </button>

        <div class="neu-groove-v h-4 my-auto"></div>

        <div class="w-7 h-7 shrink-0 flex items-center justify-center drop-shadow-sm">
          <FolioLogo />
        </div>

        <span class="font-editorial text-lg font-bold tracking-tight text-[var(--text-primary)]">
          Folio
        </span>

        <div
          class="neu-well-sm px-2 py-0.5 flex items-center gap-1.5 text-[10px] font-mono text-[var(--text-secondary)]"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-[var(--accent)]"></span>
          <span>LOCAL</span>
        </div>

        <div class="neu-groove-v h-4 my-auto"></div>

        <!-- Botón y Menú Desplegable de Exportación de Manuscrito (EPUB, PDF, DOCX) -->
        <ExportManuscriptMenu />
      </div>

      <!-- Right: Omnibox, Lore Toggle, Custom 3-Color Theme & Window Controls -->
      <div class="no-drag flex items-center gap-2">
        <!-- Quick Command Palette / Omnibox Button (Ctrl+K) -->
        <button
          type="button"
          class="no-drag neu-btn px-2.5 py-1 flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:!text-[var(--accent)] transition-all cursor-pointer"
          title="Paleta de Comandos y Búsqueda Global (Ctrl+K)"
          @click="paletteStore.open"
        >
          <Search :size="13" class="opacity-80" />
          <span class="text-[11px] font-medium hidden md:inline">Búsqueda global</span>
          <kbd class="neu-well-sm text-[9px] font-mono px-1 py-0.2 text-[var(--text-muted)]"
            >Ctrl+K</kbd
          >
        </button>

        <div class="neu-groove-v h-4 my-auto"></div>

        <!-- Wiki / Lore Inspector Toggle Button -->
        <button
          type="button"
          class="no-drag neu-btn px-2.5 py-1 flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:!text-[var(--accent)] transition-all cursor-pointer"
          :class="{ 'neu-well !text-[var(--accent)] font-semibold': uiStore.isRightSidebarOpen }"
          :title="
            uiStore.isRightSidebarOpen
              ? 'Ocultar Wiki & Reglas (Ctrl+3)'
              : 'Mostrar Wiki & Reglas (Ctrl+3)'
          "
          @click="uiStore.toggleRightSidebar"
        >
          <PanelRightClose v-if="uiStore.isRightSidebarOpen" :size="13" />
          <PanelRight v-else :size="13" />
          <span class="text-[11px] font-medium hidden sm:inline">Wiki</span>
        </button>

        <!-- Scratchpad / Bloc Rápido Toggle Button -->
        <button
          type="button"
          class="no-drag neu-btn px-2.5 py-1 flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:!text-[var(--accent)] transition-all cursor-pointer"
          :class="{ 'neu-well !text-[var(--accent)] font-semibold': scratchpadStore.isOpen }"
          :title="
            scratchpadStore.isOpen
              ? 'Cerrar Scratchpad (Ctrl+J)'
              : 'Abrir Scratchpad / Bloc Rápido (Ctrl+J)'
          "
          @click="scratchpadStore.toggleScratchpad()"
        >
          <Feather :size="13" />
          <span class="text-[11px] font-medium hidden sm:inline">Scratchpad</span>
          <span
            v-if="scratchpadStore.notes.length > 0"
            class="neu-well-sm px-1.5 py-0.2 text-[9px] font-mono text-[var(--accent)] rounded-full font-semibold"
          >
            {{ scratchpadStore.notes.length }}
          </span>
        </button>

        <div class="neu-groove-v h-4 my-auto"></div>

        <!-- Custom 3-Color Theme Button -->
        <button
          type="button"
          class="neu-btn px-2.5 py-1 flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:!text-[var(--accent)] transition-all cursor-pointer"
          :class="{ 'neu-well !text-[var(--accent)] font-semibold': uiStore.isThemeModalOpen }"
          title="Personalizar Colores (Botones, Texto y Background con filtros)"
          @click="uiStore.openThemeModal()"
        >
          <Palette :size="13" class="text-[var(--accent)]" />
          <span class="text-[11px] font-medium hidden sm:inline">Temas</span>
          <span class="flex items-center -space-x-1 ml-0.5">
            <span
              class="w-2.5 h-2.5 rounded-full border border-white/40"
              :style="{ backgroundColor: uiStore.buttonColor }"
            />
            <span
              class="w-2.5 h-2.5 rounded-full border border-white/40"
              :style="{ backgroundColor: uiStore.textColor }"
            />
            <span
              class="w-2.5 h-2.5 rounded-full border border-black/25"
              :style="{ backgroundColor: uiStore.backgroundColor }"
            />
          </span>
        </button>

        <div class="neu-groove-v h-4 my-auto"></div>

        <!-- Window Action Buttons -->
        <div class="flex items-center gap-1">
          <button
            type="button"
            class="neu-btn w-7 h-7 flex items-center justify-center text-[var(--text-secondary)]"
            title="Minimizar"
            @click="handleAction('minimize')"
          >
            <Minus :size="12" />
          </button>

          <button
            type="button"
            class="neu-btn w-7 h-7 flex items-center justify-center text-[var(--text-secondary)]"
            :title="isMaximized ? 'Restaurar' : 'Maximizar'"
            @click="handleAction('maximize')"
          >
            <Copy v-if="isMaximized" :size="11" />
            <Square v-else :size="11" />
          </button>

          <button
            type="button"
            class="neu-btn neu-close-btn w-7 h-7 flex items-center justify-center text-[var(--text-secondary)]"
            title="Cerrar aplicación"
            @click="handleAction('close')"
          >
            <X :size="13" />
          </button>
        </div>
      </div>
    </header>

    <!-- 3D Groove Separator -->
    <div class="neu-groove-h"></div>
  </div>
</template>
