export type AchievementCategory = 'daily' | 'volume' | 'consistency'

export interface AchievementEvaluationContext {
  todayLog: {
    wordsWritten: number
    scenesCreated: number
    chaptersCreated: number
    goalMet: boolean
  }
  config: {
    targetTotalWords: number
    dailyWordGoal: number
    dailySceneGoal: number
    dailyChapterGoal: number
  }
  totalManuscriptWords: number
  currentStreak: number
  chaptersCount: number
  hasCompletedChapter: boolean
}

export interface AchievementItem {
  key: string
  title: string
  description: string
  category: AchievementCategory
  categoryLabel: string
  icon: string
  badgeColor: string
  check: (ctx: AchievementEvaluationContext) => boolean
  getProgress: (ctx: AchievementEvaluationContext) => {
    current: number
    target: number
    percentage: number
  }
}

export const ACHIEVEMENTS_CATALOG: AchievementItem[] = [
  // =========================================================================
  // 1. CUMPLIMIENTO DE METAS DIARIAS
  // =========================================================================
  {
    key: 'daily_goal_hit',
    title: 'Deber Cumplido',
    description: 'Alcanzar el 100% de tu meta diaria de palabras en un solo día.',
    category: 'daily',
    categoryLabel: 'Metas Diarias',
    icon: 'Target',
    badgeColor: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
    check: (ctx) => ctx.todayLog.wordsWritten >= ctx.config.dailyWordGoal && ctx.config.dailyWordGoal > 0,
    getProgress: (ctx) => {
      const current = ctx.todayLog.wordsWritten
      const target = Math.max(1, ctx.config.dailyWordGoal)
      return {
        current,
        target,
        percentage: Math.min(100, Math.round((current / target) * 100))
      }
    }
  },
  {
    key: 'daily_goal_double',
    title: 'Doble Jornada',
    description: 'Superar el 200% de tu meta diaria de palabras en un solo día.',
    category: 'daily',
    categoryLabel: 'Metas Diarias',
    icon: 'Zap',
    badgeColor: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
    check: (ctx) =>
      ctx.todayLog.wordsWritten >= ctx.config.dailyWordGoal * 2 && ctx.config.dailyWordGoal > 0,
    getProgress: (ctx) => {
      const current = ctx.todayLog.wordsWritten
      const target = Math.max(1, ctx.config.dailyWordGoal * 2)
      return {
        current,
        target,
        percentage: Math.min(100, Math.round((current / target) * 100))
      }
    }
  },
  {
    key: 'daily_scene_architect',
    title: 'Arquitecto de Escenas',
    description: 'Cumplir la meta diaria de escenas creadas o trabajadas hoy.',
    category: 'daily',
    categoryLabel: 'Metas Diarias',
    icon: 'Layout',
    badgeColor: 'text-blue-500 bg-blue-500/10 border-blue-500/30',
    check: (ctx) =>
      ctx.todayLog.scenesCreated >= ctx.config.dailySceneGoal && ctx.config.dailySceneGoal > 0,
    getProgress: (ctx) => {
      const current = ctx.todayLog.scenesCreated
      const target = Math.max(1, ctx.config.dailySceneGoal)
      return {
        current,
        target,
        percentage: Math.min(100, Math.round((current / target) * 100))
      }
    }
  },

  // =========================================================================
  // 2. VOLUMEN DEL MANUSCRITO (PALABRAS TOTALES)
  // =========================================================================
  {
    key: 'words_500',
    title: 'Primera Pluma',
    description: 'Escribir las primeras 500 palabras en tu manuscrito activo.',
    category: 'volume',
    categoryLabel: 'Volumen de Obra',
    icon: 'Feather',
    badgeColor: 'text-[#C85A32] bg-[#C85A32]/10 border-[#C85A32]/30',
    check: (ctx) => ctx.totalManuscriptWords >= 500,
    getProgress: (ctx) => {
      const current = ctx.totalManuscriptWords
      const target = 500
      return {
        current,
        target,
        percentage: Math.min(100, Math.round((current / target) * 100))
      }
    }
  },
  {
    key: 'words_5k',
    title: 'Cuento Corto',
    description: 'Alcanzar 5.000 palabras en el manuscrito activo.',
    category: 'volume',
    categoryLabel: 'Volumen de Obra',
    icon: 'BookOpen',
    badgeColor: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/30',
    check: (ctx) => ctx.totalManuscriptWords >= 5000,
    getProgress: (ctx) => {
      const current = ctx.totalManuscriptWords
      const target = 5000
      return {
        current,
        target,
        percentage: Math.min(100, Math.round((current / target) * 100))
      }
    }
  },
  {
    key: 'words_20k',
    title: 'Novela en Marcha',
    description: 'Alcanzar 20.000 palabras en el manuscrito activo.',
    category: 'volume',
    categoryLabel: 'Volumen de Obra',
    icon: 'Compass',
    badgeColor: 'text-violet-500 bg-violet-500/10 border-violet-500/30',
    check: (ctx) => ctx.totalManuscriptWords >= 20000,
    getProgress: (ctx) => {
      const current = ctx.totalManuscriptWords
      const target = 20000
      return {
        current,
        target,
        percentage: Math.min(100, Math.round((current / target) * 100))
      }
    }
  },
  {
    key: 'words_50k',
    title: 'Hito de NaNoWriMo',
    description: 'Alcanzar 50.000 palabras, la meta clásica de una novela completa.',
    category: 'volume',
    categoryLabel: 'Volumen de Obra',
    icon: 'Award',
    badgeColor: 'text-amber-600 bg-amber-600/10 border-amber-600/30',
    check: (ctx) => ctx.totalManuscriptWords >= 50000,
    getProgress: (ctx) => {
      const current = ctx.totalManuscriptWords
      const target = 50000
      return {
        current,
        target,
        percentage: Math.min(100, Math.round((current / target) * 100))
      }
    }
  },
  {
    key: 'words_target_hit',
    title: 'Obra Magna',
    description: 'Alcanzar el 100% de la meta global de palabras configurada para el libro.',
    category: 'volume',
    categoryLabel: 'Volumen de Obra',
    icon: 'Crown',
    badgeColor: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30',
    check: (ctx) =>
      ctx.totalManuscriptWords >= ctx.config.targetTotalWords && ctx.config.targetTotalWords > 0,
    getProgress: (ctx) => {
      const current = ctx.totalManuscriptWords
      const target = Math.max(1, ctx.config.targetTotalWords)
      return {
        current,
        target,
        percentage: Math.min(100, Math.round((current / target) * 100))
      }
    }
  },

  // =========================================================================
  // 3. ESTRUCTURA Y CONSTANCIA
  // =========================================================================
  {
    key: 'first_chapter_closed',
    title: 'Primer Capítulo Cerrado',
    description: 'Tener todas las escenas de un capítulo marcadas como finalizadas.',
    category: 'consistency',
    categoryLabel: 'Constancia y Estructura',
    icon: 'BookmarkCheck',
    badgeColor: 'text-teal-500 bg-teal-500/10 border-teal-500/30',
    check: (ctx) => ctx.hasCompletedChapter,
    getProgress: (ctx) => ({
      current: ctx.hasCompletedChapter ? 1 : 0,
      target: 1,
      percentage: ctx.hasCompletedChapter ? 100 : 0
    })
  },
  {
    key: 'chapter_master',
    title: 'Maestro de Capítulos',
    description: 'Estructurar al menos 3 capítulos organizados en tu manuscrito.',
    category: 'consistency',
    categoryLabel: 'Constancia y Estructura',
    icon: 'Layers',
    badgeColor: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/30',
    check: (ctx) => ctx.chaptersCount >= 3,
    getProgress: (ctx) => ({
      current: ctx.chaptersCount,
      target: 3,
      percentage: Math.min(100, Math.round((ctx.chaptersCount / 3) * 100))
    })
  },
  {
    key: 'streak_3',
    title: 'Constancia de Hierro',
    description: 'Mantener una racha de 3 días seguidos cumpliendo tu meta diaria de palabras.',
    category: 'consistency',
    categoryLabel: 'Constancia y Estructura',
    icon: 'Flame',
    badgeColor: 'text-orange-500 bg-orange-500/10 border-orange-500/30',
    check: (ctx) => ctx.currentStreak >= 3,
    getProgress: (ctx) => ({
      current: ctx.currentStreak,
      target: 3,
      percentage: Math.min(100, Math.round((ctx.currentStreak / 3) * 100))
    })
  },
  {
    key: 'streak_7',
    title: 'Hábito Editorial',
    description: 'Mantener una racha de 7 días seguidos cumpliendo tu meta diaria de palabras.',
    category: 'consistency',
    categoryLabel: 'Constancia y Estructura',
    icon: 'Trophy',
    badgeColor: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
    check: (ctx) => ctx.currentStreak >= 7,
    getProgress: (ctx) => ({
      current: ctx.currentStreak,
      target: 7,
      percentage: Math.min(100, Math.round((ctx.currentStreak / 7) * 100))
    })
  }
]

export function getAchievementByKey(key: string): AchievementItem | undefined {
  return ACHIEVEMENTS_CATALOG.find((a) => a.key === key)
}
