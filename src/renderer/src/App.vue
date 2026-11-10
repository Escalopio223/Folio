<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'
import TitleBar from './components/TitleBar.vue'
import AppSplash from './components/AppSplash.vue'
import CommandPaletteModal from './components/palette/CommandPaletteModal.vue'
import TrashModal from './components/trash/TrashModal.vue'
import ScratchpadDrawer from './components/scratchpad/ScratchpadDrawer.vue'
import { useUiStore } from './stores/uiStore'
import { useScratchpadStore } from './stores/scratchpadStore'
import GoalsAndAchievementsModal from './components/goals/GoalsAndAchievementsModal.vue'
import SessionGoalPromptModal from './components/goals/SessionGoalPromptModal.vue'
import AchievementToast from './components/goals/AchievementToast.vue'
import ThemeCustomizerModal from './components/ThemeCustomizerModal.vue'
import HelpGuideModal from './components/HelpGuideModal.vue'
import GlobalContextMenu from './components/common/GlobalContextMenu.vue'
import { Feather, Sparkles } from 'lucide-vue-next'
import { modKey } from './utils/platform'

const uiStore = useUiStore()
const scratchpadStore = useScratchpadStore()

function handleGlobalZenKeys(event: KeyboardEvent): void {
  if (event.key === 'F11') {
    event.preventDefault()
    uiStore.toggleFocusMode()
    window.api?.window?.action('fullscreen').catch(() => {})
    return
  }
  if (event.key === 'Escape' && uiStore.isFocusMode) {
    event.preventDefault()
    uiStore.exitFocusMode()
    return
  }
}

onMounted(() => {
  uiStore.initTheme()
  window.addEventListener('keydown', handleGlobalZenKeys)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleGlobalZenKeys)
})
</script>

<template>
  <div
    class="h-screen w-screen flex flex-col bg-[var(--bg-base)] text-[var(--text-primary)] overflow-hidden select-none"
    :class="{
      'focus-mode-active': uiStore.isFocusMode
    }"
  >
    <!-- App Splash Loading Screen -->
    <transition name="fade">
      <AppSplash v-if="uiStore.isSplashLoading" />
    </transition>

    <!-- Pill Flotante Minimalista de Modo Zen (Aparece en la esquina superior derecha) -->
    <transition name="fade">
      <div
        v-if="uiStore.isFocusMode"
        class="zen-indicator fixed top-3 right-5 z-50 flex items-center gap-2 px-3.5 py-1.5 rounded-full neu-surface text-xs font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] shadow-xl border border-[var(--neu-border)] transition-all opacity-40 hover:opacity-100 cursor-pointer backdrop-blur-md"
        title="Salir del Modo Zen (Esc / F11)"
        @click="uiStore.exitFocusMode"
      >
        <Sparkles :size="12" class="text-[var(--accent)] animate-pulse" />
        <span class="font-editorial italic">Modo Zen</span>
        <kbd class="neu-well-sm text-[9px] px-1 py-0.5 text-[var(--accent)] font-semibold">Esc</kbd>
      </div>
    </transition>

    <!-- Draggable Tactile Title Bar -->
    <TitleBar class="app-header" />

    <!-- Main Workspace View -->
    <main class="flex-1 flex flex-col overflow-hidden">
      <router-view />
    </main>

    <!-- 3D Groove Divider -->
    <div class="neu-groove-h"></div>

    <!-- Bottom Warm Status Bar -->
    <footer
      class="status-bar h-6 w-full px-4 flex items-center justify-between text-[11px] text-[var(--text-muted)] bg-[var(--bg-base)] font-mono shrink-0 select-none"
    >
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="flex items-center gap-1.5 hover:text-[var(--accent)] transition-colors cursor-pointer"
          :title="`Abrir Scratchpad / Bloc Rápido (${modKey}+J)`"
          @click="scratchpadStore.toggleScratchpad()"
        >
          <Feather :size="11" />
          <span>Bloc Rápido ({{ modKey }}+J)</span>
          <span
            v-if="scratchpadStore.notes.length > 0"
            class="px-1.5 py-0.2 rounded-full neu-well-sm text-[9px] text-[var(--accent)] font-semibold"
          >
            {{ scratchpadStore.notes.length }}
          </span>
        </button>
      </div>
      <span>Folio v1.1.0</span>
    </footer>

    <!-- Omnibox / Paleta de Comandos Modal Global (Ctrl+K / Cmd+K) -->
    <CommandPaletteModal />

    <!-- Modal de Papelera de Reciclaje -->
    <TrashModal />

    <!-- Scratchpad Global (Bloc de Captura Rápida) (Ctrl+J / Cmd+J) -->
    <ScratchpadDrawer />

    <!-- Sugerencia de Meta de Sesión al Abrir la App («Ritual de Inicio») -->
    <SessionGoalPromptModal />

    <!-- Modal de Metas de Escritura y Sistema de Logros -->
    <GoalsAndAchievementsModal />

    <!-- Notificación Flotante Celebratoria de Logros -->
    <AchievementToast />

    <!-- Personalizador de Sistema de 3 Colores y Gamas de Background -->
    <ThemeCustomizerModal />

    <!-- Guia y Manual de Usuario / Atajos de Teclado (F1) -->
    <HelpGuideModal />

    <!-- Menú Contextual Táctil Global (Clic Derecho en Windows y macOS: Copiar, Pegar, Cortar) -->
    <GlobalContextMenu />
  </div>
</template>

<style scoped>
.fade-leave-active {
  transition: opacity 0.35s ease;
}
.fade-leave-to {
  opacity: 0;
}
</style>
