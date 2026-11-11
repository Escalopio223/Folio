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

export type FolioType = 'frontmatter' | 'chapter' | 'backmatter'
export type FolioStatus = 'draft' | 'in_progress' | 'done'
export type ChapterTitleAlignment = 'left' | 'center' | 'right'

export interface ChapterTitleFormat {
  alignment: ChapterTitleAlignment
  showDivider: boolean
  fontFamily: string
  color: string
  fontSize: number // admite decimales como 13.5, 28, 32.5
}

export interface Folio {
  id: string
  projectId: string
  type: FolioType
  title: string
  subtitle: string
  synopsis: string
  povTag: string
  timeline: string | null
  location: string | null
  chapterTitleFormat: ChapterTitleFormat | null
  targetWords: number
  includeInExport: boolean
  content: string
  status: FolioStatus
  wordCount: number
  orderIndex: number
  icon: string
  colorTag: string | null
  isFavorite: boolean
  isArchived: boolean
  createdAt: string | Date
  updatedAt: string | Date
}

export interface CreateFolioInput {
  projectId: string
  type?: FolioType
  title?: string
  subtitle?: string
  synopsis?: string
  povTag?: string
  timeline?: string | null
  location?: string | null
  chapterTitleFormat?: ChapterTitleFormat | null
  targetWords?: number
  includeInExport?: boolean
  content?: string
  status?: FolioStatus
  wordCount?: number
  orderIndex?: number
  icon?: string
  colorTag?: string | null
}

export interface UpdateFolioInput {
  id: string
  type?: FolioType
  title?: string
  subtitle?: string
  synopsis?: string
  povTag?: string
  timeline?: string | null
  location?: string | null
  chapterTitleFormat?: ChapterTitleFormat | null
  targetWords?: number
  includeInExport?: boolean
  content?: string
  status?: FolioStatus
  wordCount?: number
  orderIndex?: number
  icon?: string
  colorTag?: string | null
  isFavorite?: boolean
  isArchived?: boolean
}

export interface LoreItem {
  id: string
  projectId: string
  category: string
  name: string
  aliases?: string[]
  summary: string
  content: string
  attributes: Record<string, string>
  icon: string
  colorTag: string | null
  orderIndex: number
  isFavorite: boolean
  isArchived: boolean
  createdAt: string | Date
  updatedAt: string | Date
}

export interface CreateLoreInput {
  projectId: string
  category: string
  name: string
  aliases?: string[]
  summary?: string
  content?: string
  attributes?: Record<string, string>
  icon?: string
  colorTag?: string | null
  orderIndex?: number
}

export interface UpdateLoreInput {
  id: string
  category?: string
  name?: string
  aliases?: string[]
  summary?: string
  content?: string
  attributes?: Record<string, string>
  icon?: string
  colorTag?: string | null
  orderIndex?: number
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

export type SessionGoalType = 'words' | 'chapters' | 'free'

export interface ActiveSessionGoal {
  type: SessionGoalType
  target: number
  current: number
  completed: boolean
}

export interface ProjectGoals {
  projectId: string
  targetTotalWords: number
  dailyWordGoal: number
  dailyChapterGoal: number
  deadlineDate: string | null
  askSessionGoalOnStartup: boolean
  updatedAt: string | Date
}

export interface DailyWritingLog {
  id: number
  projectId: string
  date: string // YYYY-MM-DD
  wordsWritten: number
  chaptersCompleted: number
  sessionGoalsHit: number
  goalMet: boolean
}

export interface UnlockedAchievement {
  id: number
  projectId: string
  achievementKey: string
  customLabel: string | null
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
  chapterDelta?: number
  sessionGoalHitDelta?: number
}

export type WindowAction = 'minimize' | 'maximize' | 'close' | 'isMaximized' | 'fullscreen'

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
    reorder: (ids: string[]) => Promise<boolean>
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
    reorder: (ids: string[]) => Promise<boolean>
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
    unlockAchievement: (
      projectId: string,
      achievementKey: string,
      customLabel?: string | null
    ) => Promise<UnlockedAchievement | null>
  }
  window: {
    action: (action: WindowAction) => Promise<boolean | void>
  }
  export: {
    htmlToPdfBuffer: (html: string) => Promise<Uint8Array>
  }
  spellcheck: {
    setLanguages: (languages: string[]) => Promise<boolean>
    getLanguages: () => Promise<string[]>
    getAvailableLanguages: () => Promise<string[]>
    checkAndSuggest: (
      word: string,
      lang?: 'es' | 'en' | 'auto'
    ) => Promise<{ word: string; isMisspelled: boolean; suggestions: string[] }>
    getCustomWords: () => Promise<string[]>
    addCustomWord: (word: string) => Promise<string[]>
    removeCustomWord: (word: string) => Promise<string[]>
  }
  updater: {
    getState: () => Promise<UpdaterStatusPayload>
    checkForUpdates: () => Promise<boolean>
    applyUpdate: () => Promise<boolean>
    onStatusChange: (callback: (payload: UpdaterStatusPayload) => void) => () => void
  }
}

export type UpdaterStatusType =
  | 'idle'
  | 'checking'
  | 'downloading'
  | 'progress'
  | 'ready'
  | 'available-mac'
  | 'up-to-date'
  | 'error'

export interface UpdaterStatusPayload {
  status: UpdaterStatusType
  version?: string
  releaseUrl?: string
  percent?: number
  bytesPerSecond?: number
  transferred?: number
  total?: number
  message?: string
}
