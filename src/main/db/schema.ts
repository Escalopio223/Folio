import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  title: text('title').notNull().default('Sin título'),
  synopsis: text('synopsis').notNull().default(''),
  genre: text('genre').notNull().default(''),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
})

export const folios = sqliteTable(
  'folios',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    parentId: text('parent_id'), // null = capítulo, id = escena
    type: text('type').notNull().default('chapter'), // 'chapter' | 'scene'
    title: text('title').notNull().default('Sin título'),
    content: text('content').notNull().default(''),
    synopsis: text('synopsis').notNull().default(''),
    icon: text('icon').default('FileText'),
    sortOrder: integer('sort_order').notNull().default(0),
    status: text('status').notNull().default('draft'), // 'draft' | 'in_progress' | 'completed'
    isFavorite: integer('is_favorite', { mode: 'boolean' }).notNull().default(false),
    isArchived: integer('is_archived', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
  },
  (table) => [
    index('idx_folios_project_id').on(table.projectId),
    index('idx_folios_parent_id').on(table.parentId),
    index('idx_folios_type').on(table.type),
    index('idx_folios_is_archived').on(table.isArchived)
  ]
)

export const loreItems = sqliteTable(
  'lore_items',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    category: text('category').notNull().default('personaje'), // 'personaje' | 'lugar' | 'objeto' | 'idea' | 'pensamiento' | custom
    name: text('name').notNull(),
    summary: text('summary').notNull().default(''),
    content: text('content').notNull().default(''),
    attributes: text('attributes').notNull().default('{}'), // JSON: { "Rol": "Protagonista", ... }
    icon: text('icon').default('User'),
    isFavorite: integer('is_favorite', { mode: 'boolean' }).notNull().default(false),
    isArchived: integer('is_archived', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
  },
  (table) => [
    index('idx_lore_project_id').on(table.projectId),
    index('idx_lore_category').on(table.category),
    index('idx_lore_is_archived').on(table.isArchived)
  ]
)

export type ProjectSelect = typeof projects.$inferSelect
export type ProjectInsert = typeof projects.$inferInsert

export type FolioSelect = typeof folios.$inferSelect
export type FolioInsert = typeof folios.$inferInsert

export type LoreItemSelect = typeof loreItems.$inferSelect
export type LoreItemInsert = typeof loreItems.$inferInsert

export const scratchpadNotes = sqliteTable(
  'scratchpad_notes',
  {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    content: text('content').notNull().default(''),
    isPinned: integer('is_pinned', { mode: 'boolean' }).notNull().default(false),
    colorTag: text('color_tag'), // 'idea' | 'dialogo' | 'duda' | 'pendiente' | null
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
  },
  (table) => [
    index('idx_scratchpad_project_id').on(table.projectId),
    index('idx_scratchpad_is_pinned').on(table.isPinned)
  ]
)

export type ScratchpadNoteSelect = typeof scratchpadNotes.$inferSelect
export type ScratchpadNoteInsert = typeof scratchpadNotes.$inferInsert
