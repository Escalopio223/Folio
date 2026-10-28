import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type {
  FolioApi,
  Project,
  CreateProjectInput,
  UpdateProjectInput,
  Folio,
  CreateFolioInput,
  UpdateFolioInput,
  LoreItem,
  CreateLoreInput,
  UpdateLoreInput,
  ScratchpadNote,
  SaveScratchpadNoteInput,
  WorldRule,
  SaveWorldRuleInput,
  WindowAction
} from '@shared/types'

const api: FolioApi = {
  project: {
    getAll: (): Promise<Project[]> => ipcRenderer.invoke('project:getAll'),
    getById: (id: string): Promise<Project | null> => ipcRenderer.invoke('project:getById', id),
    create: (input: CreateProjectInput): Promise<Project> => ipcRenderer.invoke('project:create', input),
    update: (input: UpdateProjectInput): Promise<Project> => ipcRenderer.invoke('project:update', input),
    delete: (id: string): Promise<boolean> => ipcRenderer.invoke('project:delete', id)
  },
  folio: {
    getAll: (projectId?: string): Promise<Folio[]> => ipcRenderer.invoke('folio:getAll', projectId),
    getTrash: (projectId?: string): Promise<Folio[]> => ipcRenderer.invoke('folio:getTrash', projectId),
    getById: (id: string): Promise<Folio | null> => ipcRenderer.invoke('folio:getById', id),
    create: (input: CreateFolioInput): Promise<Folio> => ipcRenderer.invoke('folio:create', input),
    update: (input: UpdateFolioInput): Promise<Folio> => ipcRenderer.invoke('folio:update', input),
    restore: (id: string): Promise<Folio> => ipcRenderer.invoke('folio:restore', id),
    deletePermanent: (id: string): Promise<boolean> => ipcRenderer.invoke('folio:deletePermanent', id),
    emptyTrash: (projectId: string): Promise<{ purgedFolios: number; purgedLore: number }> =>
      ipcRenderer.invoke('folio:emptyTrash', projectId)
  },
  lore: {
    getAll: (projectId?: string, category?: string): Promise<LoreItem[]> =>
      ipcRenderer.invoke('lore:getAll', projectId, category),
    getTrash: (projectId?: string): Promise<LoreItem[]> => ipcRenderer.invoke('lore:getTrash', projectId),
    getById: (id: string): Promise<LoreItem | null> => ipcRenderer.invoke('lore:getById', id),
    create: (input: CreateLoreInput): Promise<LoreItem> => ipcRenderer.invoke('lore:create', input),
    update: (input: UpdateLoreInput): Promise<LoreItem> => ipcRenderer.invoke('lore:update', input),
    restore: (id: string): Promise<LoreItem> => ipcRenderer.invoke('lore:restore', id),
    deletePermanent: (id: string): Promise<boolean> => ipcRenderer.invoke('lore:deletePermanent', id)
  },
  scratchpad: {
    list: (projectId: string): Promise<ScratchpadNote[]> => ipcRenderer.invoke('scratchpad:list', projectId),
    save: (note: SaveScratchpadNoteInput): Promise<ScratchpadNote> => ipcRenderer.invoke('scratchpad:save', note),
    delete: (id: number): Promise<boolean> => ipcRenderer.invoke('scratchpad:delete', id)
  },
  rules: {
    list: (projectId: string): Promise<WorldRule[]> => ipcRenderer.invoke('rules:list', projectId),
    save: (rule: SaveWorldRuleInput): Promise<WorldRule> => ipcRenderer.invoke('rules:save', rule),
    delete: (id: number): Promise<boolean> => ipcRenderer.invoke('rules:delete', id),
    reorder: (ids: number[]): Promise<boolean> => ipcRenderer.invoke('rules:reorder', ids)
  },
  goals: {
    getSummary: (projectId: string) => ipcRenderer.invoke('goals:getSummary', projectId),
    updateConfig: (projectId: string, config) => ipcRenderer.invoke('goals:updateConfig', projectId, config),
    recordProgress: (projectId: string, payload) => ipcRenderer.invoke('goals:recordProgress', projectId, payload),
    unlockAchievement: (projectId: string, achievementKey: string) =>
      ipcRenderer.invoke('goals:unlockAchievement', projectId, achievementKey)
  },
  window: {
    action: (action: WindowAction): Promise<boolean | void> => ipcRenderer.invoke('window:action', action)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error('Failed to expose preload APIs via contextBridge:', error)
  }
} else {
  // @ts-ignore Fallback for non-context-isolated environments
  window.electron = electronAPI
  // @ts-ignore Fallback for non-context-isolated environments
  window.api = api
}
