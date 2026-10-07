import { Worker, Job } from 'bullmq';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { PrefixTrie } from './trie-cache';
import { Decimal } from 'decimal.js';

export class RatingWorker {
  private worker: Worker;
  private deckCaches: Map<bigint, PrefixTrie> = new Map();

  constructor(
    private readonly redisClient: Redis,
    private readonly pgPool: Pool
  ) {
    this.worker = new Worker(
      'rating',
      this.processJob.bind(this),
      { connection: this.redisClient, concurrency: 10 }
    );

    this.worker.on('failed', (job, err) => {
      console.error(`Job ${job?.id} failed:`, err);
    });

    console.log('✅ RatingWorker initialized. Listening for jobs...');
  }

  async loadDeckVersion(deckVersionId: bigint) {
    if (this.deckCaches.has(deckVersionId)) {
      return this.deckCaches.get(deckVersionId)!;
    }

    console.log(`[Cache Miss] Loading deck version ${deckVersionId} into Trie...`);
    const trie = new PrefixTrie();
    const result = await this.pgPool.query(
      `SELECT id, prefix, rate_per_min, increment_first, increment_next, connection_fee 
       FROM rates WHERE deck_version_id = $1`,
      [deckVersionId]
    );

    for (const row of result.rows) {
      trie.insert(
        row.prefix,
        row.id,
        row.rate_per_min,
        row.increment_first,
        row.increment_next,
        row.connection_fee
      );
    }

    this.deckCaches.set(deckVersionId, trie);
    return trie;
  }

  private async processJob(job: Job) {
    const { chunkId, deckVersionId } = job.data;
    console.log(`[Job ${job.id}] Rating chunk ${chunkId} using deck ${deckVersionId}`);

    const trie = await this.loadDeckVersion(BigInt(deckVersionId));

    // 1. Fetch unrated CDRs from this chunk
    // Note: In real life, chunk_id would map to a range or specific import partition
    const cdrs = await this.pgPool.query(
      `SELECT id, start_time, callee, duration_sec FROM cdrs WHERE rating_status = 0 LIMIT 50000`
    );

    let ratedCount = 0;
    
    // 2. Perform fast memory-bound rating
    for (const cdr of cdrs.rows) {
      const match = trie.findLongestMatch(cdr.callee);
      
      if (!match) {
        // Unrateable (No match)
        continue;
      }

      const duration = cdr.duration_sec;
      let billedSec = 0;
      
      if (duration > 0) {
        billedSec = match.incrementFirst;
        const remainder = Math.max(0, duration - match.incrementFirst);
        if (remainder > 0) {
          billedSec += Math.ceil(remainder / match.incrementNext) * match.incrementNext;
        }
      }

      const ratePerMin = match.ratePerMin as Decimal;
      const connectionFee = match.connectionFee as Decimal;
      
      const cost = connectionFee.plus(
        ratePerMin.mul(billedSec).div(60)
      );

      // In real life, we would batch these updates and upsert into usage_daily_summary
      ratedCount++;
    }

    // 3. Mark chunk as completed
    console.log(`[Job ${job.id}] Successfully rated ${ratedCount}/${cdrs.rows.length} CDRs in chunk ${chunkId}`);
  }
}
