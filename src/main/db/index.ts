import Database from 'better-sqlite3'
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { app } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import * as schema from './schema'
import type { DbStatus, Item } from '@shared/types'

let sqliteInstance: Database.Database | null = null
let drizzleInstance: BetterSQLite3Database<typeof schema> | null = null
let activeDbPath = ''

export function initDatabase(): {
  sqlite: Database.Database
  db: BetterSQLite3Database<typeof schema>
  path: string
} {
  if (sqliteInstance && drizzleInstance) {
    return {
      sqlite: sqliteInstance,
      db: drizzleInstance,
      path: activeDbPath
    }
  }

  const isProd = app.isPackaged
  activeDbPath = isProd
    ? path.join(app.getPath('userData'), 'folio.db')
    : path.resolve(process.cwd(), 'dev.db')

  // Ensure directory exists
  fs.mkdirSync(path.dirname(activeDbPath), { recursive: true })

  sqliteInstance = new Database(activeDbPath)

  // Configure SQLite for high performance and integrity
  sqliteInstance.pragma('journal_mode = WAL')
  sqliteInstance.pragma('foreign_keys = ON')

  // Initialize schema if not present
  sqliteInstance.exec(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)

  // Check initial records and seed on first run
  const countRow = sqliteInstance.prepare('SELECT count(*) as count FROM items').get() as { count: number }
  if (countRow.count === 0) {
    const stmt = sqliteInstance.prepare('INSERT INTO items (title, description) VALUES (?, ?)')
    stmt.run('Bienvenido a Folio', 'Espacio de trabajo local-first impulsado por SQLite y Drizzle ORM.')
    stmt.run('Arquitectura IPC Reactiva', 'Proceso Main gestionando SQLite en comunicación tipada con Vue 3.')
  }

  drizzleInstance = drizzle(sqliteInstance, { schema })

  return {
    sqlite: sqliteInstance,
    db: drizzleInstance,
    path: activeDbPath
  }
}

export function getDb(): BetterSQLite3Database<typeof schema> {
  if (!drizzleInstance) {
    initDatabase()
  }
  return drizzleInstance!
}

export function getSqlite(): Database.Database {
  if (!sqliteInstance) {
    initDatabase()
  }
  return sqliteInstance!
}

export function getDbStatus(): DbStatus {
  const sqlite = getSqlite()
  const journalModeRow = sqlite.pragma('journal_mode') as Array<{ journal_mode: string }>
  const journalMode = Array.isArray(journalModeRow) && journalModeRow[0]
    ? (journalModeRow[0].journal_mode || 'wal')
    : 'wal'

  const countRow = sqlite.prepare('SELECT count(*) as count FROM items').get() as { count: number }
  const versionRow = sqlite.prepare('SELECT sqlite_version() as version').get() as { version: string }

  return {
    connected: true,
    filePath: activeDbPath,
    recordsCount: countRow.count,
    journalMode: String(journalMode).toUpperCase(),
    driver: 'better-sqlite3 (Native C++)',
    orm: 'Drizzle ORM',
    sqliteVersion: versionRow.version
  }
}

export function getAllItems(): Item[] {
  const db = getDb()
  const rows = db.select().from(schema.items).all()
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    status: r.status,
    createdAt: r.createdAt
  }))
}

export function insertItem(title: string, description?: string): Item {
  const db = getDb()
  const result = db.insert(schema.items).values({
    title,
    description: description || null
  }).returning().get()

  return {
    id: result.id,
    title: result.title,
    description: result.description,
    status: result.status,
    createdAt: result.createdAt
  }
}

export function deleteItem(id: number): boolean {
  const sqlite = getSqlite()
  const info = sqlite.prepare('DELETE FROM items WHERE id = ?').run(id)
  return info.changes > 0
}
