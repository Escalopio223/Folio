import { ipcMain } from 'electron'
import {
  getAllFolios,
  getTrashFolios,
  getFolioById,
  createFolio,
  updateFolio,
  deleteFolioPermanent
} from '../db'
import type { CreateFolioInput, UpdateFolioInput } from '@shared/types'

export function registerFolioHandlers(): void {
  ipcMain.handle('folio:getAll', async (_event, projectId?: string) => {
    return getAllFolios(projectId)
  })

  ipcMain.handle('folio:getTrash', async (_event, projectId?: string) => {
    return getTrashFolios(projectId)
  })

  ipcMain.handle('folio:getById', async (_event, id: string) => {
    if (!id || typeof id !== 'string') {
      throw new Error('Valid folio ID is required')
    }
    return getFolioById(id)
  })

  ipcMain.handle('folio:create', async (_event, input: CreateFolioInput) => {
    return createFolio(input)
  })

  ipcMain.handle('folio:update', async (_event, input: UpdateFolioInput) => {
    if (!input || !input.id || typeof input.id !== 'string') {
      throw new Error('Valid folio ID is required for update')
    }
    return updateFolio(input)
  })

  ipcMain.handle('folio:deletePermanent', async (_event, id: string) => {
    if (!id || typeof id !== 'string') {
      throw new Error('Valid folio ID is required for deletion')
    }
    return deleteFolioPermanent(id)
  })
}
