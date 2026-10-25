<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useDbStore } from '../stores/dbStore'
import { useClipboard } from '@vueuse/core'
import {
  Database,
  HardDrive,
  Cpu,
  Layers,
  Plus,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  Zap,
  Activity,
  FolderGit2,
  Sparkles
} from 'lucide-vue-next'

const dbStore = useDbStore()
const newTitle = ref('')
const newDescription = ref('')
const quickAddPresets = ['Idea de proyecto', 'Nota técnica', 'Configuración de entorno']

const { copy, copied } = useClipboard()

function copyPath(): void {
  if (dbStore.status?.filePath) {
    copy(dbStore.status.filePath)
  }
}

async function handleCreate(): Promise<void> {
  if (!newTitle.value.trim()) return
  const item = await dbStore.addItem(newTitle.value, newDescription.value)
  if (item) {
    newTitle.value = ''
    newDescription.value = ''
  }
}

function usePreset(preset: string): void {
  newTitle.value = preset
  newDescription.value = `Registro generado desde la interfaz reactiva (${new Date().toLocaleTimeString()})`
}

onMounted(async () => {
  await Promise.all([dbStore.fetchStatus(), dbStore.fetchItems()])
})
</script>

<template>
  <div class="flex-1 overflow-y-auto px-6 py-6 space-y-6 max-w-7xl mx-auto w-full">
    <!-- Top Hero Banner with Glassmorphism -->
    <section class="relative rounded-2xl p-6 glass-panel overflow-hidden border border-white/10">
      <!-- Ambient colorful gradients inside hero -->
      <div class="absolute -top-16 -right-16 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute -bottom-16 -left-16 w-64 h-64 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none"></div>

      <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div class="space-y-1.5">
          <div class="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium">
            <Sparkles :size="13" class="text-indigo-400" />
            <span>Arquitectura Unificada Electron + SQLite</span>
          </div>
          <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            Dashboard Folio
            <span
              v-if="dbStore.status?.connected"
              class="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono"
            >
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              ONLINE
            </span>
          </h1>
          <p class="text-sm text-slate-400 max-w-2xl">
            Base de datos SQLite embebida gestionada exclusivamente en el Proceso Main y sincronizada mediante IPC tipado con Vue 3.
          </p>
        </div>

        <button
          type="button"
          class="self-start md:self-center inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 text-slate-200 transition-all active:scale-95 shadow-sm"
          :disabled="dbStore.loading"
          @click="dbStore.fetchStatus()"
        >
          <RefreshCw :size="14" :class="{ 'animate-spin': dbStore.loading }" />
          <span>Actualizar Diagnóstico</span>
        </button>
      </div>
    </section>

    <!-- Error Alert if any -->
    <div
      v-if="dbStore.error"
      class="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center justify-between"
    >
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center text-rose-400">
          <Activity :size="16" />
        </div>
        <span>{{ dbStore.error }}</span>
      </div>
      <button class="text-xs underline hover:text-white" @click="dbStore.fetchStatus()">Reintentar</button>
    </div>

    <!-- Diagnostic Cards Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Card 1: SQLite Connection & Physical Path -->
      <div class="lg:col-span-2 glass-card rounded-2xl p-6 flex flex-col justify-between space-y-5">
        <div>
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Database :size="20" />
              </div>
              <div>
                <h3 class="text-base font-semibold text-white">Estado de SQLite & Almacenamiento</h3>
                <p class="text-xs text-slate-400">better-sqlite3 + Drizzle ORM (Native Node-API)</p>
              </div>
            </div>

            <span
              class="px-2.5 py-1 rounded-lg text-xs font-mono font-medium border"
              :class="
                dbStore.status?.connected
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              "
            >
              {{ dbStore.status?.connected ? 'CONECTADO' : 'DESCONECTADO' }}
            </span>
          </div>

          <!-- Specs Badges -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
            <div class="p-3 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
              <div class="flex items-center gap-1.5 text-xs text-slate-400">
                <Zap :size="13" class="text-amber-400" />
                <span>Journal Mode</span>
              </div>
              <div class="text-sm font-semibold text-white font-mono">
                {{ dbStore.status?.journalMode || 'WAL' }}
              </div>
            </div>

            <div class="p-3 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
              <div class="flex items-center gap-1.5 text-xs text-slate-400">
                <HardDrive :size="13" class="text-sky-400" />
                <span>Registros</span>
              </div>
              <div class="text-sm font-semibold text-white font-mono">
                {{ dbStore.status?.recordsCount ?? 0 }}
              </div>
            </div>

            <div class="p-3 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
              <div class="flex items-center gap-1.5 text-xs text-slate-400">
                <Cpu :size="13" class="text-purple-400" />
                <span>SQLite Core</span>
              </div>
              <div class="text-sm font-semibold text-white font-mono">
                v{{ dbStore.status?.sqliteVersion || '3.x' }}
              </div>
            </div>

            <div class="p-3 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
              <div class="flex items-center gap-1.5 text-xs text-slate-400">
                <Layers :size="13" class="text-emerald-400" />
                <span>ORM Layer</span>
              </div>
              <div class="text-sm font-semibold text-white font-mono">
                {{ dbStore.status?.orm || 'Drizzle' }}
              </div>
            </div>
          </div>

          <!-- Physical File Path Box -->
          <div class="space-y-1.5 mt-4">
            <label class="text-xs font-medium text-slate-300 flex items-center justify-between">
              <span class="flex items-center gap-1.5">
                <FolderGit2 :size="13" class="text-slate-400" />
                Ruta Física del Archivo (.db) en Disco:
              </span>
              <span class="text-[11px] text-slate-500 font-normal">
                Resolución dinámica según entorno
              </span>
            </label>

            <div class="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/80 border border-white/10 font-mono text-xs text-emerald-300/90 break-all select-text">
              <span class="flex-1 truncate">{{ dbStore.status?.filePath || 'Cargando ruta...' }}</span>
              <button
                type="button"
                class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-colors shrink-0"
                title="Copiar ruta"
                @click="copyPath"
              >
                <Check v-if="copied" :size="13" class="text-emerald-400" />
                <Copy v-else :size="13" />
                <span class="text-[11px]">{{ copied ? 'Copiado' : 'Copiar' }}</span>
              </button>
            </div>
          </div>
        </div>

        <div class="pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
          <span>Driver: {{ dbStore.status?.driver || 'better-sqlite3' }}</span>
          <span class="text-emerald-400 font-mono">100% IPC Tipado Seguro</span>
        </div>
      </div>

      <!-- Card 2: Interactive SQLite Insert Form -->
      <div class="glass-card rounded-2xl p-6 flex flex-col justify-between space-y-4">
        <div>
          <div class="flex items-center gap-3 mb-3">
            <div class="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Plus :size="20" />
            </div>
            <div>
              <h3 class="text-base font-semibold text-white">Insertar Registro</h3>
              <p class="text-xs text-slate-400">Prueba de persistencia en caliente</p>
            </div>
          </div>

          <!-- Quick Presets -->
          <div class="mb-3 space-y-1">
            <span class="text-[11px] text-slate-400 font-medium">Plantillas rápidas:</span>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="preset in quickAddPresets"
                :key="preset"
                type="button"
                class="px-2 py-1 rounded-lg bg-white/5 hover:bg-indigo-500/20 border border-white/10 hover:border-indigo-500/30 text-[11px] text-slate-300 transition-colors"
                @click="usePreset(preset)"
              >
                {{ preset }}
              </button>
            </div>
          </div>

          <form class="space-y-3" @submit.prevent="handleCreate">
            <div>
              <input
                v-model="newTitle"
                type="text"
                placeholder="Título del registro..."
                class="w-full px-3 py-2 rounded-xl glass-input text-xs placeholder:text-slate-500"
                required
              />
            </div>
            <div>
              <textarea
                v-model="newDescription"
                rows="2"
                placeholder="Descripción u observaciones opcionales..."
                class="w-full px-3 py-2 rounded-xl glass-input text-xs placeholder:text-slate-500 resize-none"
              ></textarea>
            </div>

            <button
              type="submit"
              class="w-full py-2.5 px-4 rounded-xl font-medium text-xs text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
              :disabled="dbStore.inserting || !newTitle.trim()"
            >
              <RefreshCw v-if="dbStore.inserting" :size="14" class="animate-spin" />
              <Plus v-else :size="14" />
              <span>Guardar en SQLite</span>
            </button>
          </form>
        </div>

        <p class="text-[11px] text-slate-500 text-center">
          Persistido en disco con atomicidad ACID.
        </p>
      </div>
    </div>

    <!-- Live Records Section -->
    <section class="glass-card rounded-2xl p-6 space-y-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Layers :size="18" class="text-indigo-400" />
          <h3 class="text-base font-semibold text-white">Registros en SQLite</h3>
          <span class="px-2 py-0.5 rounded-full bg-slate-800 border border-white/10 text-xs font-mono text-slate-300">
            {{ dbStore.items.length }}
          </span>
        </div>

        <button
          type="button"
          class="text-xs text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1.5"
          @click="dbStore.fetchItems"
        >
          <RefreshCw :size="12" />
          <span>Refrescar Lista</span>
        </button>
      </div>

      <!-- Items Grid / List -->
      <div v-if="dbStore.items.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <article
          v-for="item in dbStore.items"
          :key="item.id"
          class="p-4 rounded-xl bg-slate-900/50 hover:bg-slate-900/80 border border-white/5 hover:border-white/15 transition-all space-y-2 group relative"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-2 min-w-0">
              <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-white/5 shrink-0">
                #{{ item.id }}
              </span>
              <h4 class="text-xs font-semibold text-slate-200 truncate group-hover:text-indigo-300 transition-colors">
                {{ item.title }}
              </h4>
            </div>

            <button
              type="button"
              class="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 transition-all p-1 -mr-1"
              title="Eliminar de SQLite"
              @click="dbStore.removeItem(item.id)"
            >
              <Trash2 :size="13" />
            </button>
          </div>

          <p v-if="item.description" class="text-xs text-slate-400 line-clamp-2 leading-relaxed">
            {{ item.description }}
          </p>

          <div class="flex items-center justify-between pt-1 text-[10px] text-slate-500 font-mono">
            <span>Estado: {{ item.status }}</span>
            <span>{{ item.createdAt }}</span>
          </div>
        </article>
      </div>

      <!-- Empty State -->
      <div
        v-else
        class="py-12 flex flex-col items-center justify-center text-center space-y-3 border border-dashed border-white/10 rounded-xl"
      >
        <div class="w-12 h-12 rounded-2xl bg-slate-800/60 border border-white/5 flex items-center justify-center text-slate-500">
          <Database :size="24" />
        </div>
        <div class="space-y-1">
          <p class="text-sm font-medium text-slate-300">No hay registros en SQLite</p>
          <p class="text-xs text-slate-500">Haz clic en el botón de arriba para insertar el primer registro</p>
        </div>
      </div>
    </section>
  </div>
</template>
