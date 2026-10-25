import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { FolioApi, DbStatus, Item, CreateItemDTO, WindowAction } from '@shared/types'

const api: FolioApi = {
  getDbStatus: (): Promise<DbStatus> => ipcRenderer.invoke('db:status'),
  getItems: (): Promise<Item[]> => ipcRenderer.invoke('db:items:get'),
  createItem: (data: CreateItemDTO): Promise<Item> => ipcRenderer.invoke('db:items:create', data),
  deleteItem: (id: number): Promise<boolean> => ipcRenderer.invoke('db:items:delete', id),
  windowAction: (action: WindowAction): Promise<boolean | void> => ipcRenderer.invoke('window:action', action)
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
