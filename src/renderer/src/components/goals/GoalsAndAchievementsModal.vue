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
  Check
} from 'lucide-vue-next'
import { useGoalsStore } from '../../stores/goalsStore'
import { useProjectStore } from '../../stores/projectStore'
import { useFolioStore } from '../../stores/folioStore'
import {
  ACHIEVEMENTS_CATALOG,
  type AchievementCategory,
  type AchievementItem
} from '../../utils/achievementsCatalog'

const goalsStore = useGoalsStore()
const projectStore = useProjectStore()
const folioStore = useFolioStore()

const activeTab = computed({
  get: () => goalsStore.activeModalTab,
  set: (val) => (goalsStore.activeModalTab = val)
})

const selectedCategory = ref<'all' | AchievementCategory>('all')

// Formularios locales para editar metas reactivamente
const editDailyWords = ref(500)
const editDailyScenes = ref(1)
const editDailyChapters = ref(0)
const editTargetWords = ref(50000)
const editDeadlineDate = ref<string>('')
const isSaving = ref(false)
const saveSuccess = ref(false)

function syncFormValues(): void {
  editDailyWords.value = goalsStore.config.dailyWordGoal
  editDailyScenes.value = goalsStore.config.dailySceneGoal
  editDailyChapters.value = goalsStore.config.dailyChapterGoal
  editTargetWords.value = goalsStore.config.targetTotalWords
  editDeadlineDate.value = goalsStore.config.deadlineDate || ''
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
  const deadline = new Date(editDeadlineDate.value)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diffTime = deadline.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
})

