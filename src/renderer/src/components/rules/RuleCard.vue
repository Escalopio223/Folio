<script setup lang="ts">
import { ref } from 'vue'
import {
  Pin,
  ChevronDown,
  Edit3,
  Trash2,
  AlertTriangle,
  BookOpen
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
    class="neu-btn w-full p-3 flex flex-col gap-2 rounded-2xl transition-all select-none border border-[var(--groove-dark)]/40 relative group"
    :class="{
      'neu-well border-[var(--accent)]/50 !shadow-inner': rulesStore.selectedRuleId === rule.id,
      'border-l-4 !border-l-[var(--accent)]': rule.isPinned
    }"
    @click="rulesStore.selectRule(rule.id)"
  >
    <!-- Cabecera de la Tarjeta: Categoría, Pin y Acciones -->
    <div class="flex items-start justify-between gap-2">
      <div class="flex items-center gap-1.5 flex-wrap min-w-0">
        <!-- Chip de Categoría Dinámica -->
        <span
          class="neu-well-sm px-2 py-0.5 text-[9px] font-mono text-[var(--accent)] font-semibold rounded-md uppercase tracking-wider truncate max-w-[170px]"
          :title="rule.category"
        >
          {{ rule.category }}
        </span>

        <!-- Insignia de Anclada -->
        <span
          v-if="rule.isPinned"
          class="inline-flex items-center gap-1 text-[9px] font-mono text-amber-500 font-bold px-1.5 py-0.2 neu-well-sm rounded-md"
          title="Regla prioritaria fijada al inicio"
        >
          <Pin :size="9" class="fill-current rotate-45" />
          <span>Fijada</span>
        </span>
      </div>

      <!-- Botones Rápidos de Cabecera -->
      <div class="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity" @click.stop>
        <!-- Conmutar Pin -->
        <button
          type="button"
          class="w-6 h-6 rounded-lg neu-btn flex items-center justify-center transition-all cursor-pointer active:scale-95"
          :class="rule.isPinned ? 'neu-well text-amber-500 font-bold' : 'text-[var(--text-muted)] hover:text-amber-500'"
          :title="rule.isPinned ? 'Desfijar regla' : 'Fijar regla como prioritaria'"
          @click="handleTogglePin"
        >
          <Pin :size="11" :class="{ 'fill-current rotate-45': rule.isPinned }" />
        </button>

        <!-- Editar -->
        <button
          type="button"
          class="w-6 h-6 rounded-lg neu-btn flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all cursor-pointer active:scale-95"
          title="Editar regla"
          @click="handleEdit"
        >
          <Edit3 :size="11" />
        </button>

        <!-- Eliminar -->
        <button
          type="button"
          class="w-6 h-6 rounded-lg neu-btn flex items-center justify-center text-[var(--text-muted)] hover:!text-rose-400 transition-all cursor-pointer active:scale-95"
          title="Eliminar regla"
          @click="handleDelete"
        >
          <Trash2 :size="11" />
        </button>
      </div>
    </div>

    <!-- Título de la Regla / Ley -->
    <h4
      class="font-editorial text-sm font-bold text-[var(--text-primary)] leading-snug cursor-pointer flex items-center justify-between gap-2"
      @click="toggleExpand"
    >
      <span class="truncate">{{ rule.title }}</span>
      <button
        type="button"
        class="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-transform duration-200 shrink-0 p-0.5"
        :class="{ 'rotate-180 text-[var(--accent)]': isExpanded }"
        :title="isExpanded ? 'Plegar detalles' : 'Desplegar detalles'"
        @click.stop="toggleExpand"
      >
        <ChevronDown :size="13" />
      </button>
    </h4>

    <!-- Bloque 1: Axioma Destacado / Verdad Fundamental (Neu-well con Serif Italic) -->
    <div class="neu-well rounded-xl p-2.5 border border-[var(--groove-dark)]/40 relative">
      <div class="flex items-center gap-1.5 text-[9px] font-mono text-[var(--text-muted)] mb-1">
        <Sparkles :size="10" class="text-[var(--accent)]" />
        <span class="uppercase tracking-wider font-semibold">Axioma Fundamental</span>
      </div>
      <p class="font-editorial italic text-xs text-[var(--text-primary)] leading-relaxed">
        «{{ rule.axiom }}»
      </p>
    </div>

    <!-- Bloque 2: Limitaciones / Costes / Consecuencias (Acento Terracota #C85A32) -->
    <div
      v-if="rule.limitations && rule.limitations.trim()"
      class="neu-well-sm rounded-xl p-2.5 border-l-3 border-[var(--accent)] bg-[var(--bg-base)]/50 flex flex-col gap-1"
    >
      <div class="flex items-center gap-1 text-[9px] font-mono text-[var(--accent)] font-bold">
        <AlertTriangle :size="10" />
        <span class="uppercase tracking-wider">Límites, Costes & Consecuencias</span>
      </div>
      <p class="text-[11px] text-[var(--text-secondary)] font-sans leading-relaxed">
        {{ rule.limitations }}
      </p>
    </div>

    <!-- Bloque 3: Detalles Profundos / Excepciones Documentadas (Acordeón desplegable) -->
    <div
      v-if="isExpanded && rule.details && rule.details.trim()"
      class="pt-1.5 border-t border-[var(--groove-dark)]/30 flex flex-col gap-1.5 animate-fadeIn"
    >
      <div class="flex items-center gap-1 text-[9px] font-mono text-[var(--text-muted)] font-semibold">
        <BookOpen :size="10" />
        <span class="uppercase tracking-wider">Detalles, Precedentes & Matices</span>
      </div>
      <div class="text-[11px] text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap font-sans neu-well-sm p-2 rounded-lg">
        {{ rule.details }}
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-3px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fadeIn {
  animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
</style>
