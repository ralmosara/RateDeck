import { Injectable, Inject, NotFoundException, forwardRef } from '@nestjs/common';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { webhookEndpoints, webhookDeliveries } from '../../infrastructure/database/schema/webhooks';
import { eq } from 'drizzle-orm';
import { Queue } from 'bullmq';
import { QUEUES } from '../../infrastructure/queue/queues';
import { ENV, type Env } from '../../config/env';

export interface CreateWebhookDto {
  url: string;
  secret: string;
  events?: string;
}

@Injectable()
export class WebhooksService {
  private integrationQueue: Queue;

  constructor(
    @Inject(forwardRef(() => DatabaseService)) private readonly db: DatabaseService,
    @Inject(ENV) private readonly env: Env,
  ) {
    this.integrationQueue = new Queue(QUEUES.integration, {
      connection: { url: this.env.REDIS_URL },
    });
  }

  async listEndpoints(accountPath: string) {
    return this.db.withTenantScope(accountPath, async (tx) => {
      return tx.select().from(webhookEndpoints);
    });
  }

  async createEndpoint(accountId: number, accountPath: string, dto: CreateWebhookDto) {
    return this.db.withTenantScope(accountPath, async (tx) => {
      const [endpoint] = await tx.insert(webhookEndpoints).values({
        accountId,
        accountPath,
        url: dto.url,
        secret: dto.secret,
        events: dto.events || '*',
      }).returning();
      return endpoint;
    });
  }

  async deleteEndpoint(accountPath: string, id: number) {
    return this.db.withTenantScope(accountPath, async (tx) => {
      await tx.delete(webhookEndpoints).where(eq(webhookEndpoints.id, id));
    });
  }

  /**
   * Internal method called by domain logic (e.g. billing worker, rating engine)
   * to dispatch an event to all interested tenant webhooks.
   */
  async dispatchEvent(accountId: number, accountPath: string, eventType: string, payload: any) {
    return this.db.withTenantScope(accountPath, async (tx) => {
      // In a real implementation we would query active endpoints that match `eventType`
      const endpoints = await tx.select().from(webhookEndpoints)
        .where(eq(webhookEndpoints.accountId, accountId));
        
      const activeEndpoints = endpoints.filter(e => e.active && (e.events === '*' || e.events.includes(eventType)));

      for (const endpoint of activeEndpoints) {
        // Create a delivery record
        const [delivery] = await tx.insert(webhookDeliveries).values({
          endpointId: endpoint.id,
          accountId,
          accountPath,
          eventType,
          payload: JSON.stringify(payload),
          status: 'pending'
        }).returning();

        // Enqueue job to perform HTTP request with 3 retries
        await this.integrationQueue.add('webhook-delivery', {
          deliveryId: delivery.id,
          url: endpoint.url,
          secret: endpoint.secret,
          payload
        }, {
          attempts: 4, // 1 initial + 3 retries
          backoff: {
            type: 'exponential',
            delay: 1000 // 1s, 2s, 4s...
          }
        });
      }
    });
  }
}
