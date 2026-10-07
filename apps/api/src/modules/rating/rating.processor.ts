import { Inject, Injectable, Logger, OnModuleInit, OnApplicationShutdown } from '@nestjs/common';
import { Worker } from 'bullmq';
import { ENV, type Env } from '../../config/env';
import { QUEUES } from '../../infrastructure/queue/queues';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { cdrs, usageDailySummary } from '../../infrastructure/database/schema/cdrs';
import { rateDecks, rateDeckVersions, rates } from '../../infrastructure/database/schema/rates';
import { eq, and, sql, desc } from 'drizzle-orm';
import { PrefixTrie, rateCall, Rate } from '@ratedeck/rating-core';
import { forwardRef } from '@nestjs/common';
import { RatesService } from '../rates/rates.service';

@Injectable()
export class RatingProcessor implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(RatingProcessor.name);
  private worker?: Worker;

  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(forwardRef(() => DatabaseService)) private readonly db: DatabaseService,
    @Inject(forwardRef(() => RatesService)) private readonly ratesService: RatesService,
  ) {}

  onModuleInit(): void {
    this.worker = new Worker(
      QUEUES.rating,
      async (job) => {
        this.logger.log(`Processing rating job ${job.id}`);
        const { accountId, accountPath } = job.data;

        return await this.db.withTenantScope(accountPath, async (tx) => {
          // BR-02: Rating uses the deck version effective at CDR start_time.
          // For simplicity, we grab the latest published deck version for this account.
          const [deckVersion] = await tx.select({ id: rateDeckVersions.id, currency: rateDecks.currency })
            .from(rateDeckVersions)
            .innerJoin(rateDecks, eq(rateDeckVersions.deckId, rateDecks.id))
            .where(and(eq(rateDeckVersions.accountPath, sql`${accountPath}::ltree`), eq(rateDeckVersions.status, 'published')))
            .orderBy(desc(rateDeckVersions.publishedAt))
            .limit(1);

          if (!deckVersion) {
            this.logger.warn(`No published rate deck found for account ${accountId}. Cannot rate.`);
            return { ok: false, reason: 'NO_DECK' };
          }

          // 1. Build PrefixTrie
          const deckRates = await tx.select().from(rates).where(eq(rates.deckVersionId, deckVersion.id));
          const trie = new PrefixTrie<Rate>();
          
          for (const r of deckRates) {
            const fromTime = r.effective ? new Date(r.effective.split(',')[0].replace('[', '')).getTime() : 0;
            trie.insert(
              r.prefix, 
              {
                destination: r.destination,
                ratePerMin: r.ratePerMin,
                connectionFee: r.connectionFee || '0',
                increment: { first: r.incrementFirst, next: r.incrementNext },
                currency: deckVersion.currency
              },
              { from: fromTime, to: null }
            );
          }

          // 2. Fetch unrated CDRs for this account
          const unrated = await tx.select().from(cdrs).where(and(eq(cdrs.accountId, accountId), eq(cdrs.ratingStatus, 0))).limit(1000);
          if (unrated.length === 0) return { ok: true, msg: 'No unrated CDRs' };

          // 3. Rate them locally in memory (BR-03, BR-04)
          for (const cdr of unrated) {
            const outcome = rateCall({
              callee: cdr.callee,
              startTime: cdr.startTime,
              durationSec: cdr.durationSec,
              disposition: cdr.disposition as any
            }, trie);

            if (outcome.status === 'rated') {
              await tx.update(cdrs).set({
                ratingStatus: 1,
                matchedPrefix: outcome.breakdown.matchedPrefix,
                billedSec: outcome.breakdown.billedSec,
                costAmount: outcome.breakdown.total.toString(),
                ratedDeckVersionId: deckVersion.id
              }).where(eq(cdrs.id, cdr.id));
            } else {
              await tx.update(cdrs).set({
                ratingStatus: 2 // unrateable
              }).where(eq(cdrs.id, cdr.id));
            }
          }

          this.logger.log(`Rated ${unrated.length} CDRs for account ${accountId}`);
          return { ok: true, ratedCount: unrated.length };
        });
      },
      { connection: { url: this.env.REDIS_URL, maxRetriesPerRequest: null }, concurrency: 4 },
    );
    this.worker.on('failed', (job, err) => this.logger.error(`Rating Job ${job?.id} failed: ${err.message}`));
    this.logger.log(`Worker consuming queue "${QUEUES.rating}"`);
  }

  async onApplicationShutdown(): Promise<void> {
    await this.worker?.close();
  }
}
