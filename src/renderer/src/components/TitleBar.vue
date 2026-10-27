<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import {
  Minus,
  Square,
  Copy,
  X,
  Sun,
  Moon,
  PanelLeft,
  PanelLeftClose,
  PanelRight,
  PanelRightClose,
  Search
} from 'lucide-vue-next'
import FolioLogo from './FolioLogo.vue'
import { useUiStore } from '../stores/uiStore'
import { usePaletteStore } from '../stores/paletteStore'
import type { WindowAction } from '@shared/types'

const uiStore = useUiStore()
const paletteStore = usePaletteStore()
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

  // Ctrl+B / Cmd+B: Alternar Árbol de Manuscrito (excepto si estamos escribiendo en el editor o input)
  if (isCtrlOrCmd && !e.shiftKey && e.key.toLowerCase() === 'b') {
    const target = document.activeElement as HTMLElement | null
    const isEditing =
      target?.closest('.ProseMirror') ||
      target?.tagName === 'INPUT' ||
      target?.tagName === 'TEXTAREA' ||
      target?.isContentEditable
    if (isEditing) {
      return
    }
    e.preventDefault()
    uiStore.toggleLeftSidebar()
    return
  }

  // Ctrl+N / Cmd+N: Alternar Wiki / Lore Inspector
  if (isCtrlOrCmd && !e.shiftKey && e.key.toLowerCase() === 'n') {
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
        <!-- Tree Toggle Button -->
        <button
          type="button"
          class="no-drag neu-btn w-7 h-7 flex items-center justify-center text-[var(--text-secondary)] hover:!text-[var(--accent)] transition-all"
          :class="{ 'neu-well !text-[var(--accent)]': uiStore.isLeftSidebarOpen }"
          :title="uiStore.isLeftSidebarOpen ? 'Ocultar árbol de manuscrito (Ctrl+B)' : 'Mostrar árbol de manuscrito (Ctrl+B)'"
          @click="uiStore.toggleLeftSidebar"
        >
          <PanelLeftClose v-if="uiStore.isLeftSidebarOpen" :size="13" />
          <PanelLeft v-else :size="13" />
        </button>

        <div class="neu-groove-v h-4 my-auto"></div>

        <div class="w-7 h-7 shrink-0 flex items-center justify-center drop-shadow-sm">
          <FolioLogo />
        </div>

        <span class="font-editorial text-lg font-bold tracking-tight text-[var(--text-primary)]">
          Folio
        </span>

        <div class="neu-well-sm px-2 py-0.5 flex items-center gap-1.5 text-[10px] font-mono text-[var(--text-secondary)]">
          <span class="w-1.5 h-1.5 rounded-full bg-[#C85A32]"></span>
          <span>LOCAL</span>
        </div>
      </div>

      <!-- Right: Omnibox, Lore Toggle, Theme & Window Controls -->
      <div class="no-drag flex items-center gap-2">
        <!-- Quick Command Palette / Omnibox Button (Ctrl+K) -->
        <button
          type="button"
          class="no-drag neu-btn px-2.5 py-1 flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:!text-[var(--accent)] transition-all cursor-pointer"
          title="Paleta de Comandos y Búsqueda Global (Ctrl+K)"
          @click="paletteStore.open"
        >
          <Search :size="13" class="opacity-80" />
          <span class="text-[11px] font-medium hidden md:inline">Buscar...</span>
          <kbd class="neu-well-sm text-[9px] font-mono px-1 py-0.2 text-[var(--text-muted)]">Ctrl+K</kbd>
        </button>

        <div class="neu-groove-v h-4 my-auto"></div>

        <!-- Wiki / Lore Inspector Toggle Button -->
        <button
          type="button"
          class="no-drag neu-btn px-2.5 py-1 flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:!text-[var(--accent)] transition-all"
          :class="{ 'neu-well !text-[var(--accent)] font-semibold': uiStore.isRightSidebarOpen }"
          :title="uiStore.isRightSidebarOpen ? 'Ocultar Wiki & Lore (Ctrl+N)' : 'Mostrar Wiki & Lore (Ctrl+N)'"
          @click="uiStore.toggleRightSidebar"
        >
          <PanelRightClose v-if="uiStore.isRightSidebarOpen" :size="13" />
          <PanelRight v-else :size="13" />
          <span class="text-[11px] font-medium hidden sm:inline">Wiki</span>
        </button>

        <div class="neu-groove-v h-4 my-auto"></div>

        <!-- Theme Toggle Button -->
        <button
          type="button"
          class="neu-btn px-2.5 py-1 flex items-center gap-1.5 text-xs text-[var(--text-secondary)]"
          :title="uiStore.isDark ? 'Cambiar a Modo Papel Claro' : 'Cambiar a Modo Espresso Oscuro'"
          @click="uiStore.toggleTheme"
        >
          <Sun v-if="uiStore.isDark" :size="13" class="text-[#C85A32]" />
          <Moon v-else :size="13" class="text-[var(--text-primary)]" />
          <span class="text-[11px] font-medium">{{ uiStore.isDark ? 'Claro' : 'Oscuro' }}</span>
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
            class="neu-btn w-7 h-7 flex items-center justify-center text-[var(--text-secondary)] hover:!text-[#C85A32]"
            title="Cerrar"
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
