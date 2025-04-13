import { pgTable, text, uuid, timestamp, integer } from 'drizzle-orm/pg-core';
import { catSittings } from './cat-sittings.js';

export const reviews = pgTable('reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  catSittingId: uuid('cat_sitting_id').notNull().references(() => catSittings.id, { onDelete: 'cascade' }),
  rating: integer('rating').notNull(),
  content: text('content'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;