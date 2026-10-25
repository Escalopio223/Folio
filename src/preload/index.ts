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
    deletePermanent: (id: string): Promise<boolean> => ipcRenderer.invoke('folio:deletePermanent', id)
  },
  lore: {
    getAll: (projectId?: string, category?: string): Promise<LoreItem[]> =>
      ipcRenderer.invoke('lore:getAll', projectId, category),
    getTrash: (projectId?: string): Promise<LoreItem[]> => ipcRenderer.invoke('lore:getTrash', projectId),
    getById: (id: string): Promise<LoreItem | null> => ipcRenderer.invoke('lore:getById', id),
    create: (input: CreateLoreInput): Promise<LoreItem> => ipcRenderer.invoke('lore:create', input),
    update: (input: UpdateLoreInput): Promise<LoreItem> => ipcRenderer.invoke('lore:update', input),
    deletePermanent: (id: string): Promise<boolean> => ipcRenderer.invoke('lore:deletePermanent', id)
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
