export interface DbStatus {
  connected: boolean
  filePath: string
  recordsCount: number
  journalMode: string
  driver: string
  orm: string
  sqliteVersion: string
}

export interface Item {
  id: number
  title: string
  description?: string | null
  status: string
  createdAt: string
}

export interface CreateItemDTO {
  title: string
  description?: string
}

export type WindowAction = 'minimize' | 'maximize' | 'close' | 'isMaximized'

export interface FolioApi {
  getDbStatus: () => Promise<DbStatus>
  getItems: () => Promise<Item[]>
  createItem: (data: CreateItemDTO) => Promise<Item>
  deleteItem: (id: number) => Promise<boolean>
  windowAction: (action: WindowAction) => Promise<boolean | void>
}
