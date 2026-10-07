import { Inject, Injectable, Logger, OnModuleInit, OnApplicationShutdown } from '@nestjs/common';
import { Worker } from 'bullmq';
import { ENV, type Env } from '../../config/env';
import { QUEUES } from '../../infrastructure/queue/queues';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { cdrs } from '../../infrastructure/database/schema/cdrs';
import { invoices } from '../../infrastructure/database/schema/billing';
import { eq, and, isNull, sum } from 'drizzle-orm';
import { BillingService } from './billing.service';

@Injectable()
export class BillingProcessor implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(BillingProcessor.name);
  private worker?: Worker;

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly db: DatabaseService,
    private readonly billingService: BillingService,
  ) {}

  onModuleInit(): void {
    this.worker = new Worker(
      QUEUES.billing,
      async (job) => {
        const { accountId, accountPath } = job.data;
        return this.processBillingForAccount(accountId, accountPath);
      },
      { connection: { url: this.env.REDIS_URL, maxRetriesPerRequest: null }, concurrency: 2 },
    );
    this.worker.on('failed', (job, err) => this.logger.error(`Billing Job ${job?.id} failed: ${err.message}`));
    this.logger.log(`Worker consuming queue "${QUEUES.billing}"`);
  }

  async processBillingForAccount(accountId: number, accountPath: string) {
    this.logger.log(`Processing billing job for account ${accountId}`);

    return await this.db.withTenantScope(accountPath, async (tx) => {
      // 1. Fetch un-invoiced, rated CDRs for this account
      const unbilledStats = await tx.select({
        totalCost: sum(cdrs.costAmount),
        count: sum(cdrs.id) // proxy to check if rows exist
      })
      .from(cdrs)
      .where(and(eq(cdrs.accountId, accountId), eq(cdrs.ratingStatus, 1), isNull(cdrs.invoiceId)));

      const totalCost = unbilledStats[0]?.totalCost;
      if (!totalCost || Number(totalCost) === 0) {
         this.logger.log(`No unbilled usage for account ${accountId}`);
         return { ok: true, msg: 'No unbilled usage' };
      }

      const periodEnd = new Date();
      const periodStart = new Date(periodEnd.getFullYear(), periodEnd.getMonth(), 1); // rough start of month

      // 2. Generate Invoice Record & PDF
      const pdfUrl = `https://ratedeck.storage/invoices/INV-${accountId}-${Date.now()}.pdf`;
      const [invoice] = await tx.insert(invoices).values({
        accountId,
        accountPath,
        invoiceNumber: `INV-${accountId}-${Date.now()}`,
        status: 'open',
        periodStart,
        periodEnd,
        subtotal: totalCost,
        total: totalCost, // No taxes in this simulated run
        currency: 'USD',
        pdfUrl,
        issuedAt: new Date(),
        dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // net 7
      }).returning();

      // 3. Mark CDRs as invoiced
      await tx.update(cdrs)
        .set({ invoiceId: invoice.id })
        .where(and(eq(cdrs.accountId, accountId), eq(cdrs.ratingStatus, 1), isNull(cdrs.invoiceId)));

      // 4. Charge the ledger (BR-06 context)
      await this.billingService.chargeUsage(accountId, accountPath, Number(totalCost), 'USD', invoice.invoiceNumber);

      this.logger.log(`Generated Invoice ${invoice.invoiceNumber} for ${totalCost} USD for account ${accountId}`);
      return { ok: true, invoiceId: invoice.id };
    });
  }
  async onApplicationShutdown(): Promise<void> {
    await this.worker?.close();
  }
}
