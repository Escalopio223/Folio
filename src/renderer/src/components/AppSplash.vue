<script setup lang="ts">
import FolioLogo from './FolioLogo.vue'
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--bg-base)] select-none transition-opacity duration-300"
  >
    <!-- Neumorphic Center Card -->
    <div class="neu-surface p-9 flex flex-col items-center justify-center space-y-5 max-w-sm w-full text-center">
      <div class="w-24 h-24 flex items-center justify-center shrink-0 drop-shadow-xl animate-pulse">
        <FolioLogo />
      </div>

      <div class="space-y-1">
        <h2 class="font-editorial text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          Folio
        </h2>
        <p class="text-xs font-mono text-[var(--accent)] font-medium">
          Cargando...
        </p>
      </div>

      <!-- Subtle Progress bar -->
      <div class="w-full neu-well-sm h-1.5 overflow-hidden mt-2">
        <div class="h-full bg-gradient-to-r from-[#D6633A] to-[#B84E28] w-2/3 rounded-full animate-[pulse_1.5s_ease-in-out_infinite]"></div>
      </div>

      <p class="text-[10px] text-[var(--text-muted)] font-mono">
        Iniciando manuscrito y librería de datos
      </p>
    </div>
  </div>
</template>
