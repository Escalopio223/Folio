import Database from 'better-sqlite3'
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { eq, and, desc, asc } from 'drizzle-orm'
import { app } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'
import * as schema from './schema'
import type {
  Project,
  CreateProjectInput,
  UpdateProjectInput,
  Folio,
  CreateFolioInput,
  UpdateFolioInput,
  LoreItem,
  CreateLoreInput,
  UpdateLoreInput,
  ScratchpadNote,
  SaveScratchpadNoteInput,
  WorldRule,
  SaveWorldRuleInput,
  ProjectGoals,
  DailyWritingLog,
  UnlockedAchievement,
  GoalsSummary,
  RecordProgressPayload
} from '@shared/types'

let sqliteInstance: Database.Database | null = null
let drizzleInstance: BetterSQLite3Database<typeof schema> | null = null
let activeDbPath = ''

// Mappers
function mapProjectGoals(row: schema.ProjectGoalsSelect): ProjectGoals {
  return {
    projectId: row.projectId,
    targetTotalWords: row.targetTotalWords,
    dailyWordGoal: row.dailyWordGoal,
    dailySceneGoal: row.dailySceneGoal,
    dailyChapterGoal: row.dailyChapterGoal,
    deadlineDate: row.deadlineDate,
    updatedAt: row.updatedAt
  }
}

function mapDailyWritingLog(row: schema.DailyWritingLogSelect): DailyWritingLog {
  return {
    id: row.id,
    projectId: row.projectId,
    date: row.date,
    wordsWritten: row.wordsWritten,
    scenesCreated: row.scenesCreated,
    chaptersCreated: row.chaptersCreated,
    goalMet: Boolean(row.goalMet)
  }
}

function mapUnlockedAchievement(row: schema.UnlockedAchievementSelect): UnlockedAchievement {
  return {
    id: row.id,
    projectId: row.projectId,
    achievementKey: row.achievementKey,
    unlockedAt: row.unlockedAt
  }
}

function mapWorldRule(row: schema.WorldRuleSelect): WorldRule {
  return {
    id: row.id,
    projectId: row.projectId,
    category: row.category,
    title: row.title,
    axiom: row.axiom,
    details: row.details,
    limitations: row.limitations,
    orderIndex: row.orderIndex,
    isPinned: Boolean(row.isPinned),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  }
}

function mapScratchpadNote(row: schema.ScratchpadNoteSelect): ScratchpadNote {
  return {
    id: row.id,
    projectId: row.projectId,
    title: row.title || '',
    content: row.content,
    isPinned: Boolean(row.isPinned),
    colorTag: row.colorTag,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  }
}
function mapProject(row: schema.ProjectSelect): Project {
  return {
    id: row.id,
    title: row.title,
    synopsis: row.synopsis,
    genre: row.genre,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  }
}

function mapFolio(row: schema.FolioSelect): Folio {
  return {
    id: row.id,
    projectId: row.projectId,
    parentId: row.parentId,
    type: row.type as 'chapter' | 'scene',
    title: row.title,
    content: row.content,
    synopsis: row.synopsis,
    icon: row.icon || 'FileText',
    sortOrder: row.sortOrder,
    status: row.status,
    isFavorite: Boolean(row.isFavorite),
    isArchived: Boolean(row.isArchived),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  }
}

