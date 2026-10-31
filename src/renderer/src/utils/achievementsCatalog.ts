export type AchievementBranch = 'words' | 'structure' | 'consistency' | 'platinum'

export interface ScalableAchievement {
  key: string
  title: string
  description: string
  branch: AchievementBranch
  branchLabel: string
  icon: string
  badgeColor: string
  tier: number
  target: number
  unitLabel: string
}

export interface AchievementEvaluationContext {
  totalManuscriptWords: number
  completedChaptersCount: number
  totalProjectsCount: number
  totalSessionGoalsHit: number
}

export interface AchievementProgress {
  current: number
  target: number
  percentage: number
  unitLabel: string
}

/**
 * Catálogo EXACTO de 22 logros (21 base + 1 Platino)
 *
 * 1. Progresión por Palabras Escritas (11 logros):
 *    - Primeras 500 palabras (500)
 *    - Primeras 1.000 palabras (1.000)
 *    - 2.000 palabras (2.000)
 *    - 5.000 palabras (5.000)
 *    - 10.000 palabras (10.000)
 *    - 15.000 palabras (15.000)
 *    - 20.000 palabras (20.000)
 *    - 25.000 palabras (25.000)
 *    - 50.000 palabras (50.000)
 *    - 75.000 palabras (75.000)
 *    - 100.000 palabras (100.000)
 *
 * 2. Progresión por Capítulos y Libros (4 logros):
 *    - Primer capítulo (1 capítulo)
 *    - Primeros 10 capítulos (10 capítulos)
 *    - Primeros 50 capítulos (50 capítulos)
 *    - Primer libro (1 libro)
 *
 * 3. Progresión por Metas de Sesión Cumplidas (6 logros):
 *    - 100 veces has cumplido tu meta de palabras por sesión
 *    - 250 veces has cumplido tu meta de palabras por sesión
 *    - 500 veces has cumplido tu meta de palabras por sesión
 *    - 1.000 veces has cumplido tu meta de palabras por sesión
 *    - 1.500 veces has cumplido tu meta de palabras por sesión
 *    - 5.000 veces has cumplido tu meta de palabras por sesión
 *
 * 4. Logro Platino (1 logro maestro):
 *    - Se desbloquea automáticamente al conseguir los 21 logros anteriores.
 */
