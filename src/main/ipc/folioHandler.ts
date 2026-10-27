import { ipcMain } from 'electron'
import {
  getAllFolios,
  getTrashFolios,
  getGraveyardFolios,
  getFolioById,
  createFolio,
  updateFolio,
  restoreFolio,
  deleteFolioPermanent,
  emptyTrash
} from '../db'
import type { CreateFolioInput, UpdateFolioInput } from '@shared/types'

export function registerFolioHandlers(): void {
  ipcMain.handle('folio:getAll', async (_event, projectId?: string) => {
    return getAllFolios(projectId)
  })

  ipcMain.handle('folio:getTrash', async (_event, projectId?: string) => {
    return getTrashFolios(projectId)
  })

  ipcMain.handle('folio:getGraveyard', async (_event, projectId?: string) => {
    return getGraveyardFolios(projectId)
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

  ipcMain.handle('folio:restore', async (_event, id: string) => {
    if (!id || typeof id !== 'string') {
      throw new Error('Valid folio ID is required for restore')
    }
    return restoreFolio(id)
  })

  ipcMain.handle('folio:deletePermanent', async (_event, id: string) => {
    if (!id || typeof id !== 'string') {
      throw new Error('Valid folio ID is required for deletion')
    }
    return deleteFolioPermanent(id)
  })

  ipcMain.handle('folio:emptyTrash', async (_event, projectId: string) => {
    if (!projectId || typeof projectId !== 'string') {
      throw new Error('Valid project ID is required to empty trash')
    }
    return emptyTrash(projectId)
  })
}
