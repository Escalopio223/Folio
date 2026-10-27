import { ipcMain } from 'electron'
import {
  getScratchpadNotes,
  saveScratchpadNote,
  deleteScratchpadNote
} from '../db'
import type { SaveScratchpadNoteInput } from '@shared/types'

export function registerScratchpadHandlers(): void {
  ipcMain.handle('scratchpad:list', async (_event, projectId: string) => {
    if (!projectId) return []
    return getScratchpadNotes(projectId)
  })

  ipcMain.handle('scratchpad:save', async (_event, note: SaveScratchpadNoteInput) => {
    if (!note || !note.projectId) {
      throw new Error('Valid projectId is required to save scratchpad note')
    }
    return saveScratchpadNote(note)
  })

  ipcMain.handle('scratchpad:delete', async (_event, id: number) => {
    if (typeof id !== 'number') {
      throw new Error('Valid numeric note ID is required')
    }
    return deleteScratchpadNote(id)
  })
}
