<script setup lang="ts">
import { computed } from 'vue'
import {
  Plus,
  Search,
  X,
  Scale,
  Pin
} from 'lucide-vue-next'
import { useRulesStore } from '../../stores/rulesStore'
import { useProjectStore } from '../../stores/projectStore'
import { getPresetsForGenre } from '../../utils/rulePresets'
import RuleCard from './RuleCard.vue'
import RuleEditModal from './RuleEditModal.vue'

const rulesStore = useRulesStore()
const projectStore = useProjectStore()

// Presets recomendados según el género del proyecto (solo para el Empty State)
const genrePresets = computed(() => {
  return getPresetsForGenre(projectStore.activeProject?.genre)
})

// Conteo de reglas por categoría
function getCategoryCount(cat: string): number {
  const c = cat.toLowerCase().trim()
  return rulesStore.rules.filter((r) => r.category.toLowerCase().trim() === c).length
}

function handleCreateRule(prefillCategory?: string): void {
  rulesStore.openCreateModal(prefillCategory)
}
</script>

<template>
  <div class="h-full flex flex-col gap-2 min-w-0 select-none">
    <!-- BARRA SUPERIOR COMPACTA: Búsqueda + Selector de Categoría + Botón Nueva Regla -->
    <div class="flex items-center gap-1.5 shrink-0">
      <!-- Input de Búsqueda -->
      <div class="relative flex-1 min-w-0">
        <Search :size="12" class="absolute left-2.5 top-2 text-[var(--text-muted)] pointer-events-none" />
        <input
          v-model="rulesStore.searchQuery"
          type="text"
          placeholder="Buscar ley, axioma..."
          class="w-full pl-7 pr-6 py-1 text-xs neu-well-sm bg-transparent border-none text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/60 focus:outline-none cursor-text select-text"
        />
        <button
          v-if="rulesStore.searchQuery"
          type="button"
          class="absolute right-1.5 top-1.5 p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
          title="Limpiar búsqueda"
          @click="rulesStore.searchQuery = ''"
        >
          <X :size="10" />
        </button>
      </div>

      <!-- Selector Desplegable de Categoría (Sin scroll horizontal) -->
      <div v-if="rulesStore.categories.length > 0" class="shrink-0">
        <select
          :value="rulesStore.activeCategoryFilter || ''"
          class="neu-btn text-[10px] font-mono py-1 px-1.5 rounded-lg bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--groove-dark)]/40 focus:outline-none cursor-pointer max-w-[110px] truncate"
          title="Filtrar por categoría"
          @change="(e) => rulesStore.setCategoryFilter((e.target as HTMLSelectElement).value || null)"
        >
          <option value="">Todas ({{ rulesStore.totalCount }})</option>
          <option v-for="cat in rulesStore.categories" :key="cat" :value="cat">
            {{ cat }} ({{ getCategoryCount(cat) }})
          </option>
        </select>
      </div>

      <!-- Botón + Nueva Regla (Abre el editor inline) -->
      <button
        type="button"
        class="neu-btn-terracotta px-2 py-1 text-xs flex items-center gap-1 shrink-0 active:scale-95 cursor-pointer transition-transform"
        title="Crear una nueva regla en el panel inline"
        @click="handleCreateRule()"
      >
        <Plus :size="12" />
        <span class="text-[11px] font-medium hidden sm:inline">Nueva</span>
      </button>
    </div>

    <!-- Indicador de Filtro Activo con botón para limpiar (si hay categoría seleccionada) -->
    <div
      v-if="rulesStore.activeCategoryFilter"
      class="flex items-center justify-between text-[10px] px-2 py-0.5 neu-well-sm rounded-lg text-[var(--accent)] shrink-0"
    >
      <span class="font-mono truncate">
        Filtrando por: <strong>{{ rulesStore.activeCategoryFilter }}</strong>
      </span>
      <button
        type="button"
        class="p-0.5 text-[var(--text-muted)] hover:text-rose-500 cursor-pointer"
        title="Quitar filtro"
        @click="rulesStore.setCategoryFilter(null)"
      >
        <X :size="10" />
      </button>
    </div>

    <!-- ÁREA PRINCIPAL CON SCROLL VERTICAL: Editor Inline + Lista de Fichas -->
    <div class="flex-1 overflow-y-auto space-y-2 editorial-scrollbar pr-0.5 min-h-0">
      <!-- Formulario de Creación / Edición Inline (cuando rulesStore.isModalOpen = true) -->
      <RuleEditModal />

      <!-- 1. Sección de Reglas Ancladas / Prioritarias (si no se está filtrando categoría específica) -->
      <template v-if="rulesStore.activeCategoryFilter === null && rulesStore.pinnedRules.length > 0 && !rulesStore.searchQuery">
        <div class="flex items-center gap-1 text-[10px] font-mono text-amber-500 font-bold px-1 pt-0.5">
          <Pin :size="10" class="fill-current rotate-45" />
          <span class="uppercase tracking-wider">Reglas Prioritarias ({{ rulesStore.pinnedRules.length }})</span>
        </div>

        <RuleCard
          v-for="rule in rulesStore.pinnedRules"
          :key="`pinned-${rule.id}`"
          :rule="rule"
        />

        <div class="neu-groove-h my-1.5 opacity-40"></div>

        <div class="flex items-center gap-1 text-[10px] font-mono text-[var(--text-muted)] font-semibold px-1">
          <Scale :size="10" />
          <span class="uppercase tracking-wider">Todas las Reglas</span>
        </div>

        <RuleCard
          v-for="rule in rulesStore.filteredRules.filter((r) => !r.isPinned)"
          :key="rule.id"
          :rule="rule"
        />
      </template>

      <!-- 2. Lista filtrada estándar -->
      <template v-else-if="rulesStore.filteredRules.length > 0">
        <RuleCard
          v-for="rule in rulesStore.filteredRules"
          :key="rule.id"
          :rule="rule"
        />
      </template>

      <!-- 3. EMPTY STATE: Cuando el proyecto no tiene ninguna regla -->
      <div
        v-else-if="rulesStore.totalCount === 0 && !rulesStore.isModalOpen"
        class="h-full flex flex-col items-center justify-center neu-well rounded-2xl p-5 text-center space-y-3"
      >
        <div class="w-10 h-10 rounded-xl neu-surface flex items-center justify-center text-[var(--accent)] shrink-0">
          <Scale :size="20" class="stroke-[1.8]" />
        </div>

        <div class="space-y-1">
          <p class="font-editorial text-sm font-bold text-[var(--text-primary)]">
            Sin Reglas Codificadas
          </p>
          <p class="text-[11px] text-[var(--text-muted)] max-w-xs leading-relaxed">
            Registra los axiomas, límites o normas inquebrantables de tu ambientación.
          </p>
        </div>

        <!-- Presets por Género (Solo mostrados aquí para sembrar el proyecto con 1 clic) -->
        <div v-if="genrePresets.categories.length > 0" class="w-full pt-1 space-y-1.5">
          <span class="text-[10px] font-mono text-[var(--text-muted)] block">
            Sugerencias para {{ projectStore.activeProject?.genre || 'tu novela' }}:
          </span>
          <div class="flex flex-wrap gap-1 justify-center">
            <button
              v-for="presetCat in genrePresets.categories.slice(0, 4)"
              :key="presetCat"
              type="button"
              class="neu-btn px-2 py-0.5 rounded text-[10px] text-[var(--text-secondary)] hover:text-[var(--accent)] cursor-pointer active:scale-95 transition-all"
              @click="handleCreateRule(presetCat)"
            >
              + {{ presetCat }}
            </button>
          </div>
        </div>

        <button
          type="button"
          class="neu-btn-terracotta py-1.5 px-3 text-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 mt-1"
          @click="handleCreateRule()"
        >
          <Plus :size="12" />
          <span>Crear primera regla</span>
        </button>
      </div>

      <!-- 4. EMPTY STATE: Sin coincidencias con búsqueda/filtro -->
      <div
        v-else-if="!rulesStore.isModalOpen"
        class="py-6 text-center neu-well rounded-xl p-4 text-[var(--text-muted)] space-y-2"
      >
        <p class="text-xs font-editorial font-medium text-[var(--text-secondary)]">
          No hay reglas que coincidan con la búsqueda
        </p>
        <button
          type="button"
          class="neu-btn px-2 py-1 text-[10px] text-[var(--accent)] cursor-pointer"
          @click="rulesStore.setCategoryFilter(null); rulesStore.searchQuery = ''"
        >
          Restablecer filtros
        </button>
      </div>
    </div>
  </div>
</template>
