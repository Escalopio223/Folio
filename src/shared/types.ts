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
  window: {
    action: (action: WindowAction) => Promise<boolean | void>
  }
}
