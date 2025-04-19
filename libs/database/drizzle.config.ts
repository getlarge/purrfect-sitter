import type { Config } from 'drizzle-kit';

export default {
  schema: './dist/src/lib/schema/*.js',
  out: './src/lib/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url:
      process.env.DATABASE_URL ||
      'postgresql://dbuser:secret@localhost:5432/purrfect-sitter',
  },
} satisfies Config;
