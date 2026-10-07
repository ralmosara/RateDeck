import { defineConfig } from 'drizzle-kit';

/**
 * drizzle-kit is used for schema *introspection/diffing* only.
 * Authoritative DDL lives in ./migrations/*.sql (ADR-0005).
 */
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/infrastructure/database/schema/index.ts',
  out: './drizzle',
  casing: 'snake_case',
  dbCredentials: {
    url: process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL ?? '',
  },
});
