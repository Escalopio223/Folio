<script setup lang="ts">
import { ref } from 'vue'
import { onClickOutside } from '@vueuse/core'
import { useProjectStore } from '../stores/projectStore'
import {
  BookOpen,
  ChevronsUpDown,
  Check,
  Plus,
  Sparkles
} from 'lucide-vue-next'

const emit = defineEmits<{
  (e: 'openCreateModal'): void
  (e: 'projectChanged', projectId: string): void
}>()

const projectStore = useProjectStore()
const isOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

// Cerrar automáticamente al hacer clic fuera del desplegable
onClickOutside(dropdownRef, () => {
  isOpen.value = false
})

function toggleDropdown(): void {
  isOpen.value = !isOpen.value
}

function selectProject(projectId: string): void {
  if (projectId !== projectStore.activeProjectId) {
    emit('projectChanged', projectId)
  }
  isOpen.value = false
}

function handleCreateNew(): void {
  isOpen.value = false
  emit('openCreateModal')
}
</script>

<template>
  <div ref="dropdownRef" class="relative w-full select-none" @keydown.esc="isOpen = false">
    <!-- Contenedor / Tarjeta del Libro Activo -->
    <div class="neu-well p-3 flex flex-col gap-2 shrink-0">
      <!-- Fila superior: Etiqueta y botón directo de creación -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-1.5 min-w-0">
          <BookOpen :size="13" class="text-[var(--accent)] shrink-0" />
          <span class="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
            Libro Activo
          </span>
        </div>

        <button
          type="button"
          class="neu-btn px-2 py-0.5 text-[10px] text-[var(--accent)] hover:!text-[var(--accent-hover)] font-medium flex items-center gap-1"
          title="Crear nuevo proyecto de novela"
          @click="emit('openCreateModal')"
        >
          <Plus :size="11" />
          <span>Nuevo Libro</span>
        </button>
      </div>

      <!-- Gatillo táctil personalizado para abrir el menú -->
      <button
        type="button"
        class="neu-btn w-full p-2.5 text-left flex items-center justify-between gap-2.5 transition-all group"
        :class="isOpen ? 'is-active ring-1 ring-[var(--accent)]/40' : ''"
        :aria-expanded="isOpen"
        aria-haspopup="listbox"
        @click="toggleDropdown"
      >
        <div class="flex items-center gap-2.5 min-w-0">
          <div
            class="w-7 h-7 rounded-lg neu-well-sm flex items-center justify-center shrink-0 transition-colors"
            :class="isOpen ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)] group-hover:text-[var(--accent)]'"
          >
            <BookOpen :size="14" />
          </div>

          <div class="min-w-0">
            <span
              v-if="projectStore.activeProject"
              class="font-editorial text-sm font-bold text-[var(--text-primary)] truncate block leading-tight"
            >
              {{ projectStore.activeProject.title }}
            </span>
            <span v-else class="text-xs text-[var(--text-muted)] italic block">
              Sin libros registrados
            </span>

            <span
              v-if="projectStore.activeProject?.genre"
              class="text-[9px] font-mono text-[var(--accent)] uppercase tracking-wider truncate block mt-0.5"
            >
              {{ projectStore.activeProject.genre }}
            </span>
          </div>
        </div>

        <div
          class="p-1 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-transform duration-200 shrink-0"
          :class="{ 'rotate-180 text-[var(--accent)]': isOpen }"
        >
          <ChevronsUpDown :size="14" />
        </div>
      </button>
    </div>

    <!-- Panel Flotante Neumórfico Personalizado -->
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 translate-y-1 scale-98"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 translate-y-1 scale-98"
    >
      <div
        v-if="isOpen"
        class="absolute left-0 right-0 top-full mt-2 z-50 neu-surface p-2.5 shadow-2xl border border-[var(--groove-dark)]/50 backdrop-blur-xl"
        style="box-shadow: 0 16px 36px -10px rgba(0, 0, 0, 0.35), var(--neu-raised);"
        role="listbox"
      >
        <!-- Encabezado del menú -->
        <div class="flex items-center justify-between px-2 py-1 mb-1">
          <span class="text-[9px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
            Tus Obras / Libros
          </span>
          <span class="text-[9px] font-mono px-1.5 py-0.2 rounded neu-well-sm text-[var(--text-muted)]">
            {{ projectStore.projects.length }} {{ projectStore.projects.length === 1 ? 'libro' : 'libros' }}
          </span>
        </div>

        <!-- Lista de Proyectos con desplazamiento suave -->
        <div class="max-h-56 overflow-y-auto space-y-1.5 pr-1">
          <div
            v-for="p in projectStore.projects"
            :key="p.id"
            role="option"
            :aria-selected="p.id === projectStore.activeProjectId"
            tabindex="0"
            class="w-full p-2 rounded-xl text-left flex items-center justify-between gap-2.5 cursor-pointer transition-all group"
            :class="
              p.id === projectStore.activeProjectId
                ? 'neu-well border-l-3 border-[var(--accent)] text-[var(--text-primary)]'
                : 'hover:bg-[var(--bg-base)]/70 text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            "
            @click="selectProject(p.id)"
          >
            <div class="flex items-center gap-2.5 min-w-0">
              <div
                class="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                :class="
                  p.id === projectStore.activeProjectId
                    ? 'text-[var(--accent)] neu-well-sm'
                    : 'text-[var(--text-muted)] group-hover:text-[var(--accent)]'
                "
              >
                <BookOpen :size="13" />
              </div>

              <div class="min-w-0">
                <span class="font-editorial text-xs font-bold truncate block leading-tight text-[var(--text-primary)]">
                  {{ p.title }}
                </span>
                <div class="flex items-center gap-2 mt-0.5">
                  <span
                    v-if="p.genre"
                    class="text-[9px] font-mono uppercase text-[var(--accent)] opacity-85 truncate"
                  >
                    {{ p.genre }}
                  </span>
                  <span
                    v-if="p.synopsis"
                    class="text-[9px] text-[var(--text-muted)] truncate max-w-[120px]"
                  >
                    · {{ p.synopsis }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Indicador activo de check -->
            <div v-if="p.id === projectStore.activeProjectId" class="shrink-0 text-[var(--accent)] pr-1">
              <Check :size="14" />
            </div>
          </div>

          <div
            v-if="projectStore.projects.length === 0"
            class="p-4 text-center text-xs text-[var(--text-muted)] italic"
          >
            No hay proyectos disponibles
          </div>
        </div>

        <!-- Divisor sutil táctil -->
        <div class="neu-groove-h my-2"></div>

        <!-- Botón para crear libro dentro del dropdown -->
        <button
          type="button"
          class="neu-btn w-full py-2 px-3 text-xs text-[var(--accent)] hover:!text-[var(--accent-hover)] font-medium flex items-center justify-center gap-2 rounded-xl transition-all"
          @click="handleCreateNew"
        >
          <Sparkles :size="13" />
          <span>Crear Nuevo Libro</span>
        </button>
      </div>
    </Transition>
  </div>
</template>
