import { ipcMain } from 'electron'
import {
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject
} from '../db'
import type { CreateProjectInput, UpdateProjectInput } from '@shared/types'

export function registerProjectHandlers(): void {
  ipcMain.handle('project:getAll', async () => {
    return getAllProjects()
  })

  ipcMain.handle('project:getById', async (_event, id: string) => {
    if (!id || typeof id !== 'string') {
      throw new Error('Valid project ID is required')
    }
    return getProjectById(id)
  })

  ipcMain.handle('project:create', async (_event, input: CreateProjectInput) => {
    if (!input || !input.title?.trim()) {
      throw new Error('Project title is required')
    }
    return createProject(input)
  })

  ipcMain.handle('project:update', async (_event, input: UpdateProjectInput) => {
    if (!input || !input.id) {
      throw new Error('Valid project ID is required for update')
    }
    return updateProject(input)
  })

  ipcMain.handle('project:delete', async (_event, id: string) => {
    if (!id) {
      throw new Error('Valid project ID is required for deletion')
    }
    return deleteProject(id)
  })
}
