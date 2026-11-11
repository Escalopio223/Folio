<script setup lang="ts">
import { onMounted } from 'vue'
import { RefreshCw, Sparkles, ExternalLink, ArrowDownCircle } from 'lucide-vue-next'
import { useUpdater } from '../composables/useUpdater'

const {
  version,
  percent,
  isDownloading,
  isReady,
  isAvailableMac,
  isVisible,
  init,
  applyUpdate
} = useUpdater()

onMounted(() => {
  init()
})
</script>

<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0 scale-90 translate-y-[-2px]"
    enter-to-class="opacity-100 scale-100 translate-y-0"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100 scale-100 translate-y-0"
    leave-to-class="opacity-0 scale-90 translate-y-[-2px]"
  >
    <div v-if="isVisible" class="flex items-center">
      <!-- 1. Estado Descargando en segundo plano (Windows / Linux) -->
      <div
        v-if="isDownloading"
        class="neu-well-sm px-2.5 py-1 flex items-center gap-1.5 text-xs font-mono text-[var(--accent)] border border-[var(--accent)]/30 rounded-lg cursor-default select-none shadow-inner"
        :title="`Descargando actualización v${version} en segundo plano (${percent}%)...`"
      >
        <RefreshCw :size="12" class="animate-spin text-[var(--accent)]" />
        <span class="text-[11px] font-semibold">Descargando v{{ version }}</span>
        <span class="text-[10px] opacity-80">({{ percent }}%)</span>
      </div>

      <!-- 2. Estado Listo para Reiniciar e Instalar (Windows) -->
      <button
        v-else-if="isReady"
        type="button"
        class="neu-btn px-2.5 py-1 flex items-center gap-1.5 text-xs font-medium cursor-pointer transition-all rounded-lg border border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white shadow-md active:scale-95 animate-pulse"
        :title="`Actualizar a v${version} (Reiniciar e instalar ahora)`"
        @click="applyUpdate"
      >
        <Sparkles :size="12" class="shrink-0" />
        <span class="text-[11px] font-bold">Instalar v{{ version }}</span>
        <span class="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0 animate-ping"></span>
      </button>

      <!-- 3. Estado Actualización Disponible en macOS (Descarga manual de .dmg) -->
      <button
        v-else-if="isAvailableMac"
        type="button"
        class="neu-btn px-2.5 py-1 flex items-center gap-1.5 text-xs font-medium cursor-pointer transition-all rounded-lg border border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white shadow-md active:scale-95"
        :title="`Nueva versión v${version} disponible (Descargar DMG)`"
        @click="applyUpdate"
      >
        <ArrowDownCircle :size="12" class="shrink-0" />
        <span class="text-[11px] font-bold">Descargar v{{ version }}</span>
        <ExternalLink :size="10" class="opacity-70 shrink-0" />
      </button>
    </div>
  </Transition>
</template>

