import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';

// Check for required environment variable
if (!process.env.DATABASE_URL) {
  console.error('Missing DATABASE_URL environment variable');
  process.exit(1);
}

const { Pool } = pg;

// Function to run migrations
async function runMigrations() {
  console.log('Running migrations...');
  
  // Create connection pool
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    // Create drizzle instance with the pool
    const db = drizzle(pool);
    
    // Run migrations from the specified directory
    await migrate(db, { migrationsFolder: './src/lib/migrations' });
    
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    // Make sure to close the pool
    await pool.end();
  }
}

// Run the migration function
runMigrations();