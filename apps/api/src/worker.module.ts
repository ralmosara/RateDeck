import { Inject, Injectable, Logger, Module, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { Worker } from 'bullmq';
import { ConfigModule } from './config/config.module';
import { ENV, type Env } from './config/env';
import { DatabaseModule } from './infrastructure/database/database.module';
import { QUEUES } from './infrastructure/queue/queues';
import { RedisModule } from './infrastructure/redis/redis.module';

/**
 * Placeholder consumer proving the worker topology end-to-end.
 * Real processors (cdr-import, rating, billing, integration) arrive in Phases 3–6
 * and are selected per pod via WORKER_QUEUES env (ADR-0006).
 */
@Injectable()
class SystemQueueConsumer implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(SystemQueueConsumer.name);
  private worker?: Worker;

  constructor(@Inject(ENV) private readonly env: Env) {}

  onModuleInit(): void {
    this.worker = new Worker(
      QUEUES.system,
      async (job) => {
        this.logger.log(`Processing ${job.name} (${job.id})`);
        return { ok: true };
      },
      { connection: { url: this.env.REDIS_URL, maxRetriesPerRequest: null }, concurrency: 4 },
    );
    this.worker.on('failed', (job, err) => this.logger.error(`Job ${job?.id} failed: ${err.message}`));
    this.logger.log(`Worker consuming queue "${QUEUES.system}"`);
  }

  async onApplicationShutdown(): Promise<void> {
    // Graceful: finish in-flight jobs before exiting (k8s terminationGracePeriodSeconds).
    await this.worker?.close();
  }
}
import { CdrModule } from './modules/cdr/cdr.module';
import { RatingModule } from './modules/rating/rating.module';
import { BillingModule } from './modules/billing/billing.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';

@Module({
  imports: [ConfigModule, DatabaseModule, RedisModule, CdrModule, RatingModule, BillingModule, WebhooksModule],
  providers: [SystemQueueConsumer],
})
export class WorkerModule {}
