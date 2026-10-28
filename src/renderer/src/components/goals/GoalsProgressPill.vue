<script setup lang="ts">
import { computed } from 'vue'
import { Flame, Trophy } from 'lucide-vue-next'
import { useGoalsStore } from '../../stores/goalsStore'
import { useUiStore } from '../../stores/uiStore'

const goalsStore = useGoalsStore()
const uiStore = useUiStore()

const radius = 7
const circumference = 2 * Math.PI * radius

const strokeDashoffset = computed(() => {
  const percent = Math.min(100, Math.max(0, goalsStore.todayWordPercentage))
  return circumference - (percent / 100) * circumference
})

const isGoalCompleted = computed(() => goalsStore.isTodayGoalMet)

const ringColor = computed(() => {
  return isGoalCompleted.value ? '#2E7D32' : '#C85A32'
})
</script>

<template>
  <button
    type="button"
    class="goals-progress-pill neu-btn px-2.5 py-1 text-xs flex items-center gap-2 transition-all duration-200 cursor-pointer group select-none"
    :class="[
      isGoalCompleted
        ? 'neu-well-sm border-emerald-500/40 text-emerald-700 dark:text-emerald-400'
        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
      { 'opacity-20 hover:opacity-100': uiStore.isFocusMode }
    ]"
    :title="`Meta diaria: ${goalsStore.todayLog.wordsWritten} de ${goalsStore.config.dailyWordGoal} palabras (${goalsStore.todayWordExactPercentage}%). Clic para ver expectativas y logros.`"
    @click="goalsStore.openGoalsModal('expectations')"
  >
    <!-- Racha Diaria con Llama -->
    <div
      v-if="goalsStore.currentStreak > 0"
      class="flex items-center gap-1 font-mono text-[11px] font-semibold text-orange-500 shrink-0"
      title="Racha de días consecutivos cumpliendo tu objetivo diario"
    >
      <Flame :size="13" class="text-orange-500 animate-pulse shrink-0" />
      <span>{{ goalsStore.currentStreak }}d</span>
    </div>

    <!-- Separador sutil si hay racha -->
    <div
      v-if="goalsStore.currentStreak > 0"
      class="w-[1px] h-3 bg-[var(--groove-dark)]/60 shrink-0"
    ></div>

    <!-- Anillo SVG de progreso circular compacto -->
    <div class="relative w-4.5 h-4.5 flex items-center justify-center shrink-0">
      <svg class="w-full h-full -rotate-90" viewBox="0 0 18 18">
        <!-- Círculo de fondo / pista -->
        <circle
          cx="9"
          cy="9"
          :r="radius"
          fill="none"
          stroke="currentColor"
          class="text-[var(--groove-dark)]/50"
          stroke-width="2.2"
        />
        <!-- Círculo de progreso animado -->
        <circle
          cx="9"
          cy="9"
          :r="radius"
          fill="none"
          :stroke="ringColor"
          stroke-width="2.2"
          stroke-linecap="round"
          :stroke-dasharray="circumference"
          :stroke-dashoffset="strokeDashoffset"
          class="transition-[stroke-dashoffset,stroke] duration-500 ease-out"
        />
      </svg>
    </div>

    <!-- Métricas en texto legible -->
    <div class="flex items-center gap-1.5 font-mono text-[11px]">
      <span class="font-medium text-[var(--text-primary)]">
        {{ goalsStore.todayLog.wordsWritten }}
      </span>
      <span class="text-[var(--text-muted)] opacity-70">/</span>
      <span class="text-[var(--text-muted)]">
        {{ goalsStore.config.dailyWordGoal }}
      </span>
      <span
        class="text-[10px] font-semibold px-1 py-0.2 rounded"
        :class="
          isGoalCompleted
            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
            : 'neu-well-sm text-[var(--accent)]'
        "
      >
        {{ goalsStore.todayWordExactPercentage }}%
      </span>
    </div>

    <!-- Indicador de Logros Totales Desbloqueados -->
    <div
      class="hidden lg:flex items-center gap-1 text-[10px] text-[var(--text-muted)] pl-1 border-l border-[var(--groove-dark)]/40 group-hover:text-[var(--text-secondary)] transition-colors"
      title="Logros literarios desbloqueados"
    >
      <Trophy :size="11" class="text-amber-500/80 shrink-0" />
      <span>{{ goalsStore.unlockedCount }}/{{ goalsStore.totalAchievementsCount }}</span>
    </div>
  </button>
</template>
