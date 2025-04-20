import {
  pgTable,
  text,
  uuid,
  timestamp,
  boolean,
  jsonb,
} from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const cats = pgTable('cats', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  age: text('age'),
  breed: text('breed'),
  isActive: boolean('is_active').default(true).notNull(),
  attributes: jsonb('attributes').$type<Record<string, unknown>>(),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Cat = typeof cats.$inferSelect;
export type NewCat = typeof cats.$inferInsert;
