import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema/index.js';

export { schema };

let pool: Pool | null = null;
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

  return { pool, db };
}

export function closeDatabase() {
  if (pool) {
    return pool.end();
  }
  return Promise.resolve();
}

export default {
  createDatabase,
  closeDatabase,
};

export const getDb = () => {
  if (!db) {
    const { db: newDb } = createDatabase();
    return newDb;
  }
  return db;
};
