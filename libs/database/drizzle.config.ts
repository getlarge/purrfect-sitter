import type { Config } from 'drizzle-kit';

export default {
  schema: './src/lib/schema',
  out: './src/lib/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url:
      process.env.DATABASE_URL ||
      'postgresql://postgres:postgres@localhost:5432/purrfect-sitter',
  },
} satisfies Config;
