<script setup lang="ts">
import { onMounted } from 'vue'
import TitleBar from './components/TitleBar.vue'
import AppSplash from './components/AppSplash.vue'
import CommandPaletteModal from './components/palette/CommandPaletteModal.vue'
import TrashModal from './components/trash/TrashModal.vue'
import ScratchpadDrawer from './components/scratchpad/ScratchpadDrawer.vue'
import { useUiStore } from './stores/uiStore'
import { useScratchpadStore } from './stores/scratchpadStore'
import { Feather } from 'lucide-vue-next'

const uiStore = useUiStore()
const scratchpadStore = useScratchpadStore()

onMounted(() => {
  uiStore.initTheme()
})
</script>

<template>
  <div class="h-screen w-screen flex flex-col bg-[var(--bg-base)] text-[var(--text-primary)] overflow-hidden select-none">
    <!-- App Splash Loading Screen -->
    <transition name="fade">
      <AppSplash v-if="uiStore.isSplashLoading" />
    </transition>

    <!-- Draggable Tactile Title Bar -->
    <TitleBar />

    <!-- Main Workspace View -->
    <main class="flex-1 flex flex-col overflow-hidden">
      <router-view />
    </main>

    <!-- 3D Groove Divider -->
    <div class="neu-groove-h"></div>

    <!-- Bottom Warm Status Bar -->
    <footer class="h-6 w-full px-4 flex items-center justify-between text-[11px] text-[var(--text-muted)] bg-[var(--bg-base)] font-mono shrink-0 select-none">
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="flex items-center gap-1.5 hover:text-[var(--accent)] transition-colors cursor-pointer"
          title="Abrir Scratchpad / Bloc Rápido (Ctrl+J)"
          @click="scratchpadStore.toggleScratchpad()"
        >
          <Feather :size="11" />
          <span>Bloc Rápido (Ctrl+J)</span>
          <span
            v-if="scratchpadStore.notes.length > 0"
            class="px-1.5 py-0.2 rounded-full neu-well-sm text-[9px] text-[var(--accent)] font-semibold"
          >
            {{ scratchpadStore.notes.length }}
          </span>
        </button>
      </div>
      <span>Folio v0.1.0</span>
    </footer>

    <!-- Omnibox / Paleta de Comandos Modal Global (Ctrl+K / Cmd+K) -->
    <CommandPaletteModal />

    <!-- Modal de Papelera de Reciclaje -->
    <TrashModal />

    <!-- Scratchpad Global (Bloc de Captura Rápida) (Ctrl+J / Cmd+J) -->
    <ScratchpadDrawer />
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
