<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import {
  X,
  Target,
  Trophy,
  Flame,
  CheckCircle,
  Calendar,
  BookOpen,
  Feather,
  Zap,
  Layout,
  Compass,
  Award,
  Crown,
  BookmarkCheck,
  Layers,
  Clock,
  TrendingUp,
  Save,
  Check,
  Sparkles,
  Plus,
  Minus,
  RotateCcw
} from 'lucide-vue-next'
import { useGoalsStore, getLocalDateString } from '../../stores/goalsStore'
import { useProjectStore } from '../../stores/projectStore'
import {
  ACHIEVEMENTS_CATALOG,
  type AchievementCategory,
  type AchievementItem,
  type AchievementProgress
} from '../../utils/achievementsCatalog'

const goalsStore = useGoalsStore()
const projectStore = useProjectStore()

const activeTab = computed({
  get: () => goalsStore.activeModalTab,
  set: (val) => (goalsStore.activeModalTab = val)
})

const selectedCategory = ref<'all' | AchievementCategory>('all')

// Formularios locales para editar metas reactivamente
const editDailyWords = ref(500)
const editDailyChapters = ref(0)
const editTargetWords = ref(50000)
const editDeadlineDate = ref<string>('')
const editAskSessionStartup = ref<boolean>(true)
const isSaving = ref(false)
const saveSuccess = ref(false)

// Controles en caliente para Meta de Sesión
const quickSessionType = ref<'words' | 'chapters'>('words')
const quickSessionTarget = ref<number>(500)

function syncFormValues(): void {
  editDailyWords.value = goalsStore.config.dailyWordGoal
  editDailyChapters.value = goalsStore.config.dailyChapterGoal
  editTargetWords.value = goalsStore.config.targetTotalWords
  editDeadlineDate.value = goalsStore.config.deadlineDate || ''
  editAskSessionStartup.value = goalsStore.config.askSessionGoalOnStartup ?? true

  if (goalsStore.activeSessionGoal && goalsStore.activeSessionGoal.type !== 'free') {
    quickSessionType.value = goalsStore.activeSessionGoal.type
    quickSessionTarget.value = goalsStore.activeSessionGoal.target
  } else {
    quickSessionType.value = 'words'
    quickSessionTarget.value = goalsStore.config.dailyWordGoal || 500
  }
}

watch(
  () => goalsStore.isGoalsModalOpen,
  (open) => {
    if (open) {
      syncFormValues()
      saveSuccess.value = false
    }
  },
  { immediate: true }
)

watch(
  () => goalsStore.config,
  () => {
    syncFormValues()
  },
  { deep: true }
)

// Ajuste con botones + / -
function stepDailyWords(delta: number): void {
  editDailyWords.value = Math.max(50, (Number(editDailyWords.value) || 500) + delta)
}

function stepDailyChapters(delta: number): void {
  editDailyChapters.value = Math.max(
    0,
    Math.min(20, (Number(editDailyChapters.value) || 0) + delta)
  )
}

function applyHotSessionGoal(): void {
  const safeTarget = Math.max(1, Number(quickSessionTarget.value) || 1)
  goalsStore.setSessionGoal(quickSessionType.value, safeTarget)
}

function switchSessionGoalType(type: 'words' | 'chapters'): void {
  quickSessionType.value = type
  if (type === 'words') {
    quickSessionTarget.value = editDailyWords.value || 500
  } else {
    quickSessionTarget.value = Math.max(1, editDailyChapters.value || 1)
  }
}

// Estimaciones
const remainingWords = computed(() => {
  return Math.max(0, editTargetWords.value - goalsStore.totalManuscriptWords)
})

const estimatedDaysLeft = computed(() => {
  const pace = Math.max(1, editDailyWords.value)
  if (remainingWords.value <= 0) return 0
  return Math.ceil(remainingWords.value / pace)
})

const daysUntilDeadline = computed(() => {
  if (!editDeadlineDate.value) return null
  const [y, m, d] = editDeadlineDate.value.split('-').map(Number)
  if (!y || !m || !d) return null
  const deadline = new Date(y, m - 1, d, 0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diffTime = deadline.getTime() - today.getTime()
  return Math.round(diffTime / (1000 * 60 * 60 * 24))
})

// Últimos 7 días para la línea de tiempo (sincronizado en vivo)
const last7Days = computed(() => {
  const days: Array<{
    dateStr: string
    dayName: string
    dayNumber: number
    words: number
    goalMet: boolean
    isToday: boolean
  }> = []

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const today = new Date()
  const todayStr = getLocalDateString(today)

  const logMap = new Map<string, { words: number; goalMet: boolean }>()
  for (const log of goalsStore.recentHistory) {
    logMap.set(log.date, { words: log.wordsWritten, goalMet: log.goalMet })
  }
  logMap.set(todayStr, {
    words: goalsStore.liveTodayWords,
    goalMet: goalsStore.isTodayGoalMet
  })

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const dateStr = getLocalDateString(d)

    const log = logMap.get(dateStr)
    days.push({
      dateStr,
      dayName: dayNames[d.getDay()],
      dayNumber: d.getDate(),
      words: log ? log.words : 0,
      goalMet: log ? log.goalMet : false,
      isToday: i === 0
    })
  }

  return days
})

