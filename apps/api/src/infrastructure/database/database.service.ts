import { Inject, Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { ENV, type Env } from '../../config/env';
import * as schema from './schema';

export type Db = NodePgDatabase<typeof schema>;

const LTREE_RE = /^[A-Za-z0-9_]+(\.[A-Za-z0-9_]+)*$/;

@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  private readonly logger = new Logger(DatabaseService.name);
  readonly pool: Pool;
  readonly db: Db;

  constructor(@Inject(ENV) env: Env) {
    this.pool = new Pool({
      connectionString: env.DATABASE_URL,
      max: env.DB_POOL_MAX,
      application_name: 'ratedeck-api',
      statement_timeout: 30_000,
    });
    this.pool.on('error', (e) => this.logger.error(`Idle client error: ${e.message}`));
    this.db = drizzle(this.pool, { schema, casing: 'snake_case' });
  }

  /**
   * Runs `fn` in a transaction scoped to a tenant subtree (ADR-0004).
   * `SET LOCAL`-equivalent (`set_config(..., true)`) is transaction-bound, so it is
   * safe behind PgBouncer in transaction mode and cannot leak across requests.
   */
  async withTenantScope<T>(scopePath: string, fn: (tx: Db) => Promise<T>): Promise<T> {
    if (!LTREE_RE.test(scopePath)) throw new Error(`Invalid tenant scope path "${scopePath}"`);
    return this.db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.scope', ${scopePath}, true)`);
      return fn(tx as unknown as Db);
    });
  }

  async ping(): Promise<boolean> {
    try {
      await this.pool.query('select 1');
      return true;
    } catch {
      return false;
    }
  }

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
