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
    type: text('type').notNull().default('chapter'), // 'frontmatter' | 'chapter' | 'backmatter'
    title: text('title').notNull().default('Sin título'),
    subtitle: text('subtitle').notNull().default(''),
    synopsis: text('synopsis').notNull().default(''),
    povTag: text('pov_tag').notNull().default(''),
    timeline: text('timeline'),
    location: text('location'),
    targetWords: integer('target_words').notNull().default(0),
    includeInExport: integer('include_in_export', { mode: 'boolean' }).notNull().default(true),
    content: text('content').notNull().default(''),
    status: text('status').notNull().default('draft'), // 'draft' | 'in_progress' | 'done'
    wordCount: integer('word_count').notNull().default(0),
    orderIndex: integer('order_index').notNull().default(0),
    icon: text('icon').default('FileText'),
    isFavorite: integer('is_favorite', { mode: 'boolean' }).notNull().default(false),
    isArchived: integer('is_archived', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
  },
  (table) => [
    index('idx_folios_project_id').on(table.projectId),
    index('idx_folios_type').on(table.type),
    index('idx_folios_order_index').on(table.orderIndex),
    index('idx_folios_is_archived').on(table.isArchived)
  ]
)

export const loreItems = sqliteTable(
  'lore_items',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    category: text('category').notNull().default('personaje'),
    name: text('name').notNull(),
    summary: text('summary').notNull().default(''),
    content: text('content').notNull().default(''),
    attributes: text('attributes').notNull().default('{}'),
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
    title: text('title').notNull().default(''),
    content: text('content').notNull().default(''),
    isPinned: integer('is_pinned', { mode: 'boolean' }).notNull().default(false),
    colorTag: text('color_tag'),
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

export const worldRules = sqliteTable(
  'world_rules',
  {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    category: text('category').notNull(),
    title: text('title').notNull(),
    axiom: text('axiom').notNull(),
    details: text('details'),
    limitations: text('limitations'),
    orderIndex: integer('order_index').notNull().default(0),
    isPinned: integer('is_pinned', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
  },
  (table) => [
    index('idx_rules_project_id').on(table.projectId),
    index('idx_rules_category').on(table.category),
    index('idx_rules_is_pinned').on(table.isPinned),
    index('idx_rules_order').on(table.orderIndex)
  ]
)

export type WorldRuleSelect = typeof worldRules.$inferSelect
export type WorldRuleInsert = typeof worldRules.$inferInsert

export const projectGoals = sqliteTable('project_goals', {
  projectId: text('project_id')
    .primaryKey()
    .references(() => projects.id, { onDelete: 'cascade' }),
  targetTotalWords: integer('target_total_words').notNull().default(50000),
  dailyWordGoal: integer('daily_word_goal').notNull().default(500),
  dailyChapterGoal: integer('daily_chapter_goal').notNull().default(0),
  deadlineDate: text('deadline_date'),
  askSessionGoalOnStartup: integer('ask_session_goal_on_startup', { mode: 'boolean' })
    .notNull()
    .default(true),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
})

export const dailyWritingLogs = sqliteTable(
  'daily_writing_logs',
  {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    date: text('date').notNull(), // Formato YYYY-MM-DD
    wordsWritten: integer('words_written').notNull().default(0),
    chaptersCompleted: integer('chapters_completed').notNull().default(0),
    sessionGoalsHit: integer('session_goals_hit').notNull().default(0),
    goalMet: integer('goal_met', { mode: 'boolean' }).notNull().default(false)
  },
  (table) => [
    index('idx_daily_logs_project_date').on(table.projectId, table.date)
  ]
)

export const unlockedAchievements = sqliteTable(
  'unlocked_achievements',
  {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    achievementKey: text('achievement_key').notNull(),
    customLabel: text('custom_label'),
    unlockedAt: integer('unlocked_at', { mode: 'timestamp' }).notNull()
  },
  (table) => [
    index('idx_unlocked_achievements_project').on(table.projectId)
  ]
)

export type ProjectGoalsSelect = typeof projectGoals.$inferSelect
export type ProjectGoalsInsert = typeof projectGoals.$inferInsert

export type DailyWritingLogSelect = typeof dailyWritingLogs.$inferSelect
export type DailyWritingLogInsert = typeof dailyWritingLogs.$inferInsert

export type UnlockedAchievementSelect = typeof unlockedAchievements.$inferSelect
export type UnlockedAchievementInsert = typeof unlockedAchievements.$inferInsert
