import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  ProjectGoals,
  DailyWritingLog,
  UnlockedAchievement,
  GoalsSummary,
  RecordProgressPayload
} from '@shared/types'
import { ACHIEVEMENTS_CATALOG } from '../utils/achievementsCatalog'
import { useFolioStore } from './folioStore'

export interface ToastNotification {
  id: string
  title: string
  description: string
  icon: string
  badgeColor: string
  type: 'achievement' | 'goal'
}

export const useGoalsStore = defineStore('goals', () => {
  const activeProjectId = ref<string | null>(null)
  const isLoading = ref(false)

  const config = ref<ProjectGoals>({
    projectId: '',
    targetTotalWords: 50000,
    dailyWordGoal: 500,
    dailySceneGoal: 1,
    dailyChapterGoal: 0,
    deadlineDate: null,
    updatedAt: new Date()
  })

  const todayLog = ref<DailyWritingLog>({
    id: 0,
    projectId: '',
    date: new Date().toISOString().split('T')[0],
    wordsWritten: 0,
    scenesCreated: 0,
    chaptersCreated: 0,
    goalMet: false
  })

  const recentHistory = ref<DailyWritingLog[]>([])
  const unlockedAchievements = ref<UnlockedAchievement[]>([])
  const totalManuscriptWords = ref<number>(0)
  const currentStreak = ref<number>(0)

  // Modal y Toasts de Gamificación
  const isGoalsModalOpen = ref(false)
  const activeModalTab = ref<'expectations' | 'achievements'>('expectations')
  const activeToast = ref<ToastNotification | null>(null)
  let toastTimer: ReturnType<typeof setTimeout> | null = null

  // Computed
  const unlockedKeys = computed(() => {
    return new Set(unlockedAchievements.value.map((a) => a.achievementKey))
  })

  const todayWordPercentage = computed(() => {
    const target = Math.max(1, config.value.dailyWordGoal)
    return Math.min(100, Math.round((todayLog.value.wordsWritten / target) * 100))
  })

  const todayWordExactPercentage = computed(() => {
    const target = Math.max(1, config.value.dailyWordGoal)
    return Math.round((todayLog.value.wordsWritten / target) * 100)
  })

  const totalManuscriptPercentage = computed(() => {
    const target = Math.max(1, config.value.targetTotalWords)
    return Math.min(100, Math.round((totalManuscriptWords.value / target) * 100))
  })

  const isTodayGoalMet = computed(() => {
    return todayLog.value.goalMet || todayLog.value.wordsWritten >= config.value.dailyWordGoal
  })

  const unlockedCount = computed(() => unlockedAchievements.value.length)
  const totalAchievementsCount = computed(() => ACHIEVEMENTS_CATALOG.length)

  // Sistema de Notificaciones Celebratorias No Intrusivas
  function showToast(toast: Omit<ToastNotification, 'id'>): void {
    if (toastTimer) {
      clearTimeout(toastTimer)
      toastTimer = null
    }

    activeToast.value = {
      ...toast,
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
    }

    toastTimer = setTimeout(() => {
      activeToast.value = null
      toastTimer = null
    }, 4500)
  }

  function dismissToast(): void {
    if (toastTimer) {
      clearTimeout(toastTimer)
      toastTimer = null
    }
    activeToast.value = null
  }

  // Motor Evaluador de Logros
  async function checkAchievements(): Promise<void> {
    if (!activeProjectId.value) return

    const folioStore = useFolioStore()

    // Comprobar si hay al menos un capítulo donde todas sus escenas estén completadas
    let hasCompletedChapter = false
    for (const chap of folioStore.chapters) {
      const scenes = folioStore.getScenesForChapter(chap.id)
      if (scenes.length > 0 && scenes.every((s) => s.status === 'completed')) {
        hasCompletedChapter = true
        break
      }
    }

    const evaluationContext = {
      todayLog: todayLog.value,
      config: config.value,
      totalManuscriptWords: totalManuscriptWords.value,
      currentStreak: currentStreak.value,
      chaptersCount: folioStore.chapters.length,
      hasCompletedChapter
    }

    for (const item of ACHIEVEMENTS_CATALOG) {
      if (!unlockedKeys.value.has(item.key)) {
        if (item.check(evaluationContext)) {
          try {
            const unlocked = await window.api.goals.unlockAchievement(
              activeProjectId.value,
              item.key
            )
            if (unlocked) {
              unlockedAchievements.value.unshift(unlocked)
              showToast({
                title: `¡Logro Desbloqueado! "${item.title}"`,
                description: item.description,
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

  // Cargar resumen de metas y logros del proyecto
  async function fetchGoals(projectId: string): Promise<GoalsSummary | null> {
    if (!projectId) return null

    try {
      isLoading.value = true
      activeProjectId.value = projectId

      const summary = await window.api.goals.getSummary(projectId)
      config.value = summary.config
      todayLog.value = summary.todayLog
      recentHistory.value = summary.recentHistory
      unlockedAchievements.value = summary.unlockedAchievements
      totalManuscriptWords.value = summary.totalManuscriptWords
      currentStreak.value = summary.currentStreak

      // Ejecutar chequeo de logros inicial
      await checkAchievements()

      return summary
    } catch (err) {
      console.error('[GoalsStore] Error al cargar metas del proyecto:', err)
      return null
    } finally {
      isLoading.value = false
    }
  }

  // Actualizar configuración de metas
  async function updateConfig(partial: Partial<ProjectGoals>): Promise<ProjectGoals | null> {
    if (!activeProjectId.value) return null

    try {
      const updated = await window.api.goals.updateConfig(activeProjectId.value, partial)
      config.value = updated

      // Evaluar logros si cambió la meta total u otra meta
      await checkAchievements()
      return updated
    } catch (err) {
      console.error('[GoalsStore] Error al actualizar configuración de metas:', err)
      return null
    }
  }

  // Registrar progreso diario atómico (invocado desde folioStore o autoguardado)
  async function recordProgress(payload: RecordProgressPayload): Promise<void> {
    if (!activeProjectId.value) return

    const wasGoalMet = isTodayGoalMet.value

    try {
      const updatedLog = await window.api.goals.recordProgress(activeProjectId.value, payload)
      todayLog.value = updatedLog

      if (payload.wordDelta) {
        totalManuscriptWords.value = Math.max(
          0,
          totalManuscriptWords.value + (payload.wordDelta || 0)
        )
      }

      // Celebración si acaba de alcanzar su meta diaria de palabras
      if (!wasGoalMet && updatedLog.goalMet) {
        showToast({
          title: '¡Meta Diaria Alcanzada! 🎉',
          description: `Has completado tu objetivo de ${config.value.dailyWordGoal} palabras para hoy.`,
          icon: 'CheckCircle',
          badgeColor: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
          type: 'goal'
        })
      }

      await checkAchievements()
    } catch (err) {
      console.error('[GoalsStore] Error al registrar progreso:', err)
    }
  }

  // Controles de Modal
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
    recentHistory,
    unlockedAchievements,
    totalManuscriptWords,
    currentStreak,
    isGoalsModalOpen,
    activeModalTab,
    activeToast,
    unlockedKeys,
    todayWordPercentage,
    todayWordExactPercentage,
    totalManuscriptPercentage,
    isTodayGoalMet,
    unlockedCount,
    totalAchievementsCount,
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