// Secciones de Logros organizadas claramente
const achievementSections = computed(() => {
  const allSections: Array<{
    id: AchievementCategory
    title: string
    subtitle: string
    items: AchievementItem[]
  }> = [
    {
      id: 'goals',
      title: '1. Logros de Tus Propias Metas',
      subtitle: 'Hitos dinámicos que celebran las metas de sesión y jornada que tú mismo defines.',
      items: ACHIEVEMENTS_CATALOG.filter((a) => a.category === 'goals')
    },
    {
      id: 'volume',
      title: '2. Hitos del Manuscrito (Volumen de la Obra)',
      subtitle: 'El crecimiento tangible de tu libro desde las primeras líneas hasta la Obra Magna.',
      items: ACHIEVEMENTS_CATALOG.filter((a) => a.category === 'volume')
    },
    {
      id: 'consistency',
      title: '3. Constancia y Oficio',
      subtitle: 'Reconocimientos al hábito editorial continuo y al cierre de estructura capitular.',
      items: ACHIEVEMENTS_CATALOG.filter((a) => a.category === 'consistency')
    },
    {
      id: 'worldbuilding',
      title: '4. Universo, Lore y Herramientas',
      subtitle: 'Hitos de construcción de mundo en la Wiki, Reglas del Canon y Scratchpad.',
      items: ACHIEVEMENTS_CATALOG.filter((a) => a.category === 'worldbuilding')
    }
  ]

  if (selectedCategory.value === 'all') {
    return allSections
  }
  return allSections.filter((s) => s.id === selectedCategory.value)
})

function isAchievementUnlocked(key: string): boolean {
  return goalsStore.unlockedKeys.has(key)
}

function getUnlockedRecord(key: string) {
  return goalsStore.unlockedAchievements.find((a) => a.achievementKey === key) || null
}

