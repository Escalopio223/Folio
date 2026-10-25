import { ipcMain } from 'electron'
import {
  getAllLore,
  getTrashLore,
  getLoreById,
  createLore,
  updateLore,
  deleteLorePermanent
} from '../db'
import type { CreateLoreInput, UpdateLoreInput } from '@shared/types'

export function registerLoreHandlers(): void {
  ipcMain.handle('lore:getAll', async (_event, projectId?: string, category?: string) => {
    return getAllLore(projectId, category)
  })

  ipcMain.handle('lore:getTrash', async (_event, projectId?: string) => {
    return getTrashLore(projectId)
  })

  ipcMain.handle('lore:getById', async (_event, id: string) => {
    if (!id || typeof id !== 'string') {
      throw new Error('Valid lore ID is required')
    }
    return getLoreById(id)
  })

  ipcMain.handle('lore:create', async (_event, input: CreateLoreInput) => {
    if (!input || !input.name?.trim()) {
      throw new Error('Lore item name is required')
    }
    return createLore(input)
  })

  ipcMain.handle('lore:update', async (_event, input: UpdateLoreInput) => {
    if (!input || !input.id) {
      throw new Error('Valid lore ID is required for update')
    }
    return updateLore(input)
  })

  ipcMain.handle('lore:deletePermanent', async (_event, id: string) => {
    if (!id) {
      throw new Error('Valid lore ID is required for deletion')
    }
    return deleteLorePermanent(id)
  })
}
