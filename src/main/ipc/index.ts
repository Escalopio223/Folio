import { registerDbHandlers } from './dbHandler'
import { registerWindowHandlers } from './windowHandler'

export function registerAllIpcHandlers(): void {
  registerDbHandlers()
  registerWindowHandlers()
}
