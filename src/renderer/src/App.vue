<script setup lang="ts">
import TitleBar from './components/TitleBar.vue'
</script>

<template>
  <div class="h-screen w-screen flex flex-col bg-[#07090e] text-slate-100 overflow-hidden relative select-none">
    <!-- Liquid Ambient Glows in the background for Glassmorphism -->
    <div class="pointer-events-none fixed -top-40 -left-40 w-96 h-96 rounded-full bg-indigo-600/15 blur-[120px]"></div>
    <div class="pointer-events-none fixed top-1/3 -right-20 w-80 h-80 rounded-full bg-purple-600/12 blur-[130px]"></div>
    <div class="pointer-events-none fixed -bottom-32 left-1/3 w-96 h-96 rounded-full bg-cyan-600/10 blur-[140px]"></div>

    <!-- Draggable Frameless Title Bar -->
    <TitleBar />

    <!-- Main Content Area / View -->
    <main class="flex-1 flex flex-col overflow-hidden relative z-10">
      <router-view />
    </main>

    <!-- Bottom Status Bar -->
    <footer class="h-6 w-full px-4 flex items-center justify-between text-[11px] text-slate-500 bg-slate-950/80 border-t border-white/5 font-mono">
      <div class="flex items-center gap-3">
        <span class="flex items-center gap-1.5">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          <span>Proceso Main: SQLite Activo</span>
        </span>
        <span class="text-slate-700">|</span>
        <span>Context Isolation: Enabled</span>
      </div>

      <div class="flex items-center gap-3">
        <span>Folio v0.1.0</span>
        <span class="text-slate-700">|</span>
        <span>Local-First Architecture</span>
      </div>
    </footer>
  </div>
</template>
