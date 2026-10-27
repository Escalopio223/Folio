<script setup lang="ts">
import { ref } from 'vue'
import {
  Pin,
  ChevronDown,
  Edit3,
  Trash2
} from 'lucide-vue-next'
import type { WorldRule } from '@shared/types'
import { useRulesStore } from '../../stores/rulesStore'

const props = defineProps<{
  rule: WorldRule
  initiallyExpanded?: boolean
}>()

const rulesStore = useRulesStore()
const isExpanded = ref(props.initiallyExpanded ?? false)

function toggleExpand(): void {
  isExpanded.value = !isExpanded.value
}

function handleEdit(): void {
  rulesStore.openEditModal(props.rule)
}

async function handleDelete(): Promise<void> {
  if (confirm(`¿Eliminar la regla "${props.rule.title}" de las Leyes del Mundo?`)) {
    await rulesStore.deleteRule(props.rule.id)
  }
}

async function handleTogglePin(): Promise<void> {
  await rulesStore.togglePin(props.rule.id)
}
</script>

<template>
  <div
    class="neu-btn w-full p-2.5 flex flex-col rounded-xl transition-all select-none border border-[var(--groove-dark)]/40 relative group cursor-pointer"
    :class="{
      'neu-well border-[var(--accent)]/50 !shadow-inner': rulesStore.selectedRuleId === rule.id,
      'border-l-3 !border-l-[var(--accent)]': rule.isPinned
    }"
    @click="toggleExpand"
  >
    <!-- LÍNEA 1: Pin (si está fijada) + Título + Píldora de Categoría + Acciones en Hover -->
    <div class="flex items-center justify-between gap-1.5 min-w-0">
      <div class="flex items-center gap-1.5 min-w-0 flex-1">
        <!-- Icono Pin discreto si está anclada -->
        <Pin
          v-if="rule.isPinned"
          :size="10"
          class="text-amber-500 fill-current rotate-45 shrink-0"
          title="Regla prioritaria fijada"
        />

        <!-- Título de la Regla en negrita editorial -->
        <h4
          class="font-editorial text-sm font-semibold text-[var(--text-primary)] truncate leading-tight"
          :title="rule.title"
        >
          {{ rule.title }}
        </h4>

        <!-- Píldora discreta de Categoría -->
        <span
          class="text-[9px] font-mono text-[var(--accent)]/90 bg-[var(--accent)]/10 px-1.5 py-0.2 rounded shrink-0 uppercase tracking-wider truncate max-w-[120px]"
          :title="rule.category"
        >
          {{ rule.category }}
        </span>
      </div>

      <!-- Acciones de Cabecera (Solo visibles en hover para eliminar ruido visual) -->
      <div
        class="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        @click.stop
      >
        <!-- Conmutar Pin -->
        <button
          type="button"
          class="w-5 h-5 rounded neu-btn flex items-center justify-center transition-all cursor-pointer active:scale-95"
          :class="rule.isPinned ? 'text-amber-500 font-bold' : 'text-[var(--text-muted)] hover:text-amber-500'"
          :title="rule.isPinned ? 'Desfijar regla' : 'Fijar regla como prioritaria'"
          @click="handleTogglePin"
        >
          <Pin :size="10" :class="{ 'fill-current rotate-45': rule.isPinned }" />
        </button>

        <!-- Editar -->
        <button
          type="button"
          class="w-5 h-5 rounded neu-btn flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all cursor-pointer active:scale-95"
          title="Editar regla inline"
          @click="handleEdit"
        >
          <Edit3 :size="10" />
        </button>

        <!-- Eliminar -->
        <button
          type="button"
          class="w-5 h-5 rounded neu-btn flex items-center justify-center text-[var(--text-muted)] hover:!text-rose-400 transition-all cursor-pointer active:scale-95"
          title="Eliminar regla"
          @click="handleDelete"
        >
          <Trash2 :size="10" />
        </button>
      </div>

      <!-- Chevron indicador de expansión -->
      <ChevronDown
        :size="12"
        class="text-[var(--text-muted)] transition-transform duration-200 shrink-0"
        :class="{ 'rotate-180 text-[var(--accent)]': isExpanded }"
      />
    </div>

    <!-- LÍNEA 2: Vista previa del Axioma truncada en 1 sola línea (Estado Colapsado) -->
    <p
      v-if="!isExpanded"
      class="line-clamp-1 text-xs font-editorial italic text-[var(--text-secondary)] opacity-80 mt-1 leading-snug"
    >
      «{{ rule.axiom }}»
    </p>

    <!-- ESTADO EXPANDIDO: Despliegue suave y limpio sin cajas pesadas -->
    <div
      v-else
      class="mt-2 pt-2 border-t border-[var(--groove-dark)]/30 space-y-2 animate-fadeIn"
      @click.stop
    >
      <!-- Texto Completo del Axioma / Ley Fundamental -->
      <p class="font-editorial text-sm leading-relaxed text-[var(--text-primary)] italic">
        «{{ rule.axiom }}»
      </p>

      <!-- Limitaciones / Costes / Consecuencias (Línea lateral terracota fina, sin cajas de alerta pesadas) -->
      <div
        v-if="rule.limitations && rule.limitations.trim()"
        class="border-l-2 border-[#C85A32] pl-2.5 text-xs text-[var(--text-secondary)] leading-relaxed space-y-0.5"
      >
        <span class="text-[9px] font-mono font-bold text-[#C85A32] uppercase tracking-wider block">
          Costes & Consecuencias
        </span>
        <p>{{ rule.limitations }}</p>
      </div>

      <!-- Notas Profundas, Matices o Precedentes (Línea lateral neutral fina) -->
      <div
        v-if="rule.details && rule.details.trim()"
        class="border-l-2 border-[var(--groove-dark)]/60 pl-2.5 text-xs text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap space-y-0.5"
      >
        <span class="text-[9px] font-mono font-semibold text-[var(--text-muted)] uppercase tracking-wider block">
          Notas & Excepciones
        </span>
        <p>{{ rule.details }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-2px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fadeIn {
  animation: fadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
</style>