function mapLoreItem(row: schema.LoreItemSelect): LoreItem {
  let parsedAttrs: Record<string, string>
  try {
    parsedAttrs = JSON.parse(row.attributes || '{}')
  } catch {
    parsedAttrs = {}
  }

  return {
    id: row.id,
    projectId: row.projectId,
    category: row.category,
    name: row.name,
    summary: row.summary,
    content: row.content,
    attributes: parsedAttrs,
    icon: row.icon || 'User',
    isFavorite: Boolean(row.isFavorite),
    isArchived: Boolean(row.isArchived),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  }
}

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

  fs.mkdirSync(path.dirname(activeDbPath), { recursive: true })

  sqliteInstance = new Database(activeDbPath)
  sqliteInstance.pragma('journal_mode = WAL')
  sqliteInstance.pragma('foreign_keys = ON')

  // Create tables & indexes
  sqliteInstance.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL DEFAULT 'Sin título',
      synopsis TEXT NOT NULL DEFAULT '',
      genre TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS folios (
      id TEXT PRIMARY KEY NOT NULL,
      project_id TEXT NOT NULL,
      parent_id TEXT,
      type TEXT NOT NULL DEFAULT 'chapter',
      title TEXT NOT NULL DEFAULT 'Sin título',
      content TEXT NOT NULL DEFAULT '',
      synopsis TEXT NOT NULL DEFAULT '',
      icon TEXT DEFAULT 'FileText',
      sort_order INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'draft',
      is_favorite INTEGER NOT NULL DEFAULT 0,
      is_archived INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_folios_project_id ON folios(project_id);
    CREATE INDEX IF NOT EXISTS idx_folios_parent_id ON folios(parent_id);
    CREATE INDEX IF NOT EXISTS idx_folios_type ON folios(type);
    CREATE INDEX IF NOT EXISTS idx_folios_is_archived ON folios(is_archived);

    CREATE TABLE IF NOT EXISTS lore_items (
      id TEXT PRIMARY KEY NOT NULL,
      project_id TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'personaje',
      name TEXT NOT NULL,
      summary TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      attributes TEXT NOT NULL DEFAULT '{}',
      icon TEXT DEFAULT 'User',
      is_favorite INTEGER NOT NULL DEFAULT 0,
      is_archived INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_lore_project_id ON lore_items(project_id);
    CREATE INDEX IF NOT EXISTS idx_lore_category ON lore_items(category);
    CREATE INDEX IF NOT EXISTS idx_lore_is_archived ON lore_items(is_archived);

    CREATE TABLE IF NOT EXISTS scratchpad_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      is_pinned INTEGER NOT NULL DEFAULT 0,
      color_tag TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_scratchpad_project_id ON scratchpad_notes(project_id);
    CREATE INDEX IF NOT EXISTS idx_scratchpad_is_pinned ON scratchpad_notes(is_pinned);

    CREATE TABLE IF NOT EXISTS world_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      axiom TEXT NOT NULL,
      details TEXT,
      limitations TEXT,
      order_index INTEGER NOT NULL DEFAULT 0,
      is_pinned INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_rules_project_id ON world_rules(project_id);
    CREATE INDEX IF NOT EXISTS idx_rules_category ON world_rules(category);
    CREATE INDEX IF NOT EXISTS idx_rules_is_pinned ON world_rules(is_pinned);
    CREATE INDEX IF NOT EXISTS idx_rules_order ON world_rules(order_index);

    CREATE TABLE IF NOT EXISTS project_goals (
      project_id TEXT PRIMARY KEY NOT NULL,
      target_total_words INTEGER NOT NULL DEFAULT 50000,
      daily_word_goal INTEGER NOT NULL DEFAULT 500,
      daily_scene_goal INTEGER NOT NULL DEFAULT 1,
      daily_chapter_goal INTEGER NOT NULL DEFAULT 0,
      deadline_date TEXT,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS daily_writing_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT NOT NULL,
      date TEXT NOT NULL,
      words_written INTEGER NOT NULL DEFAULT 0,
      scenes_created INTEGER NOT NULL DEFAULT 0,
      chapters_created INTEGER NOT NULL DEFAULT 0,
      goal_met INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      UNIQUE(project_id, date)
    );
    CREATE INDEX IF NOT EXISTS idx_daily_logs_project_date ON daily_writing_logs(project_id, date);

    CREATE TABLE IF NOT EXISTS unlocked_achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT NOT NULL,
      achievement_key TEXT NOT NULL,
      unlocked_at INTEGER NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      UNIQUE(project_id, achievement_key)
    );
    CREATE INDEX IF NOT EXISTS idx_unlocked_achievements_project ON unlocked_achievements(project_id);
  `)

  // Asegurar que la columna title existe en bases de datos ya inicializadas
  try {
    const tableColumns = sqliteInstance.prepare("PRAGMA table_info(scratchpad_notes)").all() as Array<{ name: string }>
    const hasTitle = tableColumns.some((col) => col.name === 'title')
    if (!hasTitle) {
      sqliteInstance.exec('ALTER TABLE scratchpad_notes ADD COLUMN title TEXT NOT NULL DEFAULT "";')
    }
  } catch (err) {
    console.warn('[Folio DB] scratchpad title column migration check:', err)
  }

  drizzleInstance = drizzle(sqliteInstance, { schema })

  // Seed default Project, Chapters/Scenes, and Lore Wiki if empty
  const projectCount = sqliteInstance.prepare('SELECT count(*) as count FROM projects').get() as { count: number }
  if (projectCount.count === 0) {
    const now = new Date()
    const defaultProjectId = crypto.randomUUID()

    // 1. Project
    drizzleInstance.insert(schema.projects).values({
      id: defaultProjectId,
      title: 'El Archivo de las Sombras',
      synopsis: 'Un manuscrito de intriga y fantasía sobre bibliotecas perdidas y códices olvidados.',
      genre: 'Fantasía / Misterio',
      createdAt: now,
      updatedAt: now
    }).run()

    // 2. Chapters & Scenes
    const chapter1Id = crypto.randomUUID()
    drizzleInstance.insert(schema.folios).values({
      id: chapter1Id,
      projectId: defaultProjectId,
      parentId: null,
      type: 'chapter',
      title: 'Capítulo I: El Despertar de la Cera',
      content: '',
      synopsis: 'Aria encuentra el primer sello terracota en la torre este.',
      sortOrder: 1,
      status: 'in_progress',
      isFavorite: true,
      isArchived: false,
      createdAt: now,
      updatedAt: now
    }).run()

    drizzleInstance.insert(schema.folios).values({
      id: crypto.randomUUID(),
      projectId: defaultProjectId,
      parentId: chapter1Id,
      type: 'scene',
      title: 'Escena 1: La Torre del Alba',
      content: 'La tenue luz del amanecer se filtraba entre los vitrales polvorientos del archivo central. Aria sostenía una pluma gastada mientras observaba la inscripción grabada en la mesa de roble.',
      synopsis: 'Aria examina los archivos al amanecer.',
      sortOrder: 1,
      status: 'in_progress',
      isFavorite: false,
      isArchived: false,
      createdAt: now,
      updatedAt: now
    }).run()

    drizzleInstance.insert(schema.folios).values({
      id: crypto.randomUUID(),
      projectId: defaultProjectId,
      parentId: chapter1Id,
      type: 'scene',
      title: 'Escena 2: El Mensajero Silencioso',
      content: 'Un crujido lejano en el pasillo interrumpió la lectura. No era el viento; alguien había burlado las cerraduras de bronce.',
      synopsis: 'Alguien irrumpe en el santuario.',
      sortOrder: 2,
      status: 'draft',
      isFavorite: false,
      isArchived: false,
      createdAt: now,
      updatedAt: now
    }).run()

    const chapter2Id = crypto.randomUUID()
    drizzleInstance.insert(schema.folios).values({
      id: chapter2Id,
      projectId: defaultProjectId,
      parentId: null,
      type: 'chapter',
      title: 'Capítulo II: La Ciudad Sumergida',
      content: '',
      synopsis: 'La expedición hacia las antiguas ruinas lacustres.',
      sortOrder: 2,
      status: 'draft',
      isFavorite: false,
      isArchived: false,
      createdAt: now,
      updatedAt: now
    }).run()

    drizzleInstance.insert(schema.folios).values({
      id: crypto.randomUUID(),
      projectId: defaultProjectId,
      parentId: chapter2Id,
      type: 'scene',
      title: 'Escena 1: Orillas de Niebla',
      content: 'Las aguas del lago permanecían inmóviles como un espejo de obsidiana.',
      synopsis: 'Llegada a las costas del lago.',
      sortOrder: 1,
      status: 'draft',
      isFavorite: false,
      isArchived: false,
      createdAt: now,
      updatedAt: now
    }).run()

    // 3. Lore Wiki Items (Characters, Places, Items, Concepts)
    drizzleInstance.insert(schema.loreItems).values([
      {
        id: crypto.randomUUID(),
        projectId: defaultProjectId,
        category: 'personaje',
        name: 'Aria Thorne',
        summary: 'Joven archivista con talento para la criptografía antigua.',
        content: 'Nacida en el distrito de los encuadernadores, Aria descubrió a temprana edad que podía descifrar inscripciones que volvían locos a los eruditos del consejo.',
        attributes: JSON.stringify({ Rol: 'Protagonista', Edad: '24', Rango: 'Archivista Tercera Clase' }),
        icon: 'User',
        isFavorite: true,
        isArchived: false,
        createdAt: now,
        updatedAt: now
      },
      {
        id: crypto.randomUUID(),
        projectId: defaultProjectId,
        category: 'personaje',
        name: 'Maestro Kaelen',
        summary: 'Custodio mayor del archivo de bronce.',
        content: 'Un anciano de pocas palabras y mirada penetrante. Guarda las llaves maestras de las bóvedas inferiores.',
        attributes: JSON.stringify({ Rol: 'Mentor', Estado: 'Desaparecido', Afiliación: 'Orden de la Cera' }),
        icon: 'User',
        isFavorite: false,
        isArchived: false,
        createdAt: now,
        updatedAt: now
      },
      {
        id: crypto.randomUUID(),
        projectId: defaultProjectId,
        category: 'lugar',
        name: 'El Archivo Central de Oakhaven',
        summary: 'Fortaleza de piedra caliza donde se guardan siglos de códices.',
        content: 'Construido en lo alto del acantilado, cuenta con siete niveles de galerías circulares iluminadas por lámparas de aceite perpetuas.',
        attributes: JSON.stringify({ Región: 'Meseta Central', Clima: 'Templado y brumoso', Acceso: 'Restringido' }),
        icon: 'MapPin',
        isFavorite: true,
        isArchived: false,
        createdAt: now,
        updatedAt: now
      },
      {
        id: crypto.randomUUID(),
        projectId: defaultProjectId,
        category: 'objeto',
        name: 'El Sello de Cera Terracota',
        summary: 'Amuleto ancestral que protege documentos contra el desgaste y ojos profanos.',
        content: 'Un disco cerámico grabado a fuego que emite un calor imperceptible al entrar en contacto con su legítimo dueño.',
        attributes: JSON.stringify({ Rareza: 'Artefacto Único', Material: 'Cera alquímica y bronce' }),
        icon: 'Key',
        isFavorite: false,
        isArchived: false,
        createdAt: now,
        updatedAt: now
      },
      {
        id: crypto.randomUUID(),
        projectId: defaultProjectId,
        category: 'idea',
        name: 'El Dogma del Silencio',
        summary: 'Ideal filosófico que rige el comportamiento de los escribas.',
        content: '“Aquel que transcribe la memoria de los reyes renuncia a escribir la suya propia.”',
        attributes: JSON.stringify({ Tipo: 'Filosofía / Juramento', Origen: 'Primera Era' }),
        icon: 'Lightbulb',
        isFavorite: false,
        isArchived: false,
        createdAt: now,
        updatedAt: now
      }
    ]).run()

    console.log(`[Folio DB] Seeded initial novel project with chapters, scenes and lore wiki.`)
  }

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

// -------------------------------------------------------------------------
// PROJECTS
// -------------------------------------------------------------------------

export function getAllProjects(): Project[] {
  const db = getDb()
  const rows = db.select().from(schema.projects).orderBy(desc(schema.projects.updatedAt)).all()
  return rows.map(mapProject)
}

export function getProjectById(id: string): Project | null {
  const db = getDb()
  const row = db.select().from(schema.projects).where(eq(schema.projects.id, id)).get()
  return row ? mapProject(row) : null
}

export function createProject(input: CreateProjectInput): Project {
  const db = getDb()
  const now = new Date()
  const newId = crypto.randomUUID()

  const inserted = db.insert(schema.projects).values({
    id: newId,
    title: input.title.trim() || 'Nuevo Libro',
    synopsis: input.synopsis?.trim() || '',
    genre: input.genre?.trim() || '',
    createdAt: now,
    updatedAt: now
  }).returning().get()

  // Create an initial chapter for zero-friction writing
  createFolio({
    projectId: newId,
    parentId: null,
    type: 'chapter',
    title: 'Capítulo I',
    content: ''
  })

  return mapProject(inserted)
}

export function updateProject(input: UpdateProjectInput): Project {
  const db = getDb()
  const now = new Date()

  const values: Partial<typeof schema.projects.$inferInsert> = {
    updatedAt: now
  }
  if (input.title !== undefined) values.title = input.title
  if (input.synopsis !== undefined) values.synopsis = input.synopsis
  if (input.genre !== undefined) values.genre = input.genre

  const updated = db.update(schema.projects)
    .set(values)
    .where(eq(schema.projects.id, input.id))
    .returning()
    .get()

  if (!updated) throw new Error(`Proyecto ${input.id} no encontrado`)
  return mapProject(updated)
}

export function deleteProject(id: string): boolean {
  const db = getDb()
  db.delete(schema.folios).where(eq(schema.folios.projectId, id)).run()
  db.delete(schema.loreItems).where(eq(schema.loreItems.projectId, id)).run()
  db.delete(schema.scratchpadNotes).where(eq(schema.scratchpadNotes.projectId, id)).run()
  const res = db.delete(schema.projects).where(eq(schema.projects.id, id)).run()
  return res.changes > 0
}

// -------------------------------------------------------------------------
// FOLIOS (CHAPTERS & SCENES)
// -------------------------------------------------------------------------

export function getAllFolios(projectId?: string): Folio[] {
  const db = getDb()
  const query = db.select().from(schema.folios)
  
  if (projectId) {
    const rows = query.where(and(eq(schema.folios.projectId, projectId), eq(schema.folios.isArchived, false)))
      .orderBy(asc(schema.folios.sortOrder), desc(schema.folios.updatedAt))
      .all()
    return rows.map(mapFolio)
  }

  const rows = query.where(eq(schema.folios.isArchived, false))
    .orderBy(asc(schema.folios.sortOrder), desc(schema.folios.updatedAt))
    .all()
  return rows.map(mapFolio)
}

export function getTrashFolios(projectId?: string): Folio[] {
  const db = getDb()
  const conditions = [eq(schema.folios.isArchived, true)]
  if (projectId) conditions.push(eq(schema.folios.projectId, projectId))

  const rows = db.select().from(schema.folios)
    .where(and(...conditions))
    .orderBy(desc(schema.folios.updatedAt))
    .all()
  return rows.map(mapFolio)
}

export function getFolioById(id: string): Folio | null {
  const db = getDb()
  const row = db.select().from(schema.folios).where(eq(schema.folios.id, id)).get()
  return row ? mapFolio(row) : null
}

export function createFolio(input: CreateFolioInput): Folio {
  const db = getDb()
  const now = new Date()
  const newId = crypto.randomUUID()

  const inserted = db.insert(schema.folios).values({
    id: newId,
    projectId: input.projectId,
    parentId: input.parentId ?? null,
    type: input.type || (input.parentId ? 'scene' : 'chapter'),
    title: input.title?.trim() || (input.parentId ? 'Nueva Escena' : 'Nuevo Capítulo'),
    content: input.content ?? '',
    synopsis: input.synopsis ?? '',
    icon: input.icon || 'FileText',
    sortOrder: input.sortOrder ?? 0,
    status: input.status || 'draft',
    isFavorite: false,
    isArchived: false,
    createdAt: now,
    updatedAt: now
  }).returning().get()

  return mapFolio(inserted)
}

export function updateFolio(input: UpdateFolioInput): Folio {
  const db = getDb()
  const now = new Date()

  const values: Partial<typeof schema.folios.$inferInsert> = {
    updatedAt: now
  }
  if (input.title !== undefined) values.title = input.title
  if (input.content !== undefined) values.content = input.content
  if (input.synopsis !== undefined) values.synopsis = input.synopsis
  if (input.parentId !== undefined) values.parentId = input.parentId
  if (input.type !== undefined) values.type = input.type
  if (input.sortOrder !== undefined) values.sortOrder = input.sortOrder
  if (input.status !== undefined) values.status = input.status
  if (input.icon !== undefined) values.icon = input.icon
  if (input.isFavorite !== undefined) values.isFavorite = input.isFavorite
  if (input.isArchived !== undefined) values.isArchived = input.isArchived

  const updated = db.update(schema.folios)
    .set(values)
    .where(eq(schema.folios.id, input.id))
    .returning()
    .get()

  if (!updated) throw new Error(`Folio ${input.id} no encontrado`)
  return mapFolio(updated)
}

export function restoreFolio(id: string): Folio {
  const db = getDb()
  const now = new Date()
  const folio = getFolioById(id)
  if (!folio) throw new Error(`Folio ${id} no encontrado`)

  let parentId = folio.parentId
  let type = folio.type

  // Si tiene capítulo padre, verificar que aún exista y no esté archivado
  if (parentId) {
    const parent = db.select().from(schema.folios).where(eq(schema.folios.id, parentId)).get()
    if (!parent || parent.isArchived) {
      parentId = null
      type = 'chapter'
    }
  }

  const updated = db.update(schema.folios)
    .set({
      isArchived: false,
      parentId,
      type,
      updatedAt: now
    })
    .where(eq(schema.folios.id, id))
    .returning()
    .get()

  if (!updated) throw new Error(`Error al restaurar folio ${id}`)
  return mapFolio(updated)
}

export function deleteFolioPermanent(id: string): boolean {
  const db = getDb()
  const res = db.delete(schema.folios).where(eq(schema.folios.id, id)).run()
  return res.changes > 0
}

// -------------------------------------------------------------------------
// LORE ITEMS (DYNAMIC WIKI / LIBRERÍA DE DATOS)
// -------------------------------------------------------------------------

export function getAllLore(projectId?: string, category?: string): LoreItem[] {
  const db = getDb()
  const conditions = [eq(schema.loreItems.isArchived, false)]
  if (projectId) conditions.push(eq(schema.loreItems.projectId, projectId))
  if (category && category !== 'todos') conditions.push(eq(schema.loreItems.category, category))

  const rows = db.select().from(schema.loreItems)
    .where(and(...conditions))
    .orderBy(desc(schema.loreItems.updatedAt))
    .all()

  return rows.map(mapLoreItem)
}

export function getTrashLore(projectId?: string): LoreItem[] {
  const db = getDb()
  const conditions = [eq(schema.loreItems.isArchived, true)]
  if (projectId) conditions.push(eq(schema.loreItems.projectId, projectId))

  const rows = db.select().from(schema.loreItems)
    .where(and(...conditions))
    .orderBy(desc(schema.loreItems.updatedAt))
    .all()

  return rows.map(mapLoreItem)
}

export function getLoreById(id: string): LoreItem | null {
  const db = getDb()
  const row = db.select().from(schema.loreItems).where(eq(schema.loreItems.id, id)).get()
  return row ? mapLoreItem(row) : null
}

export function createLore(input: CreateLoreInput): LoreItem {
  const db = getDb()
  const now = new Date()
  const newId = crypto.randomUUID()

  const inserted = db.insert(schema.loreItems).values({
    id: newId,
    projectId: input.projectId,
    category: input.category.toLowerCase().trim() || 'personaje',
    name: input.name.trim() || 'Nuevo Registro',
    summary: input.summary?.trim() || '',
    content: input.content ?? '',
    attributes: JSON.stringify(input.attributes || {}),
    icon: input.icon || 'User',
    isFavorite: false,
    isArchived: false,
    createdAt: now,
    updatedAt: now
  }).returning().get()

  return mapLoreItem(inserted)
}

export function updateLore(input: UpdateLoreInput): LoreItem {
  const db = getDb()
  const now = new Date()

  const values: Partial<typeof schema.loreItems.$inferInsert> = {
    updatedAt: now
  }
  if (input.category !== undefined) values.category = input.category.toLowerCase().trim()
  if (input.name !== undefined) values.name = input.name
  if (input.summary !== undefined) values.summary = input.summary
  if (input.content !== undefined) values.content = input.content
  if (input.attributes !== undefined) values.attributes = JSON.stringify(input.attributes)
  if (input.icon !== undefined) values.icon = input.icon
  if (input.isFavorite !== undefined) values.isFavorite = input.isFavorite
  if (input.isArchived !== undefined) values.isArchived = input.isArchived

  const updated = db.update(schema.loreItems)
    .set(values)
    .where(eq(schema.loreItems.id, input.id))
    .returning()
    .get()

  if (!updated) throw new Error(`Registro ${input.id} no encontrado en la librería`)
  return mapLoreItem(updated)
}

export function deleteLorePermanent(id: string): boolean {
  const db = getDb()
  const res = db.delete(schema.loreItems).where(eq(schema.loreItems.id, id)).run()
  return res.changes > 0
}

export function restoreLore(id: string): LoreItem {
  const db = getDb()
  const now = new Date()
  const updated = db.update(schema.loreItems)
    .set({
      isArchived: false,
      updatedAt: now
    })
    .where(eq(schema.loreItems.id, id))
    .returning()
    .get()

  if (!updated) throw new Error(`Registro ${id} no encontrado en la librería`)
  return mapLoreItem(updated)
}

// -------------------------------------------------------------------------
// PURGE / EMPTY TRASH (IRREVERSIBLE PURGE FOR ARCHIVED TRASH ITEMS)
// -------------------------------------------------------------------------

export function emptyTrash(projectId: string): { purgedFolios: number; purgedLore: number } {
  const db = getDb()

  const foliosRes = db.delete(schema.folios)
    .where(and(
      eq(schema.folios.projectId, projectId),
      eq(schema.folios.isArchived, true)
    ))
    .run()

  const loreRes = db.delete(schema.loreItems)
    .where(and(
      eq(schema.loreItems.projectId, projectId),
      eq(schema.loreItems.isArchived, true)
    ))
    .run()

  return {
    purgedFolios: foliosRes.changes,
    purgedLore: loreRes.changes
  }
}

// -------------------------------------------------------------------------
// SCRATCHPAD (BLOC DE CAPTURA RÁPIDA)
// -------------------------------------------------------------------------

export function getScratchpadNotes(projectId: string): ScratchpadNote[] {
  const db = getDb()
  const rows = db.select()
    .from(schema.scratchpadNotes)
    .where(eq(schema.scratchpadNotes.projectId, projectId))
    .orderBy(desc(schema.scratchpadNotes.isPinned), desc(schema.scratchpadNotes.updatedAt))
    .all()

  return rows.map(mapScratchpadNote)
}

export function saveScratchpadNote(input: SaveScratchpadNoteInput): ScratchpadNote {
  const db = getDb()
  const now = new Date()

  if (input.id) {
    const existing = db.select()
      .from(schema.scratchpadNotes)
      .where(eq(schema.scratchpadNotes.id, input.id))
      .get()

    if (existing) {
      const values: Partial<typeof schema.scratchpadNotes.$inferInsert> = {
        updatedAt: now
      }
      if (input.title !== undefined) values.title = input.title
      if (input.content !== undefined) values.content = input.content
      if (input.isPinned !== undefined) values.isPinned = input.isPinned
      if (input.colorTag !== undefined) values.colorTag = input.colorTag

      const updated = db.update(schema.scratchpadNotes)
        .set(values)
        .where(eq(schema.scratchpadNotes.id, input.id))
        .returning()
        .get()

      if (!updated) throw new Error(`Nota ${input.id} no encontrada`)
      return mapScratchpadNote(updated)
    }
  }

  // Crear nueva nota rápida
  const inserted = db.insert(schema.scratchpadNotes).values({
    projectId: input.projectId,
    title: input.title ?? '',
    content: input.content ?? '',
    isPinned: input.isPinned ?? false,
    colorTag: input.colorTag ?? null,
    createdAt: now,
    updatedAt: now
  }).returning().get()

  return mapScratchpadNote(inserted)
}

export function deleteScratchpadNote(id: number): boolean {
  const db = getDb()
  const res = db.delete(schema.scratchpadNotes).where(eq(schema.scratchpadNotes.id, id)).run()
  return res.changes > 0
}

// -------------------------------------------------------------------------
// REGLAS DEL MUNDO (LEYES, CÓDIGOS, AXIOMAS Y SISTEMAS)
// -------------------------------------------------------------------------

export function getWorldRules(projectId: string): WorldRule[] {
  const db = getDb()
  const rows = db.select()
    .from(schema.worldRules)
    .where(eq(schema.worldRules.projectId, projectId))
    .orderBy(
      desc(schema.worldRules.isPinned),
      asc(schema.worldRules.category),
      asc(schema.worldRules.orderIndex),
      desc(schema.worldRules.updatedAt)
    )
    .all()

  return rows.map(mapWorldRule)
}

export function saveWorldRule(input: SaveWorldRuleInput): WorldRule {
  const db = getDb()
  const now = new Date()

  if (input.id) {
    const existing = db.select()
      .from(schema.worldRules)
      .where(eq(schema.worldRules.id, input.id))
      .get()

    if (existing) {
      const values: Partial<typeof schema.worldRules.$inferInsert> = {
        updatedAt: now
      }
      if (input.category !== undefined) values.category = input.category
      if (input.title !== undefined) values.title = input.title
      if (input.axiom !== undefined) values.axiom = input.axiom
      if (input.details !== undefined) values.details = input.details
      if (input.limitations !== undefined) values.limitations = input.limitations
      if (input.orderIndex !== undefined) values.orderIndex = input.orderIndex
      if (input.isPinned !== undefined) values.isPinned = input.isPinned

      const updated = db.update(schema.worldRules)
        .set(values)
        .where(eq(schema.worldRules.id, input.id))
        .returning()
        .get()

      if (!updated) throw new Error(`Regla ${input.id} no encontrada`)
      return mapWorldRule(updated)
    }
  }

  // Si no se especifica orderIndex, calculamos el siguiente
  let nextOrderIndex = input.orderIndex ?? 0
  if (input.orderIndex === undefined) {
    const highest = db.select({ maxOrder: schema.worldRules.orderIndex })
      .from(schema.worldRules)
      .where(eq(schema.worldRules.projectId, input.projectId))
      .orderBy(desc(schema.worldRules.orderIndex))
      .limit(1)
      .get()
    nextOrderIndex = highest?.maxOrder !== undefined ? highest.maxOrder + 1 : 0
  }

  // Insertar nueva regla del mundo
  const inserted = db.insert(schema.worldRules).values({
    projectId: input.projectId,
    category: input.category,
    title: input.title,
    axiom: input.axiom,
    details: input.details ?? null,
    limitations: input.limitations ?? null,
    orderIndex: nextOrderIndex,
    isPinned: input.isPinned ?? false,
    createdAt: now,
    updatedAt: now
  }).returning().get()

  return mapWorldRule(inserted)
}

export function deleteWorldRule(id: number): boolean {
  const db = getDb()
  const res = db.delete(schema.worldRules).where(eq(schema.worldRules.id, id)).run()
  return res.changes > 0
}

export function reorderWorldRules(ids: number[]): boolean {
  const sqlite = getSqlite()
  const updateStmt = sqlite.prepare('UPDATE world_rules SET order_index = ?, updated_at = ? WHERE id = ?')

  const now = Date.now()
  const transaction = sqlite.transaction((ruleIds: number[]) => {
    for (let i = 0; i < ruleIds.length; i++) {
      updateStmt.run(i, now, ruleIds[i])
    }
  })

  transaction(ids)
  return true
}

// =========================================================================
// GESTIÓN DE METAS EDITORIALES, LOGS DIARIOS Y LOGROS (GAMIFICACIÓN)
// =========================================================================

export function getLocalDateStr(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getProjectGoals(projectId: string): ProjectGoals {
  const db = getDb()
  const existing = db
    .select()
    .from(schema.projectGoals)
    .where(eq(schema.projectGoals.projectId, projectId))
    .get()

  if (existing) {
    return mapProjectGoals(existing)
  }

  const now = new Date()
  const inserted = db
    .insert(schema.projectGoals)
    .values({
      projectId,
      targetTotalWords: 50000,
      dailyWordGoal: 500,
      dailySceneGoal: 1,
      dailyChapterGoal: 0,
      deadlineDate: null,
      updatedAt: now
    })
    .returning()
    .get()

  return mapProjectGoals(inserted)
}

export function updateProjectGoals(projectId: string, input: Partial<ProjectGoals>): ProjectGoals {
  const db = getDb()
  const current = getProjectGoals(projectId)
  const now = new Date()

  const updated = db
    .update(schema.projectGoals)
    .set({
      targetTotalWords: input.targetTotalWords ?? current.targetTotalWords,
      dailyWordGoal: input.dailyWordGoal ?? current.dailyWordGoal,
      dailySceneGoal: input.dailySceneGoal ?? current.dailySceneGoal,
      dailyChapterGoal: input.dailyChapterGoal ?? current.dailyChapterGoal,
      deadlineDate: input.deadlineDate !== undefined ? input.deadlineDate : current.deadlineDate,
      updatedAt: now
    })
    .where(eq(schema.projectGoals.projectId, projectId))
    .returning()
    .get()

  return mapProjectGoals(updated)
}

export function getTodayWritingLog(projectId: string, dateStr?: string): DailyWritingLog {
  const db = getDb()
  const targetDate = dateStr || getLocalDateStr()
  const existing = db
    .select()
    .from(schema.dailyWritingLogs)
    .where(
      and(
        eq(schema.dailyWritingLogs.projectId, projectId),
        eq(schema.dailyWritingLogs.date, targetDate)
      )
    )
    .get()

  if (existing) {
    return mapDailyWritingLog(existing)
  }

  return {
    id: 0,
    projectId,
    date: targetDate,
    wordsWritten: 0,
    scenesCreated: 0,
    chaptersCreated: 0,
    goalMet: false
  }
}

export function recordWritingProgress(
  projectId: string,
  payload: RecordProgressPayload
): DailyWritingLog {
  const sqlite = getSqlite()
  const todayStr = getLocalDateStr()
  const goals = getProjectGoals(projectId)

  const wordDelta = payload.wordDelta ?? 0
  const sceneDelta = payload.sceneDelta ?? 0
  const chapterDelta = payload.chapterDelta ?? 0

  // Atomic UPSERT usando ON CONFLICT nativo de SQLite
  const upsertStmt = sqlite.prepare(`
    INSERT INTO daily_writing_logs (project_id, date, words_written, scenes_created, chapters_created, goal_met)
    VALUES (?, ?, MAX(0, ?), MAX(0, ?), MAX(0, ?), 0)
    ON CONFLICT(project_id, date) DO UPDATE SET
      words_written = MAX(0, daily_writing_logs.words_written + ?),
      scenes_created = MAX(0, daily_writing_logs.scenes_created + ?),
      chapters_created = MAX(0, daily_writing_logs.chapters_created + ?)
    RETURNING id, project_id as projectId, date, words_written as wordsWritten,
              scenes_created as scenesCreated, chapters_created as chaptersCreated, goal_met as goalMet
  `)

  const row = upsertStmt.get(
    projectId,
    todayStr,
    wordDelta,
    sceneDelta,
    chapterDelta,
    wordDelta,
    sceneDelta,
    chapterDelta
  ) as schema.DailyWritingLogSelect

  // Verificar si la meta diaria de palabras se ha cumplido
  const isGoalMet = row.wordsWritten >= goals.dailyWordGoal
  if (Boolean(row.goalMet) !== isGoalMet) {
    sqlite
      .prepare('UPDATE daily_writing_logs SET goal_met = ? WHERE id = ?')
      .run(isGoalMet ? 1 : 0, row.id)
    row.goalMet = isGoalMet
  }

  return mapDailyWritingLog(row)
}

export function getRecentWritingLogs(projectId: string, days = 30): DailyWritingLog[] {
  const db = getDb()
  const rows = db
    .select()
    .from(schema.dailyWritingLogs)
    .where(eq(schema.dailyWritingLogs.projectId, projectId))
    .orderBy(desc(schema.dailyWritingLogs.date))
    .limit(days)
    .all()

  return rows.map(mapDailyWritingLog)
}

export function getUnlockedAchievements(projectId: string): UnlockedAchievement[] {
  const db = getDb()
  const rows = db
    .select()
    .from(schema.unlockedAchievements)
    .where(eq(schema.unlockedAchievements.projectId, projectId))
    .orderBy(desc(schema.unlockedAchievements.unlockedAt))
    .all()

  return rows.map(mapUnlockedAchievement)
}

export function unlockAchievement(
  projectId: string,
  achievementKey: string
): UnlockedAchievement | null {
  const db = getDb()

  // Evitar duplicados si ya fue desbloqueado
  const existing = db
    .select()
    .from(schema.unlockedAchievements)
    .where(
      and(
        eq(schema.unlockedAchievements.projectId, projectId),
        eq(schema.unlockedAchievements.achievementKey, achievementKey)
      )
    )
    .get()

  if (existing) {
    return null
  }

  const now = new Date()
  const inserted = db
    .insert(schema.unlockedAchievements)
    .values({
      projectId,
      achievementKey,
      unlockedAt: now
    })
    .returning()
    .get()

  return mapUnlockedAchievement(inserted)
}

export function getTotalManuscriptWords(projectId: string): number {
  const sqlite = getSqlite()
  const stmt = sqlite.prepare(`
    SELECT content FROM folios
    WHERE project_id = ? AND is_archived = 0
  `)
  const rows = stmt.all(projectId) as Array<{ content: string }>

  let totalWords = 0
  for (const row of rows) {
    const clean = (row.content || '').replace(/<[^>]*>/g, ' ').trim()
    if (clean) {
      totalWords += clean.split(/\s+/).length
    }
  }
  return totalWords
}

export function calculateCurrentStreak(logs: DailyWritingLog[]): number {
  if (!logs || logs.length === 0) return 0

  const logMap = new Map<string, boolean>()
  for (const log of logs) {
    if (log.goalMet) {
      logMap.set(log.date, true)
    }
  }

  const today = new Date()
  const todayStr = getLocalDateStr(today)

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = getLocalDateStr(yesterday)

  // Si hoy ya cumplió la meta, la racha cuenta desde hoy.
  // Si hoy aún no la cumple, pero ayer sí, la racha sigue viva desde ayer.
  let checkDate: Date
  if (logMap.get(todayStr)) {
    checkDate = new Date(today)
  } else if (logMap.get(yesterdayStr)) {
    checkDate = new Date(yesterday)
  } else {
    return 0
  }

  let streak = 0
  while (true) {
    const dateStr = getLocalDateStr(checkDate)
    if (logMap.get(dateStr)) {
      streak++
      checkDate.setDate(checkDate.getDate() - 1)
    } else {
      break
    }
  }

  return streak
}

export function getGoalsSummary(projectId: string): GoalsSummary {
  const config = getProjectGoals(projectId)
  const todayLog = getTodayWritingLog(projectId)
  const recentHistory = getRecentWritingLogs(projectId, 30)
  const unlockedAchievements = getUnlockedAchievements(projectId)
  const totalManuscriptWords = getTotalManuscriptWords(projectId)
  const currentStreak = calculateCurrentStreak(recentHistory)

  return {
    config,
    todayLog,
    recentHistory,
    unlockedAchievements,
    totalManuscriptWords,
    currentStreak
  }
}


