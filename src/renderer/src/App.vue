<script setup lang="ts">
import TitleBar from './components/TitleBar.vue'
import AppSplash from './components/AppSplash.vue'
import { useUiStore } from './stores/uiStore'

const uiStore = useUiStore()
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
    <footer class="h-7 w-full px-4 flex items-center justify-between text-[11px] text-[var(--text-muted)] bg-[var(--bg-base)] font-mono shrink-0">
      <div class="flex items-center gap-3">
        <span class="flex items-center gap-1.5">
          <span class="w-1.5 h-1.5 rounded-full bg-[#C85A32]"></span>
          <span class="text-[var(--text-secondary)]">SQLite Local-First · Modo WAL</span>
        </span>
        <span class="text-[var(--text-muted)] opacity-40">|</span>
        <span>Zero-Friction Engine</span>
      </div>

      <div class="flex items-center gap-3">
        <span>Folio v0.1.0</span>
        <span class="text-[var(--text-muted)] opacity-40">|</span>
        <span>Escritura Editorial & Wiki de Mundo</span>
      </div>
    </footer>
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
