import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const items = sqliteTable('items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').notNull().default('active'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`)
})

export type ItemSelect = typeof items.$inferSelect
export type ItemInsert = typeof items.$inferInsert
