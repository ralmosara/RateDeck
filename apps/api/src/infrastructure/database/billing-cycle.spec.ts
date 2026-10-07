import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import * as coreSchema from './schema/core';
import * as cdrSchema from './schema/cdrs';
import * as billingSchema from './schema/billing';
import { DatabaseService } from './database.service';
import { BillingService } from '../../modules/billing/billing.service';
import { BillingProcessor } from '../../modules/billing/billing.processor';

const env = {
  DATABASE_URL: 'postgres://ratedeck_app:ratedeck_app@localhost:5432/ratedeck',
  MIGRATION_DATABASE_URL: 'postgres://ratedeck:ratedeck_password@localhost:5432/ratedeck',
  DB_POOL_MAX: 1,
} as any;

describe('Billing Cycle & Ledger', () => {
  let adminDb: ReturnType<typeof drizzle>;
  let adminPool: Pool;
  let dbService: DatabaseService;
  let billingService: BillingService;
  let billingProcessor: BillingProcessor;

  beforeAll(async () => {
    adminPool = new Pool({ connectionString: env.MIGRATION_DATABASE_URL });
    adminDb = drizzle(adminPool, { schema: { ...coreSchema, ...cdrSchema, ...billingSchema }, casing: 'snake_case' });

    await adminDb.execute(sql`TRUNCATE TABLE accounts CASCADE`);
    
    // Insert account
    await adminDb.execute(sql`
      INSERT INTO accounts (id, type, path, name, currency, timezone, billing_mode)
      OVERRIDING SYSTEM VALUE
      VALUES 
        (1, 'platform', 'root', 'Platform', 'USD', 'UTC', 'postpaid'),
        (10, 'customer', 'root.c_10', 'Prepaid Customer', 'USD', 'UTC', 'prepaid'),
        (11, 'customer', 'root.c_11', 'Postpaid Customer', 'USD', 'UTC', 'postpaid')
    `);

    dbService = new DatabaseService(env);
    billingService = new BillingService(dbService);
    billingProcessor = new BillingProcessor({} as any, dbService, billingService);

    // Override the worker creation to avoid connecting to redis in tests
    billingProcessor.onModuleInit = () => {}; 
  });

  afterAll(async () => {
    await dbService.onApplicationShutdown();
    await adminPool.end();
  });

  it('Prepaid billing cycle', async () => {
    // 1. Initial balance is 0
    let balance = await billingService.getLedgerBalance('root.c_10');
    expect(Number(balance)).toBe(0);

    // 2. Deposit funds via Stripe webhook logic
    await billingService.addFunds(10, 'root.c_10', '50.00', 'stripe_tx_123');
    balance = await billingService.getLedgerBalance('root.c_10');
    expect(Number(balance)).toBe(50);

    // 3. Simulate CDRs generated
    await adminDb.execute(sql`
      INSERT INTO cdrs (start_time, account_id, account_path, source_id, external_call_id, caller, callee, duration_sec, disposition, rating_status, cost_amount)
      VALUES 
        (now(), 10, 'root.c_10', 1, 'call1', '123', '456', 60, 'ANSWERED', 1, 5.00),
        (now(), 10, 'root.c_10', 1, 'call2', '123', '789', 60, 'ANSWERED', 1, 10.00)
    `);

    // 4. Run billing processor
    const result = await billingProcessor.processBillingForAccount(10, 'root.c_10');
    expect(result.ok).toBe(true);

    // 5. Verify balance was deducted (50 - 15 = 35)
    balance = await billingService.getLedgerBalance('root.c_10');
    expect(Number(balance)).toBe(35);

    // 6. Verify invoice created
    const invoices = await billingService.listInvoices('root.c_10');
    expect(invoices.length).toBe(1);
    expect(Number(invoices[0].total)).toBe(15);
  });

  it('Postpaid billing cycle', async () => {
    // 1. Initial balance is 0
    let balance = await billingService.getLedgerBalance('root.c_11');
    expect(Number(balance)).toBe(0);

    // 2. Simulate CDRs generated (no prior deposit)
    await adminDb.execute(sql`
      INSERT INTO cdrs (start_time, account_id, account_path, source_id, external_call_id, caller, callee, duration_sec, disposition, rating_status, cost_amount)
      VALUES 
        (now(), 11, 'root.c_11', 1, 'call3', '123', '456', 60, 'ANSWERED', 1, 20.00)
    `);

    // 3. Run billing processor
    const result = await billingProcessor.processBillingForAccount(11, 'root.c_11');
    expect(result.ok).toBe(true);

    // 4. Verify balance went negative (0 - 20 = -20)
    balance = await billingService.getLedgerBalance('root.c_11');
    expect(Number(balance)).toBe(-20);

    // 5. Verify invoice created
    const invoices = await billingService.listInvoices('root.c_11');
    expect(invoices.length).toBe(1);
    expect(Number(invoices[0].total)).toBe(20);
  });
});
