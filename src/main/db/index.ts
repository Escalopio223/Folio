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
  UpdateLoreInput
} from '@shared/types'

let sqliteInstance: Database.Database | null = null
let drizzleInstance: BetterSQLite3Database<typeof schema> | null = null
let activeDbPath = ''

// Mappers
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
    isGraveyard: Boolean(row.isGraveyard),
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
      is_graveyard INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_folios_project_id ON folios(project_id);
    CREATE INDEX IF NOT EXISTS idx_folios_parent_id ON folios(parent_id);
    CREATE INDEX IF NOT EXISTS idx_folios_type ON folios(type);
    CREATE INDEX IF NOT EXISTS idx_folios_is_archived ON folios(is_archived);
    CREATE INDEX IF NOT EXISTS idx_folios_is_graveyard ON folios(is_graveyard);

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
  `)

  // Ensure is_graveyard column exists on legacy databases
  try {
    sqliteInstance.exec('ALTER TABLE folios ADD COLUMN is_graveyard INTEGER NOT NULL DEFAULT 0;')
  } catch {
    // Column already exists or fresh table
  }
  try {
    sqliteInstance.exec('CREATE INDEX IF NOT EXISTS idx_folios_is_graveyard ON folios(is_graveyard);')
  } catch {
    // Index already exists
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
  const conditions = [eq(schema.folios.isArchived, true), eq(schema.folios.isGraveyard, false)]
  if (projectId) conditions.push(eq(schema.folios.projectId, projectId))

  const rows = db.select().from(schema.folios)
    .where(and(...conditions))
    .orderBy(desc(schema.folios.updatedAt))
    .all()
  return rows.map(mapFolio)
}

export function getGraveyardFolios(projectId?: string): Folio[] {
  const db = getDb()
  const conditions = [eq(schema.folios.isArchived, true), eq(schema.folios.isGraveyard, true)]
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
    isGraveyard: input.isGraveyard ?? false,
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
  if (input.isGraveyard !== undefined) values.isGraveyard = input.isGraveyard

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
      isGraveyard: false,
      parentId,
      type,
      updatedAt: now
    })
    .where(eq(schema.folios.id, id))
    .returning()
    .get()

  if (!updated) throw new Error(`Error al resucitar folio ${id}`)
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
// Graveyard items are protected and NEVER purged by emptyTrash.
// -------------------------------------------------------------------------

export function emptyTrash(projectId: string): { purgedFolios: number; purgedLore: number } {
  const db = getDb()

  const foliosRes = db.delete(schema.folios)
    .where(and(
      eq(schema.folios.projectId, projectId),
      eq(schema.folios.isArchived, true),
      eq(schema.folios.isGraveyard, false)
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

