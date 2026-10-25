import { ipcMain } from 'electron'
import { getDbStatus, getAllItems, insertItem, deleteItem } from '../db'
import type { CreateItemDTO } from '@shared/types'

export function registerDbHandlers(): void {
  ipcMain.handle('db:status', async () => {
    return getDbStatus()
  })

  ipcMain.handle('db:items:get', async () => {
    return getAllItems()
  })

  ipcMain.handle('db:items:create', async (_event, payload: CreateItemDTO) => {
    if (!payload || !payload.title || typeof payload.title !== 'string') {
      throw new Error('Title is required')
    }
    return insertItem(payload.title.trim(), payload.description?.trim())
  })

  ipcMain.handle('db:items:delete', async (_event, id: number) => {
    if (typeof id !== 'number') {
      throw new Error('Valid numeric ID is required')
    }
    return deleteItem(id)
  })
}
