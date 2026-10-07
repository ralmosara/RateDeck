import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import * as coreSchema from './schema/core';
import * as webhookSchema from './schema/webhooks';
import { DatabaseService } from './database.service';
import { WebhooksService } from '../../modules/webhooks/webhooks.service';
import { WebhooksProcessor } from '../../modules/webhooks/webhooks.processor';
import * as http from 'http';
import { eq } from 'drizzle-orm';

const env = {
  DATABASE_URL: 'postgres://ratedeck_app:ratedeck_app@127.0.0.1:5432/ratedeck',
  MIGRATION_DATABASE_URL: 'postgres://ratedeck:ratedeck_password@127.0.0.1:5432/ratedeck',
  DB_POOL_MAX: 1,
  REDIS_URL: 'redis://127.0.0.1:6379',
} as any;

describe('Webhooks & Integrations', () => {
  let adminDb: ReturnType<typeof drizzle>;
  let adminPool: Pool;
  let dbService: DatabaseService;
  let webhooksService: WebhooksService;
  let webhooksProcessor: WebhooksProcessor;
  let dummyServer: http.Server;
  let requestsCount = 0;
  let dummyPort = 0;

  beforeAll(async () => {
    // 1. Setup DB
    adminPool = new Pool({ connectionString: env.MIGRATION_DATABASE_URL });
    adminDb = drizzle(adminPool, { schema: { ...coreSchema, ...webhookSchema }, casing: 'snake_case' });
    
    await adminDb.execute(sql`TRUNCATE TABLE accounts CASCADE`);
    await adminDb.execute(sql`
      INSERT INTO accounts (id, type, path, name, currency, timezone, billing_mode)
      OVERRIDING SYSTEM VALUE
      VALUES (1, 'platform', 'root', 'Platform', 'USD', 'UTC', 'postpaid')
    `);

    dbService = new DatabaseService(env);
    
    // 2. Setup failing dummy HTTP server
    dummyServer = http.createServer((req, res) => {
      requestsCount++;
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    });

    await new Promise<void>((resolve) => {
      dummyServer.listen(0, '127.0.0.1', () => {
        const addr = dummyServer.address() as import('net').AddressInfo;
        dummyPort = addr.port;
        resolve();
      });
    });

    webhooksService = new WebhooksService(dbService, env);
    webhooksProcessor = new WebhooksProcessor(env, dbService);
    // Explicitly initialize the worker so it consumes from Redis
    webhooksProcessor.onModuleInit(); 
  });

  afterAll(async () => {
    await webhooksProcessor.onApplicationShutdown();
    await dbService.onApplicationShutdown();
    await adminPool.end();
    await new Promise<void>((resolve) => dummyServer.close(() => resolve()));
  });

  it('should attempt 1 initial delivery and 3 retries (total 4 attempts) for a failing endpoint', async () => {
    // 1. Create a webhook endpoint pointing to our failing server
    const endpoint = await webhooksService.createEndpoint(1, 'root', {
      url: `http://127.0.0.1:${dummyPort}/webhook`,
      secret: 'test_secret',
      events: '*',
    });

    // 2. Dispatch an event
    await webhooksService.dispatchEvent(1, 'root', 'fraud.alert', { msg: 'Test fraud alert' });

    // 3. Wait for the BullMQ worker to process and exhaust retries (4 attempts).
    // The backoff is 1s, 2s, 4s, but this can take ~7 seconds.
    // Vitest has a default timeout of 5s, so we must increase the timeout of this test block.
    // Or, we can just poll the database until the delivery status is 'failed'.
    
    let finalDelivery;
    for (let i = 0; i < 30; i++) {
      const deliveries = await adminDb.select().from(webhookSchema.webhookDeliveries).where(eq(webhookSchema.webhookDeliveries.endpointId, endpoint.id));
      if (deliveries.length > 0) {
        if (deliveries[0].status === 'failed') {
          finalDelivery = deliveries[0];
          break;
        }
      }
      await new Promise(r => setTimeout(r, 1000)); // wait 1s
    }

    // 4. Assertions
    expect(finalDelivery).toBeDefined();
    expect(finalDelivery?.status).toBe('failed');
    
    // Total requests received by our dummy server should be 4 (1 initial + 3 retries)
    expect(requestsCount).toBe(4);
  }, 35000); // 35 seconds timeout
});
