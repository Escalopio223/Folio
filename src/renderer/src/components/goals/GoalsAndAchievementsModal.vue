<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import {
  X,
  Target,
  Trophy,
  BookOpen,
  Feather,
  Sparkles,
  Crown,
  Check,
  Save,
} from 'lucide-vue-next'
import { useGoalsStore } from '../../stores/goalsStore'
import {
  ACHIEVEMENTS_CATALOG,
  BASE_ACHIEVEMENTS_COUNT,
  getAchievementProgress,
  type ScalableAchievement,
  type AchievementBranch
} from '../../utils/achievementsCatalog'

const goalsStore = useGoalsStore()

// Input local para la meta de palabras por sesión (mínimo 500)
const editSessionWords = ref<number>(500)
const hasSavedFeedback = ref(false)
const selectedBranch = ref<'all' | 'words' | 'structure' | 'consistency'>('all')

const isInputValid = computed(() => {
  return Number(editSessionWords.value) >= 500
})

watch(
  () => goalsStore.isGoalsModalOpen,
  (isOpen) => {
    if (isOpen) {
      editSessionWords.value = goalsStore.sessionWordTarget
      hasSavedFeedback.value = false
    }
  },
  { immediate: true }
)

async function handleSaveGoal(): Promise<void> {
  const target = Math.max(500, Math.floor(Number(editSessionWords.value) || 500))
  editSessionWords.value = target

  await goalsStore.updateConfig({
    dailyWordGoal: target
  })

  // Sincronizar también con la meta de sesión activa si no se ha completado
  if (goalsStore.activeSessionGoal && goalsStore.activeSessionGoal.type === 'words') {
    goalsStore.activeSessionGoal.target = target
  }

  hasSavedFeedback.value = true
  setTimeout(() => {
    hasSavedFeedback.value = false
  }, 2200)
}

function handlePresetClick(preset: number): void {
  editSessionWords.value = preset
}

// Logro Platino
const platinumAchievement = computed<ScalableAchievement | undefined>(() => {
  return ACHIEVEMENTS_CATALOG.find((a) => a.branch === 'platinum')
})

const platinumProgress = computed(() => {
  if (!platinumAchievement.value) return { current: 0, target: 21, percentage: 0 }
  const ctx = goalsStore.getEvaluationContext()
  return getAchievementProgress(platinumAchievement.value, ctx, goalsStore.unlockedKeys)
})

// Ramas de logros agrupadas
const branches: Array<{
  id: 'words' | 'structure' | 'consistency'
  title: string
  subtitle: string
  icon: any
  badgeColor: string
}> = [
  {
    id: 'words',
    title: 'Palabras Escritas',
    subtitle: '11 escalones de volumen literario acumulado',
    icon: Feather,
    badgeColor: 'text-[#C85A32]'
  },
  {
    id: 'structure',
    title: 'Estructura & Libros',
    subtitle: '4 escalones de capítulos y obras finalizadas',
    icon: BookOpen,
    badgeColor: 'text-blue-500'
  },
  {
    id: 'consistency',
    title: 'Constancia',
    subtitle: '6 escalones de metas de sesión cumplidas',
    icon: Target,
    badgeColor: 'text-emerald-500'
  }
]

// Lista filtrada de logros
const filteredBranches = computed(() => {
  if (selectedBranch.value === 'all') return branches
  return branches.filter((b) => b.id === selectedBranch.value)
})

function getAchievementsForBranch(branchId: AchievementBranch): ScalableAchievement[] {
  return ACHIEVEMENTS_CATALOG.filter((a) => a.branch === branchId)
}

function getProgressForAchievement(ach: ScalableAchievement) {
  const ctx = goalsStore.getEvaluationContext()
  return getAchievementProgress(ach, ctx, goalsStore.unlockedKeys)
}

function isAchUnlocked(key: string): boolean {
  return goalsStore.unlockedKeys.has(key)
}