// Últimos 7 días para la línea de tiempo
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

  // Mapear historial por fecha
  const logMap = new Map<string, { words: number; goalMet: boolean }>()
  for (const log of goalsStore.recentHistory) {
    logMap.set(log.date, { words: log.wordsWritten, goalMet: log.goalMet })
  }
  // Añadir hoy
  logMap.set(goalsStore.todayLog.date, {
    words: goalsStore.todayLog.wordsWritten,
    goalMet: goalsStore.isTodayGoalMet
  })

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`

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

// Filtrado de Logros
const filteredAchievements = computed(() => {
  if (selectedCategory.value === 'all') {
    return ACHIEVEMENTS_CATALOG
  }
  return ACHIEVEMENTS_CATALOG.filter((item) => item.category === selectedCategory.value)
})

function isAchievementUnlocked(key: string): boolean {
  return goalsStore.unlockedKeys.has(key)
}

function getUnlockedDate(key: string): string | null {
  const item = goalsStore.unlockedAchievements.find((a) => a.achievementKey === key)
  if (!item) return null
  const date = new Date(item.unlockedAt)
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

function getAchievementProgress(item: AchievementItem): {
  current: number
  target: number
  percentage: number
} {
  let hasCompletedChapter = false
  for (const chap of folioStore.chapters) {
    const scenes = folioStore.getScenesForChapter(chap.id)
    if (scenes.length > 0 && scenes.every((s) => s.status === 'completed')) {
      hasCompletedChapter = true
      break
    }
  }

  return item.getProgress({
    todayLog: goalsStore.todayLog,
    config: goalsStore.config,
    totalManuscriptWords: goalsStore.totalManuscriptWords,
    currentStreak: goalsStore.currentStreak,
    chaptersCount: folioStore.chapters.length,
    hasCompletedChapter
  })
}

// Icon mapper dinámico
function getIconComponent(iconName: string): any {
  switch (iconName) {
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

// Guardar configuración
async function handleSaveGoals(): Promise<void> {
  isSaving.value = true
  saveSuccess.value = false

  try {
    await goalsStore.updateConfig({
      dailyWordGoal: Math.max(50, Number(editDailyWords.value) || 500),
      dailySceneGoal: Math.max(0, Number(editDailyScenes.value) || 1),
      dailyChapterGoal: Math.max(0, Number(editDailyChapters.value) || 0),
      targetTotalWords: Math.max(500, Number(editTargetWords.value) || 50000),
      deadlineDate: editDeadlineDate.value ? editDeadlineDate.value : null
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

// Tecla ESC para cerrar modal
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
        @click.self="goalsStore.closeGoalsModal"
      >
        <div
          class="neu-surface max-w-4xl w-full max-h-[90vh] rounded-3xl shadow-2xl border border-[var(--groove-dark)]/70 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        >
          <!-- ============================================================= -->
          <!-- CABECERA DEL MODAL: TÍTULO, SUBTÍTULO Y SELECTOR DE PESTAÑAS  -->
          <!-- ============================================================= -->
          <header
            class="px-6 md:px-8 pt-6 pb-4 border-b border-[var(--groove-dark)]/40 flex items-center justify-between gap-4 shrink-0 bg-[var(--bg-base)]"
          >
            <div class="flex items-center gap-3 min-w-0">
              <div
                class="w-10 h-10 rounded-2xl neu-well-sm flex items-center justify-center text-[var(--accent)] shrink-0 shadow-inner"
              >
                <Target :size="20" />
              </div>
              <div class="min-w-0">
                <h2
                  class="font-editorial text-xl md:text-2xl font-bold text-[var(--text-primary)] truncate tracking-tight"
                >
                  Expectativas & Logros Editoriales
                </h2>
                <p class="text-xs font-mono text-[var(--text-muted)] truncate mt-0.5">
                  {{ projectStore.activeProject?.title || 'Mi Obra Literaria' }}
                </p>
              </div>
            </div>

            <div class="flex items-center gap-3 shrink-0">
              <!-- Selector de Pestañas Táctil -->
              <div class="flex items-center p-1 rounded-xl neu-well-sm gap-1">
                <button
                  type="button"
                  class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
                  :class="
                    activeTab === 'expectations'
                      ? 'neu-btn font-semibold text-[var(--text-primary)] !shadow-sm'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  "
                  @click="activeTab = 'expectations'"
                >
                  <Compass :size="13" class="text-[var(--accent)]" />
                  <span>Expectativas & Progreso</span>
                </button>

                <button
                  type="button"
                  class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
                  :class="
                    activeTab === 'achievements'
                      ? 'neu-btn font-semibold text-[var(--text-primary)] !shadow-sm'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  "
                  @click="activeTab = 'achievements'"
                >
                  <Trophy :size="13" class="text-amber-500" />
                  <span>Vitrina de Logros</span>
                  <span
                    class="text-[10px] font-mono px-1.5 py-0.2 rounded-full neu-well-sm text-[var(--accent)] font-bold ml-0.5"
                  >
                    {{ goalsStore.unlockedCount }}
                  </span>
                </button>
              </div>

              <!-- Botón de Cerrar Modal -->
              <button
                type="button"
                class="w-8 h-8 rounded-xl neu-btn flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                title="Cerrar ventana (Esc)"
                @click="goalsStore.closeGoalsModal"
              >
                <X :size="16" />
              </button>
            </div>
          </header>

          <!-- ============================================================= -->
          <!-- CUERPO PRINCIPAL DEL MODAL (CON SCROLL EDITORIAL FLUIDO)     -->
          <!-- ============================================================= -->
          <div class="flex-1 overflow-y-auto editorial-scrollbar p-6 md:p-8 space-y-6">
            <!-- *********************************************************** -->
            <!-- PESTAÑA 1: MIS EXPECTATIVAS Y PROGRESO                     -->
            <!-- *********************************************************** -->
            <div v-if="activeTab === 'expectations'" class="space-y-6">
              <!-- TARJETA SUPERIOR: META GLOBAL DEL LIBRO -->
              <div
                class="neu-well p-6 md:p-7 rounded-2xl relative overflow-hidden border border-[var(--groove-dark)]/30"
              >
                <!-- Resplandor ambiental de fondo -->
                <div
                  class="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-[var(--accent)]/10 blur-3xl pointer-events-none"
                ></div>

                <div class="relative z-10 space-y-5">
                  <div
                    class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--groove-dark)]/40 pb-4"
                  >
                    <div>
                      <div class="flex items-center gap-2">
                        <span
                          class="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full neu-well-sm text-[var(--accent)] font-semibold"
                        >
                          Hito Global del Libro
                        </span>
                        <span
                          v-if="goalsStore.totalManuscriptWords >= editTargetWords"
                          class="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        >
                          ¡OBRA COMPLETADA! 🎉
                        </span>
                      </div>
                      <h3
                        class="font-editorial text-2xl md:text-3xl font-bold text-[var(--text-primary)] mt-1.5"
                      >
                        {{ goalsStore.totalManuscriptWords.toLocaleString() }}
                        <span class="text-sm font-normal text-[var(--text-muted)] font-mono">
                          / {{ editTargetWords.toLocaleString() }} palabras totales
                        </span>
                      </h3>
                    </div>

                    <!-- Porcentaje Circular / Badge Grande -->
                    <div class="flex items-center gap-3">
                      <div
                        class="neu-btn px-4 py-2 text-right flex flex-col items-end justify-center rounded-xl"
                      >
                        <span class="text-xs text-[var(--text-muted)] font-mono">Avance global</span>
                        <span
                          class="font-mono text-xl font-bold text-[var(--accent)] leading-tight"
                        >
                          {{ goalsStore.totalManuscriptPercentage }}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- Gran barra de progreso de volumen -->
                  <div class="space-y-1.5">
                    <div
                      class="h-3.5 w-full neu-well-sm rounded-full overflow-hidden p-0.5 border border-[var(--groove-dark)]/30"
                    >
                      <div
                        class="h-full rounded-full transition-all duration-700 ease-out"
                        :class="
                          goalsStore.totalManuscriptPercentage >= 100
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-sm'
                            : 'bg-gradient-to-r from-[#D6633A] to-[#B84E28] shadow-sm'
                        "
                        :style="{ width: `${goalsStore.totalManuscriptPercentage}%` }"
                      ></div>
                    </div>
                  </div>

                  <!-- Métricas de Ritmo y Estimación -->
                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div class="neu-btn p-3 rounded-xl flex items-center gap-3">
                      <div
                        class="w-8 h-8 rounded-lg neu-well-sm flex items-center justify-center text-[var(--accent)] shrink-0"
                      >
                        <TrendingUp :size="15" />
                      </div>
                      <div class="min-w-0">
                        <div class="text-[10px] font-mono text-[var(--text-muted)] uppercase">
                          Palabras Restantes
                        </div>
                        <div class="text-xs font-bold font-mono text-[var(--text-primary)] truncate">
                          {{ remainingWords > 0 ? remainingWords.toLocaleString() : '¡Meta alcanzada!' }}
                        </div>
                      </div>
                    </div>

                    <div class="neu-btn p-3 rounded-xl flex items-center gap-3">
                      <div
                        class="w-8 h-8 rounded-lg neu-well-sm flex items-center justify-center text-amber-500 shrink-0"
                      >
                        <Clock :size="15" />
                      </div>
                      <div class="min-w-0">
                        <div class="text-[10px] font-mono text-[var(--text-muted)] uppercase">
                          Tiempo Estimado
                        </div>
                        <div class="text-xs font-bold font-mono text-[var(--text-primary)] truncate">
                          {{ estimatedDaysLeft > 0 ? `~${estimatedDaysLeft} días de ritmo` : 'Objetivo superado' }}
                        </div>
                      </div>
                    </div>

                    <div class="neu-btn p-3 rounded-xl flex items-center gap-3">
                      <div
                        class="w-8 h-8 rounded-lg neu-well-sm flex items-center justify-center text-blue-500 shrink-0"
                      >
                        <Calendar :size="15" />
                      </div>
                      <div class="min-w-0">
                        <div class="text-[10px] font-mono text-[var(--text-muted)] uppercase">
                          Fecha Límite
                        </div>
                        <div class="text-xs font-bold font-mono text-[var(--text-primary)] truncate">
                          <template v-if="daysUntilDeadline !== null">
                            {{ daysUntilDeadline >= 0 ? `Quedan ${daysUntilDeadline} días` : 'Fecha vencida' }}
                          </template>
                          <template v-else>Sin límite fijado</template>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- LÍNEA DE TIEMPO / ÚLTIMOS 7 DÍAS -->
              <div class="neu-surface p-5 rounded-2xl border border-[var(--groove-dark)]/40 space-y-3">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <Flame :size="16" class="text-orange-500" />
                    <span class="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] font-mono">
                      Racha & Constancia de los Últimos 7 Días
                    </span>
                  </div>
                  <div
                    v-if="goalsStore.currentStreak > 0"
                    class="text-xs font-mono font-bold text-orange-500 flex items-center gap-1"
                  >
                    <span>Racha activa: {{ goalsStore.currentStreak }} días consecutivos</span>
                  </div>
                </div>

                <div class="grid grid-cols-7 gap-2 pt-1">
                  <div
                    v-for="d in last7Days"
                    :key="d.dateStr"
                    class="p-2.5 rounded-xl text-center flex flex-col items-center gap-1 transition-all"
                    :class="[
                      d.isToday ? 'neu-well border border-[var(--accent)]/40' : 'neu-btn',
                      d.goalMet ? '!border-emerald-500/40 bg-emerald-500/5' : ''
                    ]"
                  >
                    <span class="text-[10px] font-mono text-[var(--text-muted)] uppercase">
                      {{ d.dayName }}
                    </span>
                    <span class="text-xs font-bold text-[var(--text-primary)] font-mono">
                      {{ d.dayNumber }}
                    </span>

                    <div class="my-1">
                      <div
                        v-if="d.goalMet"
                        class="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center neu-well-sm"
                        title="Meta cumplida este día"
                      >
                        <Check :size="12" stroke-width="3" />
                      </div>
                      <div
                        v-else-if="d.words > 0"
                        class="w-6 h-6 rounded-full neu-well-sm text-[var(--accent)] flex items-center justify-center text-[10px] font-mono font-bold"
                        title="Escribiste palabras este día"
                      >
                        {{ d.words > 999 ? `${Math.round(d.words / 1000)}k` : d.words }}
                      </div>
                      <div
                        v-else
                        class="w-6 h-6 rounded-full neu-well-sm text-[var(--text-muted)]/40 flex items-center justify-center text-[11px]"
                      >
                        ·
                      </div>
                    </div>

                    <span
                      class="text-[9px] font-mono truncate w-full"
                      :class="d.goalMet ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-[var(--text-muted)]'"
                    >
                      {{ d.words }} pal.
                    </span>
                  </div>
                </div>
              </div>

              <!-- CONTROLES DE CONFIGURACIÓN DE METAS (INPUTS + CHIPS RÁPIDOS) -->
              <div class="neu-surface p-6 rounded-2xl border border-[var(--groove-dark)]/40 space-y-6">
                <div class="flex items-center justify-between border-b border-[var(--groove-dark)]/40 pb-3">
                  <div class="flex items-center gap-2">
                    <Target :size="16" class="text-[var(--accent)]" />
                    <h4 class="font-editorial text-lg font-bold text-[var(--text-primary)]">
                      Ajustar Expectativas del Autor
                    </h4>
                  </div>

                  <button
                    type="button"
                    class="neu-btn-terracotta px-4 py-2 text-xs flex items-center gap-2 font-medium"
                    :disabled="isSaving"
                    @click="handleSaveGoals"
                  >
                    <Check v-if="saveSuccess" :size="13" class="text-white animate-bounce" />
                    <Save v-else :size="13" />
                    <span>{{ saveSuccess ? '¡Guardado con éxito!' : isSaving ? 'Guardando...' : 'Guardar Expectativas' }}</span>
                  </button>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <!-- Meta Diaria de Palabras -->
                  <div class="space-y-2.5">
                    <label class="text-xs font-semibold text-[var(--text-primary)] flex items-center justify-between">
                      <span>Meta de palabras por día:</span>
                      <span class="font-mono text-[var(--accent)]">{{ editDailyWords.toLocaleString() }} pal.</span>
                    </label>

                    <div class="flex items-center gap-2">
                      <input
                        v-model.number="editDailyWords"
                        type="number"
                        min="50"
                        step="50"
                        class="w-32 neu-well px-3 py-2 text-sm font-mono text-[var(--text-primary)] bg-transparent border-none focus:outline-none"
                      />
                      <div class="flex items-center gap-1.5 flex-wrap">
                        <button
                          v-for="preset in [250, 500, 1000, 2000]"
                          :key="preset"
                          type="button"
                          class="px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer"
                          :class="
                            editDailyWords === preset
                              ? 'neu-well font-bold text-[var(--accent)]'
                              : 'neu-btn text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                          "
                          @click="editDailyWords = preset"
                        >
                          {{ preset }}
                        </button>
                      </div>
                    </div>
                  </div>

                  <!-- Meta Global de Palabras de la Obra -->
                  <div class="space-y-2.5">
                    <label class="text-xs font-semibold text-[var(--text-primary)] flex items-center justify-between">
                      <span>Meta global de la obra:</span>
                      <span class="font-mono text-[var(--accent)]">{{ editTargetWords.toLocaleString() }} pal.</span>
                    </label>

                    <div class="flex items-center gap-2">
                      <input
                        v-model.number="editTargetWords"
                        type="number"
                        min="500"
                        step="1000"
                        class="w-32 neu-well px-3 py-2 text-sm font-mono text-[var(--text-primary)] bg-transparent border-none focus:outline-none"
                      />
                      <div class="flex items-center gap-1.5 flex-wrap">
                        <button
                          v-for="preset in [
                            { label: '15k Relato', val: 15000 },
                            { label: '50k Novela', val: 50000 },
                            { label: '90k Extensa', val: 90000 }
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

                  <!-- Meta Diaria de Escenas -->
                  <div class="space-y-2.5">
                    <label class="text-xs font-semibold text-[var(--text-primary)] flex items-center justify-between">
                      <span>Meta diaria de escenas nuevas o finalizadas:</span>
                      <span class="font-mono text-[var(--accent)]">{{ editDailyScenes }} escena(s)</span>
                    </label>

                    <div class="flex items-center gap-2">
                      <input
                        v-model.number="editDailyScenes"
                        type="number"
                        min="1"
                        max="20"
                        class="w-20 neu-well px-3 py-2 text-sm font-mono text-[var(--text-primary)] bg-transparent border-none focus:outline-none"
                      />
                      <div class="flex items-center gap-1.5">
                        <button
                          v-for="sPreset in [1, 2, 3, 5]"
                          :key="sPreset"
                          type="button"
                          class="px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer"
                          :class="
                            editDailyScenes === sPreset
                              ? 'neu-well font-bold text-[var(--accent)]'
                              : 'neu-btn text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                          "
                          @click="editDailyScenes = sPreset"
                        >
                          {{ sPreset }}
                        </button>
                      </div>
                    </div>
                  </div>

                  <!-- Fecha Límite Opcional -->
                  <div class="space-y-2.5">
                    <label class="text-xs font-semibold text-[var(--text-primary)] flex items-center justify-between">
                      <span>Fecha límite de entrega u objetivo (Opcional):</span>
                    </label>

                    <div class="flex items-center gap-2">
                      <input
                        v-model="editDeadlineDate"
                        type="date"
                        class="neu-well px-3 py-2 text-xs font-mono text-[var(--text-primary)] bg-transparent border-none focus:outline-none w-48"
                      />
                      <button
                        v-if="editDeadlineDate"
                        type="button"
                        class="text-xs text-[var(--text-muted)] hover:text-rose-400 font-mono underline cursor-pointer"
                        @click="editDeadlineDate = ''"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- *********************************************************** -->
            <!-- PESTAÑA 2: VITRINA DE LOGROS (INSIGNIAS EDITORIALES)        -->
            <!-- *********************************************************** -->
            <div v-else-if="activeTab === 'achievements'" class="space-y-6">
              <!-- Filtros de Categoría -->
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div class="flex flex-wrap items-center gap-1.5 p-1 rounded-xl neu-well-sm">
                  <button
                    v-for="cat in [
                      { id: 'all', label: 'Todos los Logros' },
                      { id: 'daily', label: 'Metas Diarias' },
                      { id: 'volume', label: 'Volumen de Obra' },
                      { id: 'consistency', label: 'Constancia y Estructura' }
                    ]"
                    :key="cat.id"
                    type="button"
                    class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer"
                    :class="
                      selectedCategory === cat.id
                        ? 'neu-btn font-semibold text-[var(--text-primary)]'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    "
                    @click="selectedCategory = cat.id as any"
                  >
                    {{ cat.label }}
                  </button>
                </div>

                <div class="text-xs font-mono text-[var(--text-muted)]">
                  <span>Desbloqueados: </span>
                  <strong class="text-[var(--accent)]">{{ goalsStore.unlockedCount }}</strong> de
                  <span>{{ goalsStore.totalAchievementsCount }}</span>
                </div>
              </div>

              <!-- Cuadrícula de Tarjetas de Logros -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  v-for="item in filteredAchievements"
                  :key="item.key"
                  class="p-4 rounded-2xl transition-all duration-300 relative overflow-hidden flex flex-col justify-between"
                  :class="[
                    isAchievementUnlocked(item.key)
                      ? 'neu-btn border border-[var(--groove-light)]/80 shadow-md'
                      : 'neu-well border border-[var(--groove-dark)]/40 opacity-70 hover:opacity-90'
                  ]"
                >
                  <!-- Brillo en la esquina si está desbloqueado -->
                  <div
                    v-if="isAchievementUnlocked(item.key)"
                    class="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-amber-400/10 blur-xl pointer-events-none"
                  ></div>

                  <div class="flex items-start gap-3.5">
                    <!-- Icono del Logro -->
                    <div
                      class="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300"
                      :class="[
                        isAchievementUnlocked(item.key)
                          ? 'neu-well-sm text-amber-500 scale-105 shadow-inner'
                          : 'neu-well text-[var(--text-muted)]/50 grayscale'
                      ]"
                    >
                      <component :is="getIconComponent(item.icon)" :size="24" />
                    </div>

                    <!-- Texto y Descripción -->
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center justify-between gap-2">
                        <span
                          class="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.2 rounded"
                          :class="isAchievementUnlocked(item.key) ? item.badgeColor : 'neu-well-sm text-[var(--text-muted)]'"
                        >
                          {{ item.categoryLabel }}
                        </span>
                        <span
                          v-if="isAchievementUnlocked(item.key)"
                          class="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1"
                        >
                          <Check :size="11" stroke-width="3" />
                          <span>Obtenido</span>
                        </span>
                      </div>

                      <h4
                        class="font-editorial text-base font-bold text-[var(--text-primary)] mt-1 leading-snug"
                        :class="{ 'text-[var(--text-muted)]': !isAchievementUnlocked(item.key) }"
                      >
                        {{ item.title }}
                      </h4>
                      <p class="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                        {{ item.description }}
                      </p>
                    </div>
                  </div>

                  <!-- Pie de Tarjeta: Fecha de Desbloqueo o Barra de Progreso Hacia el Hito -->
                  <div class="mt-4 pt-3 border-t border-[var(--groove-dark)]/40">
                    <div
                      v-if="isAchievementUnlocked(item.key)"
                      class="flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)]"
                    >
                      <span>Completado</span>
                      <span>{{ getUnlockedDate(item.key) ? `Desbloqueado el ${getUnlockedDate(item.key)}` : 'Hito superado' }}</span>
                    </div>

                    <div v-else class="space-y-1.5">
                      <div class="flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)]">
                        <span>Progreso hacia el hito</span>
                        <span class="font-bold text-[var(--accent)]">
                          {{ getAchievementProgress(item).current.toLocaleString() }} / {{ getAchievementProgress(item).target.toLocaleString() }}
                          ({{ getAchievementProgress(item).percentage }}%)
                        </span>
                      </div>
                      <div class="h-2 w-full neu-well-sm rounded-full overflow-hidden p-0.2">
                        <div
                          class="h-full bg-[var(--accent)] rounded-full transition-all duration-300"
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
    </Transition>
  </Teleport>
</template>