export const ACHIEVEMENTS_CATALOG: ScalableAchievement[] = [
  // Rama 1: Palabras Escritas (11 logros)
  {
    key: 'words_500',
    title: 'Primeras 500 palabras',
    description: 'Escribir las primeras 500 palabras en tu manuscrito.',
    branch: 'words',
    branchLabel: 'Palabras Escritas',
    icon: 'Feather',
    badgeColor: 'text-[#C85A32] bg-[#C85A32]/12 border-[#C85A32]/30',
    tier: 1,
    target: 500,
    unitLabel: 'palabras'
  },
  {
    key: 'words_1000',
    title: 'Primeras 1.000 palabras',
    description: 'Alcanzar el primer millar de palabras en tu obra.',
    branch: 'words',
    branchLabel: 'Palabras Escritas',
    icon: 'Feather',
    badgeColor: 'text-[#C85A32] bg-[#C85A32]/12 border-[#C85A32]/30',
    tier: 2,
    target: 1000,
    unitLabel: 'palabras'
  },
  {
    key: 'words_2000',
    title: '2.000 palabras',
    description: 'Acumular 2.000 palabras de prosa literaria.',
    branch: 'words',
    branchLabel: 'Palabras Escritas',
    icon: 'Feather',
    badgeColor: 'text-[#C85A32] bg-[#C85A32]/12 border-[#C85A32]/30',
    tier: 3,
    target: 2000,
    unitLabel: 'palabras'
  },
  {
    key: 'words_5000',
    title: '5.000 palabras',
    description: 'Alcanzar las 5.000 palabras en tu manuscrito.',
    branch: 'words',
    branchLabel: 'Palabras Escritas',
    icon: 'Feather',
    badgeColor: 'text-[#C85A32] bg-[#C85A32]/12 border-[#C85A32]/30',
    tier: 4,
    target: 5000,
    unitLabel: 'palabras'
  },
  {
    key: 'words_10000',
    title: '10.000 palabras',
    description: 'Superar la barrera de las 10.000 palabras escritas.',
    branch: 'words',
    branchLabel: 'Palabras Escritas',
    icon: 'Feather',
    badgeColor: 'text-[#C85A32] bg-[#C85A32]/12 border-[#C85A32]/30',
    tier: 5,
    target: 10000,
    unitLabel: 'palabras'
  },
  {
    key: 'words_15000',
    title: '15.000 palabras',
    description: 'Alcanzar las 15.000 palabras de narrativa.',
    branch: 'words',
    branchLabel: 'Palabras Escritas',
    icon: 'Feather',
    badgeColor: 'text-[#C85A32] bg-[#C85A32]/12 border-[#C85A32]/30',
    tier: 6,
    target: 15000,
    unitLabel: 'palabras'
  },
  {
    key: 'words_20000',
    title: '20.000 palabras',
    description: 'Consolidar 20.000 palabras en tu universo.',
    branch: 'words',
    branchLabel: 'Palabras Escritas',
    icon: 'Feather',
    badgeColor: 'text-[#C85A32] bg-[#C85A32]/12 border-[#C85A32]/30',
    tier: 7,
    target: 20000,
    unitLabel: 'palabras'
  },
  {
    key: 'words_25000',
    title: '25.000 palabras',
    description: 'Un cuarto de novela: 25.000 palabras alcanzadas.',
    branch: 'words',
    branchLabel: 'Palabras Escritas',
    icon: 'Feather',
    badgeColor: 'text-[#C85A32] bg-[#C85A32]/12 border-[#C85A32]/30',
    tier: 8,
    target: 25000,
    unitLabel: 'palabras'
  },
  {
    key: 'words_50000',
    title: '50.000 palabras',
    description: 'La longitud de una novela corta completa: 50.000 palabras.',
    branch: 'words',
    branchLabel: 'Palabras Escritas',
    icon: 'Feather',
    badgeColor: 'text-[#C85A32] bg-[#C85A32]/12 border-[#C85A32]/30',
    tier: 9,
    target: 50000,
    unitLabel: 'palabras'
  },
  {
    key: 'words_75000',
    title: '75.000 palabras',
    description: 'Volumen editorial épico: 75.000 palabras escritas.',
    branch: 'words',
    branchLabel: 'Palabras Escritas',
    icon: 'Feather',
    badgeColor: 'text-[#C85A32] bg-[#C85A32]/12 border-[#C85A32]/30',
    tier: 10,
    target: 75000,
    unitLabel: 'palabras'
  },
  {
    key: 'words_100000',
    title: '100.000 palabras',
    description: 'Cien mil palabras de pura dedicación literaria.',
    branch: 'words',
    branchLabel: 'Palabras Escritas',
    icon: 'Crown',
    badgeColor: 'text-amber-500 bg-amber-500/15 border-amber-500/35',
    tier: 11,
    target: 100000,
    unitLabel: 'palabras'
  },

  // Rama 2: Capítulos y Libros (4 logros)
  {
    key: 'structure_chap_1',
    title: 'Primer capítulo',
    description: 'Completar con éxito el primer capítulo de tu manuscrito.',
    branch: 'structure',
    branchLabel: 'Estructura',
    icon: 'BookOpen',
    badgeColor: 'text-blue-500 bg-blue-500/12 border-blue-500/30',
    tier: 1,
    target: 1,
    unitLabel: 'capítulos'
  },
  {
    key: 'structure_chap_10',
    title: 'Primeros 10 capítulos',
    description: 'Finalizar los primeros 10 capítulos de la obra.',
    branch: 'structure',
    branchLabel: 'Estructura',
    icon: 'BookOpen',
    badgeColor: 'text-blue-500 bg-blue-500/12 border-blue-500/30',
    tier: 2,
    target: 10,
    unitLabel: 'capítulos'
  },
  {
    key: 'structure_chap_50',
    title: 'Primeros 50 capítulos',
    description: 'Alcanzar una arquitectura de 50 capítulos terminados.',
    branch: 'structure',
    branchLabel: 'Estructura',
    icon: 'BookOpen',
    badgeColor: 'text-blue-500 bg-blue-500/12 border-blue-500/30',
    tier: 3,
    target: 50,
    unitLabel: 'capítulos'
  },
  {
    key: 'structure_book_1',
    title: 'Primer libro',
    description: 'Crear tu primer libro o proyecto en Folio.',
    branch: 'structure',
    branchLabel: 'Estructura',
    icon: 'Crown',
    badgeColor: 'text-amber-500 bg-amber-500/15 border-amber-500/35',
    tier: 4,
    target: 1,
    unitLabel: 'libros'
  },

  // Rama 3: Metas de Sesión Cumplidas (6 logros)
  {
    key: 'goals_hit_100',
    title: '100 veces',
    description: 'Has cumplido tu meta de palabras por sesión 100 veces.',
    branch: 'consistency',
    branchLabel: 'Constancia',
    icon: 'Target',
    badgeColor: 'text-emerald-500 bg-emerald-500/12 border-emerald-500/30',
    tier: 1,
    target: 100,
    unitLabel: 'sesiones cumplidas'
  },
  {
    key: 'goals_hit_250',
    title: '250 veces',
    description: 'Has cumplido tu meta de palabras por sesión 250 veces.',
    branch: 'consistency',
    branchLabel: 'Constancia',
    icon: 'Target',
    badgeColor: 'text-emerald-500 bg-emerald-500/12 border-emerald-500/30',
    tier: 2,
    target: 250,
    unitLabel: 'sesiones cumplidas'
  },
  {
    key: 'goals_hit_500',
    title: '500 veces',
    description: 'Has cumplido tu meta de palabras por sesión 500 veces.',
    branch: 'consistency',
    branchLabel: 'Constancia',
    icon: 'Target',
    badgeColor: 'text-emerald-500 bg-emerald-500/12 border-emerald-500/30',
    tier: 3,
    target: 500,
    unitLabel: 'sesiones cumplidas'
  },
  {
    key: 'goals_hit_1000',
    title: '1.000 veces',
    description: 'Has cumplido tu meta de palabras por sesión 1.000 veces.',
    branch: 'consistency',
    branchLabel: 'Constancia',
    icon: 'Target',
    badgeColor: 'text-emerald-500 bg-emerald-500/12 border-emerald-500/30',
    tier: 4,
    target: 1000,
    unitLabel: 'sesiones cumplidas'
  },
  {
    key: 'goals_hit_1500',
    title: '1.500 veces',
    description: 'Has cumplido tu meta de palabras por sesión 1.500 veces.',
    branch: 'consistency',
    branchLabel: 'Constancia',
    icon: 'Target',
    badgeColor: 'text-emerald-500 bg-emerald-500/12 border-emerald-500/30',
    tier: 5,
    target: 1500,
    unitLabel: 'sesiones cumplidas'
  },
  {
    key: 'goals_hit_5000',
    title: '5.000 veces',
    description: 'Has cumplido tu meta de palabras por sesión 5.000 veces.',
    branch: 'consistency',
    branchLabel: 'Constancia',
    icon: 'Target',
    badgeColor: 'text-emerald-500 bg-emerald-500/12 border-emerald-500/30',
    tier: 6,
    target: 5000,
    unitLabel: 'sesiones cumplidas'
  },

  // Logro Maestro: Platino (1 logro)
  {
    key: 'platinum_master',
    title: 'Platino',
    description: 'Desbloqueado automáticamente al conseguir los 21 logros de Folio.',
    branch: 'platinum',
    branchLabel: 'Prestigio Supremo',
    icon: 'Sparkles',
    badgeColor: 'text-cyan-400 bg-cyan-400/15 border-cyan-400/40',
    tier: 1,
    target: 21,
    unitLabel: 'logros'
  }
]

