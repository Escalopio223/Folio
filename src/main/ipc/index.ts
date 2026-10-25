import { registerProjectHandlers } from './projectHandler'
import { registerFolioHandlers } from './folioHandler'
import { registerLoreHandlers } from './loreHandler'
import { registerWindowHandlers } from './windowHandler'

export function registerAllIpcHandlers(): void {
  registerProjectHandlers()
  registerFolioHandlers()
  registerLoreHandlers()
  registerWindowHandlers()
}
