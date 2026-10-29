<script setup lang="ts">
import { computed } from 'vue'
import { Flame, Trophy, Target } from 'lucide-vue-next'
import { useGoalsStore } from '../../stores/goalsStore'
import { useUiStore } from '../../stores/uiStore'

const goalsStore = useGoalsStore()
const uiStore = useUiStore()

const hasActiveSessionTarget = computed(() => {
  return (
    goalsStore.activeSessionGoal !== null && goalsStore.activeSessionGoal.type !== 'free'
  )
})

const activePercent = computed(() => {
  if (hasActiveSessionTarget.value) {
    return goalsStore.sessionGoalPercentage
  }
  return goalsStore.todayWordPercentage
})

const activeExactPercent = computed(() => {
  if (hasActiveSessionTarget.value) {
    return goalsStore.sessionGoalExactPercentage
  }
  return goalsStore.todayWordExactPercentage
})

const isCompleted = computed(() => {
  if (hasActiveSessionTarget.value) {
    return Boolean(goalsStore.activeSessionGoal?.completed) || activePercent.value >= 100
  }
  return goalsStore.isTodayGoalMet
})

const progressLabel = computed(() => {
  if (hasActiveSessionTarget.value && goalsStore.activeSessionGoal) {
    const g = goalsStore.activeSessionGoal
    if (g.type === 'words') {
      return `${g.current.toLocaleString('es-ES')} / ${g.target.toLocaleString('es-ES')} pal.`
    }
    if (g.type === 'scenes') {
      const unit = g.target === 1 ? 'escena' : 'escenas'
      return `${g.current} / ${g.target} ${unit}`
    }
    const unit = g.target === 1 ? 'capítulo' : 'capítulos'
    return `${g.current} / ${g.target} ${unit}`
  }
  return `${goalsStore.liveTodayWords.toLocaleString('es-ES')} / ${goalsStore.config.dailyWordGoal.toLocaleString('es-ES')} pal.`
})

const barColor = computed(() => {
  return isCompleted.value ? '#2E7D32' : 'var(--accent)'
})
</script>

<template>
  <button
    type="button"
    class="goals-progress-pill neu-btn px-2.5 py-1 text-xs flex items-center gap-2 transition-all duration-300 cursor-pointer group select-none"
    :class="[
      isCompleted
        ? 'neu-well-sm border-emerald-600/40 text-emerald-700 dark:text-emerald-400'
        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
      { 'opacity-[0.12] hover:opacity-100': uiStore.isFocusMode }
    ]"
    :title="
      hasActiveSessionTarget
        ? `Meta de sesión activa: ${progressLabel} (${activeExactPercent}%). Clic para ver expectativas y logros.`
        : `Meta diaria: ${progressLabel} (${activeExactPercent}%). Clic para ver expectativas y logros.`
    "
    @click="goalsStore.openGoalsModal('expectations')"
  >
    <!-- Racha Diaria con Llama (🔥 X días) -->
    <div
      v-if="goalsStore.currentStreak > 0"
      class="flex items-center gap-1 font-mono text-[11px] font-semibold text-orange-500 shrink-0"
      title="Racha de días consecutivos cumpliendo tu meta"
    >
      <Flame :size="13" class="text-orange-500 shrink-0" />
      <span>{{ goalsStore.currentStreak }} {{ goalsStore.currentStreak === 1 ? 'día' : 'días' }}</span>
    </div>

    <div
      v-if="goalsStore.currentStreak > 0"
      class="w-[1px] h-3 bg-[var(--groove-dark)]/60 shrink-0"
    ></div>

    <!-- Etiqueta de Modo (Sesión vs Día) y Progreso -->
    <div class="flex items-center gap-1.5 font-mono text-[11px]">
      <Target
        :size="12"
        class="shrink-0 transition-colors duration-300"
        :style="{ color: barColor }"
      />
      <span
        v-if="hasActiveSessionTarget"
        class="font-semibold text-[var(--text-secondary)]"
      >
        Sesión:
      </span>
      <span class="font-medium text-[var(--text-primary)]">
        {{ progressLabel }}
      </span>
      <span
        class="text-[10px] font-semibold px-1.5 py-0.2 rounded transition-colors duration-300"
        :class="
          isCompleted
            ? 'bg-[#2E7D32]/15 text-[#2E7D32] dark:text-emerald-400'
            : 'neu-well-sm text-[var(--accent)]'
        "
      >
        ({{ activeExactPercent }}%)
      </span>
    </div>

    <!-- Barra de progreso fina con transición suave #C85A32 -> #2E7D32 -->
    <div class="w-12 h-1.5 rounded-full neu-well-sm overflow-hidden shrink-0 hidden sm:block">
      <div
        class="h-full rounded-full transition-all duration-500 ease-out"
        :style="{
          width: `${activePercent}%`,
          backgroundColor: barColor
        }"
      ></div>
    </div>

    <!-- Indicador de Logros Desbloqueados -->
    <div
      class="hidden lg:flex items-center gap-1 text-[10px] text-[var(--text-muted)] pl-1.5 border-l border-[var(--groove-dark)]/40 group-hover:text-[var(--text-secondary)] transition-colors"
      title="Logros editoriales desbloqueados"
    >
      <Trophy :size="11" class="text-amber-500/85 shrink-0" />
      <span>{{ goalsStore.unlockedCount }}/{{ goalsStore.totalAchievementsCount }}</span>
    </div>
  </button>
</template>
