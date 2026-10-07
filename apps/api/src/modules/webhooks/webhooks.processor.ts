import { Inject, Injectable, Logger, OnModuleInit, OnApplicationShutdown, forwardRef } from '@nestjs/common';
import { Worker } from 'bullmq';
import { ENV, type Env } from '../../config/env';
import { QUEUES } from '../../infrastructure/queue/queues';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { webhookDeliveries } from '../../infrastructure/database/schema/webhooks';
import { eq } from 'drizzle-orm';
import * as crypto from 'crypto';

@Injectable()
export class WebhooksProcessor implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(WebhooksProcessor.name);
  private worker?: Worker;

  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(forwardRef(() => DatabaseService)) private readonly db: DatabaseService,
  ) {}

  onModuleInit(): void {
    this.worker = new Worker(
      QUEUES.integration,
      async (job) => {
        const { deliveryId, url, secret, payload } = job.data;
        this.logger.log(`Processing webhook delivery ${deliveryId} to ${url}`);

        const payloadStr = JSON.stringify(payload);
        const signature = crypto.createHmac('sha256', secret).update(payloadStr).digest('hex');

        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-RateDeck-Signature': signature,
            },
            body: payloadStr,
          });

          const responseText = await res.text();

          if (!res.ok) {
            throw new Error(`HTTP Error: ${res.status} ${responseText}`);
          }

          await this.db.db.update(webhookDeliveries).set({
            status: 'success',
            statusCode: res.status,
            responseBody: responseText,
            deliveredAt: new Date(),
          }).where(eq(webhookDeliveries.id, deliveryId));

          return { ok: true };
        } catch (err: any) {
          // Calculate if this is the final attempt
          const isFinalAttempt = job.attemptsMade >= (job.opts.attempts || 1) - 1;

          await this.db.db.update(webhookDeliveries).set({
            status: isFinalAttempt ? 'failed' : 'pending',
            statusCode: 500,
            responseBody: err.message,
          }).where(eq(webhookDeliveries.id, deliveryId));
          
          throw err; // Trigger BullMQ retry
        }
      },
      { connection: { url: this.env.REDIS_URL, maxRetriesPerRequest: null }, concurrency: 5 },
    );
    this.worker.on('failed', (job, err) => this.logger.error(`Webhook Delivery Job ${job?.id} failed: ${err.message}`));
    this.logger.log(`Worker consuming queue "${QUEUES.integration}"`);
  }

  async onApplicationShutdown(): Promise<void> {
    await this.worker?.close();
  }
}
