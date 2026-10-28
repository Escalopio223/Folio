import { ipcMain } from 'electron'
import {
  getGoalsSummary,
  updateProjectGoals,
  recordWritingProgress,
  unlockAchievement
} from '../db'
import type { ProjectGoals, RecordProgressPayload } from '@shared/types'

export function registerGoalsHandlers(): void {
  ipcMain.handle('goals:getSummary', async (_event, projectId: string) => {
    if (!projectId) {
      throw new Error('Se requiere un ID de proyecto válido para obtener metas y logros')
    }
    return getGoalsSummary(projectId)
  })

  ipcMain.handle(
    'goals:updateConfig',
    async (_event, projectId: string, config: Partial<ProjectGoals>) => {
      if (!projectId) {
        throw new Error('Se requiere un ID de proyecto válido para actualizar metas')
      }
      return updateProjectGoals(projectId, config || {})
    }
  )

  ipcMain.handle(
    'goals:recordProgress',
    async (_event, projectId: string, payload: RecordProgressPayload) => {
      if (!projectId) {
        throw new Error('Se requiere un ID de proyecto válido para registrar progreso diario')
      }
      return recordWritingProgress(projectId, payload || {})
    }
  )

  ipcMain.handle(
    'goals:unlockAchievement',
    async (_event, projectId: string, achievementKey: string) => {
      if (!projectId || !achievementKey) {
        throw new Error('Se requieren projectId y achievementKey válidos')
      }
      return unlockAchievement(projectId, achievementKey)
    }
  )
}
