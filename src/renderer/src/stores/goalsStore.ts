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
import {
  ACHIEVEMENTS_CATALOG,
  checkAchievementUnlocked,
  type AchievementEvaluationContext
} from '../utils/achievementsCatalog'
import { useFolioStore } from './folioStore'
import { useProjectStore } from './projectStore'

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

  // Configuración de Meta: Única meta configurable = "Cantidad de palabras por sesión" (min 500)
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

  // Meta de sesión activa ("Ritual de Inicio")
  const hasPromptedThisSession = ref(false)
  const promptedProjectsInSession = ref<Set<string>>(new Set())
  const isSessionPromptOpen = ref(false)
  const activeSessionGoal = ref<ActiveSessionGoal | null>(null)
  const sessionGoalBaselineWords = ref(0)
  const isFreeWritingSession = ref(false)
  const persistedSessionWords = ref(0)

  // Modales y Toasts
  const isGoalsModalOpen = ref(false)
  const activeModalTab = ref<'expectations' | 'achievements'>('expectations')
  const activeToast = ref<ToastNotification | null>(null)
  const toastQueue = ref<ToastNotification[]>([])
  let toastTimer: ReturnType<typeof setTimeout> | null = null

  // =========================================================================
  // COMPUTED PROPERTIES
  // =========================================================================
  const totalManuscriptWords = computed<number>(() => {
    const folioStore = useFolioStore()
    if (folioStore.folios.length > 0 || !isLoading.value) {
      return folioStore.totalManuscriptWords
    }
    return dbTotalManuscriptWords.value
  })

  const liveTodayWords = computed<number>(() => {
    const folioStore = useFolioStore()
    const unpersistedDelta = folioStore.sessionWordsAdded - persistedSessionWords.value
    return Math.max(0, todayLog.value.wordsWritten + unpersistedDelta)
  })

  const unlockedKeys = computed(() => {
    return new Set(unlockedAchievements.value.map((a) => a.achievementKey))
  })

  // Total histórico de metas de sesión cumplidas
  const totalSessionGoalsHit = computed<number>(() => {
    const fromHistory = recentHistory.value.reduce((acc, l) => acc + (l.sessionGoalsHit || 0), 0)
    // Asegurar que si el día de hoy tiene conteo esté reflejado
    return Math.max(fromHistory, todayLog.value.sessionGoalsHit)
  })

  // Meta de palabras por sesión actual (mínimo 500)
  const sessionWordTarget = computed<number>(() => {
    return Math.max(500, config.value.dailyWordGoal || 500)
  })

  // Progreso en palabras escritas en la sesión actual hacia la meta
  const sessionProgressWords = computed<number>(() => {
    if (!isFreeWritingSession.value && activeSessionGoal.value && activeSessionGoal.value.type === 'words') {
      return activeSessionGoal.value.current
    }
    const folioStore = useFolioStore()
    return Math.max(0, folioStore.sessionWordsAdded)
  })

  const sessionProgressPercentage = computed<number>(() => {
    const target = sessionWordTarget.value
    return Math.min(100, Math.round((sessionProgressWords.value / target) * 100))
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
    if (!isFreeWritingSession.value && sessionWordTarget.value > 0 && liveTodayWords.value >= sessionWordTarget.value) {
      return true
    }
    return false
  })

  // Progreso hacia el Platino
  const baseUnlockedCount = computed<number>(() => {
    return ACHIEVEMENTS_CATALOG.filter((a) => a.branch !== 'platinum' && unlockedKeys.value.has(a.key)).length
  })

  const isPlatinumUnlocked = computed<boolean>(() => {
    return unlockedKeys.value.has('platinum_master')
  })

  const totalAchievementsCount = computed(() => ACHIEVEMENTS_CATALOG.length)
  const unlockedCount = computed(() => unlockedAchievements.value.length)

  const todayWordPercentage = computed(() => sessionProgressPercentage.value)
  const todayWordExactPercentage = computed(() => {
    const target = sessionWordTarget.value
    return Math.round((sessionProgressWords.value / target) * 100)
  })

  const sessionGoalPercentage = computed(() => sessionProgressPercentage.value)
  const sessionGoalExactPercentage = computed(() => todayWordExactPercentage.value)

  // =========================================================================
  // TOAST NOTIFICATIONS
  // =========================================================================
  function processNextToast(): void {
    if (activeToast.value || toastQueue.value.length === 0) return
    const next = toastQueue.value.shift()!
    activeToast.value = next

    toastTimer = setTimeout(() => {
      dismissToast()
    }, 4500)
  }

  function showToast(toast: Omit<ToastNotification, 'id'>): void {
    const item: ToastNotification = {
      ...toast,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
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
  // GESTIÓN DE SESIÓN
  // =========================================================================
  function setSessionGoal(type: SessionGoalType, target = 500): void {
    const folioStore = useFolioStore()
    hasPromptedThisSession.value = true
    if (activeProjectId.value) {
      promptedProjectsInSession.value.add(activeProjectId.value)
    }

    if (type === 'free') {
      isFreeWritingSession.value = true
      activeSessionGoal.value = {
        type: 'free',
        target: 0,
        current: 0,
        completed: false
      }
      isSessionPromptOpen.value = false
      return
    }

    isFreeWritingSession.value = false

    // Restricción estricta: Mínimo 500 palabras
    const cleanTarget = Math.max(500, Math.round(target))
    sessionGoalBaselineWords.value = folioStore.sessionWordsAdded

    activeSessionGoal.value = {
      type: 'words',
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
    if (isFreeWritingSession.value || !activeSessionGoal.value || activeSessionGoal.value.type === 'free') return
    if (activeSessionGoal.value.completed) return

    activeSessionGoal.value.completed = true
    const target = activeSessionGoal.value.target

    showToast({
      title: '✨ Meta de Sesión Cumplida',
      description: `Has alcanzado tu objetivo de ${target.toLocaleString('es-ES')} palabras en esta sesión. ¡Increíble!`,
      icon: 'Sparkles',
      badgeColor: 'text-[#C85A32] bg-[#C85A32]/15 border-[#C85A32]/35',
      type: 'session'
    })

    await recordProgress({ sessionGoalHitDelta: 1 })
    await checkAchievements()
  }

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

    // Calcular racha
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
  // EVALUACIÓN DE LOGROS ESCALABLES (22 LOGROS)
  // =========================================================================
  function getEvaluationContext(): AchievementEvaluationContext {
    const folioStore = useFolioStore()
    const projectStore = useProjectStore()

    let completedChaptersCount = 0
    for (const chap of folioStore.chapters) {
      if (chap.status === 'done' && !chap.isArchived) {
        completedChaptersCount++
      }
    }

    return {
      totalManuscriptWords: totalManuscriptWords.value,
      completedChaptersCount,
      totalProjectsCount: Math.max(1, projectStore.projects.length),
      totalSessionGoalsHit: totalSessionGoalsHit.value
    }
  }

  async function checkAchievements(): Promise<void> {
    if (!activeProjectId.value) return

    syncRecentHistoryAndStreak()
    const ctx = getEvaluationContext()

    // 1. Evaluar primero los 21 logros base
    for (const ach of ACHIEVEMENTS_CATALOG) {
      if (ach.branch !== 'platinum' && !unlockedKeys.value.has(ach.key)) {
        if (checkAchievementUnlocked(ach, ctx, unlockedKeys.value)) {
          try {
            const unlocked = await window.api.goals.unlockAchievement(
              activeProjectId.value,
              ach.key,
              null
            )
            if (unlocked) {
              unlockedAchievements.value.unshift(unlocked)
              showToast({
                title: `¡Logro Desbloqueado! «${ach.title}»`,
                description: ach.description,
                icon: ach.icon,
                badgeColor: ach.badgeColor,
                type: 'achievement'
              })
            }
          } catch (err) {
            console.error('[GoalsStore] Error al desbloquear logro:', ach.key, err)
          }
        }
      }
    }

    // 2. Evaluar el Logro Platino (si los 21 logros base están desbloqueados)
    const platinumAch = ACHIEVEMENTS_CATALOG.find((a) => a.branch === 'platinum')
    if (platinumAch && !unlockedKeys.value.has(platinumAch.key)) {
      if (checkAchievementUnlocked(platinumAch, ctx, unlockedKeys.value)) {
        try {
          const unlocked = await window.api.goals.unlockAchievement(
            activeProjectId.value,
            platinumAch.key,
            '¡Has conquistado todos los 21 logros de Folio!'
          )
          if (unlocked) {
            unlockedAchievements.value.unshift(unlocked)
            showToast({
              title: `👑 ¡LOGRO PLATINO CONSEGUIDO!`,
              description: 'Has completado el 100% de los desafíos editoriales de Folio. ¡Honor inmortal!',
              icon: platinumAch.icon,
              badgeColor: platinumAch.badgeColor,
              type: 'achievement'
            })
          }
        } catch (err) {
          console.error('[GoalsStore] Error al desbloquear Platino:', err)
        }
      }
    }
  }

  // =========================================================================
  // PERSISTENCIA IPC
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

      // Apertura de ritual de inicio si corresponde
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

    // Restricción estricta de 500 palabras mínimas para la meta de sesión
    const sanitizedPartial: Partial<ProjectGoals> = { ...partial }
    if (sanitizedPartial.dailyWordGoal !== undefined) {
      sanitizedPartial.dailyWordGoal = Math.max(500, Math.floor(sanitizedPartial.dailyWordGoal))
    }

    try {
      const updated = await window.api.goals.updateConfig(activeProjectId.value, sanitizedPartial)
      config.value = updated

      if (sanitizedPartial.askSessionGoalOnStartup !== undefined) {
        if (sanitizedPartial.askSessionGoalOnStartup) {
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

    try {
      const updatedLog = await window.api.goals.recordProgress(activeProjectId.value, payload)
      todayLog.value = updatedLog

      syncRecentHistoryAndStreak()
      await checkAchievements()
    } catch (err) {
      console.error('[GoalsStore] Error al registrar progreso:', err)
    }
  }

  async function flushSessionWordsToDb(): Promise<void> {
    if (!activeProjectId.value) return
    const folioStore = useFolioStore()
    const delta = folioStore.sessionWordsAdded - persistedSessionWords.value
    if (delta !== 0) {
      persistedSessionWords.value = folioStore.sessionWordsAdded
      await recordProgress({ wordDelta: delta })
    }
  }

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
    totalSessionGoalsHit,
    sessionWordTarget,
    sessionProgressWords,
    sessionProgressPercentage,
    hasPromptedThisSession,
    isSessionPromptOpen,
    isFreeWritingSession,
    activeSessionGoal,
    sessionGoalPercentage,
    sessionGoalExactPercentage,
    isGoalsModalOpen,
    activeModalTab,
    activeToast,
    toastQueue,
    unlockedKeys,
    baseUnlockedCount,
    isPlatinumUnlocked,
    todayWordPercentage,
    todayWordExactPercentage,
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