// Determinar cuál es el "siguiente escalón" (el primer logro no desbloqueado en su rama)
function isNextTierInBranch(ach: ScalableAchievement): boolean {
  if (isAchUnlocked(ach.key)) return false
  const branchList = getAchievementsForBranch(ach.branch)
  const firstLocked = branchList.find((a) => !isAchUnlocked(a.key))
  return firstLocked?.key === ach.key
}

function handleKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape' && goalsStore.isGoalsModalOpen) {
    e.preventDefault()
    goalsStore.closeGoalsModal()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="goalsStore.isGoalsModalOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm select-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="goals-modal-title"
      >
        <!-- Modal Card -->
        <div
          class="neu-panel w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-[var(--neu-border)] bg-[var(--bg-base)] text-[var(--text-primary)] animate-in fade-in zoom-in-95 duration-150"
        >
          <!-- HEADER -->
          <div
            class="px-6 py-4 flex items-center justify-between border-b border-[var(--neu-border)] bg-[var(--bg-surface)] shrink-0"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-xl neu-well flex items-center justify-center text-[var(--accent)]"
              >
                <Trophy :size="22" />
              </div>
              <div>
                <h2
                  id="goals-modal-title"
                  class="font-editorial text-lg md:text-xl font-bold text-[var(--text-primary)]"
                >
                  Metas & Logros Editoriales
                </h2>
                <p class="text-[11px] text-[var(--text-muted)] font-mono">
                  Configura tu meta de palabras por sesión y escala las 3 ramas de progreso hasta el Platino
                </p>
              </div>
            </div>

            <button
              type="button"
              class="neu-btn w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
              title="Cerrar modal (Esc)"
              @click="goalsStore.closeGoalsModal"
            >
              <X :size="16" />
            </button>
          </div>

          <!-- BODY SCROLLABLE -->
          <div class="flex-1 overflow-y-auto p-5 md:p-6 space-y-6 text-sm">
            <!-- ========================================================= -->
            <!-- SECCIÓN SUPERIOR: CABECERA DE META Y PRESTIGIO PLATINO    -->
            <!-- ========================================================= -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Tarjeta 1: Meta de palabras por sesión -->
              <div
                class="neu-panel p-5 rounded-2xl border border-[var(--neu-border)] flex flex-col justify-between space-y-4"
              >
                <div>
                  <div class="flex items-center justify-between pb-2 border-b border-[var(--neu-border)]">
                    <span
                      class="text-[10px] font-mono uppercase tracking-wider text-[var(--accent)] font-semibold flex items-center gap-1.5"
                    >
                      <Target :size="13" />
                      Meta de Palabras por Sesión
                    </span>
                    <span
                      class="neu-well-sm px-2 py-0.5 text-[10px] font-mono text-[var(--text-muted)] rounded"
                    >
                      Mínimo estricto: 500 pal.
                    </span>
                  </div>

                  <p class="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
                    Tu único compromiso creativo diario. Al alcanzarla en cada sesión de escritura, sumas
                    <strong>+1 meta cumplida</strong> para desbloquear la rama de Constancia.
                  </p>
                </div>

                <!-- Input numérico y presets -->
                <div class="space-y-3">
                  <div class="flex items-center gap-2">
                    <div class="relative flex-1">
                      <input
                        v-model.number="editSessionWords"
                        type="number"
                        min="500"
                        step="50"
                        placeholder="500"
                        class="w-full neu-input px-3.5 py-2 rounded-xl text-base font-bold font-mono text-[var(--text-primary)] focus:outline-none"
                        :class="{ '!border-red-500/60': !isInputValid }"
                        @keydown.enter="handleSaveGoal"
                      />
                      <span
                        class="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-[var(--text-muted)] pointer-events-none"
                      >
                        palabras
                      </span>
                    </div>

                    <button
                      type="button"
                      class="neu-btn px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all shrink-0 active:scale-95"
                      :class="
                        hasSavedFeedback
                          ? 'neu-well !text-emerald-500 font-bold'
                          : '!text-[var(--accent)] hover:!text-[var(--text-primary)]'
                      "
                      :disabled="!isInputValid"
                      @click="handleSaveGoal"
                    >
                      <Check v-if="hasSavedFeedback" :size="14" />
                      <Save v-else :size="14" />
                      <span>{{ hasSavedFeedback ? '¡Guardada!' : 'Guardar Meta' }}</span>
                    </button>
                  </div>

                  <!-- Mensaje de error si es menor de 500 -->
                  <p v-if="!isInputValid" class="text-[11px] font-mono text-red-500 font-semibold">
                    ⚠ El mínimo permitido es de 500 palabras por sesión.
                  </p>

                  <!-- Presets rápidos -->
                  <div class="flex items-center gap-1.5">
                    <span class="text-[10px] font-mono text-[var(--text-muted)]">Rápidos:</span>
                    <button
                      v-for="p in [500, 750, 1000, 1500, 2000]"
                      :key="p"
                      type="button"
                      class="neu-btn px-2 py-0.5 text-[10px] font-mono rounded cursor-pointer transition-all"
                      :class="{ 'neu-well !text-[var(--accent)] font-bold': editSessionWords === p }"
                      @click="handlePresetClick(p)"
                    >
                      {{ p }}
                    </button>
                  </div>
                </div>

                <!-- Progreso de la sesión actual -->
                <div class="pt-2 border-t border-[var(--neu-border)] flex items-center justify-between text-xs">
                  <span class="text-[var(--text-secondary)]">Sesión actual:</span>
                  <span class="font-mono font-bold text-[var(--accent)]">
                    {{ goalsStore.sessionProgressWords.toLocaleString('es-ES') }} /
                    {{ goalsStore.sessionWordTarget.toLocaleString('es-ES') }} pal.
                    ({{ goalsStore.sessionProgressPercentage }}%)
                  </span>
                </div>
              </div>

              <!-- Tarjeta 2: Bloque Destacado de Prestigio — Logro Platino -->
              <div
                class="neu-panel p-5 rounded-2xl border flex flex-col justify-between space-y-4 relative overflow-hidden"
                :class="
                  goalsStore.isPlatinumUnlocked
                    ? 'border-cyan-400/60 bg-gradient-to-br from-[var(--bg-surface)] to-cyan-500/10 shadow-lg'
                    : 'border-[var(--neu-border)] bg-[var(--bg-surface)]'
                "
              >
                <div>
                  <div class="flex items-center justify-between pb-2 border-b border-[var(--neu-border)]">
                    <span
                      class="text-[10px] font-mono uppercase tracking-wider font-semibold flex items-center gap-1.5"
                      :class="goalsStore.isPlatinumUnlocked ? 'text-cyan-400 font-bold' : 'text-amber-500'"
                    >
                      <Crown :size="14" />
                      Prestigio Supremo · Logro Platino
                    </span>
                    <span
                      class="neu-well-sm px-2 py-0.5 text-[10px] font-mono font-bold rounded"
                      :class="
                        goalsStore.isPlatinumUnlocked
                          ? 'text-cyan-400 bg-cyan-400/10'
                          : 'text-[var(--text-muted)]'
                      "
                    >
                      {{ goalsStore.baseUnlockedCount }} / {{ BASE_ACHIEVEMENTS_COUNT }} completados
                    </span>
                  </div>

                  <div class="flex items-start gap-3 mt-3">
                    <div
                      class="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md transition-all duration-300"
                      :class="
                        goalsStore.isPlatinumUnlocked
                          ? 'neu-panel bg-cyan-400/20 text-cyan-300 border border-cyan-400/40'
                          : 'neu-well text-[var(--text-muted)] opacity-70'
                      "
                    >
                      <Sparkles :size="24" />
                    </div>

                    <div class="min-w-0">
                      <h3 class="font-editorial text-base font-bold text-[var(--text-primary)]">
                        {{ platinumAchievement?.title || 'Platino' }}
                      </h3>
                      <p class="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                        {{ platinumAchievement?.description }}
                      </p>
                    </div>
                  </div>
                </div>

                <!-- Barra de progreso hacia Platino -->
                <div class="space-y-1.5">
                  <div class="flex items-center justify-between text-[11px] font-mono">
                    <span class="text-[var(--text-muted)]">Progreso global de logros:</span>
                    <span
                      class="font-bold"
                      :class="goalsStore.isPlatinumUnlocked ? 'text-cyan-400' : 'text-[var(--accent)]'"
                    >
                      {{ platinumProgress.percentage }}%
                    </span>
                  </div>

                  <div class="w-full h-2 rounded-full neu-well-sm overflow-hidden p-0.5">
                    <div
                      class="h-full rounded-full transition-all duration-700 ease-out"
                      :class="goalsStore.isPlatinumUnlocked ? 'bg-cyan-400 shadow-sm' : 'bg-[var(--accent)]'"
                      :style="{ width: `${platinumProgress.percentage}%` }"
                    ></div>
                  </div>
                </div>

                <!-- Pie de estado Platino -->
                <div class="pt-2 border-t border-[var(--neu-border)] flex items-center justify-between text-xs">
                  <span class="text-[var(--text-muted)] text-[11px]">
                    {{
                      goalsStore.isPlatinumUnlocked
                        ? '✨ ¡Corona de Platino conquistada!'
                        : `Faltan ${BASE_ACHIEVEMENTS_COUNT - goalsStore.baseUnlockedCount} logros para reclamar el Platino`
                    }}
                  </span>
                  <span
                    v-if="goalsStore.isPlatinumUnlocked"
                    class="neu-well-sm px-2 py-0.5 text-[10px] font-mono text-cyan-400 font-bold rounded"
                  >
                    DESBLOQUEADO
                  </span>
                </div>
              </div>
            </div>

            <!-- ========================================================= -->
            <!-- FILTRO DE RAMAS ESCALABLES                                -->
            <!-- ========================================================= -->
            <div class="flex items-center justify-between border-b border-[var(--neu-border)] pb-3">
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="neu-btn px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-all"
                  :class="{
                    'neu-well !text-[var(--accent)] font-bold shadow-inner': selectedBranch === 'all'
                  }"
                  @click="selectedBranch = 'all'"
                >
                  Todas las Ramas (21)
                </button>

                <button
                  v-for="b in branches"
                  :key="b.id"
                  type="button"
                  class="neu-btn px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-all flex items-center gap-1.5"
                  :class="{
                    'neu-well !text-[var(--accent)] font-bold shadow-inner':
                      selectedBranch === b.id
                  }"
                  @click="selectedBranch = b.id"
                >
                  <component :is="b.icon" :size="13" :class="b.badgeColor" />
                  <span>{{ b.title }}</span>
                </button>
              </div>

              <div class="text-[11px] font-mono text-[var(--text-muted)] hidden sm:block">
                <span>{{ goalsStore.baseUnlockedCount }} / 21 logros base</span>
              </div>
            </div>

            <!-- ========================================================= -->
            <!-- VISTA DE LOGROS ESCALABLES (POR RAMA)                     -->
            <!-- ========================================================= -->
            <div class="space-y-6">
              <div
                v-for="branch in filteredBranches"
                :key="branch.id"
                class="neu-panel p-5 rounded-2xl border border-[var(--neu-border)] space-y-4"
              >
                <!-- Cabecera de la rama -->
                <div class="flex items-center justify-between border-b border-[var(--neu-border)] pb-2.5">
                  <div class="flex items-center gap-2.5">
                    <div
                      class="w-7 h-7 rounded-xl neu-well-sm flex items-center justify-center shrink-0"
                    >
                      <component :is="branch.icon" :size="14" :class="branch.badgeColor" />
                    </div>
                    <div>
                      <h3 class="font-editorial text-sm font-bold text-[var(--text-primary)]">
                        {{ branch.title }}
                      </h3>
                      <p class="text-[10px] text-[var(--text-muted)] font-mono">
                        {{ branch.subtitle }}
                      </p>
                    </div>
                  </div>

                  <span class="neu-well-sm px-2 py-0.5 text-[10px] font-mono text-[var(--accent)] font-semibold rounded">
                    {{
                      getAchievementsForBranch(branch.id).filter((a) => isAchUnlocked(a.key)).length
                    }}
                    / {{ getAchievementsForBranch(branch.id).length }}
                  </span>
                </div>

                <!-- Grid de logros de la rama -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div
                    v-for="ach in getAchievementsForBranch(branch.id)"
                    :key="ach.key"
                    class="p-3.5 rounded-xl border flex flex-col justify-between transition-all duration-200"
                    :class="[
                      isAchUnlocked(ach.key)
                        ? 'neu-panel border-[var(--accent)]/35 bg-[var(--bg-surface)] shadow-sm'
                        : isNextTierInBranch(ach)
                          ? 'neu-surface border-[var(--accent)]/50 ring-1 ring-[var(--accent)]/30'
                          : 'neu-surface border-[var(--neu-border)]/50 opacity-55'
                    ]"
                  >
                    <div>
                      <!-- Cabecera de la tarjeta del logro -->
                      <div class="flex items-start justify-between gap-2 mb-2">
                        <div class="flex items-center gap-2 min-w-0">
                          <div
                            class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs"
                            :class="
                              isAchUnlocked(ach.key)
                                ? 'neu-well-sm text-[var(--accent)] font-bold'
                                : 'neu-surface text-[var(--text-muted)]'
                            "
                          >
                            <Check v-if="isAchUnlocked(ach.key)" :size="13" />
                            <span v-else class="font-mono text-[10px]">#{{ ach.tier }}</span>
                          </div>

                          <h4
                            class="font-editorial text-xs font-bold truncate leading-snug"
                            :class="
                              isAchUnlocked(ach.key)
                                ? 'text-[var(--text-primary)]'
                                : 'text-[var(--text-secondary)]'
                            "
                          >
                            {{ ach.title }}
                          </h4>
                        </div>

                        <span
                          v-if="isNextTierInBranch(ach)"
                          class="neu-well-sm px-1.5 py-0.2 text-[9px] font-mono text-[var(--accent)] font-bold rounded shrink-0 animate-pulse"
                        >
                          SIGUIENTE
                        </span>
                        <span
                          v-else-if="isAchUnlocked(ach.key)"
                          class="neu-well-sm px-1.5 py-0.2 text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-bold rounded shrink-0"
                        >
                          CONSEGUIDO
                        </span>
                      </div>

                      <p class="text-[11px] text-[var(--text-muted)] leading-relaxed">
                        {{ ach.description }}
                      </p>
                    </div>

                    <!-- Barra de progreso individual -->
                    <div class="mt-3 pt-2.5 border-t border-[var(--neu-border)]/40 space-y-1">
                      <div class="flex items-center justify-between text-[10px] font-mono">
                        <span class="text-[var(--text-muted)]">
                          {{ getProgressForAchievement(ach).current.toLocaleString('es-ES') }} /
                          {{ ach.target.toLocaleString('es-ES') }}
                        </span>
                        <span
                          class="font-semibold"
                          :class="isAchUnlocked(ach.key) ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'"
                        >
                          {{ getProgressForAchievement(ach).percentage }}%
                        </span>
                      </div>

                      <div class="w-full h-1.5 rounded-full neu-well-sm overflow-hidden p-0.2">
                        <div
                          class="h-full rounded-full transition-all duration-300 ease-out"
                          :class="
                            isAchUnlocked(ach.key)
                              ? 'bg-[var(--accent)]'
                              : 'bg-[var(--text-muted)]/40'
                          "
                          :style="{ width: `${getProgressForAchievement(ach).percentage}%` }"
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- FOOTER -->
          <div
            class="px-6 py-3 border-t border-[var(--neu-border)] bg-[var(--bg-surface)] flex items-center justify-between text-xs text-[var(--text-muted)] shrink-0"
          >
            <div class="flex items-center gap-3">
              <span class="font-mono text-[11px]">Sistema de 22 Logros Escalables</span>
              <span>·</span>
              <span>Mínimo por sesión: 500 palabras</span>
            </div>

            <button
              type="button"
              class="neu-btn px-4 py-1.5 rounded-lg text-xs font-semibold text-[var(--text-primary)] hover:!text-[var(--accent)] cursor-pointer transition-all"
              @click="goalsStore.closeGoalsModal"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
