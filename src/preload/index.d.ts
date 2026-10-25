import { ElectronAPI } from '@electron-toolkit/preload'
import type { FolioApi } from '../shared/types'

declare global {
  interface Window {
    electron: ElectronAPI
    api: FolioApi
  }
}
