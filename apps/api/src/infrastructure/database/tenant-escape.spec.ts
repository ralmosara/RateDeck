import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import * as schema from './schema';
import { DatabaseService } from './database.service';

const env = {
  DATABASE_URL: 'postgres://ratedeck_app:ratedeck_app@127.0.0.1:5433/ratedeck',
  MIGRATION_DATABASE_URL: 'postgres://ratedeck:ratedeck@127.0.0.1:5433/ratedeck',
  DB_POOL_MAX: 1,
} as any;

describe('Tenant Escape & RLS', () => {
  let adminDb: ReturnType<typeof drizzle<typeof schema>>;
  let adminPool: Pool;
  let dbService: DatabaseService;

  beforeAll(async () => {
    // Connect as superuser/owner to seed data
    adminPool = new Pool({ connectionString: env.MIGRATION_DATABASE_URL });
    adminDb = drizzle(adminPool, { schema, casing: 'snake_case' });

    // Clean up
    await adminDb.execute(sql`TRUNCATE TABLE accounts CASCADE`);

    // Insert accounts
    await adminDb.execute(sql`
      INSERT INTO accounts (id, parent_id, type, path, name, currency, timezone, billing_mode)
      OVERRIDING SYSTEM VALUE
      VALUES 
        (1, NULL, 'platform', 'root', 'Platform', 'USD', 'UTC', 'postpaid'),
        (2, 1, 'customer', 'root.c_2', 'Customer A', 'USD', 'UTC', 'prepaid'),
        (3, 1, 'customer', 'root.c_3', 'Customer B', 'USD', 'UTC', 'prepaid')
    `);

    // Insert users
    await adminDb.execute(sql`
      INSERT INTO users (id, account_id, account_path, email, password_hash, display_name)
      OVERRIDING SYSTEM VALUE
      VALUES 
        (1, 1, 'root', 'admin@platform', 'hash', 'Admin'),
        (2, 2, 'root.c_2', 'user@custA', 'hash', 'User A'),
        (3, 3, 'root.c_3', 'user@custB', 'hash', 'User B')
    `);

    dbService = new DatabaseService(env);
  });

  afterAll(async () => {
    await dbService.onApplicationShutdown();
    await adminPool.end();
  });

  it('Customer A can only see Customer A data', async () => {
    await dbService.withTenantScope('root.c_2', async (tx) => {
      const users = await tx.select().from(schema.users);
      expect(users).toHaveLength(1);
      expect(users[0].email).toBe('user@custA');

      const accounts = await tx.select().from(schema.accounts);
      expect(accounts).toHaveLength(1);
      expect(accounts[0].name).toBe('Customer A');
    });
  });

  it('Customer B can only see Customer B data', async () => {
    await dbService.withTenantScope('root.c_3', async (tx) => {
      const users = await tx.select().from(schema.users);
      expect(users).toHaveLength(1);
      expect(users[0].email).toBe('user@custB');
    });
  });

  it('Platform admin can see all data', async () => {
    await dbService.withTenantScope('root', async (tx) => {
      const users = await tx.select().from(schema.users);
      expect(users.length).toBeGreaterThanOrEqual(3);
    });
  });
});
