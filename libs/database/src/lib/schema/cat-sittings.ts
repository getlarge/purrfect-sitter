import { pgTable, text, uuid, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { cats } from './cats.js';

export enum CatSittingStatus {
  REQUESTED = 'requested',
  APPROVED = 'approved',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export const catSittings = pgTable('cat_sittings', {
  id: uuid('id').primaryKey().defaultRandom(),
  catId: uuid('cat_id')
    .notNull()
    .references(() => cats.id, { onDelete: 'cascade' }),
  sitterId: uuid('sitter_id')
    .notNull()
    .references(() => users.id),
  status: text('status', {
    enum: Object.values(CatSittingStatus) as [string, ...string[]],
  })
    .default(CatSittingStatus.REQUESTED)
    .notNull(),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time').notNull(),
  attributes: jsonb('attributes').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type CatSitting = typeof catSittings.$inferSelect;
export type NewCatSitting = typeof catSittings.$inferInsert;
