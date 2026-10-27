import { ipcMain } from 'electron'
import {
  getWorldRules,
  saveWorldRule,
  deleteWorldRule,
  reorderWorldRules
} from '../db'
import type { SaveWorldRuleInput } from '@shared/types'

export function registerRulesHandlers(): void {
  ipcMain.handle('rules:list', async (_event, projectId: string) => {
    if (!projectId) return []
    return getWorldRules(projectId)
  })

  ipcMain.handle('rules:save', async (_event, rule: SaveWorldRuleInput) => {
    if (!rule || !rule.projectId) {
      throw new Error('Se requiere un ID de proyecto válido para guardar una regla')
    }
    return saveWorldRule(rule)
  })

  ipcMain.handle('rules:delete', async (_event, id: number) => {
    if (typeof id !== 'number') {
      throw new Error('Se requiere un ID numérico válido para eliminar una regla')
    }
    return deleteWorldRule(id)
  })

  ipcMain.handle('rules:reorder', async (_event, ids: number[]) => {
    if (!Array.isArray(ids)) {
      throw new Error('Se requiere una lista de IDs para reordenar las reglas')
    }
    return reorderWorldRules(ids)
  })
}
