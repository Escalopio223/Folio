<script setup lang="ts">
import { computed } from 'vue'
import {
  Plus,
  Search,
  X,
  Scale,
  Pin,
  Lightbulb
} from 'lucide-vue-next'
import { useRulesStore } from '../../stores/rulesStore'
import { useProjectStore } from '../../stores/projectStore'
import { getPresetsForGenre } from '../../utils/rulePresets'
import RuleCard from './RuleCard.vue'
import RuleEditModal from './RuleEditModal.vue'

const rulesStore = useRulesStore()
const projectStore = useProjectStore()

// Presets recomendados según el género del proyecto
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

function handleApplyPresetCategory(cat: string): void {
  rulesStore.openCreateModal(cat)
}
</script>

<template>
  <div class="h-full flex flex-col gap-2.5 min-w-0 select-none">
    <!-- Barra de Búsqueda Rápida de Reglas y Botón Nueva Regla -->
    <div class="flex items-center gap-2 shrink-0">
      <div class="relative flex-1">
        <div class="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-[var(--text-muted)]">
          <Search :size="12" />
        </div>
        <input
          v-model="rulesStore.searchQuery"
          type="text"
          placeholder="Buscar axioma, ley o límite..."
          class="w-full pl-8 pr-7 py-1.5 text-xs neu-well-sm bg-transparent border-none text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/60 focus:outline-none cursor-text select-text"
        />
        <button
          v-if="rulesStore.searchQuery"
          type="button"
          class="w-4 h-4 neu-btn rounded-md flex items-center justify-center absolute right-2 inset-y-auto top-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all cursor-pointer active:scale-95"
          title="Limpiar búsqueda"
          @click="rulesStore.searchQuery = ''"
        >
          <X :size="10" />
        </button>
      </div>

      <!-- Botón Nueva Regla -->
      <button
        type="button"
        class="neu-btn-terracotta px-2.5 py-1.5 text-xs flex items-center gap-1.5 shrink-0 active:scale-95 transition-transform"
        title="Crear una nueva regla, axioma o código inmutable"
        @click="handleCreateRule()"
      >
        <Plus :size="13" />
        <span class="font-medium text-[11px] hidden sm:inline">Nueva Regla</span>
      </button>
    </div>

    <!-- Barra de Filtros Dinámicos por Categoría (Totalmente Reactiva) -->
    <div class="flex items-center gap-1.5 overflow-x-auto editorial-scrollbar pb-1 text-[10px] shrink-0">
      <!-- Píldora "Todas" -->
      <button
        type="button"
        class="neu-btn px-2.5 py-1 rounded-lg shrink-0 transition-all font-mono whitespace-nowrap active:scale-95"
        :class="
          rulesStore.activeCategoryFilter === null
            ? 'is-active neu-well !text-[var(--accent)] font-bold'
            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
        "
        @click="rulesStore.setCategoryFilter(null)"
      >
        Todas ({{ rulesStore.totalCount }})
      </button>

      <!-- Píldoras de Categorías Dinámicas existentes -->
      <button
        v-for="cat in rulesStore.categories"
        :key="cat"
        type="button"
        class="neu-btn px-2.5 py-1 rounded-lg shrink-0 transition-all font-medium whitespace-nowrap active:scale-95"
        :class="
          rulesStore.activeCategoryFilter?.toLowerCase() === cat.toLowerCase()
            ? 'is-active neu-well !text-[var(--accent)] font-bold'
            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
        "
        @click="rulesStore.setCategoryFilter(cat)"
      >
        <span>{{ cat }}</span>
        <span class="ml-1 opacity-70 font-mono text-[9px]">({{ getCategoryCount(cat) }})</span>
      </button>
    </div>

    <!-- Sugerencias de Género si hay pocas categorías creadas -->
    <div
      v-if="rulesStore.categories.length < 3 && genrePresets.categories.length > 0"
      class="px-2.5 py-1.5 rounded-xl neu-well-sm border border-[var(--groove-dark)]/40 flex items-center justify-between gap-1.5 shrink-0 text-[10px]"
    >
      <div class="flex items-center gap-1 text-[var(--accent)] shrink-0 font-medium">
        <Lightbulb :size="11" />
        <span>Sugerencias para {{ projectStore.activeProject?.genre || 'tu novela' }}:</span>
      </div>
      <div class="flex items-center gap-1 overflow-x-auto editorial-scrollbar">
        <button
          v-for="presetCat in genrePresets.categories.slice(0, 3)"
          :key="presetCat"
          type="button"
          class="neu-btn px-1.5 py-0.5 rounded text-[9px] text-[var(--text-secondary)] hover:text-[var(--accent)] whitespace-nowrap active:scale-95 transition-all"
          :title="`Crear regla en categoría '${presetCat}'`"
          @click="handleApplyPresetCategory(presetCat)"
        >
          + {{ presetCat }}
        </button>
      </div>
    </div>

    <!-- Lista Desplazable de Reglas del Mundo -->
    <div class="flex-1 overflow-y-auto space-y-2.5 editorial-scrollbar pr-0.5 min-h-0">
      <!-- 1. Sección de Reglas Ancladas / Prioritarias (si no se está filtrando una categoría específica) -->
      <template v-if="rulesStore.activeCategoryFilter === null && rulesStore.pinnedRules.length > 0 && !rulesStore.searchQuery">
        <div class="flex items-center gap-1 text-[10px] font-mono text-amber-500 font-bold px-1 pt-1">
          <Pin :size="10" class="fill-current rotate-45" />
          <span class="uppercase tracking-wider">Reglas Prioritarias / Ancladas ({{ rulesStore.pinnedRules.length }})</span>
        </div>

        <RuleCard
          v-for="rule in rulesStore.pinnedRules"
          :key="`pinned-${rule.id}`"
          :rule="rule"
        />

        <div class="neu-groove-h my-2 opacity-50"></div>

        <div class="flex items-center gap-1 text-[10px] font-mono text-[var(--text-muted)] font-semibold px-1">
          <Scale :size="10" />
          <span class="uppercase tracking-wider">Todas las Leyes & Códigos</span>
        </div>

        <RuleCard
          v-for="rule in rulesStore.filteredRules.filter(r => !r.isPinned)"
          :key="rule.id"
          :rule="rule"
        />
      </template>

      <!-- 2. Lista estándar si hay filtro de categoría o búsqueda activa -->
      <template v-else-if="rulesStore.filteredRules.length > 0">
        <RuleCard
          v-for="rule in rulesStore.filteredRules"
          :key="rule.id"
          :rule="rule"
        />
      </template>

      <!-- 3. Empty State cuando no hay ninguna regla en el proyecto -->
      <div
        v-else-if="rulesStore.totalCount === 0"
        class="h-full flex flex-col items-center justify-center neu-well rounded-2xl p-6 text-center space-y-3"
      >
        <div class="w-12 h-12 rounded-2xl neu-surface flex items-center justify-center text-[var(--accent)] shrink-0">
          <Scale :size="24" class="stroke-[1.8]" />
        </div>
        <div class="space-y-1">
          <p class="font-editorial text-sm font-bold text-[var(--text-primary)]">
            Sin Reglas de Mundo Codificadas
          </p>
          <p class="text-[11px] text-[var(--text-muted)] max-w-xs leading-relaxed">
            Establece los límites mágicos, códigos legales, protocolos forenses o normas que rigen tu universo narrativo.
          </p>
        </div>

        <div class="flex flex-col gap-2 pt-1 w-full max-w-[220px]">
          <button
            type="button"
            class="neu-btn-terracotta py-2 px-3 text-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            @click="handleCreateRule()"
          >
            <Plus :size="13" />
            <span>Crear primera regla</span>
          </button>
        </div>
      </div>

      <!-- 4. Empty State cuando no hay coincidencias con la búsqueda o filtro -->
      <div
        v-else
        class="py-8 text-center neu-well rounded-2xl p-4 text-[var(--text-muted)] space-y-2"
      >
        <p class="text-xs font-editorial font-medium text-[var(--text-secondary)]">
          No se encontraron reglas para este filtro
        </p>
        <p class="text-[10px] text-[var(--text-muted)]">
          Prueba con otros términos de búsqueda o selecciona otra categoría.
        </p>
        <button
          type="button"
          class="neu-btn px-2.5 py-1 text-[11px] text-[var(--accent)] cursor-pointer mt-1"
          @click="rulesStore.setCategoryFilter(null); rulesStore.searchQuery = ''"
        >
          Ver todas las reglas
        </button>
      </div>
    </div>

    <!-- Modal de Creación / Edición de Reglas -->
    <RuleEditModal />
  </div>
</template>
