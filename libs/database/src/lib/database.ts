import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema/index.js';

const { Pool } = pg;

let pool: pg.Pool | null = null;
let db: ReturnType<typeof drizzle> | null = null;

export function createDatabase() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }

  if (!db) {
    db = drizzle(pool, { schema });
  }

  db.$client.on('error', (error) => {
    console.error('Database error:', error);
  });

  return { pool, db };
}

export function closeDatabase() {
  if (pool) {
    return pool.end();
  }
  return Promise.resolve();
}

export const getDb = () => {
  if (!db) {
    const { db: newDb } = createDatabase();
    return newDb;
  }
  return db;
};
