export interface Project {
  id: string
  title: string
  synopsis: string
  genre: string
  createdAt: string | Date
  updatedAt: string | Date
}

export interface CreateProjectInput {
  title: string
  synopsis?: string
  genre?: string
}

export interface UpdateProjectInput {
  id: string
  title?: string
  synopsis?: string
  genre?: string
}

export type FolioType = 'chapter' | 'scene'

export interface Folio {
  id: string
  projectId: string
  parentId: string | null
  type: FolioType
  title: string
  content: string
  synopsis?: string
  icon: string
  sortOrder: number
  status: string
  isFavorite: boolean
  isArchived: boolean
  createdAt: string | Date
  updatedAt: string | Date
}

export interface CreateFolioInput {
  projectId: string
  parentId?: string | null
  type?: FolioType
  title?: string
  content?: string
  synopsis?: string
  icon?: string
  sortOrder?: number
  status?: string
}

export interface UpdateFolioInput {
  id: string
  title?: string
  content?: string
  synopsis?: string
  parentId?: string | null
  type?: FolioType
  sortOrder?: number
  status?: string
  icon?: string
  isFavorite?: boolean
  isArchived?: boolean
}

export interface LoreItem {
  id: string
  projectId: string
  category: string // 'personaje' | 'lugar' | 'objeto' | 'idea' | 'pensamiento' | custom
  name: string
  summary: string
  content: string
  attributes: Record<string, string> // Pares dinámicos: e.g. { Rol: "Protagonista", Edad: "28" }
  icon: string
  isFavorite: boolean
  isArchived: boolean
  createdAt: string | Date
  updatedAt: string | Date
}

export interface CreateLoreInput {
  projectId: string
  category: string
  name: string
  summary?: string
  content?: string
  attributes?: Record<string, string>
  icon?: string
}

export interface UpdateLoreInput {
  id: string
  category?: string
  name?: string
  summary?: string
  content?: string
  attributes?: Record<string, string>
  icon?: string
  isFavorite?: boolean
  isArchived?: boolean
}

export interface ScratchpadNote {
  id: number
  projectId: string
  title: string
  content: string
  isPinned: boolean
  colorTag: string | null
  createdAt: string | Date
  updatedAt: string | Date
}

export interface SaveScratchpadNoteInput {
  id?: number
  projectId: string
  title?: string
  content?: string
  isPinned?: boolean
  colorTag?: string | null
}

export interface WorldRule {
  id: number
  projectId: string
  category: string
  title: string
  axiom: string
  details?: string | null
  limitations?: string | null
  orderIndex: number
  isPinned: boolean
  createdAt: string | Date
  updatedAt: string | Date
}

export interface SaveWorldRuleInput {
  id?: number
  projectId: string
  category: string
  title: string
  axiom: string
  details?: string | null
  limitations?: string | null
  orderIndex?: number
  isPinned?: boolean
}

export interface ProjectGoals {
  projectId: string
  targetTotalWords: number
  dailyWordGoal: number
  dailySceneGoal: number
  dailyChapterGoal: number
  deadlineDate: string | null
  updatedAt: string | Date
}

export interface DailyWritingLog {
  id: number
  projectId: string
  date: string // YYYY-MM-DD
  wordsWritten: number
  scenesCreated: number
  chaptersCreated: number
  goalMet: boolean
}

export interface UnlockedAchievement {
  id: number
  projectId: string
  achievementKey: string
  unlockedAt: string | Date
}

export interface GoalsSummary {
  config: ProjectGoals
  todayLog: DailyWritingLog
  recentHistory: DailyWritingLog[]
  unlockedAchievements: UnlockedAchievement[]
  totalManuscriptWords: number
  currentStreak: number
}

export interface RecordProgressPayload {
  wordDelta?: number
  sceneDelta?: number
  chapterDelta?: number
}

export type WindowAction = 'minimize' | 'maximize' | 'close' | 'isMaximized'

export interface FolioApi {
  project: {
    getAll: () => Promise<Project[]>
    getById: (id: string) => Promise<Project | null>
    create: (input: CreateProjectInput) => Promise<Project>
    update: (input: UpdateProjectInput) => Promise<Project>
    delete: (id: string) => Promise<boolean>
  }
  folio: {
    getAll: (projectId?: string) => Promise<Folio[]>
    getTrash: (projectId?: string) => Promise<Folio[]>
    getById: (id: string) => Promise<Folio | null>
    create: (input: CreateFolioInput) => Promise<Folio>
    update: (input: UpdateFolioInput) => Promise<Folio>
    restore: (id: string) => Promise<Folio>
    deletePermanent: (id: string) => Promise<boolean>
    emptyTrash: (projectId: string) => Promise<{ purgedFolios: number; purgedLore: number }>
  }
  lore: {
    getAll: (projectId?: string, category?: string) => Promise<LoreItem[]>
    getTrash: (projectId?: string) => Promise<LoreItem[]>
    getById: (id: string) => Promise<LoreItem | null>
    create: (input: CreateLoreInput) => Promise<LoreItem>
    update: (input: UpdateLoreInput) => Promise<LoreItem>
    restore: (id: string) => Promise<LoreItem>
    deletePermanent: (id: string) => Promise<boolean>
  }
  scratchpad: {
    list: (projectId: string) => Promise<ScratchpadNote[]>
    save: (note: SaveScratchpadNoteInput) => Promise<ScratchpadNote>
    delete: (id: number) => Promise<boolean>
  }
  rules: {
    list: (projectId: string) => Promise<WorldRule[]>
    save: (rule: SaveWorldRuleInput) => Promise<WorldRule>
    delete: (id: number) => Promise<boolean>
    reorder: (ids: number[]) => Promise<boolean>
  }
  goals: {
    getSummary: (projectId: string) => Promise<GoalsSummary>
    updateConfig: (projectId: string, config: Partial<ProjectGoals>) => Promise<ProjectGoals>
    recordProgress: (projectId: string, payload: RecordProgressPayload) => Promise<DailyWritingLog>
    unlockAchievement: (projectId: string, achievementKey: string) => Promise<UnlockedAchievement | null>
  }
  window: {
    action: (action: WindowAction) => Promise<boolean | void>
  }
}
