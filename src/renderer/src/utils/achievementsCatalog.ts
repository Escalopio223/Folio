import type { ActiveSessionGoal } from '@shared/types'

export type AchievementCategory = 'goals' | 'volume' | 'consistency' | 'worldbuilding'

export interface AchievementEvaluationContext {
  todayLog: {
    wordsWritten: number
    scenesCompleted: number
    chaptersCompleted: number
    sessionGoalsHit: number
    goalMet: boolean
  }
  config: {
    targetTotalWords: number
    dailyWordGoal: number
    dailySceneGoal: number
    dailyChapterGoal: number
  }
  activeSessionGoal: ActiveSessionGoal | null
  totalManuscriptWords: number
  currentStreak: number
  activeDaysCount: number
  chaptersCount: number
  scenesCount: number
  completedScenesCount: number
  completedChaptersCount: number
  hasCompletedChapter: boolean
  loreCount: number
  rulesCount: number
  scratchpadCount: number
}

export interface AchievementProgress {
  current: number
  target: number
  percentage: number
  unitLabel: string
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
  getCustomLabel?: (ctx: AchievementEvaluationContext) => string | null
  getProgress: (ctx: AchievementEvaluationContext) => AchievementProgress
}

export const ACHIEVEMENTS_CATALOG: AchievementItem[] = [
  // =========================================================================
  // 1. LOGROS DE TUS PROPIAS METAS (13 LOGROS DINÁMICOS Y DE JORNADA)
  // =========================================================================
  {
    key: 'session_goal_hit',
    title: 'Promesa Cumplida',
    description: 'Completar con éxito la meta que te propusiste al abrir tu sesión de escritura.',
    category: 'goals',
    categoryLabel: 'Tus Propias Metas',
    icon: 'Sparkles',
    badgeColor: 'text-[var(--accent)] bg-[var(--accent)]/12 border-[var(--accent)]/30',
    check: (ctx) =>
      ctx.todayLog.sessionGoalsHit > 0 ||
      Boolean(
        ctx.activeSessionGoal &&
          ctx.activeSessionGoal.type !== 'free' &&
          ctx.activeSessionGoal.completed
      ),
    getCustomLabel: (ctx) => {
      if (ctx.activeSessionGoal && ctx.activeSessionGoal.type !== 'free') {
        const unit =
          ctx.activeSessionGoal.type === 'words'
            ? 'palabras'
            : ctx.activeSessionGoal.type === 'scenes'
              ? ctx.activeSessionGoal.target === 1
                ? 'escena'
                : 'escenas'
              : ctx.activeSessionGoal.target === 1
                ? 'capítulo'
                : 'capítulos'
        return `Meta de sesión cumplida: ${ctx.activeSessionGoal.target.toLocaleString('es-ES')} ${unit}`
      }
      return 'Meta de sesión alcanzada con éxito'
    },
    getProgress: (ctx) => {
      if (ctx.activeSessionGoal && ctx.activeSessionGoal.type !== 'free') {
        const current = ctx.activeSessionGoal.current
        const target = Math.max(1, ctx.activeSessionGoal.target)
        const unitLabel =
          ctx.activeSessionGoal.type === 'words'
            ? 'palabras'
            : ctx.activeSessionGoal.type === 'scenes'
              ? 'escenas'
              : 'capítulos'
        return {
          current,
          target,
          percentage: Math.min(100, Math.round((current / target) * 100)),
          unitLabel
        }
      }
      const current = ctx.todayLog.sessionGoalsHit > 0 ? 1 : 0
      return {
        current,
        target: 1,
        percentage: current * 100,
        unitLabel: 'meta de sesión'
      }
    }
  },
  {
    key: 'session_goals_2_day',
    title: 'Doble Sesión Triunfal',
    description: 'Completar 2 metas de sesión distintas dentro de una misma jornada.',
    category: 'goals',
    categoryLabel: 'Tus Propias Metas',
    icon: 'Sparkles',
    badgeColor: 'text-amber-600 dark:text-amber-400 bg-amber-500/12 border-amber-500/30',
    check: (ctx) => ctx.todayLog.sessionGoalsHit >= 2,
    getCustomLabel: (ctx) => `${ctx.todayLog.sessionGoalsHit} metas de sesión cumplidas en el día`,
    getProgress: (ctx) => {
      const current = ctx.todayLog.sessionGoalsHit
      const target = 2
      return {
        current,
        target,
        percentage: Math.min(100, Math.round((current / target) * 100)),
        unitLabel: 'sesiones hoy'
      }
    }
  },
  {
    key: 'session_goals_3_day',
    title: 'Tríptico de Sesiones',
    description: 'Completar 3 metas de sesión en un mismo día de inspiración.',
    category: 'goals',
    categoryLabel: 'Tus Propias Metas',
    icon: 'Crown',
    badgeColor: 'text-yellow-600 dark:text-yellow-400 bg-yellow-500/12 border-yellow-500/30',
    check: (ctx) => ctx.todayLog.sessionGoalsHit >= 3,
    getCustomLabel: (ctx) => `${ctx.todayLog.sessionGoalsHit} metas de sesión superadas hoy`,
    getProgress: (ctx) => {
      const current = ctx.todayLog.sessionGoalsHit
      const target = 3
      return {
        current,
        target,
        percentage: Math.min(100, Math.round((current / target) * 100)),
        unitLabel: 'sesiones hoy'
      }
    }
  },
  {
    key: 'daily_first_words_100',
    title: 'Romper el Hielo',
    description: 'Escribir al menos 100 palabras nuevas en una jornada.',
    category: 'goals',
    categoryLabel: 'Tus Propias Metas',
    icon: 'Feather',
    badgeColor: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/12 border-emerald-500/30',
    check: (ctx) => ctx.todayLog.wordsWritten >= 100,
    getProgress: (ctx) => {
      const current = ctx.todayLog.wordsWritten
      const target = 100
      return {
        current,
        target,
        percentage: Math.min(100, Math.round((current / target) * 100)),
        unitLabel: 'palabras hoy'
      }
    }
  },
  {
    key: 'daily_words_250',
    title: 'Calentamiento de Pluma',
    description: 'Alcanzar 250 palabras redactadas en una misma jornada.',
    category: 'goals',
    categoryLabel: 'Tus Propias Metas',
    icon: 'Feather',
    badgeColor: 'text-teal-600 dark:text-teal-400 bg-teal-500/12 border-teal-500/30',
    check: (ctx) => ctx.todayLog.wordsWritten >= 250,
    getProgress: (ctx) => {
      const current = ctx.todayLog.wordsWritten
      const target = 250
      return {
        current,
        target,
        percentage: Math.min(100, Math.round((current / target) * 100)),
        unitLabel: 'palabras hoy'
      }
    }
  },
  {
    key: 'daily_goal_hit',
    title: 'Deber del Día',
    description:
      'Alcanzar el 100% de tu expectativa diaria configurada (en palabras, escenas o capítulos).',
    category: 'goals',
    categoryLabel: 'Tus Propias Metas',
    icon: 'Target',
    badgeColor: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/12 border-emerald-500/30',
    check: (ctx) =>
      (ctx.config.dailyWordGoal > 0 && ctx.todayLog.wordsWritten >= ctx.config.dailyWordGoal) ||
      (ctx.config.dailySceneGoal > 0 &&
        ctx.todayLog.scenesCompleted >= ctx.config.dailySceneGoal) ||
      (ctx.config.dailyChapterGoal > 0 &&
        ctx.todayLog.chaptersCompleted >= ctx.config.dailyChapterGoal),
    getCustomLabel: (ctx) => {
      if (ctx.config.dailyWordGoal > 0 && ctx.todayLog.wordsWritten >= ctx.config.dailyWordGoal) {
        return `Meta diaria alcanzada: ${ctx.config.dailyWordGoal.toLocaleString('es-ES')} palabras`
      }
      if (
        ctx.config.dailySceneGoal > 0 &&
        ctx.todayLog.scenesCompleted >= ctx.config.dailySceneGoal
      ) {
        return `Meta diaria alcanzada: ${ctx.config.dailySceneGoal} escena(s)`
      }
      if (
        ctx.config.dailyChapterGoal > 0 &&
        ctx.todayLog.chaptersCompleted >= ctx.config.dailyChapterGoal
      ) {
        return `Meta diaria alcanzada: ${ctx.config.dailyChapterGoal} capítulo(s)`
      }
      return null
    },
    getProgress: (ctx) => {
      const current = ctx.todayLog.wordsWritten
      const target = Math.max(1, ctx.config.dailyWordGoal)
      return {
        current,
        target,
        percentage: Math.min(100, Math.round((current / target) * 100)),
        unitLabel: 'palabras hoy'
      }
    }
  },
  {
    key: 'daily_goal_grace',
    title: 'Estado de Gracia',
    description: 'Superar el 150% de la meta de palabras que te habías fijado para hoy.',
    category: 'goals',
    categoryLabel: 'Tus Propias Metas',
    icon: 'Zap',
    badgeColor: 'text-amber-600 dark:text-amber-400 bg-amber-500/12 border-amber-500/30',
    check: (ctx) => {
      const target = Math.ceil(ctx.config.dailyWordGoal * 1.5)
      return ctx.config.dailyWordGoal > 0 && ctx.todayLog.wordsWritten >= target
    },
    getCustomLabel: (ctx) => {
      const target = Math.ceil(ctx.config.dailyWordGoal * 1.5)
      return `150% superado: ${target.toLocaleString('es-ES')} palabras en un día`
    },
    getProgress: (ctx) => {
      const current = ctx.todayLog.wordsWritten
      const target = Math.max(1, Math.ceil(ctx.config.dailyWordGoal * 1.5))
      return {
        current,
        target,
        percentage: Math.min(100, Math.round((current / target) * 100)),
        unitLabel: 'palabras (150%)'
      }
    }
  },
  {
    key: 'daily_goal_double',
    title: 'Doble Jornada',
    description: 'Alcanzar el 200% de tu expectativa diaria de palabras en un solo día.',
    category: 'goals',
    categoryLabel: 'Tus Propias Metas',
    icon: 'Zap',
    badgeColor: 'text-orange-600 dark:text-orange-400 bg-orange-500/12 border-orange-500/30',
    check: (ctx) => {
      const target = ctx.config.dailyWordGoal * 2
      return ctx.config.dailyWordGoal > 0 && ctx.todayLog.wordsWritten >= target
    },
    getCustomLabel: (ctx) => {
      const target = ctx.config.dailyWordGoal * 2
      return `200% alcanzado: ${target.toLocaleString('es-ES')} palabras en el día`
    },
    getProgress: (ctx) => {
      const current = ctx.todayLog.wordsWritten
      const target = Math.max(1, ctx.config.dailyWordGoal * 2)
      return {
        current,
        target,
        percentage: Math.min(100, Math.round((current / target) * 100)),
        unitLabel: 'palabras (200%)'
      }
    }
  },
  {
    key: 'daily_goal_triple',
    title: 'Fiebre Creativa',
    description: 'Triplicar (300%) tu meta diaria de palabras en una jornada memorable.',
    category: 'goals',
    categoryLabel: 'Tus Propias Metas',
    icon: 'Flame',
    badgeColor: 'text-rose-600 dark:text-rose-400 bg-rose-500/12 border-rose-500/30',
    check: (ctx) => {
      const target = ctx.config.dailyWordGoal * 3
      return ctx.config.dailyWordGoal > 0 && ctx.todayLog.wordsWritten >= target
    },
    getCustomLabel: (ctx) => {
      const target = ctx.config.dailyWordGoal * 3
      return `300% alcanzado: ${target.toLocaleString('es-ES')} palabras en el día`
    },
    getProgress: (ctx) => {
      const current = ctx.todayLog.wordsWritten
      const target = Math.max(1, ctx.config.dailyWordGoal * 3)
      return {
        current,
        target,
        percentage: Math.min(100, Math.round((current / target) * 100)),
        unitLabel: 'palabras (300%)'
      }
    }
  },
  {
    key: 'daily_words_1000',
    title: 'Mil Palabras al Sol',
    description: 'Escribir 1.000 palabras o más en una sola jornada literaria.',
    category: 'goals',
    categoryLabel: 'Tus Propias Metas',
    icon: 'Award',
    badgeColor: 'text-amber-600 dark:text-amber-400 bg-amber-500/12 border-amber-500/30',
    check: (ctx) => ctx.todayLog.wordsWritten >= 1000,
    getProgress: (ctx) => {
      const current = ctx.todayLog.wordsWritten
      const target = 1000
      return {
        current,
        target,
        percentage: Math.min(100, Math.round((current / target) * 100)),
        unitLabel: 'palabras hoy'
      }
    }
  },
  {
    key: 'daily_words_2000',
    title: 'Torrente de Tinta',
    description: 'Escribir 2.000 palabras en un solo día de inmersión absoluta.',
    category: 'goals',
    categoryLabel: 'Tus Propias Metas',
    icon: 'Crown',
    badgeColor: 'text-yellow-600 dark:text-yellow-400 bg-yellow-500/15 border-yellow-500/35',
    check: (ctx) => ctx.todayLog.wordsWritten >= 2000,
    getProgress: (ctx) => {
      const current = ctx.todayLog.wordsWritten
      const target = 2000
      return {
        current,
        target,
        percentage: Math.min(100, Math.round((current / target) * 100)),
        unitLabel: 'palabras hoy'
      }
    }
  },
  {
    key: 'daily_scene_architect',
    title: 'Arquitecto de Escenas',
    description: 'Cumplir tu objetivo de escenas propuestas en una jornada.',
    category: 'goals',
    categoryLabel: 'Tus Propias Metas',
    icon: 'Layout',
    badgeColor: 'text-sky-600 dark:text-sky-400 bg-sky-500/12 border-sky-500/30',
    check: (ctx) => {
      const target = Math.max(1, ctx.config.dailySceneGoal)
      return ctx.todayLog.scenesCompleted >= target
    },
    getCustomLabel: (ctx) => {
      const target = Math.max(1, ctx.config.dailySceneGoal)
      return `Objetivo cumplido: ${target} ${target === 1 ? 'escena completada' : 'escenas completadas'} en el día`
    },
    getProgress: (ctx) => {
      const current = ctx.todayLog.scenesCompleted
      const target = Math.max(1, ctx.config.dailySceneGoal)
      return {
        current,
        target,
        percentage: Math.min(100, Math.round((current / target) * 100)),
        unitLabel: target === 1 ? 'escena hoy' : 'escenas hoy'
      }
    }
  },
  {
    key: 'daily_chapter_close',
    title: 'Cierre Capitular',
    description: 'Cumplir tu objetivo de capítulos creados o cerrados en una jornada.',
    category: 'goals',
    categoryLabel: 'Tus Propias Metas',
    icon: 'Layers',
    badgeColor: 'text-teal-600 dark:text-teal-400 bg-teal-500/12 border-teal-500/30',
    check: (ctx) => {
      const target = Math.max(1, ctx.config.dailyChapterGoal)
      return ctx.todayLog.chaptersCompleted >= target
    },
    getCustomLabel: (ctx) => {
      const target = Math.max(1, ctx.config.dailyChapterGoal)
      return `Objetivo capitular: ${target} ${target === 1 ? 'capítulo en la jornada' : 'capítulos en la jornada'}`
    },
    getProgress: (ctx) => {
      const current = ctx.todayLog.chaptersCompleted
      const target = Math.max(1, ctx.config.dailyChapterGoal)
      return {
        current,
        target,
        percentage: Math.min(100, Math.round((current / target) * 100)),
        unitLabel: target === 1 ? 'capítulo hoy' : 'capítulos hoy'
      }
    }
  },

  // =========================================================================
  // 2. HITOS DEL MANUSCRITO (14 LOGROS DE VOLUMEN DE LA OBRA)
  // =========================================================================
  {
    key: 'words_100',
    title: 'La Página ya no está en Blanco',
    description: 'Superar las primeras 100 palabras en tu manuscrito activo.',
    category: 'volume',
    categoryLabel: 'Hitos del Manuscrito',
    icon: 'Feather',
    badgeColor: 'text-[var(--accent)] bg-[var(--accent)]/12 border-[var(--accent)]/30',
    check: (ctx) => ctx.totalManuscriptWords >= 100,
    getProgress: (ctx) => ({
      current: ctx.totalManuscriptWords,
      target: 100,
      percentage: Math.min(100, Math.round((ctx.totalManuscriptWords / 100) * 100)),
      unitLabel: 'palabras'
    })
  },
  {
    key: 'words_500',
    title: 'Primeras Líneas',
    description: 'Superar las primeras 500 palabras en tu manuscrito activo.',
    category: 'volume',
    categoryLabel: 'Hitos del Manuscrito',
    icon: 'Feather',
    badgeColor: 'text-[var(--accent)] bg-[var(--accent)]/12 border-[var(--accent)]/30',
    check: (ctx) => ctx.totalManuscriptWords >= 500,
    getProgress: (ctx) => ({
      current: ctx.totalManuscriptWords,
      target: 500,
      percentage: Math.min(100, Math.round((ctx.totalManuscriptWords / 500) * 100)),
      unitLabel: 'palabras'
    })
  },
  {
    key: 'words_1000',
    title: 'Primer Millar',
    description: 'Alcanzar las primeras 1.000 palabras en tu manuscrito activo.',
    category: 'volume',
    categoryLabel: 'Hitos del Manuscrito',
    icon: 'BookOpen',
    badgeColor: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/12 border-emerald-500/30',
    check: (ctx) => ctx.totalManuscriptWords >= 1000,
    getProgress: (ctx) => ({
      current: ctx.totalManuscriptWords,
      target: 1000,
      percentage: Math.min(100, Math.round((ctx.totalManuscriptWords / 1000) * 100)),
      unitLabel: 'palabras'
    })
  },
  {
    key: 'words_2500',
    title: 'El Impulso Inicial',
    description: 'Alcanzar 2.500 palabras dando cuerpo a los primeros compases de la obra.',
    category: 'volume',
    categoryLabel: 'Hitos del Manuscrito',
    icon: 'BookOpen',
    badgeColor: 'text-amber-600 dark:text-amber-400 bg-amber-500/12 border-amber-500/30',
    check: (ctx) => ctx.totalManuscriptWords >= 2500,
    getProgress: (ctx) => ({
      current: ctx.totalManuscriptWords,
      target: 2500,
      percentage: Math.min(100, Math.round((ctx.totalManuscriptWords / 2500) * 100)),
      unitLabel: 'palabras'
    })
  },
  {
    key: 'words_5000',
    title: 'Cuento Consolidado',
    description: 'Alcanzar 5.000 palabras: la extensión clásica de un relato completo.',
    category: 'volume',
    categoryLabel: 'Hitos del Manuscrito',
    icon: 'BookOpen',
    badgeColor: 'text-sky-600 dark:text-sky-400 bg-sky-500/12 border-sky-500/30',
    check: (ctx) => ctx.totalManuscriptWords >= 5000,
    getProgress: (ctx) => ({
      current: ctx.totalManuscriptWords,
      target: 5000,
      percentage: Math.min(100, Math.round((ctx.totalManuscriptWords / 5000) * 100)),
      unitLabel: 'palabras'
    })
  },
  {
    key: 'words_10k',
    title: 'Relato Forjado',
    description: 'Alcanzar las 10.000 palabras consolidadas en el manuscrito activo.',
    category: 'volume',
    categoryLabel: 'Hitos del Manuscrito',
    icon: 'Compass',
    badgeColor: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/12 border-emerald-500/30',
    check: (ctx) => ctx.totalManuscriptWords >= 10000,
    getProgress: (ctx) => ({
      current: ctx.totalManuscriptWords,
      target: 10000,
      percentage: Math.min(100, Math.round((ctx.totalManuscriptWords / 10000) * 100)),
      unitLabel: 'palabras'
    })
  },
  {
    key: 'words_15k',
    title: 'Nouvelle en Ciernes',
    description: 'Alcanzar 15.000 palabras: el territorio de las grandes novelas cortas.',
    category: 'volume',
    categoryLabel: 'Hitos del Manuscrito',
    icon: 'Compass',
    badgeColor: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/12 border-indigo-500/30',
    check: (ctx) => ctx.totalManuscriptWords >= 15000,
    getProgress: (ctx) => ({
      current: ctx.totalManuscriptWords,
      target: 15000,
      percentage: Math.min(100, Math.round((ctx.totalManuscriptWords / 15000) * 100)),
      unitLabel: 'palabras'
    })
  },
  {
    key: 'words_25k',
    title: 'Ecuador Narrativo',
    description: 'Alcanzar 25.000 palabras: el corazón de una novela en pleno desarrollo.',
    category: 'volume',
    categoryLabel: 'Hitos del Manuscrito',
    icon: 'Flame',
    badgeColor: 'text-orange-600 dark:text-orange-400 bg-orange-500/12 border-orange-500/30',
    check: (ctx) => ctx.totalManuscriptWords >= 25000,
    getProgress: (ctx) => ({
      current: ctx.totalManuscriptWords,
      target: 25000,
      percentage: Math.min(100, Math.round((ctx.totalManuscriptWords / 25000) * 100)),
      unitLabel: 'palabras'
    })
  },
  {
    key: 'words_35k',
    title: 'Trama en Ascenso',
    description: 'Alcanzar 35.000 palabras adentrándote en el tercer acto de la obra.',
    category: 'volume',
    categoryLabel: 'Hitos del Manuscrito',
    icon: 'Award',
    badgeColor: 'text-violet-600 dark:text-violet-400 bg-violet-500/12 border-violet-500/30',
    check: (ctx) => ctx.totalManuscriptWords >= 35000,
    getProgress: (ctx) => ({
      current: ctx.totalManuscriptWords,
      target: 35000,
      percentage: Math.min(100, Math.round((ctx.totalManuscriptWords / 35000) * 100)),
      unitLabel: 'palabras'
    })
  },
  {
    key: 'words_50k',
    title: 'Cima de Novela',
    description: 'Alcanzar 50.000 palabras, el hito consagrado de una novela completa.',
    category: 'volume',
    categoryLabel: 'Hitos del Manuscrito',
    icon: 'Award',
    badgeColor: 'text-amber-600 dark:text-amber-400 bg-amber-500/12 border-amber-500/30',
    check: (ctx) => ctx.totalManuscriptWords >= 50000,
    getProgress: (ctx) => ({
      current: ctx.totalManuscriptWords,
      target: 50000,
      percentage: Math.min(100, Math.round((ctx.totalManuscriptWords / 50000) * 100)),
      unitLabel: 'palabras'
    })
  },
  {
    key: 'words_75k',
    title: 'Volumen de Gran Aliento',
    description: 'Alcanzar 75.000 palabras en un manuscrito de largo recorrido.',
    category: 'volume',
    categoryLabel: 'Hitos del Manuscrito',
    icon: 'Crown',
    badgeColor: 'text-amber-600 dark:text-amber-400 bg-amber-500/15 border-amber-500/35',
    check: (ctx) => ctx.totalManuscriptWords >= 75000,
    getProgress: (ctx) => ({
      current: ctx.totalManuscriptWords,
      target: 75000,
      percentage: Math.min(100, Math.round((ctx.totalManuscriptWords / 75000) * 100)),
      unitLabel: 'palabras'
    })
  },
  {
    key: 'words_100k',
    title: 'Epopeya Monumental',
    description: 'Superar la barrera mítica de las 100.000 palabras en una sola obra.',
    category: 'volume',
    categoryLabel: 'Hitos del Manuscrito',
    icon: 'Crown',
    badgeColor: 'text-yellow-600 dark:text-yellow-400 bg-yellow-500/15 border-yellow-500/35',
    check: (ctx) => ctx.totalManuscriptWords >= 100000,
    getProgress: (ctx) => ({
      current: ctx.totalManuscriptWords,
      target: 100000,
      percentage: Math.min(100, Math.round((ctx.totalManuscriptWords / 100000) * 100)),
      unitLabel: 'palabras'
    })
  },
  {
    key: 'words_target_half',
    title: 'Mitad del Camino',
    description: 'Alcanzar el 50% de la meta total de palabras configurada para tu libro.',
    category: 'volume',
    categoryLabel: 'Hitos del Manuscrito',
    icon: 'Compass',
    badgeColor: 'text-teal-600 dark:text-teal-400 bg-teal-500/12 border-teal-500/30',
    check: (ctx) => {
      const half = Math.ceil(ctx.config.targetTotalWords * 0.5)
      return ctx.config.targetTotalWords > 0 && ctx.totalManuscriptWords >= half
    },
    getCustomLabel: (ctx) => {
      const half = Math.ceil(ctx.config.targetTotalWords * 0.5)
      return `50% de la obra superado: ${half.toLocaleString('es-ES')} palabras`
    },
    getProgress: (ctx) => {
      const current = ctx.totalManuscriptWords
      const target = Math.max(1, Math.ceil(ctx.config.targetTotalWords * 0.5))
      return {
        current,
        target,
        percentage: Math.min(100, Math.round((current / target) * 100)),
        unitLabel: 'palabras (50%)'
      }
    }
  },
  {
    key: 'words_target_hit',
    title: 'Obra Magna',
    description:
      'Alcanzar el 100% de la meta total personalizada que definiste para tu manuscrito.',
    category: 'volume',
    categoryLabel: 'Hitos del Manuscrito',
    icon: 'Crown',
    badgeColor: 'text-yellow-600 dark:text-yellow-400 bg-yellow-500/15 border-yellow-500/35',
    check: (ctx) =>
      ctx.config.targetTotalWords > 0 && ctx.totalManuscriptWords >= ctx.config.targetTotalWords,
    getCustomLabel: (ctx) =>
      `Meta total del libro alcanzada: ${ctx.config.targetTotalWords.toLocaleString('es-ES')} palabras`,
    getProgress: (ctx) => {
      const current = ctx.totalManuscriptWords
      const target = Math.max(1, ctx.config.targetTotalWords)
      return {
        current,
        target,
        percentage: Math.min(100, Math.round((current / target) * 100)),
        unitLabel: 'palabras'
      }
    }
  },

  // =========================================================================
  // 3. CONSTANCIA Y OFICIO (16 LOGROS DE HÁBITO Y ESTRUCTURA)
  // =========================================================================
  {
    key: 'streak_2',
    title: 'Chispa Continua',
    description: 'Cumplir tu meta diaria o de sesión durante 2 días consecutivos.',
    category: 'consistency',
    categoryLabel: 'Constancia y Oficio',
    icon: 'Flame',
    badgeColor: 'text-orange-600 dark:text-orange-400 bg-orange-500/12 border-orange-500/30',
    check: (ctx) => ctx.currentStreak >= 2,
    getCustomLabel: () => '2 días seguidos cumpliendo tus metas',
    getProgress: (ctx) => ({
      current: ctx.currentStreak,
      target: 2,
      percentage: Math.min(100, Math.round((ctx.currentStreak / 2) * 100)),
      unitLabel: 'días seguidos'
    })
  },
  {
    key: 'streak_3',
    title: 'Tres Días de Pluma',
    description: 'Mantener 3 días seguidos cumpliendo tu meta diaria o de sesión.',
    category: 'consistency',
    categoryLabel: 'Constancia y Oficio',
    icon: 'Flame',
    badgeColor: 'text-orange-600 dark:text-orange-400 bg-orange-500/12 border-orange-500/30',
    check: (ctx) => ctx.currentStreak >= 3,
    getCustomLabel: () => 'Racha de 3 jornadas consecutivas cumplidas',
    getProgress: (ctx) => ({
      current: ctx.currentStreak,
      target: 3,
      percentage: Math.min(100, Math.round((ctx.currentStreak / 3) * 100)),
      unitLabel: 'días seguidos'
    })
  },
  {
    key: 'streak_5',
    title: 'Semana Laboral de Autor',
    description: 'Mantener 5 días consecutivos cumpliendo tus objetivos de escritura.',
    category: 'consistency',
    categoryLabel: 'Constancia y Oficio',
    icon: 'Flame',
    badgeColor: 'text-amber-600 dark:text-amber-400 bg-amber-500/12 border-amber-500/30',
    check: (ctx) => ctx.currentStreak >= 5,
    getCustomLabel: () => 'Racha de 5 jornadas consecutivas cumplidas',
    getProgress: (ctx) => ({
      current: ctx.currentStreak,
      target: 5,
      percentage: Math.min(100, Math.round((ctx.currentStreak / 5) * 100)),
      unitLabel: 'días seguidos'
    })
  },
  {
    key: 'streak_7',
    title: 'Hábito de Hierro',
    description: 'Mantener 7 días seguidos escribiendo y cumpliendo tus metas.',
    category: 'consistency',
    categoryLabel: 'Constancia y Oficio',
    icon: 'Trophy',
    badgeColor: 'text-amber-600 dark:text-amber-400 bg-amber-500/12 border-amber-500/30',
    check: (ctx) => ctx.currentStreak >= 7,
    getCustomLabel: () => 'Racha de 7 jornadas consecutivas cumplidas',
    getProgress: (ctx) => ({
      current: ctx.currentStreak,
      target: 7,
      percentage: Math.min(100, Math.round((ctx.currentStreak / 7) * 100)),
      unitLabel: 'días seguidos'
    })
  },
  {
    key: 'streak_14',
    title: 'Quincena Inquebrantable',
    description: 'Mantener una racha de 14 días seguidos cumpliendo tus metas editoriales.',
    category: 'consistency',
    categoryLabel: 'Constancia y Oficio',
    icon: 'Trophy',
    badgeColor: 'text-yellow-600 dark:text-yellow-400 bg-yellow-500/15 border-yellow-500/35',
    check: (ctx) => ctx.currentStreak >= 14,
    getCustomLabel: () => '14 días consecutivos de disciplina literaria',
    getProgress: (ctx) => ({
      current: ctx.currentStreak,
      target: 14,
      percentage: Math.min(100, Math.round((ctx.currentStreak / 14) * 100)),
      unitLabel: 'días seguidos'
    })
  },
  {
    key: 'streak_30',
    title: 'Maestro del Oficio',
    description: 'Mantener 30 días consecutivos cumpliendo tu meta diaria o de sesión.',
    category: 'consistency',
    categoryLabel: 'Constancia y Oficio',
    icon: 'Crown',
    badgeColor: 'text-yellow-600 dark:text-yellow-400 bg-yellow-500/15 border-yellow-500/35',
    check: (ctx) => ctx.currentStreak >= 30,
    getCustomLabel: () => '30 días seguidos de maestría y constancia',
    getProgress: (ctx) => ({
      current: ctx.currentStreak,
      target: 30,
      percentage: Math.min(100, Math.round((ctx.currentStreak / 30) * 100)),
      unitLabel: 'días seguidos'
    })
  },
  {
    key: 'active_days_5',
    title: 'Cinco Jornadas en el Santuario',
    description: 'Acumular al menos 5 días con palabras escritas en este proyecto.',
    category: 'consistency',
    categoryLabel: 'Constancia y Oficio',
    icon: 'BookOpen',
    badgeColor: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/12 border-emerald-500/30',
    check: (ctx) => ctx.activeDaysCount >= 5,
    getProgress: (ctx) => ({
      current: ctx.activeDaysCount,
      target: 5,
      percentage: Math.min(100, Math.round((ctx.activeDaysCount / 5) * 100)),
      unitLabel: 'jornadas activas'
    })
  },
  {
    key: 'active_days_15',
    title: 'Quince Días de Tinta',
    description: 'Acumular 15 jornadas de escritura registradas en tu manuscrito.',
    category: 'consistency',
    categoryLabel: 'Constancia y Oficio',
    icon: 'Award',
    badgeColor: 'text-teal-600 dark:text-teal-400 bg-teal-500/12 border-teal-500/30',
    check: (ctx) => ctx.activeDaysCount >= 15,
    getProgress: (ctx) => ({
      current: ctx.activeDaysCount,
      target: 15,
      percentage: Math.min(100, Math.round((ctx.activeDaysCount / 15) * 100)),
      unitLabel: 'jornadas activas'
    })
  },
  {
    key: 'scenes_5',
    title: 'Tejedor de Escenas',
    description: 'Estructurar al menos 5 escenas activas dentro de tu manuscrito.',
    category: 'consistency',
    categoryLabel: 'Constancia y Oficio',
    icon: 'Layout',
    badgeColor: 'text-sky-600 dark:text-sky-400 bg-sky-500/12 border-sky-500/30',
    check: (ctx) => ctx.scenesCount >= 5,
    getProgress: (ctx) => ({
      current: ctx.scenesCount,
      target: 5,
      percentage: Math.min(100, Math.round((ctx.scenesCount / 5) * 100)),
      unitLabel: 'escenas'
    })
  },
  {
    key: 'scenes_15',
    title: 'Mosaico Dramático',
    description: 'Alcanzar 15 escenas organizadas en la estructura de tu obra.',
    category: 'consistency',
    categoryLabel: 'Constancia y Oficio',
    icon: 'Layout',
    badgeColor: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/12 border-indigo-500/30',
    check: (ctx) => ctx.scenesCount >= 15,
    getProgress: (ctx) => ({
      current: ctx.scenesCount,
      target: 15,
      percentage: Math.min(100, Math.round((ctx.scenesCount / 15) * 100)),
      unitLabel: 'escenas'
    })
  },
  {
    key: 'scenes_30',
    title: 'Tapiz de Escenas',
    description: 'Alcanzar 30 escenas construidas a lo largo de tu manuscrito.',
    category: 'consistency',
    categoryLabel: 'Constancia y Oficio',
    icon: 'Layout',
    badgeColor: 'text-violet-600 dark:text-violet-400 bg-violet-500/12 border-violet-500/30',
    check: (ctx) => ctx.scenesCount >= 30,
    getProgress: (ctx) => ({
      current: ctx.scenesCount,
      target: 30,
      percentage: Math.min(100, Math.round((ctx.scenesCount / 30) * 100)),
      unitLabel: 'escenas'
    })
  },
  {
    key: 'scenes_completed_5',
    title: 'Cinco Escenas Pulidas',
    description: 'Tener al menos 5 escenas marcadas con el estado «Finalizado».',
    category: 'consistency',
    categoryLabel: 'Constancia y Oficio',
    icon: 'CheckCircle',
    badgeColor: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/12 border-emerald-500/30',
    check: (ctx) => ctx.completedScenesCount >= 5,
    getProgress: (ctx) => ({
      current: ctx.completedScenesCount,
      target: 5,
      percentage: Math.min(100, Math.round((ctx.completedScenesCount / 5) * 100)),
      unitLabel: 'escenas finalizadas'
    })
  },
  {
    key: 'chapters_3',
    title: 'Tríptico Capitular',
    description: 'Organizar tu obra en al menos 3 capítulos estructurados.',
    category: 'consistency',
    categoryLabel: 'Constancia y Oficio',
    icon: 'Layers',
    badgeColor: 'text-teal-600 dark:text-teal-400 bg-teal-500/12 border-teal-500/30',
    check: (ctx) => ctx.chaptersCount >= 3,
    getProgress: (ctx) => ({
      current: ctx.chaptersCount,
      target: 3,
      percentage: Math.min(100, Math.round((ctx.chaptersCount / 3) * 100)),
      unitLabel: 'capítulos'
    })
  },
  {
    key: 'chapters_10',
    title: 'Arquitectura de Diez Capítulos',
    description: 'Desplegar una estructura sólida de al menos 10 capítulos en el libro.',
    category: 'consistency',
    categoryLabel: 'Constancia y Oficio',
    icon: 'Layers',
    badgeColor: 'text-cyan-600 dark:text-cyan-400 bg-cyan-500/12 border-cyan-500/30',
    check: (ctx) => ctx.chaptersCount >= 10,
    getProgress: (ctx) => ({
      current: ctx.chaptersCount,
      target: 10,
      percentage: Math.min(100, Math.round((ctx.chaptersCount / 10) * 100)),
      unitLabel: 'capítulos'
    })
  },
  {
    key: 'first_chapter_closed',
    title: 'Capítulo Sellado',
    description: 'Marcar todas las escenas de un capítulo como Finalizado.',
    category: 'consistency',
    categoryLabel: 'Constancia y Oficio',
    icon: 'BookmarkCheck',
    badgeColor: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/12 border-emerald-500/30',
    check: (ctx) => ctx.hasCompletedChapter,
    getCustomLabel: (ctx) =>
      ctx.completedChaptersCount > 1
        ? `${ctx.completedChaptersCount} capítulos sellados en la obra`
        : 'Primer capítulo con todas sus escenas finalizadas',
    getProgress: (ctx) => ({
      current: ctx.hasCompletedChapter ? 1 : 0,
      target: 1,
      percentage: ctx.hasCompletedChapter ? 100 : 0,
      unitLabel: 'capítulo cerrado'
    })
  },
  {
    key: 'three_chapters_closed',
    title: 'Tres Capítulos Sellados',
    description: 'Completar íntegramente 3 capítulos con todas sus escenas finalizadas.',
    category: 'consistency',
    categoryLabel: 'Constancia y Oficio',
    icon: 'BookmarkCheck',
    badgeColor: 'text-amber-600 dark:text-amber-400 bg-amber-500/12 border-amber-500/30',
    check: (ctx) => ctx.completedChaptersCount >= 3,
    getProgress: (ctx) => ({
      current: ctx.completedChaptersCount,
      target: 3,
      percentage: Math.min(100, Math.round((ctx.completedChaptersCount / 3) * 100)),
      unitLabel: 'capítulos cerrados'
    })
  },

  // =========================================================================
  // 4. UNIVERSO, LORE Y HERRAMIENTAS DE AUTOR (5 LOGROS)
  // =========================================================================
  {
    key: 'lore_first',
    title: 'Semilla del Mundo',
    description: 'Crear tu primera ficha en la Wiki de Lore (personaje, lugar u objeto).',
    category: 'worldbuilding',
    categoryLabel: 'Universo y Lore',
    icon: 'Compass',
    badgeColor: 'text-[var(--accent)] bg-[var(--accent)]/12 border-[var(--accent)]/30',
    check: (ctx) => ctx.loreCount >= 1,
    getProgress: (ctx) => ({
      current: ctx.loreCount,
      target: 1,
      percentage: Math.min(100, Math.round((ctx.loreCount / 1) * 100)),
      unitLabel: 'ficha de lore'
    })
  },
  {
    key: 'lore_5',
    title: 'Cronista del Universo',
    description: 'Documentar al menos 5 fichas activas en la Wiki de tu obra.',
    category: 'worldbuilding',
    categoryLabel: 'Universo y Lore',
    icon: 'BookOpen',
    badgeColor: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/12 border-emerald-500/30',
    check: (ctx) => ctx.loreCount >= 5,
    getProgress: (ctx) => ({
      current: ctx.loreCount,
      target: 5,
      percentage: Math.min(100, Math.round((ctx.loreCount / 5) * 100)),
      unitLabel: 'fichas de lore'
    })
  },
  {
    key: 'lore_15',
    title: 'Enciclopedista Mayor',
    description: 'Alcanzar 15 entradas documentadas en tu Wiki de personajes, lugares y objetos.',
    category: 'worldbuilding',
    categoryLabel: 'Universo y Lore',
    icon: 'Crown',
    badgeColor: 'text-amber-600 dark:text-amber-400 bg-amber-500/12 border-amber-500/30',
    check: (ctx) => ctx.loreCount >= 15,
    getProgress: (ctx) => ({
      current: ctx.loreCount,
      target: 15,
      percentage: Math.min(100, Math.round((ctx.loreCount / 15) * 100)),
      unitLabel: 'fichas de lore'
    })
  },
  {
    key: 'rules_3',
    title: 'Legislador del Canon',
    description: 'Establecer al menos 3 Reglas del Mundo para regir la coherencia de tu universo.',
    category: 'worldbuilding',
    categoryLabel: 'Universo y Lore',
    icon: 'Award',
    badgeColor: 'text-sky-600 dark:text-sky-400 bg-sky-500/12 border-sky-500/30',
    check: (ctx) => ctx.rulesCount >= 3,
    getProgress: (ctx) => ({
      current: ctx.rulesCount,
      target: 3,
      percentage: Math.min(100, Math.round((ctx.rulesCount / 3) * 100)),
      unitLabel: 'reglas del mundo'
    })
  },
  {
    key: 'scratchpad_3',
    title: 'Cazador de Ideas Fugaces',
    description: 'Capturar al menos 3 anotaciones rápidas en tu Scratchpad.',
    category: 'worldbuilding',
    categoryLabel: 'Universo y Lore',
    icon: 'Feather',
    badgeColor: 'text-teal-600 dark:text-teal-400 bg-teal-500/12 border-teal-500/30',
    check: (ctx) => ctx.scratchpadCount >= 3,
    getProgress: (ctx) => ({
      current: ctx.scratchpadCount,
      target: 3,
      percentage: Math.min(100, Math.round((ctx.scratchpadCount / 3) * 100)),
      unitLabel: 'notas rápidas'
    })
  }
]

export function getAchievementByKey(key: string): AchievementItem | undefined {
  return ACHIEVEMENTS_CATALOG.find((a) => a.key === key)
}
