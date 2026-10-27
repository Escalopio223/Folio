<script setup lang="ts">
import { onMounted } from 'vue'
import TitleBar from './components/TitleBar.vue'
import AppSplash from './components/AppSplash.vue'
import CommandPaletteModal from './components/palette/CommandPaletteModal.vue'
import { useUiStore } from './stores/uiStore'

const uiStore = useUiStore()

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
    <footer class="h-6 w-full px-4 flex items-center justify-end text-[11px] text-[var(--text-muted)] bg-[var(--bg-base)] font-mono shrink-0 select-none">
      <span>Folio v0.1.0</span>
    </footer>

    <!-- Omnibox / Paleta de Comandos Modal Global (Ctrl+K / Cmd+K) -->
    <CommandPaletteModal />
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
