import { registerProjectHandlers } from './projectHandler'
import { registerFolioHandlers } from './folioHandler'
import { registerLoreHandlers } from './loreHandler'
import { registerWindowHandlers } from './windowHandler'
import { registerScratchpadHandlers } from './scratchpadHandler'
import { registerRulesHandlers } from './rulesHandler'
import { registerGoalsHandlers } from './goalsHandler'
import { registerExportHandlers } from './exportHandler'
import { registerSpellcheckHandlers } from './spellcheckHandler'

export function registerAllIpcHandlers(): void {
  registerProjectHandlers()
  registerFolioHandlers()
  registerLoreHandlers()
  registerWindowHandlers()
  registerScratchpadHandlers()
  registerRulesHandlers()
  registerGoalsHandlers()
  registerExportHandlers()
  registerSpellcheckHandlers()
}
