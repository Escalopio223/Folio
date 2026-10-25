<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Minus, Square, Copy, X, Database } from 'lucide-vue-next'
import type { WindowAction } from '@shared/types'

const isMaximized = ref(false)

async function handleAction(action: WindowAction): Promise<void> {
  const result = await window.api.windowAction(action)
  if (action === 'maximize' || action === 'isMaximized') {
    if (typeof result === 'boolean') {
      isMaximized.value = result
    }
  }
}

onMounted(async () => {
  const max = await window.api.windowAction('isMaximized')
  if (typeof max === 'boolean') {
    isMaximized.value = max
  }
})
</script>

<template>
  <header
    class="drag-region h-10 w-full flex items-center justify-between px-3 select-none bg-slate-950/70 backdrop-blur-md border-b border-white/5 z-50 text-xs"
  >
    <!-- Left: Brand / Title -->
    <div class="flex items-center gap-2 text-slate-300 font-medium tracking-wide">
      <div class="w-6 h-6 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
        <Database :size="13" />
      </div>
      <span class="font-semibold text-white tracking-wider">FOLIO</span>
      <span class="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        Local-First
      </span>
    </div>

    <!-- Center: App Mode indicator -->
    <div class="hidden sm:flex items-center gap-1.5 text-slate-400 text-[11px] font-mono">
      <span>Electron 34+</span>
      <span class="text-slate-600">•</span>
      <span>SQLite WAL</span>
      <span class="text-slate-600">•</span>
      <span>Drizzle ORM</span>
    </div>

    <!-- Right: Window Action Controls -->
    <div class="no-drag flex items-center gap-1 -mr-1">
      <button
        type="button"
        class="w-8 h-7 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        title="Minimizar"
        @click="handleAction('minimize')"
      >
        <Minus :size="13" />
      </button>

      <button
        type="button"
        class="w-8 h-7 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        :title="isMaximized ? 'Restaurar' : 'Maximizar'"
        @click="handleAction('maximize')"
      >
        <Copy v-if="isMaximized" :size="12" />
        <Square v-else :size="12" />
      </button>

      <button
        type="button"
        class="w-8 h-7 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-rose-500/80 transition-colors"
        title="Cerrar"
        @click="handleAction('close')"
      >
        <X :size="14" />
      </button>
    </div>
  </header>
</template>
