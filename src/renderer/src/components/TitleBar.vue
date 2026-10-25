<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Minus, Square, Copy, X, Sun, Moon, PanelLeft, PanelLeftClose } from 'lucide-vue-next'
import FolioLogo from './FolioLogo.vue'
import { useUiStore } from '../stores/uiStore'
import type { WindowAction } from '@shared/types'

const uiStore = useUiStore()
const isMaximized = ref(false)
const isDark = ref(true)

function initTheme(): void {
  const saved = localStorage.getItem('folio:theme')
  if (saved === 'light') {
    isDark.value = false
    document.documentElement.classList.remove('dark')
  } else {
    isDark.value = true
    document.documentElement.classList.add('dark')
    if (!saved) {
      localStorage.setItem('folio:theme', 'dark')
    }
  }
}

function toggleTheme(): void {
  isDark.value = !isDark.value
  if (isDark.value) {
    document.documentElement.classList.add('dark')
    localStorage.setItem('folio:theme', 'dark')
  } else {
    document.documentElement.classList.remove('dark')
    localStorage.setItem('folio:theme', 'light')
  }
}

async function handleAction(action: WindowAction): Promise<void> {
  const result = await window.api.window.action(action)
  if (action === 'maximize' || action === 'isMaximized') {
    if (typeof result === 'boolean') {
      isMaximized.value = result
    }
  }
}

function handleKeydown(e: KeyboardEvent): void {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
    e.preventDefault()
    uiStore.toggleSidebar()
  }
}

onMounted(async () => {
  initTheme()
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
    <header class="drag-region h-10 w-full flex items-center justify-between px-3.5 text-xs">
      <!-- Left: Brand / Title / Logo / Sidebar Toggle -->
      <div class="flex items-center gap-2.5">
        <!-- Sidebar Toggle Button -->
        <button
          type="button"
          class="no-drag neu-btn w-7 h-7 flex items-center justify-center text-[var(--text-secondary)] hover:!text-[var(--accent)]"
          :title="uiStore.isSidebarOpen ? 'Ocultar barra lateral (Ctrl+B)' : 'Mostrar barra lateral (Ctrl+B)'"
          @click="uiStore.toggleSidebar"
        >
          <PanelLeftClose v-if="uiStore.isSidebarOpen" :size="13" />
          <PanelLeft v-else :size="13" />
        </button>

        <div class="neu-groove-v h-3.5 my-auto"></div>

        <div class="w-5 h-5 shrink-0 flex items-center justify-center">
          <FolioLogo />
        </div>

        <span class="font-editorial text-base font-bold tracking-tight text-[var(--text-primary)]">
          Folio
        </span>

        <div class="neu-well-sm px-2 py-0.5 flex items-center gap-1.5 text-[10px] font-mono text-[var(--text-secondary)]">
          <span class="w-1.5 h-1.5 rounded-full bg-[#C85A32]"></span>
          <span>LOCAL</span>
        </div>
      </div>

      <!-- Right: Controls -->
      <div class="no-drag flex items-center gap-2">
        <!-- Theme Toggle Button -->
        <button
          type="button"
          class="neu-btn px-2.5 py-1 flex items-center gap-1.5 text-xs text-[var(--text-secondary)]"
          :title="isDark ? 'Cambiar a Modo Papel Claro' : 'Cambiar a Modo Espresso Oscuro'"
          @click="toggleTheme"
        >
          <Sun v-if="isDark" :size="13" class="text-[#C85A32]" />
          <Moon v-else :size="13" class="text-[var(--text-primary)]" />
          <span class="text-[11px] font-medium">{{ isDark ? 'Claro' : 'Oscuro' }}</span>
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
