/**
 * Minimal, deterministic SQL migration runner (ADR-0005).
 *  - Applies apps/api/migrations/*.sql in lexical order.
 *  - Each file runs in its own transaction; checksum drift on applied files fails the run.
 *  - Advisory lock prevents concurrent runners (multiple pods booting).
 * Runs as the schema-owner role (MIGRATION_DATABASE_URL), never as the runtime app role.
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Client } from 'pg';

for (const p of ['.env', '../../.env'].map((f) => resolve(process.cwd(), f))) {
  if (existsSync(p)) {
    process.loadEnvFile(p);
    break;
  }
}

const url = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error('MIGRATION_DATABASE_URL (or DATABASE_URL) is required');

const dir = resolve(__dirname, '../migrations');
const LOCK_ID = 7_212_026;

async function main(): Promise<void> {
  const client = new Client({ connectionString: url, application_name: 'ratedeck-migrate' });
  await client.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [LOCK_ID]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version    text PRIMARY KEY,
        checksum   text NOT NULL,
        applied_at timestamptz NOT NULL DEFAULT now()
      )`);

    const applied = new Map<string, string>(
      (await client.query<{ version: string; checksum: string }>('SELECT version, checksum FROM schema_migrations'))
        .rows.map((r) => [r.version, r.checksum]),
    );

    const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
    let count = 0;

    for (const file of files) {
      const sql = readFileSync(join(dir, file), 'utf8');
      const checksum = createHash('sha256').update(sql).digest('hex');
      const prior = applied.get(file);

      if (prior) {
        if (prior !== checksum) throw new Error(`Checksum mismatch for applied migration ${file}`);
        continue;
      }

      process.stdout.write(`→ applying ${file} ... `);
      await client.query('BEGIN');
      try {
        await client.query("SET LOCAL lock_timeout = '5s'");
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (version, checksum) VALUES ($1, $2)', [file, checksum]);
        await client.query('COMMIT');
        count++;
        console.log('done');
      } catch (e) {
        await client.query('ROLLBACK');
        console.log('FAILED');
        throw e;
      }
    }
    console.log(count ? `✔ ${count} migration(s) applied` : '✔ database is up to date');
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [LOCK_ID]).catch(() => undefined);
    await client.end();
  }
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