export const BASE_ACHIEVEMENTS_COUNT = 21

export function checkAchievementUnlocked(
  ach: ScalableAchievement,
  ctx: AchievementEvaluationContext,
  unlockedKeys: Set<string>
): boolean {
  if (ach.branch === 'words') {
    return ctx.totalManuscriptWords >= ach.target
  }

  if (ach.branch === 'structure') {
    if (ach.key === 'structure_book_1') {
      return ctx.totalProjectsCount >= 1
    }
    return ctx.completedChaptersCount >= ach.target
  }

  if (ach.branch === 'consistency') {
    return ctx.totalSessionGoalsHit >= ach.target
  }

  if (ach.branch === 'platinum') {
    // Debe haber desbloqueado todos los 21 logros base
    const baseAch = ACHIEVEMENTS_CATALOG.filter((a) => a.branch !== 'platinum')
    return baseAch.every((a) => unlockedKeys.has(a.key))
  }

  return false
}

export function getAchievementProgress(
  ach: ScalableAchievement,
  ctx: AchievementEvaluationContext,
  unlockedKeys: Set<string>
): AchievementProgress {
  if (ach.branch === 'words') {
    const current = ctx.totalManuscriptWords
    const target = ach.target
    const percentage = Math.min(100, Math.round((current / target) * 100))
    return { current, target, percentage, unitLabel: ach.unitLabel }
  }

  if (ach.branch === 'structure') {
    if (ach.key === 'structure_book_1') {
      const current = ctx.totalProjectsCount
      const target = 1
      const percentage = Math.min(100, Math.round((current / target) * 100))
      return { current, target, percentage, unitLabel: ach.unitLabel }
    }
    const current = ctx.completedChaptersCount
    const target = ach.target
    const percentage = Math.min(100, Math.round((current / target) * 100))
    return { current, target, percentage, unitLabel: ach.unitLabel }
  }

  if (ach.branch === 'consistency') {
    const current = ctx.totalSessionGoalsHit
    const target = ach.target
    const percentage = Math.min(100, Math.round((current / target) * 100))
    return { current, target, percentage, unitLabel: ach.unitLabel }
  }

  if (ach.branch === 'platinum') {
    const baseAch = ACHIEVEMENTS_CATALOG.filter((a) => a.branch !== 'platinum')
    const current = baseAch.filter((a) => unlockedKeys.has(a.key)).length
    const target = 21
    const percentage = Math.min(100, Math.round((current / target) * 100))
    return { current, target, percentage, unitLabel: 'logros' }
  }

  return { current: 0, target: 1, percentage: 0, unitLabel: '' }
}
