import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  ProjectGoals,
  DailyWritingLog,
  UnlockedAchievement,
  GoalsSummary,
  RecordProgressPayload,
  ActiveSessionGoal,
  SessionGoalType
} from '@shared/types'
import { ACHIEVEMENTS_CATALOG } from '../utils/achievementsCatalog'
import { useFolioStore } from './folioStore'
import { useLoreStore } from './loreStore'
import { useRulesStore } from './rulesStore'
import { useScratchpadStore } from './scratchpadStore'

export interface ToastNotification {
  id: string
  title: string
  description: string
  icon: string
  badgeColor: string
  type: 'achievement' | 'goal' | 'session'
}

export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const useGoalsStore = defineStore('goals', () => {
  const activeProjectId = ref<string | null>(null)
  const isLoading = ref(false)

  const config = ref<ProjectGoals>({
    projectId: '',
    targetTotalWords: 50000,
    dailyWordGoal: 500,
    dailyChapterGoal: 0,
    deadlineDate: null,
    askSessionGoalOnStartup: true,
    updatedAt: new Date()
  })

  const todayLog = ref<DailyWritingLog>({
    id: 0,
    projectId: '',
    date: getLocalDateString(),
    wordsWritten: 0,
    chaptersCompleted: 0,
    sessionGoalsHit: 0,
    goalMet: false
  })

  const recentHistory = ref<DailyWritingLog[]>([])
  const unlockedAchievements = ref<UnlockedAchievement[]>([])
  const dbTotalManuscriptWords = ref<number>(0)
  const currentStreak = ref<number>(0)

  // =========================================================================
  // ESTADO DE META DE SESIÓN ACTIVA ("RITUAL DE INICIO")
  // =========================================================================
  const hasPromptedThisSession = ref(false)
  const promptedProjectsInSession = ref<Set<string>>(new Set())
  const isSessionPromptOpen = ref(false)
  const activeSessionGoal = ref<ActiveSessionGoal | null>(null)
  const sessionGoalBaselineWords = ref(0)

  // Control de palabras de sesión ya persistidas en SQLite para sincronía exacta
  const persistedSessionWords = ref(0)

  // Modal Principal y Cola de Toasts Celebratorios No Intrusivos
  const isGoalsModalOpen = ref(false)
  const activeModalTab = ref<'expectations' | 'achievements'>('expectations')
  const activeToast = ref<ToastNotification | null>(null)
  const toastQueue = ref<ToastNotification[]>([])
  let toastTimer: ReturnType<typeof setTimeout> | null = null

  // =========================================================================
  // COMPUTED PROPERTIES (SINCRONIZADAS EN TIEMPO REAL)
  // =========================================================================

  // Fuente única de verdad para el volumen total del manuscrito (excluyendo papelera)
  const totalManuscriptWords = computed<number>(() => {
    const folioStore = useFolioStore()
    if (folioStore.folios.length > 0 || !isLoading.value) {
      return folioStore.totalManuscriptWords
    }
    return dbTotalManuscriptWords.value
  })

  // Palabras escritas hoy en tiempo real (incluyendo las teclas aún en debounce)
  const liveTodayWords = computed<number>(() => {
    const folioStore = useFolioStore()
    const unpersistedDelta = folioStore.sessionWordsAdded - persistedSessionWords.value
    return Math.max(0, todayLog.value.wordsWritten + unpersistedDelta)
  })

  const unlockedKeys = computed(() => {
    return new Set(unlockedAchievements.value.map((a) => a.achievementKey))
  })

  const todayWordPercentage = computed(() => {
    const target = Math.max(1, config.value.dailyWordGoal)
    return Math.min(100, Math.round((liveTodayWords.value / target) * 100))
  })

  const todayWordExactPercentage = computed(() => {
    const target = Math.max(1, config.value.dailyWordGoal)
    return Math.round((liveTodayWords.value / target) * 100)
  })

  const totalManuscriptPercentage = computed(() => {
    const target = Math.max(1, config.value.targetTotalWords)
    return Math.min(100, Math.round((totalManuscriptWords.value / target) * 100))
  })

  const totalManuscriptExactPercentage = computed(() => {
    const target = Math.max(1, config.value.targetTotalWords)
    return Math.round((totalManuscriptWords.value / target) * 100)
  })

  const isTodayGoalMet = computed(() => {
    if (todayLog.value.sessionGoalsHit > 0) return true
    if (
      activeSessionGoal.value &&
      activeSessionGoal.value.type !== 'free' &&
      activeSessionGoal.value.completed
    ) {
      return true
    }
    if (config.value.dailyWordGoal > 0 && liveTodayWords.value >= config.value.dailyWordGoal) {
      return true
    }
    if (
      config.value.dailyChapterGoal > 0 &&
      todayLog.value.chaptersCompleted >= config.value.dailyChapterGoal
    ) {
      return true
    }
    return false
  })

  // Progreso de la Meta de Sesión Activa
  const sessionGoalPercentage = computed(() => {
    if (!activeSessionGoal.value || activeSessionGoal.value.type === 'free') return 0
    const target = Math.max(1, activeSessionGoal.value.target)
    return Math.min(100, Math.round((activeSessionGoal.value.current / target) * 100))
  })

  const sessionGoalExactPercentage = computed(() => {
    if (!activeSessionGoal.value || activeSessionGoal.value.type === 'free') return 0
    const target = Math.max(1, activeSessionGoal.value.target)
    return Math.round((activeSessionGoal.value.current / target) * 100)
  })

  const unlockedCount = computed(() => unlockedAchievements.value.length)
  const totalAchievementsCount = computed(() => ACHIEVEMENTS_CATALOG.length)

  // =========================================================================
  // COLA DE NOTIFICACIONES CELEBRATORIAS NO INTRUSIVAS
  // =========================================================================
  function processNextToast(): void {
    if (activeToast.value || toastQueue.value.length === 0) return

    const next = toastQueue.value.shift()!
    activeToast.value = next

    toastTimer = setTimeout(() => {
      activeToast.value = null
      toastTimer = null
      if (toastQueue.value.length > 0) {
        setTimeout(() => processNextToast(), 220)
      }
    }, 4500)
  }

  function showToast(toast: Omit<ToastNotification, 'id'>): void {
    // Evitar duplicar el mismo título si ya está activo o en cola
    if (
      activeToast.value?.title === toast.title ||
      toastQueue.value.some((t) => t.title === toast.title)
    ) {
      return
    }

    const item: ToastNotification = {
      ...toast,
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
    }

    toastQueue.value.push(item)
    processNextToast()
  }

  function dismissToast(): void {
    if (toastTimer) {
      clearTimeout(toastTimer)
      toastTimer = null
    }
    activeToast.value = null
    if (toastQueue.value.length > 0) {
      setTimeout(() => processNextToast(), 180)
    }
  }

  // =========================================================================
  // RECÁLCULO LOCAL DE RACHA E HISTORIAL EN TIEMPO REAL
  // =========================================================================
  function syncRecentHistoryAndStreak(): void {
    const todayStr = getLocalDateString()
    const effectiveTodayLog: DailyWritingLog = {
      ...todayLog.value,
      date: todayStr,
      wordsWritten: liveTodayWords.value,
      goalMet: isTodayGoalMet.value
    }

    const idx = recentHistory.value.findIndex((l) => l.date === todayStr)
    if (idx !== -1) {
      recentHistory.value[idx] = effectiveTodayLog
    } else {
      recentHistory.value.unshift(effectiveTodayLog)
    }

    // Calcular racha igual que el backend
    const logMap = new Map<string, boolean>()
    for (const log of recentHistory.value) {
      if (log.goalMet) {
        logMap.set(log.date, true)
      }
    }
    if (effectiveTodayLog.goalMet) {
      logMap.set(todayStr, true)
    }

    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = getLocalDateString(yesterday)

    let checkDate: Date
    if (logMap.get(todayStr)) {
      checkDate = new Date(today)
    } else if (logMap.get(yesterdayStr)) {
      checkDate = new Date(yesterday)
    } else {
      currentStreak.value = 0
      return
    }

    let streak = 0
    while (true) {
      const dStr = getLocalDateString(checkDate)
      if (logMap.get(dStr)) {
        streak++
        checkDate.setDate(checkDate.getDate() - 1)
      } else {
        break
      }
    }
    currentStreak.value = streak
  }

  // =========================================================================
  // GESTIÓN DE META DE SESIÓN ("RITUAL DE INICIO")
  // =========================================================================
  function setSessionGoal(type: SessionGoalType, target = 0): void {
    const folioStore = useFolioStore()
    hasPromptedThisSession.value = true
    if (activeProjectId.value) {
      promptedProjectsInSession.value.add(activeProjectId.value)
    }

    if (type === 'free') {
      activeSessionGoal.value = {
        type: 'free',
        target: 0,
        current: 0,
        completed: false
      }
      isSessionPromptOpen.value = false
      return
    }

    const cleanTarget = Math.max(1, Math.round(target))
    sessionGoalBaselineWords.value = folioStore.sessionWordsAdded

    activeSessionGoal.value = {
      type,
      target: cleanTarget,
      current: 0,
      completed: false
    }
    isSessionPromptOpen.value = false
  }

  function clearSessionGoal(): void {
    activeSessionGoal.value = null
  }

  function openSessionPrompt(): void {
    isSessionPromptOpen.value = true
  }

  function closeSessionPrompt(): void {
    hasPromptedThisSession.value = true
    if (activeProjectId.value) {
      promptedProjectsInSession.value.add(activeProjectId.value)
    }
    isSessionPromptOpen.value = false
  }

  async function completeActiveSessionGoal(): Promise<void> {
    if (!activeSessionGoal.value || activeSessionGoal.value.type === 'free') return
    if (activeSessionGoal.value.completed) return

    activeSessionGoal.value.completed = true

    const { type, target } = activeSessionGoal.value
    const unitText =
      type === 'words'
        ? `${target.toLocaleString('es-ES')} palabras`
        : `${target} ${target === 1 ? 'capítulo' : 'capítulos'}`

    showToast({
      title: '✨ Meta de Sesión Cumplida',
      description: `Has alcanzado ${type === 'words' ? 'las' : 'el objetivo de'} ${unitText} que te propusiste hoy. ¡Gran trabajo!`,
      icon: 'Sparkles',
      badgeColor: 'text-[#C85A32] bg-[#C85A32]/15 border-[#C85A32]/35',
      type: 'session'
    })

    await recordProgress({ sessionGoalHitDelta: 1 })
  }

  // Invocado en tiempo real desde folioStore al teclear palabras
  function syncLiveSessionWords(totalSessionWords: number): void {
    if (activeSessionGoal.value && activeSessionGoal.value.type === 'words') {
      const progressWords = Math.max(0, totalSessionWords - sessionGoalBaselineWords.value)
      activeSessionGoal.value.current = progressWords

      if (progressWords >= activeSessionGoal.value.target && !activeSessionGoal.value.completed) {
        completeActiveSessionGoal()
      }
    }
    syncRecentHistoryAndStreak()
  }

  // =========================================================================
  // MOTOR EVALUADOR DE LOGROS
  // =========================================================================
  function getEvaluationContext() {
    const folioStore = useFolioStore()
    const loreStore = useLoreStore()
    const rulesStore = useRulesStore()
    const scratchpadStore = useScratchpadStore()

    let completedChaptersCount = 0

    for (const chap of folioStore.chapters) {
      if (chap.status === 'done') {
        completedChaptersCount++
      }
    }

    const activeDaysCount = recentHistory.value.filter(
      (l) => l.wordsWritten > 0 || l.chaptersCompleted > 0 || l.goalMet
    ).length

    return {
      todayLog: {
        ...todayLog.value,
        wordsWritten: liveTodayWords.value,
        goalMet: isTodayGoalMet.value
      },
      config: config.value,
      activeSessionGoal: activeSessionGoal.value,
      totalManuscriptWords: totalManuscriptWords.value,
      currentStreak: currentStreak.value,
      activeDaysCount,
      chaptersCount: folioStore.chapters.length,
      completedChaptersCount,
      hasCompletedChapter: completedChaptersCount > 0,
      loreCount: loreStore.items.length,
      rulesCount: rulesStore.rules.length,
      scratchpadCount: scratchpadStore.notes.length
    }
  }

  async function checkAchievements(): Promise<void> {
    if (!activeProjectId.value) return

    syncRecentHistoryAndStreak()
    const evaluationContext = getEvaluationContext()

    for (const item of ACHIEVEMENTS_CATALOG) {
      if (!unlockedKeys.value.has(item.key)) {
        if (item.check(evaluationContext)) {
          try {
            const customLabel = item.getCustomLabel ? item.getCustomLabel(evaluationContext) : null
            const unlocked = await window.api.goals.unlockAchievement(
              activeProjectId.value,
              item.key,
              customLabel
            )
            if (unlocked) {
              unlockedAchievements.value.unshift(unlocked)
              showToast({
                title: `¡Logro Editorial! «${item.title}»`,
                description: unlocked.customLabel || item.description,
                icon: item.icon,
                badgeColor: item.badgeColor,
                type: 'achievement'
              })
            }
          } catch (err) {
            console.error('[GoalsStore] Error al desbloquear logro:', item.key, err)
          }
        }
      }
    }
  }

  // =========================================================================
  // ACCIONES PRINCIPALES (IPC + ESTADO)
  // =========================================================================
  async function fetchGoals(projectId: string): Promise<GoalsSummary | null> {
    if (!projectId) return null

    try {
      isLoading.value = true
      const isSwitchingProject = activeProjectId.value !== projectId
      activeProjectId.value = projectId

      if (isSwitchingProject) {
        const folioStore = useFolioStore()
        persistedSessionWords.value = folioStore.sessionWordsAdded
        activeSessionGoal.value = null
      }

      const summary = await window.api.goals.getSummary(projectId)
      config.value = summary.config
      todayLog.value = summary.todayLog
      recentHistory.value = summary.recentHistory
      unlockedAchievements.value = summary.unlockedAchievements
      dbTotalManuscriptWords.value = summary.totalManuscriptWords
      currentStreak.value = summary.currentStreak

      syncRecentHistoryAndStreak()
      await checkAchievements()

      // Mostrar sugerencia de Meta de Sesión al abrir si no se ha desactivado
      const skipFromStorage = localStorage.getItem('folio:skipSessionGoalPrompt') === 'true'
      const alreadyPromptedForProject = promptedProjectsInSession.value.has(projectId)
      if (
        config.value.askSessionGoalOnStartup &&
        !skipFromStorage &&
        !alreadyPromptedForProject &&
        !hasPromptedThisSession.value
      ) {
        hasPromptedThisSession.value = true
        promptedProjectsInSession.value.add(projectId)
        isSessionPromptOpen.value = true
      }

      return summary
    } catch (err) {
      console.error('[GoalsStore] Error al cargar metas del proyecto:', err)
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function updateConfig(partial: Partial<ProjectGoals>): Promise<ProjectGoals | null> {
    if (!activeProjectId.value) return null

    try {
      const updated = await window.api.goals.updateConfig(activeProjectId.value, partial)
      config.value = updated

      if (partial.askSessionGoalOnStartup !== undefined) {
        if (partial.askSessionGoalOnStartup) {
          localStorage.removeItem('folio:skipSessionGoalPrompt')
        } else {
          localStorage.setItem('folio:skipSessionGoalPrompt', 'true')
        }
      }

      syncRecentHistoryAndStreak()
      await checkAchievements()
      return updated
    } catch (err) {
      console.error('[GoalsStore] Error al actualizar configuración de metas:', err)
      return null
    }
  }

  async function recordProgress(payload: RecordProgressPayload): Promise<void> {
    if (!activeProjectId.value) return

    const wasDailyWordGoalMet =
      config.value.dailyWordGoal > 0 && todayLog.value.wordsWritten >= config.value.dailyWordGoal

    try {
      const updatedLog = await window.api.goals.recordProgress(activeProjectId.value, payload)
      todayLog.value = updatedLog

      // Actualizar progreso de Meta de Sesión si es de capítulos
      if (activeSessionGoal.value && !activeSessionGoal.value.completed) {
        if (
          activeSessionGoal.value.type === 'chapters' &&
          payload.chapterDelta &&
          payload.chapterDelta > 0
        ) {
          activeSessionGoal.value.current += payload.chapterDelta
          if (activeSessionGoal.value.current >= activeSessionGoal.value.target) {
            await completeActiveSessionGoal()
          }
        }
      }

      const isNowDailyWordGoalMet =
        config.value.dailyWordGoal > 0 && updatedLog.wordsWritten >= config.value.dailyWordGoal

      if (!wasDailyWordGoalMet && isNowDailyWordGoalMet) {
        showToast({
          title: '¡Expectativa Diaria Cumplida! 🎉',
          description: `Has alcanzado tu hábito diario de ${config.value.dailyWordGoal.toLocaleString('es-ES')} palabras hoy.`,
          icon: 'CheckCircle',
          badgeColor:
            'text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 border-emerald-500/35',
          type: 'goal'
        })
      }

      syncRecentHistoryAndStreak()
      await checkAchievements()
    } catch (err) {
      console.error('[GoalsStore] Error al registrar progreso:', err)
    }
  }

  // Sincroniza el delta de palabras de sesión con SQLite (llamado desde flushSave)
  async function flushSessionWordsToDb(): Promise<void> {
    if (!activeProjectId.value) return
    const folioStore = useFolioStore()
    const delta = folioStore.sessionWordsAdded - persistedSessionWords.value
    if (delta !== 0) {
      persistedSessionWords.value = folioStore.sessionWordsAdded
      await recordProgress({ wordDelta: delta })
    }
  }

  // Controles de Modal Principal
  function openGoalsModal(tab: 'expectations' | 'achievements' = 'expectations'): void {
    activeModalTab.value = tab
    isGoalsModalOpen.value = true
  }

  function closeGoalsModal(): void {
    isGoalsModalOpen.value = false
  }

  function toggleGoalsModal(): void {
    isGoalsModalOpen.value = !isGoalsModalOpen.value
  }

  return {
    activeProjectId,
    isLoading,
    config,
    todayLog,
    liveTodayWords,
    recentHistory,
    unlockedAchievements,
    totalManuscriptWords,
    currentStreak,
    hasPromptedThisSession,
    isSessionPromptOpen,
    activeSessionGoal,
    sessionGoalPercentage,
    sessionGoalExactPercentage,
    isGoalsModalOpen,
    activeModalTab,
    activeToast,
    toastQueue,
    unlockedKeys,
    todayWordPercentage,
    todayWordExactPercentage,
    totalManuscriptPercentage,
    totalManuscriptExactPercentage,
    isTodayGoalMet,
    unlockedCount,
    totalAchievementsCount,
    getEvaluationContext,
    setSessionGoal,
    clearSessionGoal,
    openSessionPrompt,
    closeSessionPrompt,
    syncLiveSessionWords,
    flushSessionWordsToDb,
    showToast,
    dismissToast,
    checkAchievements,
    fetchGoals,
    updateConfig,
    recordProgress,
    openGoalsModal,
    closeGoalsModal,
    toggleGoalsModal
  }
})
