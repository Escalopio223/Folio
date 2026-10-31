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
  FolioType,
  FolioStatus,
  ChapterTitleFormat,
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

export function computeWordCount(htmlOrText: string): number {
  const withoutBreaks = (htmlOrText || '').replace(
    /<div[^>]*data-type=["']scene-break["'][^>]*>[\s\S]*?<\/div>/gi,
    ' '
  )
  const clean = withoutBreaks.replace(/<[^>]*>/g, ' ').trim()
  if (!clean) return 0
  return clean.split(/\s+/).length
}

function normalizeFolioType(rawType?: string | null): FolioType {
  if (rawType === 'frontmatter' || rawType === 'backmatter') return rawType
  return 'chapter'
}

function normalizeFolioStatus(rawStatus?: string | null): FolioStatus {
  if (rawStatus === 'done' || rawStatus === 'completed') return 'done'
  if (rawStatus === 'in_progress') return 'in_progress'
  return 'draft'
}

// Mappers
function mapProjectGoals(row: schema.ProjectGoalsSelect): ProjectGoals {
  return {
    projectId: row.projectId,
    targetTotalWords: row.targetTotalWords,
    dailyWordGoal: row.dailyWordGoal,
    dailyChapterGoal: row.dailyChapterGoal,
    deadlineDate: row.deadlineDate,
    askSessionGoalOnStartup:
      row.askSessionGoalOnStartup === undefined ? true : Boolean(row.askSessionGoalOnStartup),
    updatedAt: row.updatedAt
  }
}

function mapDailyWritingLog(row: schema.DailyWritingLogSelect): DailyWritingLog {
  return {
    id: row.id,
    projectId: row.projectId,
    date: row.date,
    wordsWritten: row.wordsWritten ?? 0,
    chaptersCompleted: row.chaptersCompleted ?? 0,
    sessionGoalsHit: row.sessionGoalsHit ?? 0,
    goalMet: Boolean(row.goalMet)
  }
}

function mapUnlockedAchievement(row: schema.UnlockedAchievementSelect): UnlockedAchievement {
  return {
    id: row.id,
    projectId: row.projectId,
    achievementKey: row.achievementKey,
    customLabel: row.customLabel ?? null,
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

function parseTitleFormat(raw?: string | null): ChapterTitleFormat | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    const alignment =
      parsed.alignment === 'center' || parsed.alignment === 'right' ? parsed.alignment : 'left'
    const showDivider = parsed.showDivider === undefined ? true : Boolean(parsed.showDivider)
    const fontFamily = typeof parsed.fontFamily === 'string' ? parsed.fontFamily : ''
    const color = typeof parsed.color === 'string' ? parsed.color : ''
    const parsedSize = Number(parsed.fontSize)
    const fontSize = !isNaN(parsedSize) && parsedSize >= 6 && parsedSize <= 96 ? parsedSize : 32
    return {
      alignment,
      showDivider,
      fontFamily,
      color,
      fontSize
    }
  } catch {
    return null
  }
}

function mapFolio(row: schema.FolioSelect): Folio {
  const content = row.content || ''
  const wordCount =
    typeof row.wordCount === 'number' && row.wordCount > 0
      ? row.wordCount
      : computeWordCount(content)

  return {
    id: row.id,
    projectId: row.projectId,
    type: normalizeFolioType(row.type),
    title: row.title,
    subtitle: row.subtitle || '',
    synopsis: row.synopsis || '',
    povTag: row.povTag || '',
    timeline: row.timeline ?? null,
    location: row.location ?? null,
    chapterTitleFormat: parseTitleFormat(row.titleFormat),
    targetWords: row.targetWords ?? 0,
    includeInExport: row.includeInExport === undefined ? true : Boolean(row.includeInExport),
    content,
    status: normalizeFolioStatus(row.status),
    wordCount,
    orderIndex: row.orderIndex ?? 0,
    icon: row.icon || 'FileText',
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

  // 1. Crear tablas base si no existen (sin índices sobre columnas migradas aún)
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
      type TEXT NOT NULL DEFAULT 'chapter',
      title TEXT NOT NULL DEFAULT 'Sin título',
      subtitle TEXT NOT NULL DEFAULT '',
      synopsis TEXT NOT NULL DEFAULT '',
      pov_tag TEXT NOT NULL DEFAULT '',
      timeline TEXT,
      location TEXT,
      title_format TEXT,
      target_words INTEGER NOT NULL DEFAULT 0,
      include_in_export INTEGER NOT NULL DEFAULT 1,
      content TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft',
      word_count INTEGER NOT NULL DEFAULT 0,
      order_index INTEGER NOT NULL DEFAULT 0,
      icon TEXT DEFAULT 'FileText',
      is_favorite INTEGER NOT NULL DEFAULT 0,
      is_archived INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

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

    CREATE TABLE IF NOT EXISTS project_goals (
      project_id TEXT PRIMARY KEY NOT NULL,
      target_total_words INTEGER NOT NULL DEFAULT 50000,
      daily_word_goal INTEGER NOT NULL DEFAULT 500,
      daily_chapter_goal INTEGER NOT NULL DEFAULT 0,
      deadline_date TEXT,
      ask_session_goal_on_startup INTEGER NOT NULL DEFAULT 1,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS daily_writing_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT NOT NULL,
      date TEXT NOT NULL,
      words_written INTEGER NOT NULL DEFAULT 0,
      chapters_completed INTEGER NOT NULL DEFAULT 0,
      session_goals_hit INTEGER NOT NULL DEFAULT 0,
      goal_met INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      UNIQUE(project_id, date)
    );

    CREATE TABLE IF NOT EXISTS unlocked_achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT NOT NULL,
      achievement_key TEXT NOT NULL,
      custom_label TEXT,
      unlocked_at INTEGER NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      UNIQUE(project_id, achievement_key)
    );
  `)

  // =========================================================================
  // 2. MIGRACIÓN AUTOMÁTICA NO DESTRUCTIVA Y CONSOLIDACIÓN DE ESCENAS EN CAPÍTULOS
  // =========================================================================
  try {
    const getTableCols = (tableName: string): Set<string> => {
      const cols = sqliteInstance!
        .prepare(`PRAGMA table_info(${tableName})`)
        .all() as Array<{ name: string }>
      return new Set(cols.map((c) => c.name))
    }

    const folioCols = getTableCols('folios')

    if (!folioCols.has('subtitle')) {
      sqliteInstance.exec("ALTER TABLE folios ADD COLUMN subtitle TEXT NOT NULL DEFAULT '';")
    }
    if (!folioCols.has('synopsis')) {
      sqliteInstance.exec("ALTER TABLE folios ADD COLUMN synopsis TEXT NOT NULL DEFAULT '';")
    }
    if (!folioCols.has('pov_tag')) {
      sqliteInstance.exec("ALTER TABLE folios ADD COLUMN pov_tag TEXT NOT NULL DEFAULT '';")
    }
    if (!folioCols.has('timeline')) {
      sqliteInstance.exec('ALTER TABLE folios ADD COLUMN timeline TEXT;')
    }
    if (!folioCols.has('location')) {
      sqliteInstance.exec('ALTER TABLE folios ADD COLUMN location TEXT;')
    }
    if (!folioCols.has('title_format')) {
      sqliteInstance.exec('ALTER TABLE folios ADD COLUMN title_format TEXT;')
    }
    if (!folioCols.has('target_words')) {
      sqliteInstance.exec('ALTER TABLE folios ADD COLUMN target_words INTEGER NOT NULL DEFAULT 0;')
    }
    if (!folioCols.has('include_in_export')) {
      sqliteInstance.exec(
        'ALTER TABLE folios ADD COLUMN include_in_export INTEGER NOT NULL DEFAULT 1;'
      )
    }
    if (!folioCols.has('word_count')) {
      sqliteInstance.exec('ALTER TABLE folios ADD COLUMN word_count INTEGER NOT NULL DEFAULT 0;')
    }
    if (!folioCols.has('order_index')) {
      sqliteInstance.exec('ALTER TABLE folios ADD COLUMN order_index INTEGER NOT NULL DEFAULT 0;')
      if (folioCols.has('sort_order')) {
        sqliteInstance.exec('UPDATE folios SET order_index = sort_order;')
      }
    } else if (folioCols.has('sort_order')) {
      sqliteInstance.exec(
        'UPDATE folios SET order_index = sort_order WHERE order_index = 0 AND sort_order != 0;'
      )
    }

    // Normalizar estados heredados ('completed' -> 'done')
    sqliteInstance.exec("UPDATE folios SET status = 'done' WHERE status = 'completed';")

    // Consolidar escenas hijas (parent_id IS NOT NULL) dentro de su capítulo padre sin perder texto
    if (folioCols.has('parent_id')) {
      const orderColumn = folioCols.has('sort_order')
        ? 'order_index ASC, sort_order ASC'
        : 'order_index ASC'
      const childRows = sqliteInstance
        .prepare(
          `SELECT id, parent_id, title, content, synopsis, is_archived as isArchived
           FROM folios
           WHERE parent_id IS NOT NULL
           ORDER BY ${orderColumn}, created_at ASC`
        )
        .all() as Array<{
        id: string
        parent_id: string
        title: string
        content: string
        synopsis: string
        isArchived: number
      }>

      if (childRows.length > 0) {
        const consolidateTx = sqliteInstance.transaction(() => {
          const childrenByParent = new Map<string, typeof childRows>()
          for (const child of childRows) {
            const list = childrenByParent.get(child.parent_id) || []
            list.push(child)
            childrenByParent.set(child.parent_id, list)
          }

          for (const [parentChapterId, children] of childrenByParent.entries()) {
            const parent = sqliteInstance!
              .prepare(
                'SELECT id, content, synopsis, is_archived as isArchived FROM folios WHERE id = ?'
              )
              .get(parentChapterId) as
              | { id: string; content: string; synopsis: string; isArchived: number }
              | undefined

            if (parent) {
              const activeBlocks: string[] = []
              if (parent.content && parent.content.trim()) {
                activeBlocks.push(parent.content.trim())
              }

              for (const child of children) {
                if (child.isArchived && !parent.isArchived) {
                  // Mantener en la papelera como capítulo independiente para que no se pierda ni ensucie el capítulo activo
                  const childWords = computeWordCount(child.content || '')
                  sqliteInstance!
                    .prepare(
                      "UPDATE folios SET parent_id = NULL, type = 'chapter', word_count = ? WHERE id = ?"
                    )
                    .run(childWords, child.id)
                } else {
                  const trimmed = (child.content || '').trim()
                  if (trimmed) {
                    const wrapped = /^<(p|h[1-6]|blockquote|div|ul|ol)/i.test(trimmed)
                      ? trimmed
                      : `<p>${trimmed}</p>`
                    activeBlocks.push(wrapped)
                  }
                  sqliteInstance!.prepare('DELETE FROM folios WHERE id = ?').run(child.id)
                }
              }

              const mergedContent = activeBlocks.join('<hr data-type="scene-break">')
              const mergedWords = computeWordCount(mergedContent)
              sqliteInstance!
                .prepare(
                  "UPDATE folios SET content = ?, word_count = ?, type = 'chapter' WHERE id = ?"
                )
                .run(mergedContent, mergedWords, parent.id)
            } else {
              // Huérfanas sin padre: promover a capítulo plano
              for (const orphan of children) {
                const w = computeWordCount(orphan.content || '')
                sqliteInstance!
                  .prepare(
                    "UPDATE folios SET parent_id = NULL, type = 'chapter', word_count = ? WHERE id = ?"
                  )
                  .run(w, orphan.id)
              }
            }
          }
        })
        consolidateTx()
      }

      // Asegurar que ningún registro quede con type = 'scene'
      sqliteInstance.exec(
        "UPDATE folios SET type = 'chapter' WHERE type NOT IN ('frontmatter', 'chapter', 'backmatter');"
      )
    }

    // Recalcular word_count para todos los folios existentes
    const allFoliosForCount = sqliteInstance
      .prepare('SELECT id, content, word_count as wordCount FROM folios')
      .all() as Array<{ id: string; content: string; wordCount: number }>
    const updateWordCountStmt = sqliteInstance.prepare(
      'UPDATE folios SET word_count = ? WHERE id = ?'
    )
    for (const f of allFoliosForCount) {
      const actual = computeWordCount(f.content || '')
      if (f.wordCount !== actual) {
        updateWordCountStmt.run(actual, f.id)
      }
    }

    const scratchpadCols = getTableCols('scratchpad_notes')
    if (!scratchpadCols.has('title')) {
      sqliteInstance.exec("ALTER TABLE scratchpad_notes ADD COLUMN title TEXT NOT NULL DEFAULT '';")
    }
    if (!scratchpadCols.has('is_pinned')) {
      sqliteInstance.exec(
        'ALTER TABLE scratchpad_notes ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0;'
      )
    }
    if (!scratchpadCols.has('color_tag')) {
      sqliteInstance.exec('ALTER TABLE scratchpad_notes ADD COLUMN color_tag TEXT;')
    }

    const rulesCols = getTableCols('world_rules')
    if (!rulesCols.has('details')) {
      sqliteInstance.exec('ALTER TABLE world_rules ADD COLUMN details TEXT;')
    }
    if (!rulesCols.has('limitations')) {
      sqliteInstance.exec('ALTER TABLE world_rules ADD COLUMN limitations TEXT;')
    }
    if (!rulesCols.has('order_index')) {
      sqliteInstance.exec(
        'ALTER TABLE world_rules ADD COLUMN order_index INTEGER NOT NULL DEFAULT 0;'
      )
    }
    if (!rulesCols.has('is_pinned')) {
      sqliteInstance.exec(
        'ALTER TABLE world_rules ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0;'
      )
    }

    const goalsCols = getTableCols('project_goals')
    if (!goalsCols.has('daily_chapter_goal')) {
      sqliteInstance.exec(
        'ALTER TABLE project_goals ADD COLUMN daily_chapter_goal INTEGER NOT NULL DEFAULT 0;'
      )
    }
    if (!goalsCols.has('deadline_date')) {
      sqliteInstance.exec('ALTER TABLE project_goals ADD COLUMN deadline_date TEXT;')
    }
    if (!goalsCols.has('ask_session_goal_on_startup')) {
      sqliteInstance.exec(
        'ALTER TABLE project_goals ADD COLUMN ask_session_goal_on_startup INTEGER NOT NULL DEFAULT 1;'
      )
    }

    const logsCols = getTableCols('daily_writing_logs')
    if (!logsCols.has('chapters_completed')) {
      sqliteInstance.exec(
        'ALTER TABLE daily_writing_logs ADD COLUMN chapters_completed INTEGER NOT NULL DEFAULT 0;'
      )
      if (logsCols.has('chapters_created')) {
        sqliteInstance.exec('UPDATE daily_writing_logs SET chapters_completed = chapters_created;')
      }
    }
    if (!logsCols.has('session_goals_hit')) {
      sqliteInstance.exec(
        'ALTER TABLE daily_writing_logs ADD COLUMN session_goals_hit INTEGER NOT NULL DEFAULT 0;'
      )
    }

    const achCols = getTableCols('unlocked_achievements')
    if (!achCols.has('custom_label')) {
      sqliteInstance.exec('ALTER TABLE unlocked_achievements ADD COLUMN custom_label TEXT;')
    }
  } catch (err) {
    console.warn('[Folio DB] column migration check:', err)
  }

  // 3. Crear índices una vez que todas las columnas (incluyendo order_index) están garantizadas
  sqliteInstance.exec(`
    CREATE INDEX IF NOT EXISTS idx_folios_project_id ON folios(project_id);
    CREATE INDEX IF NOT EXISTS idx_folios_type ON folios(type);
    CREATE INDEX IF NOT EXISTS idx_folios_order_index ON folios(order_index);
    CREATE INDEX IF NOT EXISTS idx_folios_is_archived ON folios(is_archived);

    CREATE INDEX IF NOT EXISTS idx_lore_project_id ON lore_items(project_id);
    CREATE INDEX IF NOT EXISTS idx_lore_category ON lore_items(category);
    CREATE INDEX IF NOT EXISTS idx_lore_is_archived ON lore_items(is_archived);

    CREATE INDEX IF NOT EXISTS idx_scratchpad_project_id ON scratchpad_notes(project_id);
    CREATE INDEX IF NOT EXISTS idx_scratchpad_is_pinned ON scratchpad_notes(is_pinned);

    CREATE INDEX IF NOT EXISTS idx_rules_project_id ON world_rules(project_id);
    CREATE INDEX IF NOT EXISTS idx_rules_category ON world_rules(category);
    CREATE INDEX IF NOT EXISTS idx_rules_is_pinned ON world_rules(is_pinned);
    CREATE INDEX IF NOT EXISTS idx_rules_order ON world_rules(order_index);

    CREATE INDEX IF NOT EXISTS idx_daily_logs_project_date ON daily_writing_logs(project_id, date);
    CREATE INDEX IF NOT EXISTS idx_unlocked_achievements_project ON unlocked_achievements(project_id);
  `)

  drizzleInstance = drizzle(sqliteInstance, { schema })

  // Seed default Project, Flat Chapters, and Lore Wiki if empty
  const projectCount = sqliteInstance
    .prepare('SELECT count(*) as count FROM projects')
    .get() as { count: number }
  if (projectCount.count === 0) {
    const now = new Date()
    const defaultProjectId = crypto.randomUUID()

    // 1. Project
    drizzleInstance
      .insert(schema.projects)
      .values({
        id: defaultProjectId,
        title: 'El Archivo de las Sombras',
        synopsis:
          'Un manuscrito de intriga y fantasía sobre bibliotecas perdidas y códices olvidados.',
        genre: 'Fantasía / Misterio',
        createdAt: now,
        updatedAt: now
      })
      .run()

    // 2. Flat Chapters (Frontmatter + Chapters with SceneBreaks)
    const prologueContent =
      '<p>«Aquel que transcribe la memoria de los reyes renuncia a escribir la suya propia.»</p><p>En los anales de Oakhaven, ningún custodio pronunciaba su propio nombre al cruzar el umbral de bronce. Las lámparas de aceite ardían día y noche alimentando la penumbra cálida de las siete galerías.</p>'

    drizzleInstance
      .insert(schema.folios)
      .values({
        id: crypto.randomUUID(),
        projectId: defaultProjectId,
        type: 'frontmatter',
        title: 'Prólogo: El Juramento de la Cera',
        subtitle: 'Del Códice de los Silentes, Libro Primero',
        synopsis: 'Introducción atmosférica a la Orden de la Cera y las leyes del Archivo.',
        povTag: 'Códice · Primera Era',
        targetWords: 300,
        includeInExport: true,
        content: prologueContent,
        status: 'done',
        wordCount: computeWordCount(prologueContent),
        orderIndex: 1,
        isFavorite: false,
        isArchived: false,
        createdAt: now,
        updatedAt: now
      })
      .run()

    const chapter1Content =
      '<p>La tenue luz del amanecer se filtraba entre los vitrales polvorientos del archivo central. Aria sostenía una pluma gastada mientras observaba la inscripción grabada en la mesa de roble.</p><div data-type="scene-break" class="scene-break">* * *</div><p>Un crujido lejano en el pasillo interrumpió la lectura. No era el viento; alguien había burlado las cerraduras de bronce de la torre este.</p>'

    drizzleInstance
      .insert(schema.folios)
      .values({
        id: crypto.randomUUID(),
        projectId: defaultProjectId,
        type: 'chapter',
        title: 'Capítulo I: El Despertar de la Cera',
        subtitle: 'Donde el silencio de la torre se quiebra al amanecer',
        synopsis:
          'Aria examina los archivos al amanecer cuando un intruso irrumpe en el santuario.',
        povTag: 'Aria · Presente',
        targetWords: 1500,
        includeInExport: true,
        content: chapter1Content,
        status: 'in_progress',
        wordCount: computeWordCount(chapter1Content),
        orderIndex: 2,
        isFavorite: true,
        isArchived: false,
        createdAt: now,
        updatedAt: now
      })
      .run()

    const chapter2Content =
      '<p>Las aguas del lago permanecían inmóviles como un espejo de obsidiana. En la orilla cubierta de bruma, las barcas aguardaban sin barquero.</p>'

    drizzleInstance
      .insert(schema.folios)
      .values({
        id: crypto.randomUUID(),
        projectId: defaultProjectId,
        type: 'chapter',
        title: 'Capítulo II: La Ciudad Sumergida',
        subtitle: 'Las aguas de obsidiana no devuelven sus secretos',
        synopsis: 'La expedición hacia las antiguas ruinas lacustres en busca del Maestro Kaelen.',
        povTag: 'Aria · Presente',
        targetWords: 2000,
        includeInExport: true,
        content: chapter2Content,
        status: 'draft',
        wordCount: computeWordCount(chapter2Content),
        orderIndex: 3,
        isFavorite: false,
        isArchived: false,
        createdAt: now,
        updatedAt: now
      })
      .run()

    // 3. Lore Wiki Items
    drizzleInstance
      .insert(schema.loreItems)
      .values([
        {
          id: crypto.randomUUID(),
          projectId: defaultProjectId,
          category: 'personaje',
          name: 'Aria Thorne',
          summary: 'Joven archivista con talento para la criptografía antigua.',
          content:
            'Nacida en el distrito de los encuadernadores, Aria descubrió a temprana edad que podía descifrar inscripciones que volvían locos a los eruditos del consejo.',
          attributes: JSON.stringify({
            Rol: 'Protagonista',
            Edad: '24',
            Rango: 'Archivista Tercera Clase'
          }),
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
          content:
            'Un anciano de pocas palabras y mirada penetrante. Guarda las llaves maestras de las bóvedas inferiores.',
          attributes: JSON.stringify({
            Rol: 'Mentor',
            Estado: 'Desaparecido',
            Afiliación: 'Orden de la Cera'
          }),
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
          content:
            'Construido en lo alto del acantilado, cuenta con siete niveles de galerías circulares iluminadas por lámparas de aceite perpetuas.',
          attributes: JSON.stringify({
            Región: 'Meseta Central',
            Clima: 'Templado y brumoso',
            Acceso: 'Restringido'
          }),
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
          content:
            'Un disco cerámico grabado a fuego que emite un calor imperceptible al entrar en contacto con su legítimo dueño.',
          attributes: JSON.stringify({
            Rareza: 'Artefacto Único',
            Material: 'Cera alquímica y bronce'
          }),
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
          content:
            '“Aquel que transcribe la memoria de los reyes renuncia a escribir la suya propia.”',
          attributes: JSON.stringify({ Tipo: 'Filosofía / Juramento', Origen: 'Primera Era' }),
          icon: 'Lightbulb',
          isFavorite: false,
          isArchived: false,
          createdAt: now,
          updatedAt: now
        }
      ])
      .run()

    console.log(`[Folio DB] Seeded initial novel project with flat chapters and lore wiki.`)
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

  const inserted = db
    .insert(schema.projects)
    .values({
      id: newId,
      title: input.title.trim() || 'Nuevo Libro',
      synopsis: input.synopsis?.trim() || '',
      genre: input.genre?.trim() || '',
      createdAt: now,
      updatedAt: now
    })
    .returning()
    .get()

  // Inicializar únicamente el «Capítulo I» plano con contenido vacío listo para escribir
  createFolio({
    projectId: newId,
    type: 'chapter',
    title: 'Capítulo I',
    content: '',
    orderIndex: 1
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

  const updated = db
    .update(schema.projects)
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
// FOLIOS (FLAT CHAPTERS)
// -------------------------------------------------------------------------

export function getAllFolios(projectId?: string): Folio[] {
  const db = getDb()
  const query = db.select().from(schema.folios)

  if (projectId) {
    const rows = query
      .where(and(eq(schema.folios.projectId, projectId), eq(schema.folios.isArchived, false)))
      .orderBy(asc(schema.folios.orderIndex), asc(schema.folios.createdAt))
      .all()
    return rows.map(mapFolio)
  }

  const rows = query
    .where(eq(schema.folios.isArchived, false))
    .orderBy(asc(schema.folios.orderIndex), asc(schema.folios.createdAt))
    .all()
  return rows.map(mapFolio)
}

export function getTrashFolios(projectId?: string): Folio[] {
  const db = getDb()
  const conditions = [eq(schema.folios.isArchived, true)]
  if (projectId) conditions.push(eq(schema.folios.projectId, projectId))

  const rows = db
    .select()
    .from(schema.folios)
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
  const content = input.content ?? ''
  const wordCount =
    input.wordCount !== undefined ? input.wordCount : computeWordCount(content)

  let nextOrderIndex = input.orderIndex
  if (nextOrderIndex === undefined) {
    const existing = db
      .select({ orderIndex: schema.folios.orderIndex })
      .from(schema.folios)
      .where(eq(schema.folios.projectId, input.projectId))
      .orderBy(desc(schema.folios.orderIndex))
      .limit(1)
      .get()
    nextOrderIndex = existing ? existing.orderIndex + 1 : 1
  }

  const inserted = db
    .insert(schema.folios)
    .values({
      id: newId,
      projectId: input.projectId,
      type: normalizeFolioType(input.type),
      title: input.title?.trim() || 'Nuevo Capítulo',
      subtitle: input.subtitle?.trim() ?? '',
      synopsis: input.synopsis ?? '',
      povTag: input.povTag?.trim() ?? '',
      timeline: input.timeline?.trim() || null,
      location: input.location?.trim() || null,
      titleFormat: input.chapterTitleFormat ? JSON.stringify(input.chapterTitleFormat) : null,
      targetWords: Math.max(0, input.targetWords ?? 0),
      includeInExport: input.includeInExport ?? true,
      content,
      status: normalizeFolioStatus(input.status),
      wordCount,
      orderIndex: nextOrderIndex,
      icon: input.icon || 'FileText',
      isFavorite: false,
      isArchived: false,
      createdAt: now,
      updatedAt: now
    })
    .returning()
    .get()

  return mapFolio(inserted)
}

export function updateFolio(input: UpdateFolioInput): Folio {
  const db = getDb()
  const now = new Date()

  const values: Partial<typeof schema.folios.$inferInsert> = {
    updatedAt: now
  }
  if (input.type !== undefined) values.type = normalizeFolioType(input.type)
  if (input.title !== undefined) values.title = input.title
  if (input.subtitle !== undefined) values.subtitle = input.subtitle
  if (input.synopsis !== undefined) values.synopsis = input.synopsis
  if (input.povTag !== undefined) values.povTag = input.povTag
  if (input.timeline !== undefined) values.timeline = input.timeline?.trim() || null
  if (input.location !== undefined) values.location = input.location?.trim() || null
  if (input.chapterTitleFormat !== undefined) {
    values.titleFormat = input.chapterTitleFormat
      ? JSON.stringify(input.chapterTitleFormat)
      : null
  }
  if (input.targetWords !== undefined) values.targetWords = Math.max(0, input.targetWords)
  if (input.includeInExport !== undefined) values.includeInExport = input.includeInExport
  if (input.content !== undefined) {
    values.content = input.content
    values.wordCount =
      input.wordCount !== undefined ? input.wordCount : computeWordCount(input.content)
  } else if (input.wordCount !== undefined) {
    values.wordCount = input.wordCount
  }
  if (input.orderIndex !== undefined) values.orderIndex = input.orderIndex
  if (input.status !== undefined) values.status = normalizeFolioStatus(input.status)
  if (input.icon !== undefined) values.icon = input.icon
  if (input.isFavorite !== undefined) values.isFavorite = input.isFavorite
  if (input.isArchived !== undefined) values.isArchived = input.isArchived

  const updated = db
    .update(schema.folios)
    .set(values)
    .where(eq(schema.folios.id, input.id))
    .returning()
    .get()

  if (!updated) throw new Error(`Capítulo ${input.id} no encontrado`)
  return mapFolio(updated)
}

export function reorderFolios(ids: string[]): boolean {
  const sqlite = getSqlite()
  const stmt = sqlite.prepare('UPDATE folios SET order_index = ?, updated_at = ? WHERE id = ?')
  const now = Date.now()
  const tx = sqlite.transaction((chapterIds: string[]) => {
    for (let i = 0; i < chapterIds.length; i++) {
      stmt.run(i + 1, now, chapterIds[i])
    }
  })
  tx(ids)
  return true
}

export function restoreFolio(id: string): Folio {
  const db = getDb()
  const now = new Date()
  const folio = getFolioById(id)
  if (!folio) throw new Error(`Capítulo ${id} no encontrado`)

  const updated = db
    .update(schema.folios)
    .set({
      isArchived: false,
      updatedAt: now
    })
    .where(eq(schema.folios.id, id))
    .returning()
    .get()

  if (!updated) throw new Error(`Error al restaurar capítulo ${id}`)
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

  const rows = db
    .select()
    .from(schema.loreItems)
    .where(and(...conditions))
    .orderBy(desc(schema.loreItems.updatedAt))
    .all()

  return rows.map(mapLoreItem)
}

export function getTrashLore(projectId?: string): LoreItem[] {
  const db = getDb()
  const conditions = [eq(schema.loreItems.isArchived, true)]
  if (projectId) conditions.push(eq(schema.loreItems.projectId, projectId))

  const rows = db
    .select()
    .from(schema.loreItems)
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

  const inserted = db
    .insert(schema.loreItems)
    .values({
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
    })
    .returning()
    .get()

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

  const updated = db
    .update(schema.loreItems)
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
  const updated = db
    .update(schema.loreItems)
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

  const foliosRes = db
    .delete(schema.folios)
    .where(and(eq(schema.folios.projectId, projectId), eq(schema.folios.isArchived, true)))
    .run()

  const loreRes = db
    .delete(schema.loreItems)
    .where(and(eq(schema.loreItems.projectId, projectId), eq(schema.loreItems.isArchived, true)))
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
  const rows = db
    .select()
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
    const existing = db
      .select()
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

      const updated = db
        .update(schema.scratchpadNotes)
        .set(values)
        .where(eq(schema.scratchpadNotes.id, input.id))
        .returning()
        .get()

      if (!updated) throw new Error(`Nota ${input.id} no encontrada`)
      return mapScratchpadNote(updated)
    }
  }

  const inserted = db
    .insert(schema.scratchpadNotes)
    .values({
      projectId: input.projectId,
      title: input.title ?? '',
      content: input.content ?? '',
      isPinned: input.isPinned ?? false,
      colorTag: input.colorTag ?? null,
      createdAt: now,
      updatedAt: now
    })
    .returning()
    .get()

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
  const rows = db
    .select()
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
    const existing = db
      .select()
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

      const updated = db
        .update(schema.worldRules)
        .set(values)
        .where(eq(schema.worldRules.id, input.id))
        .returning()
        .get()

      if (!updated) throw new Error(`Regla ${input.id} no encontrada`)
      return mapWorldRule(updated)
    }
  }

  let nextOrderIndex = input.orderIndex ?? 0
  if (input.orderIndex === undefined) {
    const highest = db
      .select({ maxOrder: schema.worldRules.orderIndex })
      .from(schema.worldRules)
      .where(eq(schema.worldRules.projectId, input.projectId))
      .orderBy(desc(schema.worldRules.orderIndex))
      .limit(1)
      .get()
    nextOrderIndex = highest?.maxOrder !== undefined ? highest.maxOrder + 1 : 0
  }

  const inserted = db
    .insert(schema.worldRules)
    .values({
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
    })
    .returning()
    .get()

  return mapWorldRule(inserted)
}

export function deleteWorldRule(id: number): boolean {
  const db = getDb()
  const res = db.delete(schema.worldRules).where(eq(schema.worldRules.id, id)).run()
  return res.changes > 0
}

export function reorderWorldRules(ids: number[]): boolean {
  const sqlite = getSqlite()
  const updateStmt = sqlite.prepare(
    'UPDATE world_rules SET order_index = ?, updated_at = ? WHERE id = ?'
  )

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
      dailyChapterGoal: 0,
      deadlineDate: null,
      askSessionGoalOnStartup: true,
      updatedAt: now
    })
    .returning()
    .get()

  return mapProjectGoals(inserted)
}

function evaluateDailyGoalMet(
  log: {
    wordsWritten: number
    chaptersCompleted: number
    sessionGoalsHit: number
  },
  goals: ProjectGoals
): boolean {
  if (log.sessionGoalsHit > 0) return true
  if (goals.dailyWordGoal > 0 && log.wordsWritten >= goals.dailyWordGoal) return true
  if (goals.dailyChapterGoal > 0 && log.chaptersCompleted >= goals.dailyChapterGoal) return true
  return false
}

export function updateProjectGoals(projectId: string, input: Partial<ProjectGoals>): ProjectGoals {
  const db = getDb()
  const sqlite = getSqlite()
  const current = getProjectGoals(projectId)
  const now = new Date()

  const updated = db
    .update(schema.projectGoals)
    .set({
      targetTotalWords: input.targetTotalWords ?? current.targetTotalWords,
      dailyWordGoal: input.dailyWordGoal !== undefined ? Math.max(500, Math.floor(input.dailyWordGoal)) : current.dailyWordGoal,
      dailyChapterGoal: input.dailyChapterGoal ?? current.dailyChapterGoal,
      deadlineDate: input.deadlineDate !== undefined ? input.deadlineDate : current.deadlineDate,
      askSessionGoalOnStartup:
        input.askSessionGoalOnStartup !== undefined
          ? input.askSessionGoalOnStartup
          : current.askSessionGoalOnStartup,
      updatedAt: now
    })
    .where(eq(schema.projectGoals.projectId, projectId))
    .returning()
    .get()

  const mappedGoals = mapProjectGoals(updated)

  const todayStr = getLocalDateStr()
  const todayRow = db
    .select()
    .from(schema.dailyWritingLogs)
    .where(
      and(
        eq(schema.dailyWritingLogs.projectId, projectId),
        eq(schema.dailyWritingLogs.date, todayStr)
      )
    )
    .get()

  if (todayRow) {
    const newGoalMet = evaluateDailyGoalMet(
      {
        wordsWritten: todayRow.wordsWritten,
        chaptersCompleted: todayRow.chaptersCompleted,
        sessionGoalsHit: todayRow.sessionGoalsHit
      },
      mappedGoals
    )
    if (Boolean(todayRow.goalMet) !== newGoalMet) {
      sqlite
        .prepare('UPDATE daily_writing_logs SET goal_met = ? WHERE id = ?')
        .run(newGoalMet ? 1 : 0, todayRow.id)
    }
  }

  return mappedGoals
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
    chaptersCompleted: 0,
    sessionGoalsHit: 0,
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
  const chapterDelta = payload.chapterDelta ?? 0
  const sessionGoalHitDelta = payload.sessionGoalHitDelta ?? 0

  const upsertStmt = sqlite.prepare(`
    INSERT INTO daily_writing_logs (
      project_id, date, words_written, chapters_completed, session_goals_hit, goal_met
    )
    VALUES (?, ?, MAX(0, ?), MAX(0, ?), MAX(0, ?), 0)
    ON CONFLICT(project_id, date) DO UPDATE SET
      words_written = MAX(0, daily_writing_logs.words_written + ?),
      chapters_completed = MAX(0, daily_writing_logs.chapters_completed + ?),
      session_goals_hit = MAX(0, daily_writing_logs.session_goals_hit + ?)
    RETURNING id, project_id as projectId, date,
              words_written as wordsWritten,
              chapters_completed as chaptersCompleted,
              session_goals_hit as sessionGoalsHit,
              goal_met as goalMet
  `)

  const row = upsertStmt.get(
    projectId,
    todayStr,
    wordDelta,
    chapterDelta,
    sessionGoalHitDelta,
    wordDelta,
    chapterDelta,
    sessionGoalHitDelta
  ) as schema.DailyWritingLogSelect

  const isGoalMet = evaluateDailyGoalMet(
    {
      wordsWritten: row.wordsWritten,
      chaptersCompleted: row.chaptersCompleted,
      sessionGoalsHit: row.sessionGoalsHit
    },
    goals
  )

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
  achievementKey: string,
  customLabel?: string | null
): UnlockedAchievement | null {
  const db = getDb()

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
    if (customLabel && !existing.customLabel) {
      db.update(schema.unlockedAchievements)
        .set({ customLabel })
        .where(eq(schema.unlockedAchievements.id, existing.id))
        .run()
    }
    return null
  }

  const now = new Date()
  const inserted = db
    .insert(schema.unlockedAchievements)
    .values({
      projectId,
      achievementKey,
      customLabel: customLabel ?? null,
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
    WHERE project_id = ?
      AND is_archived = 0
  `)
  const rows = stmt.all(projectId) as Array<{ content: string }>

  let totalWords = 0
  for (const row of rows) {
    totalWords += computeWordCount(row.content || '')
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