function getUnlockedDate(key: string): string | null {
  const item = getUnlockedRecord(key)
  if (!item) return null
  const date = new Date(item.unlockedAt)
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

function getAchievementProgress(item: AchievementItem): AchievementProgress {
  const ctx = goalsStore.getEvaluationContext()
  return item.getProgress(ctx)
}

function getIconComponent(iconName: string): any {
  switch (iconName) {
    case 'Sparkles':
      return Sparkles
    case 'Target':
      return Target
    case 'Zap':
      return Zap
    case 'Layout':
      return Layout
    case 'Feather':
      return Feather
    case 'BookOpen':
      return BookOpen
    case 'Compass':
      return Compass
    case 'Award':
      return Award
    case 'Crown':
      return Crown
    case 'BookmarkCheck':
      return BookmarkCheck
    case 'Layers':
      return Layers
    case 'Flame':
      return Flame
    case 'CheckCircle':
      return CheckCircle
    case 'Trophy':
    default:
      return Trophy
  }
}

async function handleSaveGoals(): Promise<void> {
  isSaving.value = true
  saveSuccess.value = false

  try {
    await goalsStore.updateConfig({
      dailyWordGoal: Math.max(50, Number(editDailyWords.value) || 500),
      dailyChapterGoal: Math.max(0, Number(editDailyChapters.value) ?? 0),
      targetTotalWords: Math.max(500, Number(editTargetWords.value) || 50000),
      deadlineDate: editDeadlineDate.value ? editDeadlineDate.value : null,
      askSessionGoalOnStartup: editAskSessionStartup.value
    })
    saveSuccess.value = true
    setTimeout(() => {
      saveSuccess.value = false
    }, 2500)
  } catch (err) {
    console.error('Error al guardar metas:', err)
  } finally {
    isSaving.value = false
  }
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape' && goalsStore.isGoalsModalOpen) {
    goalsStore.closeGoalsModal()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="goalsStore.isGoalsModalOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/60 backdrop-blur-sm select-none"
        role="dialog"
        aria-modal="true"
        @click.self="goalsStore.closeGoalsModal"
      >
        <div
          class="neu-surface max-w-4xl w-full max-h-[90vh] rounded-3xl shadow-2xl border border-[var(--groove-dark)]/70 flex flex-col overflow-hidden"
        >
          <!-- ============================================================= -->
          <!-- CABECERA DEL MODAL                                            -->
          <!-- ============================================================= -->
          <header
            class="px-6 md:px-8 pt-6 pb-4 border-b border-[var(--groove-dark)]/40 flex flex-wrap items-center justify-between gap-4 shrink-0 bg-[var(--bg-base)]"
          >
            <div class="flex items-center gap-3.5 min-w-0">
              <div
                class="w-11 h-11 rounded-2xl neu-well-sm flex items-center justify-center text-[var(--accent)] shrink-0 shadow-inner"
              >
                <Target :size="22" />
              </div>
              <div class="min-w-0">
                <h2
                  class="font-editorial text-xl md:text-2xl font-bold text-[var(--text-primary)] truncate tracking-tight"
                >
                  Expectativas & Logros Editoriales
                </h2>
                <p class="text-xs font-mono text-[var(--text-secondary)] truncate mt-0.5">
                  {{ projectStore.activeProject?.title || 'Mi Obra Literaria' }}
                </p>
              </div>
            </div>

            <div class="flex items-center gap-3 shrink-0">
              <!-- Selector de Pestañas Táctil -->
              <div class="flex items-center p-1 rounded-xl neu-well-sm gap-1">
                <button
                  type="button"
                  class="px-3.5 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 cursor-pointer"
                  :class="
                    activeTab === 'expectations'
                      ? 'neu-btn font-semibold text-[var(--text-primary)] !shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  "
                  @click="activeTab = 'expectations'"
                >
                  <Compass :size="14" class="text-[var(--accent)]" />
                  <span>Expectativas & Progreso</span>
                </button>

                <button
                  type="button"
                  class="px-3.5 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 cursor-pointer"
                  :class="
                    activeTab === 'achievements'
                      ? 'neu-btn font-semibold text-[var(--text-primary)] !shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  "
                  @click="activeTab = 'achievements'"
                >
                  <Trophy :size="14" class="text-amber-500" />
                  <span>Vitrina de Logros</span>
                  <span
                    class="text-xs font-mono px-2 py-0.5 rounded-full neu-well-sm text-[var(--accent)] font-bold"
                  >
                    {{ goalsStore.unlockedCount }}/{{ goalsStore.totalAchievementsCount }}
                  </span>
                </button>
              </div>

              <!-- Botón de Cerrar Modal -->
              <button
                type="button"
                class="w-9 h-9 rounded-xl neu-btn flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                title="Cerrar ventana (Esc)"
                @click="goalsStore.closeGoalsModal"
              >
                <X :size="16" />
              </button>
            </div>
          </header>

          <!-- ============================================================= -->
          <!-- CUERPO PRINCIPAL DEL MODAL                                    -->
          <!-- ============================================================= -->
          <div class="flex-1 overflow-y-auto editorial-scrollbar p-6 md:p-8 space-y-7">
            <!-- *********************************************************** -->
            <!-- PESTAÑA 1: EXPECTATIVAS Y PROGRESO (SESIÓN + DÍA + LIBRO)   -->
            <!-- *********************************************************** -->
            <div v-if="activeTab === 'expectations'" class="space-y-6">
              <!-- 1. TARJETA DESTACADA: PROGRESO TOTAL DEL MANUSCRITO -->
              <div
                class="neu-well p-6 md:p-7 rounded-2xl relative overflow-hidden border border-[var(--groove-dark)]/30"
              >
                <div
                  class="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-[var(--accent)]/10 blur-3xl pointer-events-none"
                ></div>

                <div class="relative z-10 space-y-5">
                  <div
                    class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--groove-dark)]/40 pb-4"
                  >
                    <div>
                      <div class="flex items-center gap-2.5">
                        <span
                          class="text-xs font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full neu-well-sm text-[var(--accent)] font-semibold"
                        >
                          Progreso Total del Manuscrito
                        </span>
                        <span
                          v-if="goalsStore.totalManuscriptWords >= editTargetWords"
                          class="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#2E7D32]/15 text-[#2E7D32] dark:text-emerald-400"
                        >
                          ¡Obra Completada! 🎉
                        </span>
                      </div>
                      <h3
                        class="font-editorial text-2xl md:text-3xl font-bold text-[var(--text-primary)] mt-2"
                      >
                        {{ goalsStore.totalManuscriptWords.toLocaleString('es-ES') }}
                        <span class="text-base font-normal text-[var(--text-secondary)] font-mono">
                          / {{ editTargetWords.toLocaleString('es-ES') }} palabras ({{
                            goalsStore.totalManuscriptExactPercentage
                          }}%)
                        </span>
                      </h3>
                    </div>

                    <div
                      class="neu-btn px-4 py-2.5 text-right flex flex-col items-end justify-center rounded-xl shrink-0"
                    >
                      <span class="text-xs text-[var(--text-secondary)] font-mono">
                        Hoy llevas
                      </span>
                      <span class="font-mono text-lg font-bold text-[var(--accent)] leading-tight">
                        {{ goalsStore.liveTodayWords.toLocaleString('es-ES') }}
                        <span class="text-xs font-normal text-[var(--text-secondary)]">
                          / {{ goalsStore.config.dailyWordGoal.toLocaleString('es-ES') }} pal.
                        </span>
                      </span>
                    </div>
                  </div>

                  <!-- Barra de progreso ancha y legible -->
                  <div class="space-y-2">
                    <div
                      class="h-4 w-full neu-well-sm rounded-full overflow-hidden p-0.5 border border-[var(--groove-dark)]/30"
                    >
                      <div
                        class="h-full rounded-full transition-all duration-700 ease-out"
                        :style="{
                          width: `${goalsStore.totalManuscriptPercentage}%`,
                          backgroundColor:
                            goalsStore.totalManuscriptPercentage >= 100 ? '#2E7D32' : 'var(--accent)'
                        }"
                      ></div>
                    </div>
                  </div>

                  <!-- Métricas de Ritmo y Estimación -->
                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div class="neu-btn p-3.5 rounded-xl flex items-center gap-3">
                      <div
                        class="w-9 h-9 rounded-lg neu-well-sm flex items-center justify-center text-[var(--accent)] shrink-0"
                      >
                        <TrendingUp :size="16" />
                      </div>
                      <div class="min-w-0">
                        <div class="text-xs font-mono text-[var(--text-secondary)]">
                          Palabras Restantes
                        </div>
                        <div class="text-sm font-bold font-mono text-[var(--text-primary)] truncate">
                          {{
                            remainingWords > 0
                              ? remainingWords.toLocaleString('es-ES')
                              : '¡Meta alcanzada!'
                          }}
                        </div>
                      </div>
                    </div>

                    <div class="neu-btn p-3.5 rounded-xl flex items-center gap-3">
                      <div
                        class="w-9 h-9 rounded-lg neu-well-sm flex items-center justify-center text-amber-500 shrink-0"
                      >
                        <Clock :size="16" />
                      </div>
                      <div class="min-w-0">
                        <div class="text-xs font-mono text-[var(--text-secondary)]">
                          Ritmo Estimado
                        </div>
                        <div class="text-sm font-bold font-mono text-[var(--text-primary)] truncate">
                          {{
                            estimatedDaysLeft > 0
                              ? `~${estimatedDaysLeft} sesiones`
                              : 'Objetivo superado'
                          }}
                        </div>
                      </div>
                    </div>

                    <div class="neu-btn p-3.5 rounded-xl flex items-center gap-3">
                      <div
                        class="w-9 h-9 rounded-lg neu-well-sm flex items-center justify-center text-sky-500 shrink-0"
                      >
                        <Calendar :size="16" />
                      </div>
                      <div class="min-w-0">
                        <div class="text-xs font-mono text-[var(--text-secondary)]">
                          Fecha Límite
                        </div>
                        <div class="text-sm font-bold font-mono text-[var(--text-primary)] truncate">
                          <template v-if="daysUntilDeadline !== null">
                            {{
                              daysUntilDeadline >= 0
                                ? `Quedan ${daysUntilDeadline} días`
                                : 'Fecha vencida'
                            }}
                          </template>
                          <template v-else>Sin límite fijado</template>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 2. META DE LA SESIÓN ACTUAL (MODIFICABLE O REINICIABLE EN CALIENTE) -->
              <div
                class="neu-surface p-5 md:p-6 rounded-2xl border border-[var(--groove-dark)]/40 space-y-4"
              >
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <div class="flex items-center gap-2.5">
                    <Sparkles :size="18" class="text-[var(--accent)]" />
                    <div>
                      <h4 class="font-editorial text-lg font-bold text-[var(--text-primary)]">
                        Meta de la Sesión Actual
                      </h4>
                      <p class="text-xs text-[var(--text-secondary)]">
                        Tu propósito inmediato para este rato de escritura (puedes cambiarlo o
                        reiniciarlo cuando quieras).
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    class="neu-btn px-3 py-1.5 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--accent)] flex items-center gap-1.5 cursor-pointer"
                    @click="goalsStore.openSessionPrompt"
                  >
                    <Compass :size="13" />
                    <span>Abrir Ritual de Inicio</span>
                  </button>
                </div>

                <!-- Estado actual de la sesión -->
                <div
                  v-if="
                    goalsStore.activeSessionGoal && goalsStore.activeSessionGoal.type !== 'free'
                  "
                  class="neu-well p-4 rounded-xl space-y-2.5"
                >
                  <div class="flex items-center justify-between text-sm">
                    <span class="font-semibold text-[var(--text-primary)]">
                      Progreso de esta sesión:
                    </span>
                    <span class="font-mono font-bold text-[var(--accent)]">
                      {{ goalsStore.activeSessionGoal.current.toLocaleString('es-ES') }} /
                      {{ goalsStore.activeSessionGoal.target.toLocaleString('es-ES') }}
                      {{
                        goalsStore.activeSessionGoal.type === 'words'
                          ? 'palabras'
                          : 'capítulos'
                      }}
                      ({{ goalsStore.sessionGoalExactPercentage }}%)
                    </span>
                  </div>
                  <div class="h-2.5 w-full neu-surface rounded-full overflow-hidden p-0.5">
                    <div
                      class="h-full rounded-full transition-all duration-500"
                      :style="{
                        width: `${goalsStore.sessionGoalPercentage}%`,
                        backgroundColor: goalsStore.activeSessionGoal.completed
                          ? '#2E7D32'
                          : 'var(--accent)'
                      }"
                    ></div>
                  </div>
                </div>

                <!-- Controles rápidos para fijar / reiniciar en caliente -->
                <div class="flex flex-wrap items-center gap-2.5 pt-1">
                  <input
                    v-model.number="quickSessionTarget"
                    type="number"
                    min="1"
                    :step="quickSessionType === 'words' ? 50 : 1"
                    class="w-24 neu-well px-3 py-2 rounded-xl text-sm font-mono font-bold text-[var(--text-primary)] border-none focus:outline-none"
                  />

                  <div class="flex items-center p-1 rounded-xl neu-well-sm gap-1">
                    <button
                      v-for="t in [
                        { id: 'words', label: 'Palabras' },
                        { id: 'chapters', label: 'Capítulos' }
                      ]"
                      :key="t.id"
                      type="button"
                      class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer"
                      :class="
                        quickSessionType === t.id
                          ? 'neu-btn font-semibold text-[var(--accent)]'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      "
                      @click="switchSessionGoalType(t.id as 'words' | 'chapters')"
                    >
                      {{ t.label }}
                    </button>
                  </div>

                  <button
                    type="button"
                    class="neu-btn-terracotta px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    @click="applyHotSessionGoal"
                  >
                    <RotateCcw :size="13" />
                    <span>
                      {{
                        goalsStore.activeSessionGoal &&
                        goalsStore.activeSessionGoal.type !== 'free'
                          ? 'Actualizar / Reiniciar Sesión'
                          : 'Fijar Meta de Sesión'
                      }}
                    </span>
                  </button>

                  <button
                    v-if="
                      goalsStore.activeSessionGoal && goalsStore.activeSessionGoal.type !== 'free'
                    "
                    type="button"
                    class="neu-btn px-3 py-2 rounded-xl text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                    @click="goalsStore.setSessionGoal('free', 0)"
                  >
                    Modo Libre (Sin meta)
                  </button>
                </div>
              </div>

              <!-- 3. RACHA Y LÍNEA DE TIEMPO DE LOS ÚLTIMOS 7 DÍAS -->
              <div
                class="neu-surface p-5 md:p-6 rounded-2xl border border-[var(--groove-dark)]/40 space-y-3.5"
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <Flame :size="17" class="text-orange-500" />
                    <span
                      class="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] font-mono"
                    >
                      Racha & Constancia de los Últimos 7 Días
                    </span>
                  </div>
                  <div
                    v-if="goalsStore.currentStreak > 0"
                    class="text-xs font-mono font-bold text-orange-500 flex items-center gap-1.5"
                  >
                    <Flame :size="14" />
                    <span>
                      Racha activa: {{ goalsStore.currentStreak }}
                      {{ goalsStore.currentStreak === 1 ? 'día' : 'días' }}
                    </span>
                  </div>
                </div>

                <div class="grid grid-cols-7 gap-2 pt-1">
                  <div
                    v-for="d in last7Days"
                    :key="d.dateStr"
                    class="p-2.5 rounded-xl text-center flex flex-col items-center gap-1 transition-all"
                    :class="[
                      d.isToday ? 'neu-well border border-[var(--accent)]/40' : 'neu-btn',
                      d.goalMet ? '!border-[#2E7D32]/45 bg-[#2E7D32]/5' : ''
                    ]"
                  >
                    <span class="text-xs font-mono text-[var(--text-secondary)] uppercase">
                      {{ d.dayName }}
                    </span>
                    <span class="text-sm font-bold text-[var(--text-primary)] font-mono">
                      {{ d.dayNumber }}
                    </span>

                    <div class="my-1">
                      <div
                        v-if="d.goalMet"
                        class="w-7 h-7 rounded-full bg-[#2E7D32]/20 text-[#2E7D32] dark:text-emerald-400 flex items-center justify-center neu-well-sm"
                        title="Meta cumplida este día"
                      >
                        <Check :size="14" stroke-width="3" />
                      </div>
                      <div
                        v-else-if="d.words > 0"
                        class="w-7 h-7 rounded-full neu-well-sm text-[var(--accent)] flex items-center justify-center text-xs font-mono font-bold"
                        title="Escribiste palabras este día"
                      >
                        {{ d.words > 999 ? `${Math.round(d.words / 1000)}k` : d.words }}
                      </div>
                      <div
                        v-else
                        class="w-7 h-7 rounded-full neu-well-sm text-[var(--text-muted)]/50 flex items-center justify-center text-xs"
                      >
                        ·
                      </div>
                    </div>

                    <span
                      class="text-xs font-mono truncate w-full"
                      :class="
                        d.goalMet
                          ? 'text-[#2E7D32] dark:text-emerald-400 font-semibold'
                          : 'text-[var(--text-secondary)]'
                      "
                    >
                      {{ d.words.toLocaleString('es-ES') }} pal.
                    </span>
                  </div>
                </div>
              </div>

              <!-- 4. MIS EXPECTATIVAS DIARIAS Y META TOTAL DEL LIBRO -->
              <div
                class="neu-surface p-6 rounded-2xl border border-[var(--groove-dark)]/40 space-y-6"
              >
                <div
                  class="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--groove-dark)]/40 pb-4"
                >
                  <div class="flex items-center gap-2.5">
                    <Target :size="18" class="text-[var(--accent)]" />
                    <h4 class="font-editorial text-lg font-bold text-[var(--text-primary)]">
                      Mis Expectativas Diarias y Meta del Libro
                    </h4>
                  </div>

                  <button
                    type="button"
                    class="neu-btn-terracotta px-4 py-2 text-xs flex items-center gap-2 font-semibold cursor-pointer"
                    :disabled="isSaving"
                    @click="handleSaveGoals"
                  >
                    <Check v-if="saveSuccess" :size="14" class="text-white" />
                    <Save v-else :size="14" />
                    <span>
                      {{
                        saveSuccess
                          ? '¡Expectativas Guardadas!'
                          : isSaving
                            ? 'Guardando...'
                            : 'Guardar Expectativas'
                      }}
                    </span>
                  </button>
                </div>

                <!-- Controles Diarios con Botones + / - (Palabras/día y Capítulos/día) -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <!-- Palabras / día -->
                  <div class="neu-well p-4 rounded-2xl space-y-3">
                    <label
                      class="text-xs font-semibold text-[var(--text-primary)] flex items-center justify-between"
                    >
                      <span>Palabras / día</span>
                      <span class="font-mono text-[var(--accent)] font-bold">
                        {{ editDailyWords.toLocaleString('es-ES') }}
                      </span>
                    </label>
                    <div class="flex items-center gap-2">
                      <button
                        type="button"
                        class="w-9 h-9 rounded-xl neu-btn flex items-center justify-center text-[var(--text-primary)] hover:text-[var(--accent)] cursor-pointer shrink-0"
                        title="Restar 50 palabras"
                        @click="stepDailyWords(-50)"
                      >
                        <Minus :size="14" />
                      </button>
                      <input
                        v-model.number="editDailyWords"
                        type="number"
                        min="50"
                        step="50"
                        class="w-full text-center neu-surface px-2 py-2 rounded-xl text-sm font-mono font-bold text-[var(--text-primary)] border-none focus:outline-none"
                      />
                      <button
                        type="button"
                        class="w-9 h-9 rounded-xl neu-btn flex items-center justify-center text-[var(--text-primary)] hover:text-[var(--accent)] cursor-pointer shrink-0"
                        title="Sumar 50 palabras"
                        @click="stepDailyWords(50)"
                      >
                        <Plus :size="14" />
                      </button>
                    </div>
                    <div class="flex items-center justify-between gap-1 pt-0.5">
                      <button
                        v-for="preset in [250, 500, 1000, 1500]"
                        :key="preset"
                        type="button"
                        class="flex-1 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer"
                        :class="
                          editDailyWords === preset
                            ? 'neu-surface font-bold text-[var(--accent)]'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        "
                        @click="editDailyWords = preset"
                      >
                        {{ preset }}
                      </button>
                    </div>
                  </div>

                  <!-- Capítulos / día -->
                  <div class="neu-well p-4 rounded-2xl space-y-3">
                    <label
                      class="text-xs font-semibold text-[var(--text-primary)] flex items-center justify-between"
                    >
                      <span>Capítulos / día</span>
                      <span class="font-mono text-[var(--accent)] font-bold">
                        Hoy: {{ goalsStore.todayLog.chaptersCompleted }} / {{ editDailyChapters }}
                      </span>
                    </label>
                    <div class="flex items-center gap-2">
                      <button
                        type="button"
                        class="w-9 h-9 rounded-xl neu-btn flex items-center justify-center text-[var(--text-primary)] hover:text-[var(--accent)] cursor-pointer shrink-0"
                        @click="stepDailyChapters(-1)"
                      >
                        <Minus :size="14" />
                      </button>
                      <input
                        v-model.number="editDailyChapters"
                        type="number"
                        min="0"
                        max="20"
                        class="w-full text-center neu-surface px-2 py-2 rounded-xl text-sm font-mono font-bold text-[var(--text-primary)] border-none focus:outline-none"
                      />
                      <button
                        type="button"
                        class="w-9 h-9 rounded-xl neu-btn flex items-center justify-center text-[var(--text-primary)] hover:text-[var(--accent)] cursor-pointer shrink-0"
                        @click="stepDailyChapters(1)"
                      >
                        <Plus :size="14" />
                      </button>
                    </div>
                    <div class="flex items-center justify-between gap-1 pt-0.5">
                      <button
                        v-for="cPreset in [0, 1, 2, 3]"
                        :key="cPreset"
                        type="button"
                        class="flex-1 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer"
                        :class="
                          editDailyChapters === cPreset
                            ? 'neu-surface font-bold text-[var(--accent)]'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        "
                        @click="editDailyChapters = cPreset"
                      >
                        {{ cPreset === 0 ? 'Libre' : `${cPreset} cap.` }}
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Meta Total del Libro con Presets Rápidos (Relato 10k, Novela Corta 30k, Novela 60k, Épica 100k+) -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div class="space-y-2.5">
                    <label
                      class="text-xs font-semibold text-[var(--text-primary)] flex items-center justify-between"
                    >
                      <span>Meta Total del Libro:</span>
                      <span class="font-mono text-[var(--accent)] font-bold">
                        {{ editTargetWords.toLocaleString('es-ES') }} palabras
                      </span>
                    </label>

                    <div class="flex flex-wrap items-center gap-2">
                      <input
                        v-model.number="editTargetWords"
                        type="number"
                        min="500"
                        step="1000"
                        class="w-32 neu-well px-3.5 py-2 rounded-xl text-sm font-mono font-bold text-[var(--text-primary)] bg-transparent border-none focus:outline-none"
                      />
                      <div class="flex items-center gap-1.5 flex-wrap">
                        <button
                          v-for="preset in [
                            { label: 'Relato 10k', val: 10000 },
                            { label: 'Novela Corta 30k', val: 30000 },
                            { label: 'Novela 60k', val: 60000 },
                            { label: 'Épica 100k+', val: 100000 }
                          ]"
                          :key="preset.val"
                          type="button"
                          class="px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer"
                          :class="
                            editTargetWords === preset.val
                              ? 'neu-well font-bold text-[var(--accent)]'
                              : 'neu-btn text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                          "
                          @click="editTargetWords = preset.val"
                        >
                          {{ preset.label }}
                        </button>
                      </div>
                    </div>
                  </div>

                  <!-- Fecha Límite y Preferencia de Ritual de Inicio -->
                  <div class="space-y-3">
                    <div class="space-y-2">
                      <label class="text-xs font-semibold text-[var(--text-primary)] block">
                        Fecha límite de entrega (Opcional):
                      </label>
                      <div class="flex items-center gap-2">
                        <input
                          v-model="editDeadlineDate"
                          type="date"
                          class="neu-well px-3.5 py-2 rounded-xl text-xs font-mono text-[var(--text-primary)] bg-transparent border-none focus:outline-none w-48"
                        />
                        <button
                          v-if="editDeadlineDate"
                          type="button"
                          class="text-xs text-[var(--text-secondary)] hover:text-rose-400 font-mono underline cursor-pointer"
                          @click="editDeadlineDate = ''"
                        >
                          Quitar fecha
                        </button>
                      </div>
                    </div>

                    <label
                      class="flex items-center gap-2.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer pt-1"
                    >
                      <input
                        v-model="editAskSessionStartup"
                        type="checkbox"
                        class="rounded accent-[var(--accent)] w-4 h-4 cursor-pointer"
                      />
                      <span>
                        Mostrar sugerencia de Meta de Sesión al abrir Folio («Ritual de Inicio»)
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <!-- *********************************************************** -->
            <!-- PESTAÑA 2: VITRINA DE LOGROS DE ALTA LEGIBILIDAD            -->
            <!-- *********************************************************** -->
            <div v-else-if="activeTab === 'achievements'" class="space-y-7">
              <!-- Barra Superior de Filtros y Contador -->
              <div class="flex flex-wrap items-center justify-between gap-4">
                <div class="flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl neu-well-sm">
                  <button
                    v-for="cat in [
                      { id: 'all', label: 'Todos los Hitos' },
                      { id: 'goals', label: 'Tus Propias Metas' },
                      { id: 'volume', label: 'Hitos del Manuscrito' },
                      { id: 'consistency', label: 'Constancia y Oficio' },
                      { id: 'worldbuilding', label: 'Universo y Lore' }
                    ]"
                    :key="cat.id"
                    type="button"
                    class="px-3.5 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer"
                    :class="
                      selectedCategory === cat.id
                        ? 'neu-btn font-semibold text-[var(--text-primary)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    "
                    @click="selectedCategory = cat.id as any"
                  >
                    {{ cat.label }}
                  </button>
                </div>

                <div class="text-sm font-mono text-[var(--text-secondary)]">
                  <span>Hitos conseguidos: </span>
                  <strong class="text-[var(--accent)] font-bold">{{ goalsStore.unlockedCount }}</strong>
                  de
                  <span class="font-semibold text-[var(--text-primary)]">
                    {{ goalsStore.totalAchievementsCount }}
                  </span>
                </div>
              </div>

              <!-- Secciones Editoriales de Logros (Máximo 2 por fila, amplias y legibles) -->
              <div
                v-for="section in achievementSections"
                :key="section.id"
                class="space-y-4"
              >
                <div class="border-b border-[var(--groove-dark)]/40 pb-2">
                  <h3 class="font-editorial text-lg font-bold text-[var(--text-primary)]">
                    {{ section.title }}
                  </h3>
                  <p class="text-sm text-[var(--text-secondary)] mt-0.5">
                    {{ section.subtitle }}
                  </p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div
                    v-for="item in section.items"
                    :key="item.key"
                    class="p-5 rounded-2xl transition-all duration-300 relative overflow-hidden flex flex-col justify-between gap-4"
                    :class="
                      isAchievementUnlocked(item.key)
                        ? 'neu-gamification-card border border-[var(--accent)]/45 shadow-md'
                        : 'neu-gamification-well border border-[var(--groove-dark)]/40'
                    "
                  >
                    <!-- Resplandor cálido si está desbloqueado -->
                    <div
                      v-if="isAchievementUnlocked(item.key)"
                      class="absolute -top-12 -right-12 w-28 h-28 rounded-full bg-amber-500/10 blur-2xl pointer-events-none"
                    ></div>

                    <div class="flex items-start gap-4 relative z-10">
                      <!-- Icono editorial grande y cálido a la izquierda -->
                      <div
                        class="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-300"
                        :class="
                          isAchievementUnlocked(item.key)
                            ? 'neu-well-sm text-[var(--accent)] shadow-inner'
                            : 'neu-surface text-[var(--text-secondary)]'
                        "
                      >
                        <component :is="getIconComponent(item.icon)" :size="26" />
                      </div>

                      <!-- Título en font-editorial text-base font-bold y Descripción en text-sm -->
                      <div class="flex-1 min-w-0 space-y-1">
                        <div class="flex items-center justify-between gap-2">
                          <span
                            class="text-xs font-mono font-semibold px-2 py-0.5 rounded-md"
                            :class="
                              isAchievementUnlocked(item.key)
                                ? item.badgeColor
                                : 'neu-surface text-[var(--text-secondary)]'
                            "
                          >
                            {{ item.categoryLabel }}
                          </span>

                          <span
                            v-if="isAchievementUnlocked(item.key)"
                            class="text-xs font-mono text-[#2E7D32] dark:text-emerald-400 font-bold flex items-center gap-1 shrink-0"
                          >
                            <Check :size="14" stroke-width="3" />
                            <span>Conseguido</span>
                          </span>
                        </div>

                        <h4
                          class="font-editorial text-base font-bold text-[var(--text-primary)] leading-snug pt-0.5"
                        >
                          {{ item.title }}
                        </h4>

                        <p class="text-sm text-[var(--text-secondary)] leading-relaxed">
                          {{ item.description }}
                        </p>
                      </div>
                    </div>

                    <!-- Pie de Tarjeta: Contexto/Fecha de Obtención o Barra de Progreso Exacta -->
                    <div
                      class="pt-3 border-t border-[var(--groove-dark)]/35 relative z-10"
                    >
                      <div
                        v-if="isAchievementUnlocked(item.key)"
                        class="flex flex-wrap items-center justify-between gap-2 text-xs font-mono"
                      >
                        <span class="text-[var(--accent)] font-semibold">
                          {{ getUnlockedRecord(item.key)?.customLabel || 'Hito editorial alcanzado' }}
                        </span>
                        <span class="text-[var(--text-secondary)]">
                          {{
                            getUnlockedDate(item.key)
                              ? `Obtenido el ${getUnlockedDate(item.key)}`
                              : 'Completado'
                          }}
                        </span>
                      </div>

                      <div v-else class="space-y-2">
                        <div
                          class="flex items-center justify-between text-xs font-mono text-[var(--text-secondary)]"
                        >
                          <span>Progreso actual</span>
                          <span class="font-bold text-[var(--text-primary)]">
                            {{ getAchievementProgress(item).current.toLocaleString('es-ES') }} /
                            {{ getAchievementProgress(item).target.toLocaleString('es-ES') }}
                            {{ getAchievementProgress(item).unitLabel }}
                            <span class="text-[var(--accent)]">
                              ({{ getAchievementProgress(item).percentage }}%)
                            </span>
                          </span>
                        </div>

                        <div class="h-2.5 w-full neu-surface rounded-full overflow-hidden p-0.5">
                          <div
                            class="h-full bg-[var(--accent)] rounded-full transition-all duration-500"
                            :style="{ width: `${getAchievementProgress(item).percentage}%` }"
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
