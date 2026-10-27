import { registerProjectHandlers } from './projectHandler'
import { registerFolioHandlers } from './folioHandler'
import { registerLoreHandlers } from './loreHandler'
import { registerWindowHandlers } from './windowHandler'
import { registerScratchpadHandlers } from './scratchpadHandler'

export function registerAllIpcHandlers(): void {
  registerProjectHandlers()
  registerFolioHandlers()
  registerLoreHandlers()
  registerWindowHandlers()
  registerScratchpadHandlers()
}
